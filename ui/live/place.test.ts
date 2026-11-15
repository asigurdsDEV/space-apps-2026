import { describe, expect, it } from 'vitest'
import { parseCoords } from './place'

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
