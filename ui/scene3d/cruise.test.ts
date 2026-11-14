import { describe, expect, it } from 'vitest'
import { cruiseCaption, cruiseDays, cruiseLayout, cruiseProgress, transferArc, transferPoint } from './cruise'

describe('cruise view', () => {
  it('draws Earth at its real size next to the Moon and Mars', () => {
    expect(cruiseLayout('moon').earthRadius).toBeCloseTo(3.67, 2)
    expect(cruiseLayout('mars').earthRadius).toBeCloseTo(1.88, 2)
  })

  it('the arc leaves just above Earth and arrives just above the destination, never inside either', () => {
    for (const body of ['moon', 'mars'] as const) {
      const { earthRadius, distance } = cruiseLayout(body)
      const [sx] = transferPoint(body, 0)
      const [ex] = transferPoint(body, 1)
      expect(sx).toBeCloseTo(-distance + earthRadius * 1.2)
      expect(ex).toBeCloseTo(-1.2)
      for (const [x, , z] of transferArc(body)) {
        expect(Math.hypot(x, z), body).toBeGreaterThan(1)
        expect(Math.hypot(x + distance, z), body).toBeGreaterThan(earthRadius)
      }
      expect(transferPoint(body, 2)).toEqual(transferPoint(body, 1))
    }
  })

  it('progress follows sim time and clamps', () => {
    expect(cruiseProgress(0, 210)).toBe(0)
    expect(cruiseProgress(105 * 86_400, 210)).toBe(0.5)
    expect(cruiseProgress(999 * 86_400, 210)).toBe(1)
    expect(cruiseProgress(5, 0)).toBe(1)
  })

  it('reads cruise_days from the picked orbit and says it in the caption', () => {
    const state = { params: { orbit: 'low-mars-orbit' }, entities: [{ id: 'low-mars-orbit', kind: 'orbit', name: 'Low Mars orbit', props: { cruise_days: 210 } }] }
    expect(cruiseDays(state)).toBe(210)
    expect(cruiseDays({ params: {}, entities: [] })).toBe(0)
    expect(cruiseCaption('mars', 210)).toBe('Cruise to Mars · 210 days')
    expect(cruiseCaption('mars', 210, 0.4)).toBe('Cruise to Mars · 210 days · day 85')
    expect(cruiseCaption('moon', 5, 1)).toBe('Cruise to the Moon · 5 days · day 5')
  })
})
