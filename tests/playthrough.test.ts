// Plays the demo scenario end to end through the real sim with real data and real Commands,
// the way the app will: init → set_param → launch → step until ended.
import { describe, it, expect } from 'vitest'
import type { Command, Config, ParamValue, SimEvent, SimState } from '../shared'
import { init, step } from '../sim'
import { getDatasets, getScenario } from '../data'

const demo = getScenario('demo')!
const MAX_STEPS = 10_000 // far beyond any mission length; stops a stuck sim from hanging the test

function play(design: Record<string, ParamValue>, config: Config = demo) {
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
const sandbox: Config = { ...demo, params: { ...demo.params, random_failures: false } }

describe('demo playthrough (real sim + real data)', () => {
  it('starting design launches, flies to the end, and loses', () => {
    const r = play({}, sandbox)
    expect(r.designIssues).toEqual([])
    expect(r.launched).toBe(true)
    expect(r.state.status).toBe('ended')
    expect(r.ended?.payload).toMatchObject({ reason: 'science_shortfall' })
  })

  it('reference design wins', () => {
    const r = play(
      { bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' },
      sandbox,
    )
    expect(r.designIssues).toEqual([])
    expect(r.launched).toBe(true)
    expect(r.ended?.payload).toMatchObject({ reason: 'success' })
  })

  it('an impossible design is refused at launch with a reason', () => {
    const r = play({ orbit: 'geo' }, sandbox) // the rideshare can't reach GEO
    expect(r.designIssues).toContainEqual(expect.stringMatching(/^orbit_unreachable:/))
    expect(r.launched).toBe(false)
  })

  it('the same seed gives the same result (with random failures on)', () => {
    const a = play({}), b = play({})
    expect(b.state.metrics).toEqual(a.state.metrics)
  })
})
