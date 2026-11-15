import { describe, expect, it } from 'vitest'
import { missionFacts, subPoint } from './screens'

describe('mission control screens', () => {
  const { orbit, slots, calls, budgets, program } = missionFacts()

  it('traces a sun-synchronous ground track', () => {
    const at = (orbits: number) => subPoint(orbits * orbit.period_s, orbit.inclination_rad, orbit.period_s, -50, { lat: 0, lon: 0 })
    expect(at(0)).toEqual({ lat: 0, lon: -50 })
    // A retrograde orbit tops out at 180° minus its inclination and heads west from the start.
    expect(at(0.25).lat).toBeCloseTo(180 - (orbit.inclination_rad * 180) / Math.PI, 5)
    expect(at(0.01).lon).toBeLessThan(-50)
    // One orbit later the ground has turned by period / solar day.
    expect(at(1).lat).toBeCloseTo(0, 5)
    expect(at(1).lon).toBeCloseTo(-50 - (360 * orbit.period_s) / 86400, 5)
    expect(Math.abs(at(7.3).lon)).toBeLessThanOrEqual(180)
  })

  it('prints the first mission as the catalog and the sim have it', () => {
    expect(slots.map((s) => s.slot)).toEqual(['Orbit', 'Rocket', 'Bus', 'Instruments', 'Radio', 'Power', 'Battery'])
    expect(slots.every((s) => s.part !== 'Not picked' && s.figure)).toBe(true)
    expect(calls.map((c) => c.label)).toEqual(['PLAN', 'SPACECRAFT', 'SCIENCE', 'COMMS'])
    expect(budgets.mass_kg).toBeLessThan(budgets.mass_limit_kg)
    expect(program.map((m) => m.body)).toEqual(['earth', 'moon', 'mars'])
  })
})
