import { describe, expect, it } from 'vitest'
import { steadyResolution } from './steady'

/** Runs `windows` windows of 40 frames at `ms` per frame. */
const run = (tick: (dt: number) => void, ms: number, windows: number) => {
  for (let i = 0; i < windows * 40; i++) tick(ms / 1000)
}

describe('steadyResolution', () => {
  it('leaves a smooth scene alone', () => {
    const set: number[] = []
    const tick = steadyResolution((r) => set.push(r), 2)
    run(tick, 16.7, 20)
    run(tick, 8.3, 20) // a 120 Hz screen
    expect(set).toEqual([])
  })

  it('cuts the pixel ratio when frames run long, keeps cutting while it helps, and stops at the floor', () => {
    const set: number[] = []
    let ms = 40
    const tick = steadyResolution((r) => { set.push(r); ms *= 0.8 }, 2) // fewer pixels, faster frames
    run(tick, ms, 1)
    expect(set).toEqual([]) // one slow window is not enough
    for (let i = 0; i < 12; i++) run(tick, ms, 1)
    expect(set[0]).toBeCloseTo(1.6)
    expect(set[1]).toBeCloseTo(1.28)
    expect(ms).toBeLessThan(21) // fast enough now
    const settled = set.length
    run(tick, ms, 20)
    expect(set.length).toBe(settled) // and it never goes back up
    expect(Math.min(...set)).toBeGreaterThanOrEqual(0.75)
  })

  it('undoes a cut that did not help and then leaves the ratio alone (a 30 fps battery saver)', () => {
    const set: number[] = []
    const tick = steadyResolution((r) => set.push(r), 2)
    run(tick, 33.3, 10)
    expect(set).toEqual([1.6, 2])
  })

  it('ignores the long gap after a tab switch', () => {
    const set: number[] = []
    const tick = steadyResolution((r) => set.push(r), 2)
    for (let i = 0; i < 400; i++) tick(i % 10 === 0 ? 3 : 0.0167)
    expect(set).toEqual([])
  })

  it('never goes below the floor, and the floor is never above the start', () => {
    const set: number[] = []
    let ms = 90
    const tick = steadyResolution((r) => { set.push(r); ms *= 0.85 }, 1)
    for (let i = 0; i < 40; i++) run(tick, ms, 1)
    expect(Math.min(...set)).toBe(0.75)
    const low: number[] = []
    run(steadyResolution((r) => low.push(r), 0.5), 60, 10)
    expect(low).toEqual([]) // already at its floor
  })
})
