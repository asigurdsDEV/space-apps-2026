import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM, type Elements } from './elements'
import { loadOrbits, type Tracked } from './propagate'
import { screenApproaches } from './screening'
import stations from './fixtures/gp-stations.json'
import weather from './fixtures/gp-weather.json'

const NOW = new Date('2026-11-15T10:00:00Z')
const iss = stations[0] as Elements
const goes19 = weather.find((el) => el.NORAD_CAT_ID === 60133) as Elements

describe('SGP4 propagation of real elements', () => {
  it('puts the ISS where the ISS flies', async () => {
    const orbits = (await loadOrbits([iss]))!
    const state = orbits.state(0, NOW)!
    expect(state.altKm).toBeGreaterThan(400)
    expect(state.altKm).toBeLessThan(435)
    expect(state.speedKmS).toBeGreaterThan(7.6)
    expect(state.speedKmS).toBeLessThan(7.7)
    expect(Math.abs(state.lat)).toBeLessThan(51.8)
  })

  it('finds GOES-19 over 75.2 degrees west, 35,786 km up: time, Earth turn and east-west sign are all right', async () => {
    const state = (await loadOrbits([goes19]))!.state(0, NOW)!
    expect(state.lon).toBeGreaterThan(-75.7)
    expect(state.lon).toBeLessThan(-74.7)
    expect(Math.abs(state.lat)).toBeLessThan(0.5)
    expect(Math.abs(state.altKm - 35_786)).toBeLessThan(60)
  })

  it('gives positions in Earth radii in the bundled map frame: longitude 0 on +X, north +Y, east toward -Z', async () => {
    const orbits = (await loadOrbits([iss, goes19, stations[3] as Elements]))!
    const out = new Float32Array(9)
    expect(orbits.positions(NOW, out)).toBe(3)
    for (const index of [0, 1, 2]) {
      const state = orbits.state(index, NOW)!
      const [x, y, z] = out.slice(index * 3, index * 3 + 3)
      expect([x, y, z]).toEqual(state.position)
      const r = Math.hypot(x, y, z)
      expect(r).toBeCloseTo(1 + state.altKm / EARTH_RADIUS_KM, 2)
      // Geodetic and geocentric latitude differ by up to 0.2 degrees, hence the loose match.
      const lat = (state.lat * Math.PI) / 180
      const lon = (state.lon * Math.PI) / 180
      expect(x / r).toBeCloseTo(Math.cos(lat) * Math.cos(lon), 2)
      expect(y / r).toBeCloseTo(Math.sin(lat), 2)
      expect(z / r).toBeCloseTo(-Math.cos(lat) * Math.sin(lon), 2)
    }
  })

  it('draws one lap as a closed ring', async () => {
    const orbits = (await loadOrbits([iss]))!
    const ring = new Float32Array(129 * 3)
    expect(orbits.ring(0, NOW, ring)).toBe(true)
    expect(Math.hypot(ring[0] - ring[384], ring[1] - ring[385], ring[2] - ring[386])).toBeLessThan(0.01)
    for (let k = 0; k < 129; k++) expect(Math.hypot(ring[k * 3], ring[k * 3 + 1], ring[k * 3 + 2])).toBeCloseTo(1.065, 1)
    expect([...ring.slice(0, 3)]).toEqual(orbits.state(0, NOW)!.position)
  })

  it('writes an object it cannot propagate at the centre and does not count it', async () => {
    const orbits = (await loadOrbits([iss, { ...iss, MEAN_MOTION: 17.5 }]))! // a period below the ground: SGP4 reports decay
    const out = new Float32Array(6).fill(7)
    expect(orbits.positions(NOW, out)).toBe(1)
    expect([...out.slice(3)]).toEqual([0, 0, 0])
    expect(orbits.state(1, NOW)).toBeNull()
    expect(orbits.ring(1, NOW, new Float32Array(30))).toBe(false)
  })
})

// Circular orbits with exact positions, so the closest approach is known to the metre.
const MU = 398600.4418
type Vec = [number, number, number]
function circular(name: string, id: number, altKm: number, u: Vec, v: Vec, atU_ms: number, eccentricityForBand = 0, epoch = '2026-11-15T08:00:00.000000') {
  const r = EARTH_RADIUS_KM + altKm
  const rate = Math.sqrt(MU / r ** 3) // radians per second
  const elements: Elements = { OBJECT_NAME: name, NORAD_CAT_ID: id, EPOCH: epoch, MEAN_MOTION: (rate * 86_400) / (2 * Math.PI), ECCENTRICITY: eccentricityForBand, INCLINATION: 0, RA_OF_ASC_NODE: 0, ARG_OF_PERICENTER: 0, MEAN_ANOMALY: 0, BSTAR: 0, MEAN_MOTION_DOT: 0, MEAN_MOTION_DDOT: 0 }
  const at = (timeMs: number, out: Float64Array) => {
    const angle = (rate * (timeMs - atU_ms)) / 1000
    for (let i = 0; i < 3; i++) out[i] = r * (Math.cos(angle) * u[i] + Math.sin(angle) * v[i])
  }
  return { elements, at }
}
function tracked(objects: ReturnType<typeof circular>[]): Tracked {
  return { elements: objects.map((o) => o.elements), kmAt: (index, timeMs, out) => (objects[index].at(timeMs, out), true) }
}

describe('close-approach screening', () => {
  const t0 = NOW.getTime()
  const target = tracked([circular('TARGET', 1, 500, [1, 0, 0], [0, 1, 0], t0)])
  // Where the target is 37.25 minutes in: 15 s from the nearest 30 s sample, the worst case for the coarse sweep.
  const meetMs = t0 + 37.25 * 60_000
  const meet = new Float64Array(3)
  target.kmAt(0, meetMs, meet)
  const p = Array.from(meet, (x) => x / Math.hypot(...meet)) as Vec

  it('finds a 1.5 km pass that falls between coarse samples, ahead of a 40 km pass that falls on one', async () => {
    const others = tracked([
      circular('FAR ABOVE', 10, 2000, [1, 0, 0], [0, 0, 1], t0),
      circular('ON A SAMPLE', 11, 540, [1, 0, 0], [0, 0, 1], t0, 0.01), // crosses +X, 40 km above the target, exactly at the first sample
      circular('BETWEEN SAMPLES', 12, 501.5, p, [0, 0, 1], meetMs, 0.001),
    ])
    const result = (await screenApproaches(target, 0, others, NOW))!
    expect(result.closest).toMatchObject({ name: 'BETWEEN SAMPLES', id: 12, index: 2 })
    expect(Math.abs(Date.parse(result.closest!.at) - meetMs)).toBeLessThan(5)
    expect(result.closest!.distanceKm).toBeCloseTo(1.5, 2)
    expect(result.closest!.inMinutes).toBeCloseTo(37.25, 3)
    expect(result.closest!.elementsAgeDays).toBeCloseTo(2 / 24, 5)
    expect(result.sharingAltitude).toBe(2) // the two whose height range reaches 500 km
    expect(result.band.lowKm).toBeCloseTo(500, 6)
    expect(result).toMatchObject({ screened: 3, tooOld: 0, windowMinutes: 100, from: NOW.toISOString() })
  })

  it('reports a pass that is already opening when the window starts at the window edge', async () => {
    const opening = tracked([circular('LEAVING', 20, 480, [1, 0, 0], [0, 0, 1], t0 - 10_000)])
    const first = (await screenApproaches(target, 0, opening, NOW))!
    expect(first.closest!.inMinutes).toBeLessThan(0.001)
    const out = new Float64Array(3)
    opening.kmAt(0, t0, out)
    expect(first.closest!.distanceKm).toBeCloseTo(Math.hypot(out[0] - (EARTH_RADIUS_KM + 500), out[1], out[2]), 1)
  })

  it('leaves out orbit data older than ten days and the satellite itself', async () => {
    const others = tracked([
      circular('STALE', 30, 500.5, p, [0, 0, 1], meetMs, 0.001, '2026-10-20T00:00:00.000000'),
      circular('TARGET', 1, 500, [1, 0, 0], [0, 1, 0], t0),
      circular('FRESH', 31, 503, p, [0, 0, 1], meetMs, 0.001),
    ])
    const result = (await screenApproaches(target, 0, others, NOW))!
    expect(result.closest!.name).toBe('FRESH')
    expect(result.closest!.distanceKm).toBeCloseTo(3, 2)
    expect(result).toMatchObject({ screened: 1, tooOld: 1, sharingAltitude: 3 })
  })

  it('answers with no closest pass when there is nothing to screen, and null when cancelled or the satellite is lost', async () => {
    expect((await screenApproaches(target, 0, tracked([]), NOW))!.closest).toBeNull()
    const lost: Tracked = { elements: target.elements, kmAt: () => false }
    expect(await screenApproaches(lost, 0, target, NOW)).toBeNull()
    const many = tracked(Array.from({ length: 4000 }, (_, i) => circular(`PIECE ${i}`, 100 + i, 500, p, [0, 0, 1], meetMs + i * 977, 0.001)))
    const gone = new AbortController()
    gone.abort()
    expect(await screenApproaches(target, 0, many, NOW, gone.signal)).toBeNull()
  })

  it('agrees with real SGP4: an object 0.1 degrees behind the ISS on the same orbit stays about 11.9 km away', async () => {
    const orbits = (await loadOrbits([iss, { ...iss, OBJECT_NAME: 'SHADOW', NORAD_CAT_ID: 99, MEAN_ANOMALY: iss.MEAN_ANOMALY - 0.1 }]))!
    const result = (await screenApproaches(orbits, 0, orbits, NOW))!
    expect(result.closest).toMatchObject({ name: 'SHADOW', index: 1 })
    expect(result.closest!.distanceKm).toBeGreaterThan(11.3)
    expect(result.closest!.distanceKm).toBeLessThan(12.1)
    expect(result).toMatchObject({ screened: 1, sharingAltitude: 2 })
  })
})
