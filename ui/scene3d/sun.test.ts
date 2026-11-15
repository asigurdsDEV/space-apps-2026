import { describe, expect, it } from 'vitest'
import { earthOrientation, subsolarPoint, sunDirection } from './sun'

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
  it('turns the globe so the real noon point faces the scene Sun, with the pole leaning the real amount', () => {
    type V = [number, number, number]
    const turn = ([x, y, z, w]: number[], [a, b, c]: V): V => {
      // v + 2w(q x v) + 2 q x (q x v)
      const [i, j, k] = [y * c - z * b, z * a - x * c, x * b - y * a]
      return [a + 2 * (w * i + y * k - z * j), b + 2 * (w * j + z * i - x * k), c + 2 * (w * k + x * j - y * i)]
    }
    const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const sceneSun: V = [0.8377, 0.2932, 0.4607] // world.ts SUN
    for (const when of ['2026-03-20T12:00:00Z', '2026-06-21T18:00:00Z', '2026-11-14T03:00:00Z', '2026-12-21T09:30:00Z']) {
      const date = new Date(when)
      const q = earthOrientation(sunDirection(date), sceneSun)
      expect(Math.hypot(...q)).toBeCloseTo(1, 9)
      expect(dot(turn(q, sunDirection(date)), sceneSun)).toBeCloseTo(1, 3) // the lit centre is the real subsolar point
      const pole = turn(q, [0, 1, 0])
      // The pole stands (90 - the Sun's latitude) degrees from the Sun, in June as in December.
      expect(dot(pole, sceneSun)).toBeCloseTo(Math.sin((subsolarPoint(date)[0] * Math.PI) / 180), 3)
      expect(pole[1]).toBeGreaterThan(Math.cos((42 * Math.PI) / 180)) // and stays within 42 degrees of screen-up
    }
    // A different hint (the close-up tips the globe toward the camera) still keeps the noon point on the Sun.
    const noon = sunDirection(new Date('2026-11-14T18:00:00Z'))
    const tipped = earthOrientation(noon, sceneSun, [0, Math.cos(1.1), Math.sin(1.1)])
    expect(dot(turn(tipped, noon), sceneSun)).toBeCloseTo(1, 3)
    expect(turn(tipped, [0, 1, 0])[2]).toBeGreaterThan(0.4)
  })
})
