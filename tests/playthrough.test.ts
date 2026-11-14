// Plays every scenario end to end through the real sim with real data and real Commands,
// the way the app will: init → set_param → launch → step until ended.
import { describe, it, expect } from 'vitest'
import type { Command, Config, ParamValue, SimEvent, SimState } from '../shared'
import { init, step } from '../sim'
import { getDatasets, getScenario } from '../data'

const MAX_STEPS = 10_000 // far beyond any mission length; stops a stuck sim from hanging the test

function play(config: Config, design: Record<string, ParamValue> = {}) {
  let state: SimState = init(config, getDatasets(config.datasets))
  const events: SimEvent[] = []
  const commands: Command[] = Object.entries(design).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }))
  ;({ state } = step(state, commands, config.dt_s))
  const designIssues = state.issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`)
  ;({ state } = step(state, [{ type: 'launch', payload: {} }], config.dt_s))
  const launched = state.metrics.phase !== 'design'
  for (let n = 0; state.status !== 'ended' && n < MAX_STEPS; n++) {
    const r = step(state, [], config.dt_s)
    state = r.state
    events.push(...r.events)
  }
  return { state, events, designIssues, launched, ended: events.find((e) => e.type === 'scenario_ended') }
}

// Judge the design, not luck: no launch failure, bus failure or random events.
const sandbox = (id: string): Config => {
  const c = getScenario(id)!
  return { ...c, params: { ...c.params, random_failures: false } }
}

// One known win per scenario: the proof each one is winnable. Changes from the scenario's starting design.
const WINS: Record<string, Record<string, ParamValue>> = {
  demo: { bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' },
  moon: { bus: 'medium-bus', instruments: 'laser-altimeter,radiation-detector,ir-spectrometer', comms: 'high-gain-dish' },
  mars: { instruments: 'subsurface-radar,ir-spectrometer', comms: 'mars-hga' },
}

describe('playthrough (real sim + real data)', () => {
  it.each(Object.keys(WINS))('%s: the reference design wins', (id) => {
    const r = play(sandbox(id), WINS[id])
    expect(r.designIssues).toEqual([])
    expect(r.launched).toBe(true)
    expect(r.ended?.payload).toMatchObject({ reason: 'success' })
  })

  it.each(Object.keys(WINS))('%s: the starting design does not win', (id) => {
    const r = play(sandbox(id))
    expect(r.ended?.payload.reason ?? 'refused at launch').not.toBe('success')
  })

  it('demo: starting design launches, flies to the end, and loses', () => {
    const r = play(sandbox('demo'))
    expect(r.designIssues).toEqual([])
    expect(r.launched).toBe(true)
    expect(r.ended?.payload).toMatchObject({ reason: 'science_shortfall' })
  })

  it('moon: starting smallsat is refused because it cannot brake into lunar orbit', () => {
    const r = play(sandbox('moon'))
    expect(r.designIssues).toContainEqual(expect.stringMatching(/^delta_v_short:/))
    expect(r.launched).toBe(false)
  })

  it('an impossible design is refused at launch with a reason', () => {
    const r = play(sandbox('demo'), { orbit: 'geo' }) // the rideshare can't reach GEO
    expect(r.designIssues).toContainEqual(expect.stringMatching(/^orbit_unreachable:/))
    expect(r.launched).toBe(false)
  })

  it('the same seed gives the same result (with random failures on)', () => {
    const demo = getScenario('demo')!
    expect(play(demo).state.metrics).toEqual(play(demo).state.metrics)
  })
})
