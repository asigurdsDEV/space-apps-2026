import { describe as group, expect, it } from 'vitest'
import type { Entity, Params } from '../../shared'
import { antennaOf, busSize, describe, lapSeconds, orbitRadius, sceneSpec, wingSpan } from './model'

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
    expect(spec.craft).toMatchObject({ bus: [0.2, 0.34, 0.1], cubesat: true, power: 'wings', antenna: 'patch', instruments: ['lens', 'boom'] })
    expect(describe(spec)).toBe(
      '3D view: 6U CubeSat with Small deployable solar wings, S-band patch antenna, 2 instruments (Basic Earth camera, Magnetometer), in Sun-synchronous orbit, 600 km above Earth.',
    )
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
    expect(busSize(e('bus', 'cubesat-3u', '3U CubeSat', { class: 'cubesat' })).size).toEqual([0.1, 0.34, 0.1])
    expect(busSize(e('bus', 'medium-bus', 'Medium spacecraft', { dry_mass_kg: 800 })).size[0]).toBeCloseTo(1.387, 2)
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
