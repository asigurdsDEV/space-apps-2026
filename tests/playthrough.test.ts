// Plays every scenario end to end through the real sim with real data and real Commands,
// the way the app will: init → set_param → launch → step until ended.
import { describe, it, expect } from 'vitest'
import type { Command, Config, ParamValue, SimEvent, SimState } from '../shared'
import { init, step, summary } from '../sim'
import { DIFFICULTIES, PROGRAM, getDatasets, getScenario, scenarios, type Difficulty } from '../data'
import { stars } from '../ui/mission/game'

const MAX_STEPS = 10_000 // far beyond any mission length; stops a stuck sim from hanging the test

function play(config: Config, design: Record<string, ParamValue> = {}) {
  let state: SimState = init(config, getDatasets(config.datasets))
  const events: SimEvent[] = []
  const commands: Command[] = Object.entries(design).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }))
  ;({ state } = step(state, commands, config.dt_s))
  const designIssues = state.issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`)
  ;({ state } = step(state, [{ type: 'launch', payload: {} }], config.dt_s))
  const launched = state.metrics.phase !== 'design'
  // Anomaly cards stop the clock until answered; take option `a` (the safe one), like the sim's own what-if reruns.
  let waiting: string | undefined
  for (let n = 0; state.status !== 'ended' && n < MAX_STEPS; n++) {
    const answer: Command[] = waiting ? [{ type: 'resolve_decision', payload: { decision_id: waiting, option_id: 'a' } }] : []
    const r = step(state, answer, config.dt_s)
    state = r.state
    events.push(...r.events)
    waiting = r.events.find((e) => e.type === 'decision_required')?.payload.decision_id as string | undefined
  }
  return { state, events, designIssues, launched, ended: events.find((e) => e.type === 'scenario_ended') }
}

// Judge the design, not luck: no launch failure, bus failure or random events.
const sandbox = (id: string, level: Difficulty = 'normal'): Config => {
  const c = getScenario(id, level)!
  return { ...c, params: { ...c.params, random_failures: false } }
}

// One known win per scenario: the proof each one is winnable. Changes from the scenario's starting design.
const WINS: Record<string, Record<string, ParamValue>> = {
  demo: { bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' },
  // camera + magnetometer: the science margin that survives the reaction-wheel card (drawn on Normal and Hard).
  moon: { bus: 'medium-bus', instruments: 'laser-altimeter,radiation-detector,ir-spectrometer,camera-basic,magnetometer', comms: 'high-gain-dish' },
  mars: { instruments: 'subsurface-radar,ir-spectrometer', comms: 'mars-hga' },
}

describe('playthrough (real sim + real data)', () => {
  // Budget and science goal change with difficulty, so the same reference design must still win at every level.
  const LEVELS = Object.keys(DIFFICULTIES) as Difficulty[]
  it.each(Object.keys(WINS).flatMap((id) => LEVELS.map((level) => [id, level] as const)))(
    '%s (%s): the reference design wins',
    (id, level) => {
      const r = play(sandbox(id, level), WINS[id])
      expect(r.designIssues).toEqual([])
      expect(r.launched).toBe(true)
      expect(r.ended?.payload).toMatchObject({ reason: 'success' })
    },
  )

  // The app draws DIFFICULTIES[level].anomaly_cards cards. Answering the safe option every time must still win.
  it.each(Object.keys(WINS).flatMap((id) => LEVELS.map((level) => [id, level] as const)))(
    '%s (%s, with its anomaly cards): the reference design wins',
    (id, level) => {
      const c = sandbox(id, level)
      const r = play({ ...c, params: { ...c.params, anomaly_cards: DIFFICULTIES[level].anomaly_cards } }, WINS[id])
      expect(r.events.filter((e) => e.type === 'decision_required')).toHaveLength(DIFFICULTIES[level].anomaly_cards)
      expect(r.ended?.payload).toMatchObject({ reason: 'success' })
    },
  )

  // Hard turns random failures on, so the scenario's own seed must not doom a good design.
  it.each(Object.keys(WINS))('%s (hard, random failures on): the reference design survives its seed', (id) => {
    const r = play(getScenario(id, 'hard')!, WINS[id])
    expect(r.ended?.payload).toMatchObject({ reason: 'success' })
  })

  // The bonus star must be a goal results can judge, and reachable on Normal.
  it.each(Object.keys(WINS))('%s: the reference design earns the bonus star', (id) => {
    const config = sandbox(id)
    const [, bonus] = stars(summary(play(config, WINS[id]).state), String(config.params.bonus_goal))
    expect(bonus.label).not.toBe('Bonus goal') // an unknown code falls back to this label
    expect(bonus.earned).toBe(true)
  })

  it('the mission program lists every scenario once', () => {
    expect([...PROGRAM].sort()).toEqual(scenarios.map((s) => s.scenario_id).sort())
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
    const demo = getScenario('demo', 'hard')!
    expect(play(demo).state.metrics).toEqual(play(demo).state.metrics)
  })
})
