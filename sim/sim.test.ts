import { describe, expect, it } from 'vitest'
import type { Command, Config, Dataset, ParamValue, SimEvent, SimState } from '../shared'
import { init, simCore, step, summary } from './index'
import { demoConfig, fixtureDatasets, goodDesign, launchVehicles } from './testing/fixtures'

const DAY = 86400

function configWith(params: Record<string, ParamValue>, base: Config = demoConfig): Config {
  return { ...base, params: { ...base.params, ...params } }
}
/** Sandbox config: no random failures, so results can be checked by hand. */
const calm = (params: Record<string, ParamValue> = {}) => configWith({ ...goodDesign, random_failures: false, ...params })

function run(state: SimState, steps: number, dt = DAY, first: Command[] = []) {
  const events: SimEvent[] = []
  let current = state
  for (let i = 0; i < steps && current.status !== 'ended'; i++) {
    const result = step(current, i === 0 ? first : [], dt)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}
const launch: Command = { type: 'launch', payload: {} }
const setParam = (key: string, value: ParamValue): Command => ({ type: 'set_param', payload: { key, value } })

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('init', () => {
  it('starts in the design phase with the catalog as entities and one issue per empty slot', () => {
    const state = init(demoConfig, fixtureDatasets)
    expect(state.metrics.phase).toBe('design')
    expect(state.t_s).toBe(0)
    expect(state.entities.filter((e) => e.kind === 'launch_vehicle').map((e) => e.id)).toEqual(['small-lifter', 'medium-lifter', 'heavy-lifter'])
    expect(state.entities.find((e) => e.id === 'x-band')?.props.data_rate_mbps).toBe(150)
    expect(state.issues.map((i) => i.code).sort()).toEqual(
      ['missing_bus', 'missing_comms_system', 'missing_instrument', 'missing_launch_vehicle', 'missing_orbit', 'missing_power_system'],
    )
    expect(state.params.mission_days).toBe(365)
  })

  it('computes the budgets for a complete design', () => {
    const m = init(calm(), fixtureDatasets).metrics
    expect(m.mass_kg).toBeCloseTo(192)
    expect(m.mass_limit_kg).toBe(200)
    expect(m.power_w).toBeCloseTo(250)
    expect(m.power_available_w).toBeCloseTo(420)
    expect(m.cost_usd).toBeCloseTo(34.5e6 + 35000 * 365)
    expect(m.data_generated_gb_per_day).toBeCloseTo(120)
    expect(m.downlink_gb_per_day).toBeCloseTo(168.75)
    expect(m.science_per_day).toBeCloseTo(6 * 1.5 * 1.3)
    expect(m.schedule_months).toBe(19)
  })
})

describe('step: design phase', () => {
  it('never mutates the state it is given', () => {
    const state = deepFreeze(init(calm(), fixtureDatasets))
    const before = JSON.stringify(state)
    const flown = run(state, 400, DAY, [launch])
    expect(flown.state.status).toBe('ended')
    expect(JSON.stringify(state)).toBe(before)
  })

  it('applies set_param, keeps time still, and reports limits being crossed', () => {
    const state = init(calm(), fixtureDatasets)
    const { state: next, events } = step(state, [setParam('instruments', 'multispectral-imager,radar-altimeter')], DAY)
    expect(next.t_s).toBe(0)
    expect(next.tick).toBe(1)
    expect(next.metrics.mass_kg).toBeCloseTo(252)
    expect(next.issues.map((i) => i.code)).toContain('mass_over_limit')
    expect(next.issues.map((i) => i.code)).toContain('payload_over_bus')
    const crossed = events.filter((e) => e.type === 'threshold_crossed').map((e) => e.payload.metric)
    expect(crossed).toContain('mass_kg')
    expect(events[0].type).toBe('scenario_started')
    expect(state.params.instruments).toBe('multispectral-imager')
  })

  it('refuses to launch a design with errors and says why', () => {
    const state = init(calm({ launch_vehicle: 'small-lifter', orbit: 'geostationary' }), fixtureDatasets)
    const { state: next, events } = step(state, [launch], DAY)
    expect(next.metrics.phase).toBe('design')
    expect(next.issues.map((i) => i.code)).toContain('orbit_unreachable')
    const warning = events.find((e) => e.type === 'warning')
    expect(warning?.type === 'warning' && warning.payload.message).toMatch(/Not ready to launch/)
  })

  it('flags budget, schedule and power problems', () => {
    const codes = (params: Record<string, ParamValue>) => init(calm(params), fixtureDatasets).issues.map((i) => i.code)
    expect(codes({ launch_vehicle: 'heavy-lifter' })).toContain('over_budget')
    expect(codes({ deadline_months: 12 })).toContain('behind_schedule')
    expect(codes({ power_system: 'body-panels' })).toContain('power_negative')
    expect(codes({ ground_stations: 1 })).toContain('downlink_short')
    expect(codes({ instruments: 'magnetometer' })).toContain('objective_mismatch')
    expect(codes({})).toEqual(['mass_margin_low'])
  })
})

describe('step: flying the mission', () => {
  it('goes design -> cruise -> operations -> ended and returns the science you can work out by hand', () => {
    const { state, events } = run(init(calm(), fixtureDatasets), 400, DAY, [launch])
    expect(events.filter((e) => e.type === 'phase_changed').map((e) => e.payload.to)).toEqual(['cruise', 'operations', 'ended'])
    expect(state.status).toBe('ended')
    expect(state.metrics.outcome).toBe('success')
    expect(state.t_s).toBeCloseTo((2 + 365) * DAY)
    expect(state.metrics.science_score).toBeCloseTo(6 * 1.5 * 1.3 * 365, 3)
    expect(state.metrics.data_lost_gb).toBe(0)
    expect(state.metrics.cost_spent_usd).toBeCloseTo(34.5e6 + 35000 * 365)
    const ended = events.find((e) => e.type === 'scenario_ended')
    expect(ended?.type === 'scenario_ended' && ended.payload.reason).toBe('success')
    expect(events.some((e) => e.type === 'threshold_crossed' && e.payload.metric === 'science_score')).toBe(true)
    expect(state.entities.find((e) => e.id === 'spacecraft')?.position).toHaveLength(3)
    expect(state.utc).toBe('2028-01-03T00:00:00.000Z')
  })

  it('loses science when the radio cannot keep up, and explains it', () => {
    const { state } = run(init(calm({ ground_stations: 1 }), fixtureDatasets), 400, DAY, [launch])
    expect(state.metrics.outcome).toBe('science_shortfall')
    // 56.25 of 120 GB a day gets home, so the same share of the science does.
    expect(state.metrics.science_score).toBeCloseTo(11.7 * 365 * (56.25 / 120), 3)
    expect(Number(state.metrics.data_lost_gb)).toBeGreaterThan(0)
    expect(state.metrics.data_stored_gb).toBe(500)
    const report = summary(state)
    expect(report.grade).not.toBe('A')
    expect(String(report.why)).toMatch(/storage filled up/)
    expect(String(report.why)).toMatch(/Add ground stations/)
  })

  it('gives the same result for one big step as for many small ones', () => {
    const launched = step(init(calm(), fixtureDatasets), [launch], DAY).state
    const daily = run(launched, 400, DAY).state
    const once = step(launched, [], 1000 * DAY).state
    expect(once.status).toBe('ended')
    expect(once.t_s).toBeCloseTo(daily.t_s)
    expect(once.metrics.science_score).toBeCloseTo(Number(daily.metrics.science_score), 3)
  })

  it('is deterministic for a seed and changes with the seed', () => {
    const risky = (seed: number) => ({ ...configWith({ ...goodDesign, event_rate_per_day: 0.05 }), seed })
    const fly = (seed: number) => run(init(risky(seed), fixtureDatasets), 400, DAY, [launch])
    expect(JSON.stringify(fly(7))).toBe(JSON.stringify(fly(7)))
    const outcomes = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(fly(seed).state.metrics)))
    expect(outcomes.size).toBeGreaterThan(1)
  })

  it('fails at launch on a launch vehicle that never works', () => {
    const dud: Dataset = {
      ...launchVehicles,
      data: { ...launchVehicles.data, rows: [...launchVehicles.data.rows, ['dud', 'Dud', 1e6, 0, 9000, 9000, 9000]] },
    }
    const datasets = fixtureDatasets.map((d) => (d.id === 'launch-vehicles' ? dud : d))
    const { state, events } = step(init(configWith({ ...goodDesign, launch_vehicle: 'dud' }), datasets), [launch], DAY)
    expect(state.status).toBe('ended')
    expect(state.metrics.outcome).toBe('launch_failure')
    expect(events.at(-1)?.type).toBe('scenario_ended')
    expect(String(summary(state).why)).toMatch(/launch failed/)
  })

  it('locks the design after launch and does nothing once ended', () => {
    const launched = step(init(calm(), fixtureDatasets), [launch], DAY).state
    const { state, events } = step(launched, [setParam('bus', 'large-bus')], DAY)
    expect(state.params.bus).toBe('smallsat')
    expect(events.some((e) => e.type === 'warning')).toBe(true)
    const ended = run(state, 400).state
    expect(step(ended, [launch], DAY)).toEqual({ state: ended, events: [] })
  })
})

describe('summary', () => {
  it('scores a clean success highly and reports the numbers', () => {
    const { state } = run(init(calm(), fixtureDatasets), 400, DAY, [launch])
    const report = simCore.summary(state)
    expect(report.outcome).toBe('success')
    expect(report.score).toBeGreaterThanOrEqual(80)
    expect(report.data_downlinked_gb).toBeCloseTo(120 * 365)
    expect(String(report.why)).toMatch(/Mission success/)
  })

  it('works before launch', () => {
    const report = summary(init(demoConfig, fixtureDatasets))
    expect(report.outcome).toBe('in_design')
    expect(report.score).toBe(0)
  })
})
