import { describe, expect, it } from 'vitest'
import { BODY_DAY_S, flightPlan, groundTrack, trackLines, trackRevs, westShift } from './wall'

describe('ground track', () => {
  const ISS = { i: 0.9006, T: 5550 }

  it('reaches as far north and south as the orbit is tilted, and each pass crosses the equator further west', () => {
    const track = groundTrack(ISS.i, ISS.T, BODY_DAY_S.earth, 2, 96, 10)
    const lats = track.map((p) => p[1])
    expect(Math.max(...lats)).toBeCloseTo(51.6, 0)
    expect(Math.min(...lats)).toBeCloseTo(-51.6, 0)
    expect(track[0]).toEqual([10, 0])
    expect(track[96]![1]).toBeCloseTo(0)
    expect(track[96]![0]).toBeCloseTo(10 - westShift(ISS.T, BODY_DAY_S.earth))
    expect(westShift(ISS.T, BODY_DAY_S.earth)).toBeCloseTo(23.2, 1)
  })

  it('a geostationary orbit stays over one spot; a polar orbit passes over the poles', () => {
    for (const [lon, lat] of groundTrack(0, BODY_DAY_S.earth, BODY_DAY_S.earth, 1, 24, -75)) {
      expect(lon).toBeCloseTo(-75)
      expect(lat).toBeCloseTo(0)
    }
    expect(Math.max(...groundTrack(Math.PI / 2, 7080, BODY_DAY_S.moon, 1).map((p) => p[1]))).toBeCloseTo(90, 0)
  })

  it('stays on the map and is cut where it wraps round the edge', () => {
    const track = groundTrack(1.7064, 5800, BODY_DAY_S.earth, 3)
    for (const [lon, lat] of track) {
      expect(lon).toBeGreaterThanOrEqual(-180)
      expect(lon).toBeLessThan(180)
      expect(Math.abs(lat)).toBeLessThanOrEqual(90)
    }
    const lines = trackLines(track)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) for (let k = 1; k < line.length; k++) expect(Math.abs(line[k]![0] - line[k - 1]![0])).toBeLessThan(180)
  })

  it('draws three passes for a low orbit and more where the body turns slowly', () => {
    expect(trackRevs(5550, BODY_DAY_S.earth)).toBe(3)
    expect(trackRevs(7080, BODY_DAY_S.moon)).toBe(14)
  })
})

describe('flight plan', () => {
  it('build, cruise and science in order, with the launch and end days', () => {
    const plan = flightPlan({ schedule_months: 37, deadline_months: 48, cruise_days: 210, mission_days: 1095 }, '2028-10-01T00:00:00Z')
    expect(plan.phases.map((p) => p.label)).toEqual(['Build', 'Cruise', 'Science'])
    expect(plan.phases[1]!.days).toBe(210)
    expect(plan.phases[2]!.days).toBe(885)
    expect(plan.launch).toBe('2028-10-01')
    expect(plan.end).toBe('2031-10-01')
    expect(plan.deadline_months).toBe(48)
  })

  it('no cruise near Earth, no dates without a start', () => {
    const plan = flightPlan({ schedule_months: 10, cruise_days: 0, mission_days: 365 })
    expect(plan.phases.map((p) => p.label)).toEqual(['Build', 'Science'])
    expect(plan.launch).toBeUndefined()
    expect(plan.deadline_months).toBe(0)
  })
})
