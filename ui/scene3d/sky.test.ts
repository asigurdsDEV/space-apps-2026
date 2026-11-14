import { describe, expect, it } from 'vitest'
import { COMPANIONS, companionPosition, type Companion } from './sky'

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
