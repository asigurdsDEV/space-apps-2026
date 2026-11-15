import { describe, expect, it } from 'vitest'
import { brightStars, COMPANIONS, companionPosition, milkyWay, skyDirection, skyTurn, sunInSky, type Companion } from './sky'
import { sunDirection } from './sun'

const degreesWide = (c: Companion) => (2 * Math.atan(c.size[0] / c.distance) * 180) / Math.PI
const named = (body: keyof typeof COMPANIONS, name: string) => COMPANIONS[body].find((c) => c.name === name)!
const sun = [1, 0.35, 0.55].map((x) => x / Math.hypot(1, 0.35, 0.55)) as [number, number, number] // world.ts's Sun

describe('sky companions', () => {
  it('are as wide in the sky as the real ones', () => {
    expect(degreesWide(named('earth', 'the Moon'))).toBeCloseTo(0.52, 1) // the full Moon from Earth
    expect(degreesWide(named('moon', 'Earth'))).toBeCloseTo(1.9, 1) // Earth from the Moon, almost four times wider
  })

  it('keep their real pace', () => {
    expect(1 / named('earth', 'the Moon').lapsPerSpin).toBeCloseTo(27.4, 1) // days per lap
    expect(named('mars', 'Phobos').lapsPerSpin).toBeGreaterThan(3) // faster than Mars turns
    expect(named('mars', 'Deimos').lapsPerSpin).toBeLessThan(1)
    expect(named('moon', 'Earth').lapsPerSpin).toBe(1) // fixed over the Moon's near side
  })

  it('sit at their distance, in the right plane', () => {
    for (const c of Object.values(COMPANIONS).flat()) {
      for (const spin of [0, 1.3, 40]) {
        const p = companionPosition(c, spin, sun)
        expect(Math.hypot(...p)).toBeCloseTo(c.distance, 6)
        if (c.plane === 'equator') expect(p[1]).toBeCloseTo(0, 9)
      }
    }
    // In the ecliptic, phase 0 is the Sun's own direction (a new Moon).
    const moon = { ...named('earth', 'the Moon'), phase: 0 }
    const p = companionPosition(moon, 0, sun)
    expect(p.map((x) => x / moon.distance)).toEqual(sun.map((x) => expect.closeTo(x, 3)))
  })

  it('go round the way the planet turns (counter-clockwise seen from the north)', () => {
    const phobos = { ...named('mars', 'Phobos'), phase: 0 }
    const a = companionPosition(phobos, 0, [1, 0, 0])
    const b = companionPosition(phobos, 0.1, [1, 0, 0])
    expect(a[0]).toBeCloseTo(phobos.distance)
    expect(b[2]).toBeLessThan(0) // from +x towards -z, like a turn about +y
  })
})

describe('the real stars', () => {
  const stars = brightStars()
  const star = (name: string) => stars.find((s) => s.name === name)!
  const at = (name: string) => skyDirection(star(name).ra_h, star(name).dec_deg)
  const apart = (a: [number, number, number], b: [number, number, number]) => (Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * 180) / Math.PI
  const between = (a: string, b: string) => apart(at(a), at(b))

  it('is a table of a few hundred well-formed stars, each listed once, brightest first', () => {
    expect(stars.length).toBeGreaterThanOrEqual(250)
    expect(stars.length).toBeLessThanOrEqual(400)
    expect(new Set(stars.map((s) => s.name)).size).toBe(stars.length)
    for (const s of stars) {
      expect(s.ra_h >= 0 && s.ra_h < 24 && Math.abs(s.dec_deg) <= 90, s.name).toBe(true)
      expect(s.mag > -1.5 && s.mag < 3.7, s.name).toBe(true)
      expect(s.kind, s.name).toMatch(/^[OBAFGKM]$/)
    }
    expect(stars.slice(0, 3).map((s) => s.name)).toEqual(['Sirius', 'Canopus', 'Rigil Kentaurus'])
    // No two entries are the same star typed twice under two names (the closest real pair here, Shaula and Lesath, is 0.6 degrees apart).
    for (let i = 0; i < stars.length; i++) for (let j = 0; j < i; j++) expect(between(stars[i]!.name, stars[j]!.name), `${stars[i]!.name} / ${stars[j]!.name}`).toBeGreaterThan(0.5)
  })

  it('puts famous stars at their catalogue places (J2000), to a quarter of a degree', () => {
    // [right ascension in hours, declination in degrees] from the Yale Bright Star Catalogue.
    const known: Record<string, [number, number]> = {
      Sirius: [6.7525, -16.716], Canopus: [6.3992, -52.696], Vega: [18.6156, 38.784], Betelgeuse: [5.9195, 7.407], Rigel: [5.2423, -8.202],
      Arcturus: [14.261, 19.182], Antares: [16.4901, -26.432], Polaris: [2.5303, 89.264],
    }
    for (const [name, [ra, dec]] of Object.entries(known)) expect(apart(at(name), skyDirection(ra, dec)), name).toBeLessThan(0.25)
    expect(apart(at('Polaris'), [0, 1, 0])).toBeLessThan(1) // the pole star, 0.74 degrees from the pole
    expect(star('Betelgeuse').kind).toBe('M') // red
    expect(star('Rigel').kind).toBe('B') // blue-white
  })

  it('draws the patterns people know: angles between stars match the sky', () => {
    expect(between('Betelgeuse', 'Rigel')).toBeCloseTo(18.6, 0.5) // across Orion
    expect(between('Alnitak', 'Mintaka')).toBeCloseTo(2.7, 0.5) // Orion's belt
    // The Big Dipper, bowl to handle.
    const dipper = ['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid']
    const steps = [5.4, 7.9, 4.5, 5.4, 4.4, 6.7]
    steps.forEach((degrees, i) => expect(Math.abs(between(dipper[i]!, dipper[i + 1]!) - degrees), `${dipper[i]} to ${dipper[i + 1]}`).toBeLessThan(0.25))
    expect(between('Dubhe', 'Alkaid')).toBeCloseTo(25.7, 0.5)
    // Merak to Dubhe points at Polaris, about five times their own spacing farther on.
    expect(between('Dubhe', 'Polaris')).toBeCloseTo(28.7, 0.5)
    expect(between('Merak', 'Polaris')).toBeCloseTo(between('Merak', 'Dubhe') + between('Dubhe', 'Polaris'), 0)
    expect(between('Vega', 'Deneb')).toBeCloseTo(23.8, 0.5) // the Summer Triangle
    expect(between('Vega', 'Altair')).toBeCloseTo(34.2, 0.5)
    expect(between('Acrux', 'Gacrux')).toBeCloseTo(6.0, 0.5) // the long bar of the Southern Cross
    expect(between('Castor', 'Pollux')).toBeCloseTo(4.5, 0.5)
  })

  it('knows where the Sun is among them on a date', () => {
    const [ra, dec] = sunInSky(new Date('2026-06-21T12:00Z')) // the June solstice: 6 hours, as far north as it gets
    expect(ra).toBeCloseTo(6, 1)
    expect(dec).toBeCloseTo(23.44, 1)
    expect(sunInSky(new Date('2026-03-20T15:00Z'))[1]).toBeCloseTo(0, 0) // the March equinox: on the equator
    // Every 23 August the Sun passes Regulus, the heart of Leo.
    expect(apart(skyDirection(...sunInSky(new Date('2026-08-23T12:00Z'))), at('Regulus'))).toBeLessThan(1)
  })

  it('turns the sky so the Sun among the stars is the Sun over the Earth map', () => {
    for (const when of ['2026-11-15T12:00Z', '2026-06-21T03:00Z', '2027-01-03T19:30Z']) {
      const date = new Date(when)
      const sunInMap = sunDirection(date)
      const turn = skyTurn(date, sunInMap)
      const [x, y, z] = skyDirection(...sunInSky(date))
      const turned: [number, number, number] = [x * Math.cos(turn) + z * Math.sin(turn), y, -x * Math.sin(turn) + z * Math.cos(turn)] // about +Y, as three.js turns
      expect(apart(turned, sunInMap), when).toBeLessThan(1.5) // sun.ts is good to about a degree
    }
  })

  it('has a Milky Way along the galactic plane, brightest toward Sagittarius', () => {
    const centre = milkyWay(skyDirection(17.6, -29.5))
    expect(centre).toBeGreaterThan(0.5)
    expect(milkyWay(at('Deneb'))).toBeGreaterThan(0.1) // Cygnus, in the band
    expect(milkyWay(at('Deneb'))).toBeLessThan(centre)
    expect(milkyWay(skyDirection(12.857, 27.128))).toBe(0) // the galactic pole, in Coma Berenices
    expect(milkyWay(at('Arcturus'))).toBe(0)
    expect(milkyWay(skyDirection(5.39, -69.8))).toBeGreaterThan(0.2) // the Large Magellanic Cloud
    for (const s of stars) expect(milkyWay(at(s.name)) >= 0 && milkyWay(at(s.name)) <= 1).toBe(true)
  })
})
