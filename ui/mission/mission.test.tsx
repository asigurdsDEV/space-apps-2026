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
    expect(html).toContain('mv-space') // 3D SpaceView from ui/scene3d
    expect(html).toContain('Science returned')
    expect(html).toContain('In orbit. Science operations have started.')
    expect(html).toContain('Pause')
  })

  it('shows Resume when paused', () => {
    const state = init(demoConfig, fixtureDatasets)
    const html = renderToStaticMarkup(<MissionView state={state} events={[]} onCommand={noop} paused />)
    expect(html).toContain('Resume')
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

// ------------------------------------------------- decision 004: game layer

import { DecisionCard, DecisionCardBody } from './DecisionCard'
import { bestFixes, matchMission, shareText, stars, teamPriorities, type Decision } from './game'

const card: Decision = {
  decision_id: 'd1',
  card_id: 'reaction-wheel',
  title: 'Reaction wheel failure',
  body: 'A wheel stopped.',
  console: 'spacecraft',
  options: [
    { id: 'a', label: 'Coarse pointing', effect_text: 'Science −40%.' },
    { id: 'b', label: 'Restart it', effect_text: 'Gamble.' },
  ],
  story: { mission: 'Kepler', year: 2013, text: 'It really happened.', source_url: 'https://example.org/kepler' },
}

describe('stars', () => {
  const base = { outcome: 'success', score: 900, data_generated_gb: 100, data_lost_gb: 0, budget_usd: 100, cost_usd: 70, mass_kg: 95, mass_limit_kg: 100 }

  it('awards success, the scenario bonus goal and excellent', () => {
    expect(stars(base, 'no_data_lost').map((s) => s.earned)).toEqual([true, true, true])
    expect(stars(base, 'budget_left_20')[1].earned).toBe(true)
    expect(stars(base, 'mass_margin_10')[1].earned).toBe(false) // 5% margin
  })

  it('gives no bonus star on a failed mission or an unknown goal', () => {
    expect(stars({ ...base, outcome: 'science_shortfall', score: 600 }, 'no_data_lost').map((s) => s.earned)).toEqual([false, false, false])
    // No known goal: no nameless bonus star (playtest finding), just success + excellent.
    expect(stars(base, 'made_up').map((s) => s.label)).toEqual(['Mission success', 'Excellent (850+ points)'])
    expect(stars(base).length).toBe(2)
  })
})

describe('what-if + share card', () => {
  it('keeps only fixes that beat the current score, best first, max 3', () => {
    const fixes = [50, 88, 70, 95, 61, 40].map((score) => ({ change: `c${score}`, score }))
    expect(bestFixes(fixes, 60).map((f) => f.score)).toEqual([95, 88, 70])
  })

  it('builds a share text with stars, score, grade and outcome', () => {
    const text = shareText({ outcome: 'success', score: 84, grade: 'B' }, { title: 'First Light', daily: '2026-11-14', anomalies: 2 })
    expect(text).toBe('First Flight · Daily 2026-11-14 · First Light\n★☆  84 pts (B)\nMission success · ⚠ 2 anomalies survived')
  })
})

describe('anomaly card', () => {
  it('renders the card over the run view and locks the run controls', () => {
    const { state, events } = fly({ toEnd: false, sandbox: true })
    const html = renderToStaticMarkup(<MissionView state={state} events={events} onCommand={noop} decision={card} onDecide={noop} />)
    expect(html).toContain('role="alertdialog"')
    expect(html).toContain('SPACECRAFT console')
    expect(html).toContain('Based on a real event: Kepler (2013)')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>❚❚ Pause/)
  })

  it('sends the decision and option ids', () => {
    const picked: string[] = []
    const element = DecisionCardBody({ decision: card, onDecide: (d, o) => picked.push(`${d}:${o}`) })
    findButton(element, 'Restart it').props.onClick()
    expect(picked).toEqual(['d1:b'])
  })

  it('disables the options when another console owns the card', () => {
    const html = renderToStaticMarkup(<DecisionCard decision={card} onDecide={noop} canAnswer={false} />)
    expect(html).toContain('Waiting for the SPACECRAFT console to decide.')
  })
})

describe('debrief', () => {
  it('shows stars, the best fixes with Try it, and the share card', () => {
    const { state } = fly({ toEnd: true, sandbox: true })
    const report = summary(state)
    const tried: string[] = []
    const fixes = [{ change: '3 ground stations instead of 1', score: 998, grade: 'A' }, { change: 'Add the Magnetometer', score: 995 }]
    const element = ResultsScreen({ summary: report, onCommand: noop, bonusGoal: 'no_data_lost', fixes, onTryFix: (f) => tried.push(f.change) })
    const html = renderToStaticMarkup(element)
    expect(html).toContain('3 stars')
    expect(html).toContain('Even better')
    expect(html).toContain('<strong>3 ground stations instead of 1</strong>: this exact mission scores')
    expect(html).toContain('<strong>Add the Magnetometer</strong>: this exact mission scores')
    expect(renderToStaticMarkup(<MissionScreen state={state} events={[]} summary={report} onCommand={noop} />)).toContain('Share your result')
    findButton(element, 'Try it').props.onClick()
    expect(tried).toEqual(['3 ground stations instead of 1'])
  })
})

describe('space weather strip', () => {
  it('shows the real day and storm level, and hides when absent', () => {
    const { state, events } = fly({ toEnd: false, sandbox: true })
    const day = { date: '2003-10-30', kp_max: 9, storm_g: 5, sunspots: 250, f107_sfu: 267.6 }
    const html = renderToStaticMarkup(<MissionView state={state} events={events} onCommand={noop} spaceWeather={day} />)
    expect(html).toContain('G5 extreme storm')
    expect(html).toContain('Real NASA data from 30 Oct 2003')
    expect(html).toContain('mv-tone-bad')
    expect(renderToStaticMarkup(<MissionView state={state} events={events} onCommand={noop} />)).not.toContain('mv-weather')
  })
})

describe('real mission match', () => {
  const missions = [
    { id: 'icecube', name: 'IceCube', agency: 'NASA', year: 2017, body: 'earth', orbit_class: 'leo-iss', mass_kg: 4.5, objective: 'earth-observation', fact: 'Tiny.', source_url: 'https://a' },
    { id: 'landsat-9', name: 'Landsat 9', agency: 'NASA', year: 2021, body: 'earth', orbit_class: 'sso', mass_kg: 2711, objective: 'earth-observation', fact: 'Big.', source_url: 'https://b' },
    { id: 'small-sso', name: 'Small SSO', agency: 'NASA', year: 2020, body: 'earth', orbit_class: 'sso', mass_kg: 15, objective: 'earth-observation', fact: 'Small.', source_url: 'https://c' },
    { id: 'lro', name: 'LRO', agency: 'NASA', year: 2009, body: 'moon', orbit_class: 'lunar', mass_kg: 1916, objective: 'lunar-mapping', fact: 'Moon.', source_url: 'https://d' },
  ]

  it('needs the same body, then weighs size class over orbit and objective', () => {
    expect(matchMission(missions, { body: 'earth', orbit: 'sso', objective: 'earth-observation', mass_kg: 12 })?.id).toBe('small-sso')
    expect(matchMission(missions, { body: 'earth', orbit: 'sso', objective: 'earth-observation', mass_kg: 2000 })?.id).toBe('landsat-9')
    // Live playtest: a ~6 kg CubeSat in SSO was matched to a 5-tonne flagship. Size now wins over orbit.
    expect(matchMission(missions.filter((m) => m.id !== 'small-sso'), { body: 'earth', orbit: 'sso', objective: 'earth-observation', mass_kg: 6 })?.id).toBe('icecube')
    expect(matchMission(missions, { body: 'moon', mass_kg: 5 })?.id).toBe('lro')
    expect(matchMission(missions, { body: 'mars', mass_kg: 5 })).toBeNull()
  })

  it('shows the match with its fact and source on the debrief', () => {
    const { state, events } = fly({ toEnd: true, sandbox: true })
    const html = renderToStaticMarkup(<MissionScreen state={state} events={events} onCommand={noop} realMissions={missions} />)
    expect(html).toContain('Your mission is most like')
    expect(html).toMatch(/<strong>(IceCube|Landsat 9|Small SSO)<\/strong>/)
    expect(html).toContain('>Source</a>')
  })
})

describe('card story header', () => {
  it('does not say "Based on a real event: Inspired by …"', () => {
    const inspired = { ...card, story: { mission: 'Inspired by the Deep Space Network', year: 'ongoing', text: 'Shared antennas.' } }
    const html = renderToStaticMarkup(<DecisionCard decision={inspired} onDecide={noop} />)
    expect(html).toContain('<strong>Inspired by the Deep Space Network</strong>')
    expect(html).not.toContain('Based on a real event')
    expect(renderToStaticMarkup(<DecisionCard decision={card} onDecide={noop} />)).toContain('Based on a real event: Kepler (2013)')
  })
})

describe('team priorities', () => {
  const won = { outcome: 'success', score: 90, science_score: 40, science_goal: 30, mass_kg: 22, mass_limit_kg: 200, data_lost_gb: 0, cost_usd: 7e6, budget_usd: 8e6 }

  it('judges each console goal from the summary and issues', () => {
    expect(teamPriorities(won, []).map((p) => p.met)).toEqual([true, true, true, true])
    const tight = { ...won, mass_kg: 190, science_score: 33, data_lost_gb: 5 }
    expect(teamPriorities(tight, [{ resource: 'power' }]).map((p) => p.met)).toEqual([false, false, false, false])
  })

  it('shows the team card with the bonus line on the debrief', () => {
    const { state, events } = fly({ toEnd: true, sandbox: true })
    const html = renderToStaticMarkup(<MissionScreen state={state} events={events} onCommand={noop} />)
    expect(html).toContain('Team priorities')
    expect(html).toContain('<strong>COMMS</strong>')
    expect(html).toMatch(/Team bonus: \d of 4|\d of 4 priorities met/)
  })
})
