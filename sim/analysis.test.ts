// what-if and success rate on the real data/ catalogs and scenarios (test-only import of data/).
import { describe, expect, it } from 'vitest'
import { getDatasets, getScenario } from '../data'
import type { Command, Config, Params, SimEvent } from '../shared'
import { choicesOf, designOf, flyMission, oneChangeDesigns, successRate, whatIf } from './analysis'
import { catalogEntities } from './parts'
import { init, step, summary } from './sim'

const scenario = (id: string, level: 'easy' | 'normal' | 'hard' = 'normal') => getScenario(id, level) as Config
const demo = scenario('demo')
const datasets = getDatasets(demo.datasets)
// The reference design from tests/playthrough.test.ts.
const WIN: Params = { ...demo.params, bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' }

describe('flyMission', () => {
  it('flies the starting design to a loss and the reference design to a win', () => {
    expect(flyMission(demo, datasets, designOf(demo.params))?.outcome).toBe('science_shortfall')
    expect(flyMission(demo, datasets, designOf(WIN))?.outcome).toBe('success')
  })

  it('returns null for a design that cannot launch', () => {
    expect(flyMission(demo, datasets, { ...designOf(demo.params), launch_vehicle: 'not-a-rocket' })).toBeNull()
  })
})

describe('whatIf', () => {
  const start = designOf(demo.params)
  const baseline = Number(flyMission(demo, datasets, start)!.score)
  const t0 = performance.now()
  const fixes = whatIf(demo, datasets, demo.params)
  const ms = performance.now() - t0

  it('tries one change at a time', () => {
    for (const { design } of oneChangeDesigns(datasets, demo.params)) {
      const changed = Object.keys(design).filter((k) => design[k] !== start[k])
      expect(changed.length).toBe(1)
    }
  })

  it('finds a single change that beats the real score, best first', () => {
    expect(fixes.length).toBeGreaterThan(0)
    expect(fixes[0]!.score).toBeGreaterThan(baseline)
    for (let i = 1; i < fixes.length; i++) expect(fixes[i - 1]!.score).toBeGreaterThanOrEqual(fixes[i]!.score)
    expect(fixes[0]!.change).toMatch(/instead of|Add|Drop|ground station/)
  })

  it('never suggests flying to a different world', () => {
    for (const id of ['demo', 'mars']) {
      const c = scenario(id)
      const parts = catalogEntities(getDatasets(c.datasets))
      const bodyOf = (orbit: unknown) => parts.find((p) => p.kind === 'orbit' && p.id === orbit)?.props.central_body
      const home = bodyOf(c.params.orbit)
      const swaps = oneChangeDesigns(getDatasets(c.datasets), c.params).filter((o) => o.design.orbit !== c.params.orbit)
      for (const o of swaps) expect(bodyOf(o.design.orbit), o.change).toBe(home)
    }
  })

  it('is fast enough for a debrief screen', () => {
    expect(ms).toBeLessThan(3000)
  })
})

describe('successRate', () => {
  it('is 1 or 0 when nothing random is on', () => {
    expect(successRate(demo, datasets, WIN, 5)).toBe(1)
    expect(successRate(demo, datasets, demo.params, 5)).toBe(0)
  })

  it('is between 0 and 1 with random failures on, and repeatable', () => {
    const hard = scenario('demo', 'hard')
    const a = successRate(hard, getDatasets(hard.datasets), { ...hard.params, ...designOf(WIN) }, 30)!
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
    expect(successRate(hard, getDatasets(hard.datasets), { ...hard.params, ...designOf(WIN) }, 30)).toBe(a)
  })

  it('is null for a design that cannot launch', () => {
    expect(successRate(demo, datasets, { ...demo.params, launch_vehicle: 'not-a-rocket' }, 3)).toBeNull()
  })
})

describe('anomaly cards in reruns', () => {
  // A player who answers every card with option b, flown by hand like the app does.
  const cards: Config = { ...demo, params: { ...demo.params, anomaly_cards: 3 } }
  const design = designOf(WIN)
  let state = init(cards, datasets)
  const events: SimEvent[] = []
  const go = (commands: Command[]) => {
    const r = step(state, commands, cards.dt_s)
    state = r.state
    events.push(...r.events)
  }
  go(Object.entries(design).map(([key, value]) => ({ type: 'set_param', payload: { key, value } })))
  go([{ type: 'launch', payload: {} }])
  for (let n = 0; state.status !== 'ended' && n < 100_000; n++) {
    const id = state.metrics.decision_id
    go(id ? [{ type: 'resolve_decision', payload: { decision_id: String(id), option_id: 'b' } }] : [])
  }
  const real = summary(state)

  it('reads the player\'s answers from the events', () => {
    const choices = choicesOf(events)
    expect(Object.keys(choices).length).toBeGreaterThan(0)
    expect(Object.values(choices).every((o) => o === 'b')).toBe(true)
  })

  it('replays them, so the rerun of the flown design matches the real mission', () => {
    expect(flyMission(cards, datasets, design, choicesOf(events))).toEqual(real)
  })
})
