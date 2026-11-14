// Sim core tests against the real catalogs and demo scenario from data/.
// Every expected number can be worked out by hand from data/catalogs/*.json; the comments show how.
// `calm()` is data/'s reference design (goodDesign) with random failures off.

import { describe, expect, it, vi } from 'vitest'
import type { Command, Config, Dataset, ParamValue, SimEvent, SimState } from '../shared'
import { init, simCore, step, summary, uptimeAt } from './index'
import { demoConfig, fixtureDatasets, goodDesign } from './testing/fixtures'

const DAY = 86400
const YEAR = 31557600

function configWith(params: Record<string, ParamValue>, base: Config = demoConfig): Config {
  return { ...base, params: { ...base.params, ...params } }
}
/** The reference design in sandbox mode: no random failures, so results can be checked by hand. */
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
const codes = (state: SimState) => state.issues.map((issue) => issue.code).sort()
const issueCodes = (params: Record<string, ParamValue>, datasets = fixtureDatasets) => codes(init(calm(params), datasets))

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

/** The catalogs with extra rows in one table. */
function withRows(datasetId: string, rows: (ParamValue | null)[][]): Dataset[] {
  return fixtureDatasets.map((d) =>
    d.id === datasetId && d.kind === 'table' ? { ...d, data: { ...d.data, rows: [...d.data.rows, ...rows] } } : d,
  )
}

/** The catalogs with one more column in one table. Rows not listed get null (= the column is missing for them). */
function withColumn(datasetId: string, column: string, values: Record<string, number>, datasets = fixtureDatasets): Dataset[] {
  return datasets.map((d) =>
    d.id === datasetId && d.kind === 'table'
      ? { ...d, data: { columns: [...d.data.columns, column], rows: d.data.rows.map((row) => [...row, values[String(row[0])] ?? null]) } }
      : d,
  )
}

describe('init', () => {
  it('turns the six data/ catalogs into entities, with the columns untouched', () => {
    const state = init(demoConfig, fixtureDatasets)
    const ids = (kind: string) => state.entities.filter((e) => e.kind === kind).map((e) => e.id)
    expect(ids('launch_vehicle')).toEqual(['rideshare', 'electron', 'pegasus-xl', 'falcon-9', 'vulcan-centaur', 'sls-block-1'])
    expect(ids('orbit')).toEqual(['leo-iss', 'sso', 'geo', 'lunar'])
    expect(ids('bus')).toContain('cubesat-12u') // from the "spacecraft-buses" dataset
    expect(ids('power_system')).toHaveLength(9) // solar arrays, the RTG and batteries share one catalog
    expect(ids('comms_system')).toHaveLength(5)
    expect(ids('instrument')).toHaveLength(10)

    const part = (id: string) => state.entities.find((e) => e.id === id)!
    expect(part('x-band-transmitter').props.data_rate_bps).toBe(50_000_000)
    expect(part('rideshare').props.payload_sso_kg).toBe(200)
    expect(part('cubesat-6u').props.dry_mass_kg).toBe(7)
    expect(part('battery-small').props.type).toBe('battery')
    expect(part('sso').props.altitude_m).toBe(600_000)
    expect(part('sso').props.altitude_km).toBe(600) // added for the mission view
    expect(part('sso').name).toBe('Sun-synchronous orbit')
  })

  it('starts in the design phase with the scenario design and its problems', () => {
    const state = init(demoConfig, fixtureDatasets)
    expect(state.metrics.phase).toBe('design')
    expect(state.t_s).toBe(0)
    expect(state.params.bus).toBe('cubesat-6u')
    expect(state.params.mission_duration_s).toBe(31_536_000)
    expect(state.metrics.science_goal).toBe(30) // the scenario's target_science_score
    expect(state.metrics.mission_days).toBe(365)
    // It can launch (no errors), but: no thruster, a slow radio, and so not enough science.
    expect(codes(state)).toEqual(['downlink_short', 'no_station_keeping', 'science_short'])
    expect(state.issues.every((issue) => issue.severity === 'warning')).toBe(true)
  })

  it('asks for every required part when nothing is picked (the battery is optional)', () => {
    const empty = configWith({ launch_vehicle: '', orbit: '', bus: '', instruments: '', solar: '', battery: '', comms: '' })
    expect(codes(init(empty, fixtureDatasets))).toEqual(
      ['missing_bus', 'missing_comms', 'missing_instrument', 'missing_launch_vehicle', 'missing_orbit', 'missing_solar'],
    )
  })

  it('computes the budgets for the reference design', () => {
    const state = init(calm(), fixtureDatasets)
    const m = state.metrics
    expect(state.issues).toEqual([])
    // Mass: 14 bus + 0.4 camera + 3 spectrometer + 2 wings + 0.3 battery + 2 radio.
    expect(m.mass_kg).toBeCloseTo(21.7)
    expect(m.mass_limit_kg).toBe(200) // rideshare payload_sso_kg
    expect(m.added_mass_kg).toBeCloseTo(7.7)
    expect(m.added_mass_limit_kg).toBe(9)
    expect(m.payload_mass_kg).toBeCloseTo(3.4)
    expect(m.instrument_count).toBe(2)
    expect(m.instrument_limit).toBe(3)
    // Power: 8 bus + 30 radio + 2.5 + 6 instruments, against 80 W x (1 - 0.35 eclipse).
    expect(m.power_w).toBeCloseTo(46.5)
    expect(m.power_available_w).toBeCloseTo(52)
    expect(m.instrument_uptime).toBe(1)
    // Battery: 46.5 W x 0.35 x 5800 s / 3600.
    expect(m.battery_needed_wh).toBeCloseTo(26.2208, 3)
    expect(m.battery_wh).toBe(40)
    // Cost: 2.5M + 0.15M + 3M + 0.4M + 0.02M + 0.8M parts, 300,000 + 6,000/kg x 21.7 kg launch.
    expect(m.build_cost_usd).toBeCloseTo(6_870_000)
    expect(m.launch_cost_usd).toBeCloseTo(430_200)
    expect(m.cost_usd).toBeCloseTo(7_300_200)
    expect(m.budget_usd).toBe(8_000_000)
    // Data: (2 Mbps x 0.1 + 5 Mbps x 0.2) x 86400 s = 103.68 Gbit; radio 50 Mbps x 3000 s = 150 Gbit.
    expect(m.data_generated_gb_per_day).toBeCloseTo(12.96)
    expect(m.downlink_gb_per_day).toBeCloseTo(18.75)
    expect(m.data_rate_bps).toBe(50_000_000)
    expect(m.link_factor).toBe(1)
    expect(m.storage_gb).toBeCloseTo(12.96) // no storage column: one day of observations
    // Science: 10 + 30 points over the 365-day mission, all of it expected home.
    expect(m.science_per_day).toBeCloseTo(40 / 365)
    expect(m.science_expected).toBeCloseTo(40)
    expect(m.science_score).toBeCloseTo(40) // in design this shows the forecast
    expect(m.delta_v_ms).toBe(60)
    expect(m.delta_v_required_ms).toBe(20)
    expect(m.launch_reliability).toBe(0.97)
    expect(m.bus_reliability).toBeCloseTo(0.87 ** 1.5) // sso radiation_factor 1.5
    expect(m.lifetime_days).toBe(365)
  })

  it('leaves the old optional features off when data/ has no column or key for them', () => {
    const m = init(calm(), fixtureDatasets).metrics
    expect(m.cruise_days).toBe(0)
    expect(m.schedule_months).toBe(0)
    expect(m.deadline_months).toBe(0)
    expect(m.ops_cost_usd).toBe(0)
    expect(m.ground_stations).toBe(1)
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

  it('never calls Math.random or Date.now', () => {
    const random = vi.spyOn(Math, 'random')
    const now = vi.spyOn(Date, 'now')
    run(init(configWith({ ...goodDesign, event_rate_per_day: 0.05 }), fixtureDatasets), 400, DAY, [launch])
    expect(random).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('applies set_param, keeps time still, and reports limits being crossed', () => {
    const state = init(calm(), fixtureDatasets)
    // The 15 kg microwave sounder: 22.7 kg bolted on (limit 9), and it needs a smallsat-class bus.
    const { state: next, events } = step(state, [setParam('instruments', 'camera-basic,ir-spectrometer,microwave-sounder')], DAY)
    expect(next.t_s).toBe(0)
    expect(next.tick).toBe(1)
    expect(next.metrics.added_mass_kg).toBeCloseTo(22.7)
    expect(next.metrics.mass_kg).toBeCloseTo(36.7)
    expect(codes(next)).toEqual(expect.arrayContaining(['added_mass_over_bus', 'bus_too_small']))
    expect(next.issues.find((issue) => issue.code === 'bus_too_small')?.message).toBe(
      'Microwave sounder is too big for 12U CubeSat. You need at least a smallsat-class bus, or smaller parts.',
    )
    expect(events[0].type).toBe('scenario_started')
    const crossed = events.find((e) => e.type === 'threshold_crossed')
    expect(crossed?.type === 'threshold_crossed' && crossed.payload).toMatchObject({ metric: 'added_mass_kg', threshold: 9, direction: 'up' })
    expect(state.params.instruments).toBe(goodDesign.instruments)

    const back = step(next, [setParam('instruments', 'camera-basic,ir-spectrometer')], DAY)
    expect(back.state.issues).toEqual([])
    expect(back.events.find((e) => e.type === 'threshold_crossed')?.payload).toMatchObject({ metric: 'added_mass_kg', direction: 'down' })
  })

  it('refuses to launch a design with errors and says why', () => {
    const state = init(calm({ orbit: 'geo' }), fixtureDatasets) // the rideshare only goes to sun-synchronous orbit
    const { state: next, events } = step(state, [launch], DAY)
    expect(next.metrics.phase).toBe('design')
    expect(next.t_s).toBe(0)
    expect(codes(next)).toContain('orbit_unreachable')
    const warning = events.find((e) => e.type === 'warning')
    expect(warning?.type === 'warning' && warning.payload.message).toMatch(/Not ready to launch.*cannot reach Geostationary orbit/)
  })

  it('blocks launch for each hard limit in the catalogs', () => {
    expect(issueCodes({})).toEqual([])
    // Falcon 9 alone costs $70M of the $8M budget.
    expect(issueCodes({ launch_vehicle: 'falcon-9' })).toEqual(['over_budget'])
    // GEO needs a 1,500 m/s burn; the 12U CubeSat has 60 m/s.
    expect(issueCodes({ launch_vehicle: 'falcon-9', orbit: 'geo', budget_usd: 0 })).toContain('delta_v_short')
    // 7.7 kg of parts on a bus that carries 4 kg.
    expect(issueCodes({ bus: 'cubesat-6u' })).toContain('added_mass_over_bus')
    // Four instruments on a bus with room for three (8.4 kg still fits).
    expect(issueCodes({ instruments: 'camera-basic,ir-spectrometer,magnetometer,radiation-detector' })).toEqual(
      expect.arrayContaining(['too_many_instruments']),
    )
    // A 300 kg spacecraft on a rocket that lifts 200 kg: smallsat bus 120 + 25 + 25 + 8 + 2 + imager 25... use the numbers.
    const heavy = init(calm({ bus: 'smallsat', launch_vehicle: 'rideshare', instruments: 'multispectral-imager,microwave-sounder', solar: 'solar-array-medium', battery: 'battery-medium', budget_usd: 0 }), fixtureDatasets)
    expect(heavy.metrics.mass_kg).toBeCloseTo(120 + 25 + 15 + 25 + 8 + 2) // 195 kg
    expect(codes(heavy)).toContain('mass_margin_low') // 195 of 200 kg
    expect(issueCodes({ bus: 'medium-bus', budget_usd: 0 })).toContain('mass_over_limit') // 807.7 kg on a 200 kg rideshare
    // Body-mounted cells average 7 W x 0.65 = 4.55 W; the bus and radio alone need 38 W.
    expect(issueCodes({ solar: 'solar-body-panels' })).toContain('power_negative')
    expect(issueCodes({ bus: 'no-such-bus' })).toContain('unknown_bus')
    expect(issueCodes({ solar: 'battery-small' })).toContain('wrong_type_solar')
    expect(issueCodes({ instruments: 'camera-basic,nope' })).toContain('unknown_instrument')
  })

  it('warns, without blocking launch, when a choice costs performance', () => {
    const state = (params: Record<string, ParamValue>) => init(calm(params), fixtureDatasets)
    const ready = (s: SimState) => !s.issues.some((issue) => issue.severity === 'error')

    // No battery: instruments are off in shadow, 35% of each orbit.
    const noBattery = state({ battery: '' })
    expect(codes(noBattery)).toEqual(['battery_small', 'science_short']) // 40 x 0.65 = 26 of 30
    expect(noBattery.metrics.instrument_uptime).toBeCloseTo(0.65)
    expect(noBattery.metrics.science_expected).toBeCloseTo(40 * 0.65)
    expect(ready(noBattery)).toBe(true)

    // Small wings + S-band: 19.5 W for a 16 W base load and 8.5 W of instruments.
    const lowPower = state({ solar: 'solar-deployable-small', comms: 's-band-patch' })
    expect(codes(lowPower)).toContain('power_short')
    expect(lowPower.metrics.instrument_uptime).toBeCloseTo((19.5 - 16) / 8.5)
    expect(ready(lowPower)).toBe(true)

    // UHF is built for 1,000 km and the ground is 1,500 km away: (1000 / 1500)^2 of 9,600 bps.
    const uhf = state({ comms: 'uhf-radio' })
    expect(codes(uhf)).toEqual(expect.arrayContaining(['link_weak', 'downlink_short']))
    expect(uhf.metrics.link_factor).toBeCloseTo(4 / 9)
    expect(uhf.metrics.data_rate_bps).toBeCloseTo(9600 * (4 / 9))

    // The radiation detector is best in lunar orbit: 8 points become 4, so 10 + 4 < 30.
    const offOrbit = state({ instruments: 'camera-basic,radiation-detector' })
    expect(codes(offOrbit)).toEqual(['off_best_orbit', 'science_short'])
    expect(offOrbit.metrics.science_expected).toBeCloseTo(14)

    // A 6U CubeSat has no thruster and the orbit asks for 20 m/s: it flies, but drifts.
    const drifting = init(demoConfig, fixtureDatasets)
    expect(codes(drifting)).toContain('no_station_keeping')
    expect(ready(drifting)).toBe(true)
  })

  it('ends the mission early when the bus or the orbit does not last', () => {
    // A 4-year mission on a bus built for 3 years (94,672,800 s).
    const shortBus = init(calm({ mission_duration_s: 4 * YEAR }), fixtureDatasets)
    expect(codes(shortBus)).toContain('bus_life_short')
    expect(shortBus.metrics.lifetime_days).toBeCloseTo(94_672_800 / DAY)
    // ISS-like orbit lasts 2 years, halved to 1 for a bus that cannot station-keep (50 m/s needed, 6U has none).
    const decays = init(configWith({ launch_vehicle: 'electron', orbit: 'leo-iss', mission_duration_s: 2 * YEAR }), fixtureDatasets)
    expect(codes(decays)).toEqual(expect.arrayContaining(['no_station_keeping', 'orbit_life_short']))
    expect(decays.metrics.lifetime_days).toBeCloseTo(365.25)
  })

  it('writes messages a student can act on, with one issue per code', () => {
    const state = init(calm({ bus: 'cubesat-6u', comms: 'uhf-radio', battery: '', orbit: 'leo-iss', launch_vehicle: 'electron' }), fixtureDatasets)
    expect(state.issues.length).toBeGreaterThan(3)
    expect(new Set(codes(state)).size).toBe(state.issues.length)
    for (const issue of state.issues) {
      expect(issue.message, issue.code).toMatch(/^[A-Z0-9"].*\.$/)
      expect(['mass', 'power', 'budget', 'data', 'comms', 'time', 'design']).toContain(issue.resource)
    }
    expect(init(calm({ battery: '' }), fixtureDatasets).issues[0].message).toBe(
      'There is no battery, so the instruments will switch off in shadow (35% of each orbit). Add a battery that holds at least 26.2 Wh.',
    )
  })
})

describe('param aliases', () => {
  const stepWith = (...commands: Command[]) => step(init(calm(), fixtureDatasets), commands, DAY).state

  it('"power" from the builder sets solar, or battery when the part is a battery', () => {
    const solar = stepWith(setParam('power', 'solar-deployable-small'))
    expect(solar.params.solar).toBe('solar-deployable-small')
    expect(solar.params.battery).toBe('battery-small')
    expect(solar.metrics.power_available_w).toBeCloseTo(19.5)

    const battery = stepWith(setParam('power', 'battery-medium'))
    expect(battery.params.battery).toBe('battery-medium')
    expect(battery.params.solar).toBe('solar-deployable-large')
    expect(battery.metrics.battery_wh).toBe(1200)
  })

  it('keeps params.power in step with solar, because the builder reads it back', () => {
    expect(init(demoConfig, fixtureDatasets).params.power).toBe('solar-deployable-small')
    expect(stepWith(setParam('solar', 'solar-deployable-small')).params.power).toBe('solar-deployable-small')
  })

  it('accepts the old names power_system and comms_system', () => {
    const state = stepWith(setParam('power_system', 'solar-deployable-small'), setParam('comms_system', 's-band-patch'))
    expect(state.params.solar).toBe('solar-deployable-small')
    expect(state.params.comms).toBe('s-band-patch')
    expect(state.metrics.data_rate_bps).toBe(1_000_000)
  })

  it('reads aliases from Config.params only when the real key is unset', () => {
    const old = init(calm({ solar: '', comms: '', power_system: 'solar-deployable-large', comms_system: 'x-band-transmitter' }), fixtureDatasets)
    expect(old.issues).toEqual([])
    expect(old.metrics.power_available_w).toBeCloseTo(52)
    const both = init(calm({ power: 'solar-body-panels' }), fixtureDatasets)
    expect(both.params.solar).toBe('solar-deployable-large')
    expect(both.metrics.power_available_w).toBeCloseTo(52)
  })

  it('accepts the old scenario keys science_goal and mission_days', () => {
    const { target_science_score: _t, mission_duration_s: _d, ...rest } = calm().params
    const state = init({ ...demoConfig, params: { ...rest, science_goal: 12, mission_days: 100 } }, fixtureDatasets)
    expect(state.metrics.science_goal).toBe(12)
    expect(state.metrics.mission_days).toBe(100)
    // Without either key the mission length is Config.duration_s.
    expect(init({ ...demoConfig, params: rest }, fixtureDatasets).metrics.mission_days).toBe(365)
  })
})

describe('optional features switch on when the column or key exists', () => {
  it('schedule: build_months and deadline_months', () => {
    const datasets = withColumn('instruments', 'build_months', { 'ir-spectrometer': 8 }, withColumn('spacecraft-buses', 'build_months', { 'cubesat-12u': 10 }))
    const state = init(calm({ deadline_months: 11 }), datasets)
    expect(state.metrics.schedule_months).toBe(12) // slowest part 10 + 1 month per instrument x 2
    expect(codes(state)).toEqual(['behind_schedule'])
    expect(codes(init(calm({ deadline_months: 12 }), datasets))).toEqual([])
  })

  it('operations cost and ground stations', () => {
    const m = init(calm({ ops_cost_usd_per_day: 1000, ground_station_cost_usd_per_day: 500, ground_stations: 2 }), fixtureDatasets).metrics
    expect(m.ops_cost_usd_per_day).toBe(2000)
    expect(m.cost_usd).toBeCloseTo(7_300_200 + 2000 * 365)
    expect(m.downlink_gb_per_day).toBeCloseTo(37.5) // twice the contact time
  })

  it('cruise time comes out of the mission clock', () => {
    const datasets = withColumn('orbits', 'cruise_days', { sso: 5 })
    const { state, events } = run(init(calm(), datasets), 400, DAY, [launch])
    expect(state.metrics.cruise_days).toBe(5)
    expect(state.t_s).toBe(365 * DAY)
    expect(events.find((e) => e.type === 'phase_changed' && e.payload.to === 'operations')?.t_s).toBe(5 * DAY)
    expect(state.metrics.science_score).toBeCloseTo((40 * 360) / 365, 6)
  })

  it('on-board storage from a storage_gb column', () => {
    const datasets = withColumn('spacecraft-buses', 'storage_gb', { 'cubesat-12u': 100 })
    const { state } = run(init(calm({ comms: 's-band-patch' }), datasets), 400, DAY, [launch])
    expect(state.metrics.storage_gb).toBe(100)
    expect(state.metrics.data_stored_gb).toBe(100)
  })
})

describe('step: flying the mission', () => {
  it('goes design -> cruise -> operations -> ended and returns the science you can work out by hand', () => {
    const { state, events } = run(init(calm(), fixtureDatasets), 400, DAY, [launch])
    expect(events.filter((e) => e.type === 'phase_changed').map((e) => e.payload.to)).toEqual(['cruise', 'operations', 'ended'])
    expect(state.status).toBe('ended')
    expect(state.metrics.outcome).toBe('success')
    expect(state.tick).toBe(1 + 365) // the launch step, then one step per day
    expect(state.t_s).toBe(365 * DAY)
    expect(state.metrics.mission_day).toBe(365)
    expect(state.metrics.science_score).toBeCloseTo(40, 6)
    expect(state.metrics.data_generated_gb).toBeCloseTo(12.96 * 365, 6)
    expect(state.metrics.data_downlinked_gb).toBeCloseTo(12.96 * 365, 6)
    expect(state.metrics.data_lost_gb).toBe(0)
    expect(state.metrics.cost_spent_usd).toBeCloseTo(7_300_200)
    const ended = events.at(-1)
    expect(ended?.type === 'scenario_ended' && ended.payload.reason).toBe('success')
    // 30 of 40 points arrive three quarters of the way through: day 274.
    const goal = events.find((e) => e.type === 'threshold_crossed' && e.payload.metric === 'science_score')
    expect(goal?.t_s).toBe(274 * DAY)
    expect(state.utc).toBe('2028-01-01T00:00:00.000Z')
  })

  it('puts the orbited body and the spacecraft where the mission view looks for them', () => {
    const launched = step(init(calm(), fixtureDatasets), [launch], DAY)
    expect(launched.state.metrics.phase).toBe('cruise')
    expect(launched.events.filter((e) => e.type === 'entity_added').map((e) => e.payload.entity.id)).toEqual(['earth', 'spacecraft'])
    const flying = step(launched.state, [], DAY).state
    expect(flying.metrics.phase).toBe('operations')
    const body = flying.entities.find((e) => e.kind === 'body')!
    const craft = flying.entities.find((e) => e.kind === 'spacecraft')!
    expect(flying.entities.filter((e) => e.kind === 'body' || e.kind === 'spacecraft')).toHaveLength(2)
    expect(body).toMatchObject({ id: 'earth', name: 'Earth', position: [0, 0, 0], props: { radius_m: 6_371_000 } })
    expect(craft).toMatchObject({ id: 'spacecraft', name: 'Your spacecraft', props: { body: 'earth', orbit: 'sso', altitude_m: 600_000 } })
    expect(Math.hypot(...craft.position!)).toBeCloseTo(6_971_000, 0) // 600 km above a 6,371 km radius
    expect(flying.frame).toBe('body-centered')
  })

  it('loses science when the radio cannot keep up, and explains it', () => {
    const { state, events } = run(init(calm({ comms: 's-band-patch' }), fixtureDatasets), 400, DAY, [launch])
    expect(state.metrics.outcome).toBe('science_shortfall')
    // 0.375 of 12.96 GB a day gets home, so the same share of the 40 points does.
    expect(state.metrics.science_score).toBeCloseTo((40 * 0.375) / 12.96, 6)
    expect(state.metrics.data_downlinked_gb).toBeCloseTo(0.375 * 365, 6)
    expect(state.metrics.data_stored_gb).toBeCloseTo(12.96) // the recorder is full
    expect(state.metrics.data_lost_gb).toBeCloseTo(12.96 * 365 - 0.375 * 365 - 12.96, 6)
    const full = events.find((e) => e.type === 'threshold_crossed' && e.payload.metric === 'data_stored_gb')
    expect(full?.t_s).toBe(2 * DAY) // 12.585 GB left over each day fills 12.96 GB on day 2
    const report = summary(state)
    expect(report.grade).toBe('F')
    expect(String(report.why)).toMatch(/never reached the ground/)
    expect(String(report.why)).toMatch(/Pick a faster radio/)
  })

  it('fades with the solar panels: 3% less output each year', () => {
    // 72 W wings average 46.8 W, just over the 46.5 W load. One year later: 46.8 x 0.97 = 45.4 W.
    const datasets = withRows('power-systems', [['test-wings', 'Test wings', 'solar', 2, 400000, 72, 0, 0.03, 'cubesat', 'Barely enough.']])
    const design = init(calm({ solar: 'test-wings' }), datasets)
    expect(codes(design)).toEqual(['power_fades'])
    const flight = { base_load_w: 38, instrument_load_w: 8.5, power_available_w: 46.8, degradation_per_year: 0.03, shadow_uptime: 1 }
    expect(uptimeAt(flight, 0)).toBe(1)
    expect(uptimeAt(flight, 1)).toBeCloseTo((46.8 * 0.97 - 38) / 8.5) // 0.87

    let expected = 0
    for (let day = 0; day < 365; day++) expected += (40 / 365) * uptimeAt(flight, (day * DAY) / YEAR)
    const { state } = run(design, 400, DAY, [launch])
    expect(state.metrics.science_score).toBeCloseTo(expected, 6)
    expect(Number(state.metrics.science_score)).toBeLessThan(40)
    expect(Number(state.metrics.science_score)).toBeGreaterThan(40 * 0.87)
  })

  it('stops at the end of the bus design life', () => {
    const { state, events } = run(init(calm({ mission_duration_s: 4 * YEAR, target_science_score: 35 }), fixtureDatasets), 2000, DAY, [launch])
    expect(state.t_s).toBe(94_672_800) // 3 years
    expect(state.metrics.outcome).toBe('science_shortfall')
    expect(state.metrics.science_score).toBeCloseTo(30, 6) // three quarters of 40
    expect(events.some((e) => e.type === 'warning' && /design life/.test(e.payload.message))).toBe(true)
  })

  it('gives the same result for one big step as for many small ones', () => {
    const launched = step(init(calm({ comms: 's-band-patch' }), fixtureDatasets), [launch], DAY).state
    const daily = run(launched, 400, DAY).state
    const once = step(launched, [], 1000 * DAY).state
    const fine = run(launched, 2000, DAY / 4).state
    for (const other of [once, fine]) {
      expect(other.status).toBe('ended')
      expect(other.t_s).toBeCloseTo(daily.t_s)
      expect(other.metrics.science_score).toBeCloseTo(Number(daily.metrics.science_score), 6)
      expect(other.metrics.data_lost_gb).toBeCloseTo(Number(daily.metrics.data_lost_gb), 6)
    }
  })

  it('is deterministic for a seed and changes with the seed', () => {
    const risky = (seed: number) => ({ ...configWith({ ...goodDesign, event_rate_per_day: 0.05 }), seed })
    const fly = (seed: number) => run(init(risky(seed), fixtureDatasets), 400, DAY, [launch])
    expect(JSON.stringify(fly(7))).toBe(JSON.stringify(fly(7)))
    const outcomes = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(fly(seed).state.metrics)))
    expect(outcomes.size).toBeGreaterThan(1)
  })

  it('fails at launch on a launch vehicle that never works', () => {
    const datasets = withRows('launch-vehicles', [['dud', 'Dud', 'test', 9000, 9000, 9000, 9000, 1_000_000, 0, 0, 'Never works.']])
    const { state, events } = step(init(configWith({ ...goodDesign, launch_vehicle: 'dud' }), datasets), [launch], DAY)
    expect(state.status).toBe('ended')
    expect(state.metrics.outcome).toBe('launch_failure')
    expect(events.at(-1)?.type).toBe('scenario_ended')
    expect(String(summary(state).why)).toMatch(/launch failed/)
    // Sandbox mode ignores reliability.
    const sandbox = step(init(calm({ launch_vehicle: 'dud' }), datasets), [launch], DAY).state
    expect(sandbox.metrics.phase).toBe('cruise')
  })

  it('loses the spacecraft on a bus that never survives', () => {
    const datasets = withRows('spacecraft-buses', [['lemon', 'Lemon', 'cubesat', 14, 9, 3, 8, 60, 2_500_000, 94_672_800, 0, 'Always breaks.']])
    const config = { ...configWith({ ...goodDesign, bus: 'lemon', launch_vehicle: 'falcon-9', budget_usd: 0 }), seed: 3 }
    const { state } = run(init(config, datasets), 10, DAY, [launch])
    expect(state.metrics.outcome).toBe('spacecraft_failure')
    expect(state.t_s).toBe(DAY)
    expect(String(summary(state).why)).toMatch(/failed on day 1 of 365/)
  })

  it('locks the design after launch and does nothing once ended', () => {
    const launched = step(init(calm(), fixtureDatasets), [launch], DAY).state
    const { state, events } = step(launched, [setParam('bus', 'smallsat'), launch], DAY)
    expect(state.params.bus).toBe('cubesat-12u')
    expect(events.filter((e) => e.type === 'warning')).toHaveLength(2)
    const ended = run(state, 400).state
    expect(step(ended, [launch], DAY)).toEqual({ state: ended, events: [] })
  })
})

describe('summary', () => {
  it('scores a clean success highly and reports the numbers', () => {
    const { state } = run(init(calm(), fixtureDatasets), 400, DAY, [launch])
    const report = simCore.summary(state)
    // 70 science + 10 launch margin + 10 data + 10 x (8.7% budget left / 20%) = 94.
    expect(report).toMatchObject({ outcome: 'success', score: 94, grade: 'A', science_goal: 30, budget_usd: 8_000_000, mass_limit_kg: 200, data_lost_gb: 0, mission_days_flown: 365 })
    expect(report.science_score).toBeCloseTo(40, 6)
    expect(report.cost_usd).toBeCloseTo(7_300_200)
    expect(report.mass_kg).toBeCloseTo(21.7)
    expect(report.data_downlinked_gb).toBeCloseTo(12.96 * 365, 6)
    expect(report.why).toBe('Mission success: you returned 40 science points and needed 30. You finished $700K under budget.')
  })

  it('works before launch, without counting the forecast as science', () => {
    const state = init(calm(), fixtureDatasets)
    expect(state.metrics.science_score).toBeCloseTo(40)
    const report = summary(state)
    expect(report.outcome).toBe('in_design')
    expect(report.score).toBe(0)
    expect(report.science_score).toBe(0)
  })
})
