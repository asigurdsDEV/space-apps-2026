import { describe, expect, it } from 'vitest'
import { CUTSCENE_SCENE_MS, shotProgress } from './timing'

describe('cutscene timing', () => {
  it('stays inside the 10 second cap from the story frame', () => {
    for (const ms of Object.values(CUTSCENE_SCENE_MS)) {
      expect(ms).toBeGreaterThan(0)
      expect(ms).toBeLessThanOrEqual(10_000)
    }
  })

  it('holds the first frame under reduced motion and clamps a finished shot', () => {
    expect(shotProgress(0, 5000, false)).toBe(0)
    expect(shotProgress(2500, 5000, true)).toBe(0)
    expect(shotProgress(5000, 5000, false)).toBe(1)
    expect(shotProgress(9000, 5000, false)).toBe(1)
  })
})
