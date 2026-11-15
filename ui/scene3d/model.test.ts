import { describe as group, expect, it } from 'vitest'
import type { Entity, Params } from '../../shared'
import { getDatasets, getScenario } from '../../data'
import { init, step } from '../../sim'
import { antennaOf, busSize, describe, lapSeconds, orbitRadius, sceneSpec, stormGlow, wingSpan } from './model'

const e = (kind: string, id: string, name: string, props: Params = {}): Entity => ({ id, kind, name, props })
const entities: Entity[] = [
  e('orbit', 'sso', 'Sun-synchronous orbit', { central_body: 'earth', altitude_m: 600_000, inclination_rad: 1.7064, period_s: 5800 }),
  e('orbit', 'lunar', 'Low lunar orbit', { central_body: 'moon', altitude_m: 100_000, inclination_rad: 1.5708, period_s: 7080 }),
  e('bus', 'cubesat-6u', '6U CubeSat', { class: 'cubesat', dry_mass_kg: 7 }),
  e('bus', 'smallsat', 'Small satellite (ESPA-class)', { class: 'smallsat', dry_mass_kg: 120 }),
  e('power_system', 'solar-deployable-small', 'Small deployable solar wings', { type: 'solar', power_w: 30 }),
  e('power_system', 'rtg', 'Radioisotope power system (MMRTG)', { type: 'rtg', power_w: 110 }),
  e('comms_system', 's-band-patch', 'S-band patch antenna', { band: 'S' }),
  e('comms_system', 'high-gain-dish', 'High-gain dish antenna', { band: 'Ka' }),
  e('instrument', 'camera-basic', 'Basic Earth camera', { category: 'imager' }),
  e('instrument', 'magnetometer', 'Magnetometer', { category: 'fields' }),
]

group('sceneSpec', () => {
  it('builds the craft from the picked parts', () => {
    const params: Params = { orbit: 'sso', bus: 'cubesat-6u', solar: 'solar-deployable-small', comms: 's-band-patch', instruments: 'camera-basic,magnetometer' }
    const spec = sceneSpec({ entities, params })
    expect(spec.body).toBe('earth')
    expect(spec.altitude_m).toBe(600_000)
    expect(spec.craft).toMatchObject({ bus: [0.2263, 0.366, 0.1], cubesat: true, power: 'wings', antenna: 'patch', instruments: ['lens', 'boom'] })
    expect(describe(spec)).toBe(
      '3D view: 6U CubeSat with Small deployable solar wings, S-band patch antenna, 2 instruments (Basic Earth camera, Magnetometer), in Sun-synchronous orbit, 600 km above Earth.',
    )
  })

  it('passes the picked catalog rows to the part models', () => {
    const pack = e('power_system', 'battery-small', 'Small battery pack', { type: 'battery', capacity_wh: 40 })
    const spec = sceneSpec({ entities: [...entities, pack], params: { bus: 'smallsat', solar: 'rtg', battery: 'battery-small', comms: 'high-gain-dish', instruments: 'magnetometer,nope,camera-basic' } })
    const { parts } = spec.craft
    expect([parts?.bus?.id, parts?.solar?.id, parts?.battery?.id, parts?.comms?.id]).toEqual(['smallsat', 'rtg', 'battery-small', 'high-gain-dish'])
    expect(parts?.instruments.map((i) => i.id)).toEqual(['magnetometer', 'camera-basic'])
    expect(spec.names.battery).toBe('Small battery pack')
    // A battery id in the solar slot is not a battery pick, and unknown ids are dropped.
    expect(sceneSpec({ entities, params: { battery: 'nope' } }).craft.parts).toMatchObject({ instruments: [] })
  })

  it('switches body, power and antenna', () => {
    const spec = sceneSpec({ entities, params: { orbit: 'lunar', bus: 'smallsat', solar: 'rtg', comms: 'high-gain-dish' } })
    expect(spec.body).toBe('moon')
    expect(spec.craft.cubesat).toBe(false)
    expect(spec.craft.power).toBe('rtg')
    expect(spec.craft.antenna).toBe('dish')
  })

  it('falls back to a plain craft when nothing is picked', () => {
    const spec = sceneSpec({ entities: [], params: {} })
    expect(spec).toMatchObject({ body: 'earth', altitude_m: 500_000, craft: { power: 'none', antenna: 'none', instruments: [] } })
    expect(describe(spec)).toBe('3D view: your spacecraft, 500 km above Earth.')
  })
})

group('helpers', () => {
  it('sizes buses and wings', () => {
    expect(busSize(e('bus', 'cubesat-3u', '3U CubeSat', { class: 'cubesat' })).size).toEqual([0.1, 0.3405, 0.1])
    // MAVEN's 2.3 m bus at 809 kg, scaled to 800 kg.
    expect(busSize(e('bus', 'medium-bus', 'Medium spacecraft', { dry_mass_kg: 800 })).size[0]).toBeCloseTo(2.291, 2)
    expect(busSize(e('bus', 'smallsat', 'Small satellite', { class: 'smallsat', dry_mass_kg: 201 })).size).toEqual([0.95, 1.09, 0.76])
    expect(busSize(undefined).size).toEqual([0.2263, 0.366, 0.1])
    expect(wingSpan(7)).toBe(0.8)
    expect(wingSpan(1e9)).toBe(3.6)
    expect(wingSpan(1000)).toBeCloseTo(2.3, 5)
  })

  it('picks antennas from band and name', () => {
    expect(antennaOf(e('comms_system', 'uhf-radio', 'UHF radio', { band: 'UHF' })).antenna).toBe('whip')
    expect(antennaOf(e('comms_system', 'x-band-transmitter', 'X-band transmitter', { band: 'X' }))).toEqual({ antenna: 'dish', dishSize: 0.55 })
  })

  it('keeps every orbit on screen and in order', () => {
    const leo = orbitRadius({ body: 'earth', altitude_m: 400_000 })
    const geo = orbitRadius({ body: 'earth', altitude_m: 35_786_000 })
    expect(leo).toBeGreaterThan(1.2)
    expect(geo).toBeGreaterThan(leo)
    expect(geo).toBeLessThan(3)
    expect(lapSeconds(86164)).toBeGreaterThan(lapSeconds(5550))
  })
})

group('stormGlow', () => {
  it('is off without flight metrics, in the design phase and on a quiet day', () => {
    expect(stormGlow({ params: { real_storms: '0:5' } })).toBe(0) // screens that pass only entities and params
    expect(stormGlow({ params: { real_storms: '0:5' }, metrics: { phase: 'design', mission_day: 0 } })).toBe(0)
    expect(stormGlow({ params: { real_storms: '13:3,28:5' }, metrics: { phase: 'operations', mission_day: 12.9 } })).toBe(0)
    expect(stormGlow({ params: {}, metrics: { phase: 'operations', mission_day: 13 } })).toBe(0)
  })

  it('follows the real storm of the day, stronger for a higher NOAA level', () => {
    const params = { real_storms: '13:3,28:5,113:4' }
    const on = (mission_day: number) => stormGlow({ params, metrics: { phase: 'operations', mission_day } })
    expect(on(13.4)).toBeCloseTo(0.6)
    expect(on(28)).toBe(1)
    expect(on(113.99)).toBeCloseTo(0.8)
    expect(on(3)).toBe(0) // day 3 is not day 13 or 113
  })

  it('is on while the storm card waits: the real level, or G3 for a card that is not from real data', () => {
    const card = { phase: 'operations', mission_day: 40.2, decision_card: 'geomagnetic-storm', decision_id: 'geomagnetic-storm-28' }
    expect(stormGlow({ params: { real_storms: '13:3,28:5' }, metrics: card })).toBe(1) // the card's own day, not today
    expect(stormGlow({ params: {}, metrics: { ...card, decision_id: 'geomagnetic-storm-40' } })).toBeCloseTo(0.6)
    expect(stormGlow({ params: {}, metrics: { ...card, decision_card: 'reaction-wheel', decision_id: 'reaction-wheel-40' } })).toBe(0)
  })

  it('reads the state the real sim makes when a real storm hits', () => {
    const demo = getScenario('demo')!
    // 1 Oct 2003 launch: the first strong storm (G3) is on 14 Oct, mission day 13 (sim/real-storms.test.ts).
    const config = { ...demo, params: { ...demo.params, random_failures: false, anomaly_cards: 0, weather_start: '2003-10-01', real_storms: '13:3,28:5' } }
    let state = init(config, getDatasets(demo.datasets))
    expect(stormGlow(state)).toBe(0)
    state = step(state, [{ type: 'launch', payload: {} }], config.dt_s).state
    for (let i = 0; state.status !== 'ended' && !state.metrics.decision_id && i < 2000; i++) {
      expect(stormGlow(state)).toBe(0)
      state = step(state, [], config.dt_s).state
    }
    expect(state.metrics.decision_card).toBe('geomagnetic-storm')
    expect(stormGlow(state)).toBeCloseTo(0.6)
  })
})
