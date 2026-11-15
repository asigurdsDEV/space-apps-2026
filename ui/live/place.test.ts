import { describe, expect, it } from 'vitest'
import { distanceKm, parseCoords, tripTime } from './place'

describe('parseCoords', () => {
  it('reads signed pairs and N/S/E/W', () => {
    expect(parseCoords('40.7, -74.0')).toEqual({ lat: 40.7, lon: -74 })
    expect(parseCoords(' 40.7 -74 ')).toEqual({ lat: 40.7, lon: -74 })
    expect(parseCoords('33.9°S 151.2°E')).toEqual({ lat: -33.9, lon: 151.2 })
    expect(parseCoords('40.7N, 74.0W')).toEqual({ lat: 40.7, lon: -74 })
  })
  it('leaves addresses and out-of-range numbers alone', () => {
    expect(parseCoords('1600 Pennsylvania Ave')).toBeNull()
    expect(parseCoords('91, 10')).toBeNull()
    expect(parseCoords('10, 181')).toBeNull()
  })
})

describe('distanceKm and tripTime', () => {
  it('is the height straight overhead and grows with ground distance', () => {
    expect(distanceKm({ lat: 10, lon: 20, altKm: 420 }, { lat: 10, lon: 20 })).toBeCloseTo(420, 6)
    // A quarter of the way round: the chord between radius R+h and R at 90°.
    const r = 6378.137
    expect(distanceKm({ lat: 0, lon: 0, altKm: 400 }, { lat: 0, lon: 90 })).toBeCloseTo(Math.hypot(r + 400, r), 6)
  })
  it('reads seconds, minutes and hours', () => {
    expect(tripTime(42.4)).toBe('42 s')
    expect(tripTime(12 * 60)).toBe('12 min')
    expect(tripTime(65 * 60)).toBe('1 h 05 min')
  })
})
