import { describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../../data/presets'
import { aimAt, EYE, lookDir, type Vec3 } from '../fps/model'
import { PRESET_WALL, presetSpots, presetTiles } from './presets'

describe('rocket preset wall', () => {
  it('each tile can be aimed at on its own from in front of the wall', () => {
    for (const list of Object.values(PRESETS)) {
      const spots = presetSpots(list, () => {})
      for (const s of spots) {
        expect(Math.abs(s.at[0] - PRESET_WALL.x)).toBeLessThan(PRESET_WALL.w / 2) // inside the screen, clear of the pilasters
        const eye: Vec3 = [s.at[0], EYE, PRESET_WALL.z - 2]
        const v = [s.at[0] - eye[0], s.at[1] - eye[1], s.at[2] - eye[2]]
        const dir = lookDir(Math.PI, Math.atan2(v[1], Math.hypot(v[0], v[2])))
        expect(aimAt(eye, dir, spots)?.id).toBe(s.id)
      }
    }
  })

  it('loads the whole design, or in co-op only the slots this player may set', () => {
    const send = vi.fn()
    const [moon] = PRESETS.moon!
    presetSpots([moon!], send)[0]!.use()
    expect(Object.fromEntries(send.mock.calls[0][0].map((c: { payload: { key: string; value: unknown } }) => [c.payload.key, c.payload.value]))).toEqual(moon!.design)
    presetSpots([moon!], send, (key) => key === 'instruments')[0]!.use()
    expect(send.mock.calls[1][0]).toEqual([{ type: 'set_param', payload: { key: 'instruments', value: moon!.design.instruments } }])
  })

  it('shows name and rocket only, and marks the loaded one', () => {
    const [demo] = PRESETS.demo!
    const { ground_stations: _, ...params } = demo!.design
    expect(presetTiles(PRESETS.demo!, params)).toEqual([{ name: 'Earth Imager', rocket: 'Rideshare slot', loaded: true }])
    expect(presetTiles(PRESETS.demo!, { ...params, bus: 'cubesat-6u' })[0]!.loaded).toBe(false)
  })
})
