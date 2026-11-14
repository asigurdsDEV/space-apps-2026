import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SimEvent, Summary } from '../../shared'
import { CapcomPopout, Cutscene, FactPopout } from './Story'
import { CUTSCENE_MS, LINES, storyBeat, worldOf } from './model'

const at = { tick: 1, t_s: 1 }
const phase = (to: string): SimEvent => ({ type: 'phase_changed', ...at, payload: { from: 'x', to } })
const ended = (outcome: string): SimEvent => ({ type: 'scenario_ended', ...at, payload: { reason: outcome, summary: { outcome } as Summary } })
const card = (id: string): SimEvent =>
  ({ type: 'decision_required', ...at, payload: { decision_id: id, card_id: 'c', title: 't', body: 'b', console: 'spacecraft', options: [] } })
const answered = (id: string): SimEvent => ({ type: 'decision_resolved', ...at, payload: { decision_id: id, card_id: 'c', option_id: 'a', message: '' } })

describe('storyBeat', () => {
  it('knows the world from the scenario id, difficulty included', () => {
    expect(worldOf('demo')).toBe('earth')
    expect(worldOf('moon-hard')).toBe('moon')
    expect(worldOf('mars')).toBe('mars')
  })

  it('opens each mission with its call and the arrival cutscene', () => {
    expect(storyBeat('briefing', [], 'mars-easy')).toEqual({ key: 'call-mars-easy', line: 'call-mars', cutscene: 'arrival' })
  })

  it('follows the flight: launch, orbit, anomaly, answer, ending', () => {
    const log: SimEvent[] = [phase('cruise')]
    expect(storyBeat('flight', log, 'moon')).toMatchObject({ key: 'launch', cutscene: 'launch' })
    log.push(phase('operations'))
    expect(storyBeat('flight', log, 'moon')).toMatchObject({ key: 'orbit', line: 'orbit-moon', cutscene: 'orbit' })
    expect(storyBeat('flight', log, 'demo')).toEqual({ key: 'orbit', line: 'orbit-earth' }) // no cutscene right after lift-off
    log.push(card('d1'))
    expect(storyBeat('flight', log, 'moon')).toMatchObject({ key: 'anomaly-d1', cutscene: 'anomaly' })
    log.push(answered('d1'))
    expect(storyBeat('flight', log, 'moon')).toEqual({ key: 'resolved-d1', line: 'anomaly-resolved' })
    log.push(ended('success'))
    expect(storyBeat('flight', log, 'moon')).toMatchObject({ line: 'ending-success', cutscene: 'ending-success' })
    expect(storyBeat('results', log, 'moon').line).toBe('debrief-success')
    expect(storyBeat('results', [ended('science_shortfall')], 'moon').line).toBe('debrief-loss')
  })

  it('keeps every line short and every cutscene at 10 s or less', () => {
    for (const line of Object.values(LINES)) expect(line.length).toBeLessThanOrEqual(120)
    for (const ms of Object.values(CUTSCENE_MS)) expect(ms).toBeLessThanOrEqual(10_000)
  })
})

describe('pop-outs', () => {
  it('CAPCOM speaks politely to screen readers', () => {
    const html = renderToStaticMarkup(<CapcomPopout line="poll" onClose={() => {}} />)
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain(LINES.poll)
    expect(html).toContain('Got it')
  })

  it('fact pop-outs come from the glossary, and unknown terms show nothing', () => {
    expect(renderToStaticMarkup(<FactPopout termId="delta-v" onClose={() => {}} />)).toContain('Did you know?')
    expect(renderToStaticMarkup(<FactPopout termId="not-a-term" onClose={() => {}} />)).toBe('')
  })

  it('a cutscene always has its caption and a Skip button, and a still without a 3D scene', () => {
    const html = renderToStaticMarkup(<Cutscene id="launch" caption={LINES.launch} onDone={() => {}} />)
    expect(html).toContain(LINES.launch)
    expect(html).toContain('Skip')
    expect(html).toContain('st-still')
  })
})
