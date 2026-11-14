import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Command, SimEvent, SimState } from '../../shared'
import { init, step, summary } from '../../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../../sim/testing/fixtures'
import { eventText, eventWhen, logLines } from './eventText'
import { fillShare, formatGb, formatMetric, formatUsd, splitSentences } from './format'
import { MissionScreen } from './MissionScreen'
import { MissionView } from './MissionView'
import { ResultsScreen } from './ResultsScreen'

const noop = () => {}

/** Design the fixture's good spacecraft, launch it, and optionally fly to the end. */
function fly(opts: { toEnd: boolean; sandbox?: boolean; seed?: number }) {
  const config = {
    ...demoConfig,
    seed: opts.seed ?? demoConfig.seed,
    params: { ...demoConfig.params, random_failures: !opts.sandbox },
  }
  let state: SimState = init(config, fixtureDatasets)
  const events: SimEvent[] = []
  const run = (commands: Command[]) => {
    const result = step(state, commands, config.dt_s)
    state = result.state
    events.push(...result.events)
  }
  run(Object.entries(goodDesign).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }) as Command))
  run([{ type: 'launch', payload: {} }])
  for (let i = 0; opts.toEnd && state.status !== 'ended' && i < 1000; i++) run([])
  return { state, events }
}

describe('format helpers', () => {
  it('formats money, data and units', () => {
    expect(formatUsd(50e6)).toBe('$50M')
    expect(formatUsd(1_250_000)).toBe('$1.3M')
    expect(formatUsd(850)).toBe('$850')
    expect(formatGb(0.25)).toBe('250 MB')
    expect(formatGb(1500)).toBe('1.5 TB')
    expect(formatMetric('mass_kg', 1234.4)).toBe('1,234 kg')
    expect(formatMetric('cost_usd', 2e6)).toBe('$2M')
  })

  it('clamps bar fill and treats a 0 limit as no limit', () => {
    expect(fillShare(5, 10)).toBe(0.5)
    expect(fillShare(20, 10)).toBe(1)
    expect(fillShare(5, 0)).toBe(0)
  })

  it('splits the summary why text into sentences without breaking $ amounts', () => {
    expect(splitSentences('Mission success: you returned 3,100 points. You finished $1.2M under budget.')).toEqual([
      'Mission success: you returned 3,100 points.',
      'You finished $1.2M under budget.',
    ])
  })
})

describe('event text', () => {
  it('reads science goal as good news and other limits as problems', () => {
    const base = { tick: 1, t_s: 86400 * 10 }
    const science = eventText({ ...base, type: 'threshold_crossed', payload: { metric: 'science_score', value: 3000, threshold: 3000, direction: 'up' } })
    const mass = eventText({ ...base, type: 'threshold_crossed', payload: { metric: 'mass_kg', value: 500, threshold: 400, direction: 'up' } })
    expect(science?.tone).toBe('good')
    expect(mass?.tone).toBe('bad')
    expect(mass?.text).toContain('500 kg / 400 kg')
  })

  it('labels design-phase events and flight days', () => {
    expect(eventWhen(0, 'warning')).toBe('Design')
    expect(eventWhen(0, 'phase_changed')).toBe('Launch')
    expect(eventWhen(86400 * 4.5)).toBe('T+4d')
  })

  it('has a line for every event a real mission emits, newest first', () => {
    const { events } = fly({ toEnd: true })
    for (const event of events) {
      if (event.type === 'entity_added' && event.payload.entity.kind === 'body') continue
      expect(eventText(event), event.type).not.toBeNull()
    }
    const lines = logLines(events, 5)
    expect(lines).toHaveLength(5)
    expect(lines[0].t_s).toBeGreaterThanOrEqual(lines[4].t_s)
  })
})

describe('MissionView', () => {
  it('shows the spacecraft, phase and progress mid-flight', () => {
    const { state, events } = fly({ toEnd: false, sandbox: true })
    let flying = state
    const all = [...events]
    for (let i = 0; i < 40; i++) {
      const r = step(flying, [], demoConfig.dt_s)
      flying = r.state
      all.push(...r.events)
    }
    expect(flying.metrics.phase).toBe('operations')
    const html = renderToStaticMarkup(<MissionView state={flying} events={all} onCommand={noop} title="Demo" />)
    expect(html).toContain('aria-current="step"')
    expect(html).toContain('Science ops')
    expect(html).toContain('orbiting Earth')
    expect(html).toContain('Science returned')
    expect(html).toContain('In orbit. Science operations have started.')
    expect(html).toContain('Pause')
  })

  it('shows Resume when paused and a placeholder before launch', () => {
    const state = init(demoConfig, fixtureDatasets)
    const html = renderToStaticMarkup(<MissionView state={state} events={[]} onCommand={noop} paused />)
    expect(html).toContain('Resume')
    expect(html).toContain('Launch to see your spacecraft here.')
  })
})

describe('results', () => {
  it('MissionScreen switches to results once the sim ends and shows the summary', () => {
    const { state, events } = fly({ toEnd: true, sandbox: true })
    expect(state.status).toBe('ended')
    const report = summary(state)
    const html = renderToStaticMarkup(<MissionScreen state={state} events={events} onCommand={noop} />)
    expect(html).toContain('aria-label="Mission results"')
    expect(html).toContain(`Grade ${report.grade}`)
    expect(html).toContain(`<strong>${report.score}</strong> / 100`)
    expect(html).toContain('Design a new mission')
  })

  it('Start over sends a reset command', () => {
    const sent: Command[] = []
    const { state } = fly({ toEnd: true, sandbox: true })
    // Render to markup can't click, so call the handler the same way the button does.
    const element = ResultsScreen({ summary: summary(state), onCommand: (c) => sent.push(c) })
    const button = findButton(element, 'Design a new mission')
    button.props.onClick()
    expect(sent).toEqual([{ type: 'reset', payload: {} }])
  })
})

// Walk a React element tree (no DOM) to find a button by its text.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findButton(node: any, text: string): any {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButton(child, text)
      if (hit) return hit
    }
    return null
  }
  const children = node.props?.children
  if (node.type === 'button' && JSON.stringify(children).includes(text)) return node
  return findButton(children, text)
}
