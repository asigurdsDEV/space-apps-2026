import { describe, expect, it } from 'vitest'
import { subsolarPoint, sunDirection } from './sun'

describe('real Sun position', () => {
  it('is over the equator near Greenwich at noon UTC on the March equinox', () => {
    const [lat, lon] = subsolarPoint(new Date('2026-03-20T12:00:00Z'))
    expect(Math.abs(lat)).toBeLessThan(1)
    expect(Math.abs(lon)).toBeLessThan(3)
    const [x, y, z] = sunDirection(new Date('2026-03-20T12:00:00Z'))
    expect(x).toBeGreaterThan(0.99)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9)
  })
  it('is over the northern tropic in June and the southern in December', () => {
    expect(subsolarPoint(new Date('2026-06-21T12:00:00Z'))[0]).toBeCloseTo(23.44, 0)
    expect(subsolarPoint(new Date('2026-12-21T12:00:00Z'))[0]).toBeCloseTo(-23.44, 0)
  })
  it('moves west 15 degrees an hour: midnight UTC puts noon on the date line, 18:00 UTC over the Americas', () => {
    expect(Math.abs(subsolarPoint(new Date('2026-06-21T00:00:00Z'))[1])).toBeGreaterThan(177)
    expect(subsolarPoint(new Date('2026-06-21T18:00:00Z'))[1]).toBeCloseTo(-90, -1)
    expect(sunDirection(new Date('2026-06-21T18:00:00Z'))[2]).toBeGreaterThan(0.8) // west is +Z in the map frame
  })
})
