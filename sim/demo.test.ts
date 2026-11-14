// Demo balance: data/'s demo scenario, flown through the real sim with the real catalogs.
// data/data.test.ts proves the same two designs with its own budget math; this proves
// the sim agrees: the starting design flies but loses, and the reference design wins.

import { describe, expect, it } from 'vitest'
import type { Command, Config, ParamValue, SimEvent, SimState } from '../shared'
import { getDatasets, getScenario } from '../data'
import { init, step, summary } from './index'

const demo = getScenario('demo')!
const datasets = getDatasets(demo.datasets)
/** Judge the design, not luck. */
const sandbox: Config = { ...demo, params: { ...demo.params, random_failures: false } }

/** The winning design from data/data.test.ts ("reference solution"): the starting design with four parts swapped. */
const reference: Record<string, ParamValue> = {
  bus: 'cubesat-12u',
  instruments: 'camera-basic,ir-spectrometer',
  solar: 'solar-deployable-large',
  comms: 'x-band-transmitter',
}

/** Play the way the app does: init, set_param for each change, launch, step until ended. */
function play(changes: Record<string, ParamValue>, config: Config = sandbox) {
  let state: SimState = init(config, datasets)
  const events: SimEvent[] = []
  const run = (commands: Command[]) => {
    const result = step(state, commands, config.dt_s)
    state = result.state
    events.push(...result.events)
  }
  run(Object.entries(changes).map(([key, value]) => ({ type: 'set_param', payload: { key, value } })))
  const errors = state.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.code)
  const warnings = state.issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.code)
  const design = state.metrics
  run([{ type: 'launch', payload: {} }])
  const launched = state.metrics.phase !== 'design'
  for (let i = 0; state.status !== 'ended' && i < 10_000; i++) run([])
  return { state, events, errors, warnings, design, launched }
}

describe('demo scenario in the real sim', () => {
  it('starting design: no launch blockers, flies the whole year, misses the science target', () => {
    const r = play({})
    expect(r.errors).toEqual([])
    expect(r.launched).toBe(true)
    expect(r.state.status).toBe('ended')
    expect(r.state.metrics.outcome).toBe('science_shortfall')
    expect(r.state.t_s).toBe(demo.duration_s)

    // The numbers data/README.md promises: it fits mass, power and budget...
    expect(r.design.mass_kg).toBeCloseTo(9.1) // 7 bus + 0.4 camera + 1 wings + 0.3 battery + 0.4 radio
    expect(r.design.mass_limit_kg).toBe(200)
    expect(r.design.power_w).toBeCloseTo(15.5) // 5 bus + 2.5 camera + 8 radio
    expect(r.design.power_available_w).toBeCloseTo(19.5) // 30 W x (1 - 0.35 eclipse)
    expect(r.design.cost_usd).toBeCloseTo(1_774_600) // 1,420,000 parts + 300,000 + 6,000/kg x 9.1 kg
    expect(r.design.budget_usd).toBe(8_000_000)
    // ...but the camera makes 2.16 GB a day and the S-band radio sends 0.375 GB a day.
    expect(r.design.data_generated_gb_per_day).toBeCloseTo(2.16)
    expect(r.design.downlink_gb_per_day).toBeCloseTo(0.375)
    expect(r.warnings).toContain('downlink_short')
    // 10 points x (0.375 / 2.16) of the data returned = 1.74 of the 30 needed.
    expect(r.state.metrics.science_score).toBeCloseTo((10 * 0.375) / 2.16, 6)
    expect(r.state.metrics.science_goal).toBe(30)

    const ended = r.events.at(-1)
    expect(ended?.type === 'scenario_ended' && ended.payload.reason).toBe('science_shortfall')
    expect(summary(r.state).grade).toBe('F')
  })

  it('reference design: no issues at all, flies the whole year, wins', () => {
    const r = play(reference)
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
    expect(r.launched).toBe(true)
    expect(r.state.metrics.outcome).toBe('success')
    expect(r.state.t_s).toBe(demo.duration_s)

    expect(r.design.mass_kg).toBeCloseTo(21.7) // 14 bus + 0.4 + 3 instruments + 2 wings + 0.3 battery + 2 radio
    expect(r.design.power_w).toBeCloseTo(46.5) // 8 bus + 2.5 + 6 instruments + 30 radio
    expect(r.design.power_available_w).toBeCloseTo(52) // 80 W x 0.65
    expect(r.design.cost_usd).toBeCloseTo(7_300_200) // 6,870,000 parts + 300,000 + 6,000/kg x 21.7 kg
    expect(r.design.data_generated_gb_per_day).toBeCloseTo(12.96)
    expect(r.design.downlink_gb_per_day).toBeCloseTo(18.75)
    // All the data gets home, so both instruments earn their full value: 10 + 30.
    expect(r.state.metrics.science_score).toBeCloseTo(40, 6)
    expect(r.state.metrics.data_lost_gb).toBe(0)

    const report = summary(r.state)
    expect(report.outcome).toBe('success')
    expect(report.grade).toBe('A')
  })

  it('the forecast shown while designing matches what the flight returns', () => {
    expect(play({}).design.science_score).toBeCloseTo((10 * 0.375) / 2.16, 6)
    expect(play(reference).design.science_score).toBeCloseTo(40, 6)
  })

  it('an impossible design is refused at launch with the reason', () => {
    const r = play({ orbit: 'geo' }) // the rideshare only goes to sun-synchronous orbit
    expect(r.errors).toContain('orbit_unreachable')
    expect(r.launched).toBe(false)
    const refusal = r.events.find((e) => e.type === 'warning')
    expect(refusal?.type === 'warning' && refusal.payload.message).toMatch(/Not ready to launch.*Rideshare slot cannot reach Geostationary orbit/)
  })

  it('with random failures on, the same seed gives the same mission', () => {
    const lucky: Config = { ...demo, params: { ...demo.params, random_failures: true } }
    const a = play(reference, lucky)
    const b = play(reference, lucky)
    expect(b.state.metrics).toEqual(a.state.metrics)
    expect(b.events).toEqual(a.events)
  })
})
