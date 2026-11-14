import { describe, expect, it } from 'vitest'
import { createWalkTouch, walkingVector } from './walk-touch'

describe('walking touch intent', () => {
  it('uses right/forward axes, dead zone and a unit speed limit', () => {
    expect(walkingVector(0, -50, 50)).toEqual([0, 1])
    expect(walkingVector(3, 2, 50)).toEqual([0, 0])
    expect(walkingVector(25, 0, 50)).toEqual([.5, -0])
    const v = walkingVector(100, 100, 50)
    expect(Math.hypot(...v)).toBeCloseTo(1)
    expect(v[0]).toBeGreaterThan(0)
    expect(v[1]).toBeLessThan(0)
    expect(walkingVector(NaN, 0, 50)).toEqual([0, 0])
    expect(walkingVector(0, 1, 0)).toEqual([0, 0])
  })

  it('keeps simultaneous move/look fingers independent and emits incremental look', () => {
    const input = createWalkTouch()
    expect(input.startMove(1)).toBe(true)
    expect(input.startMove(3)).toBe(false)
    expect(input.startLook(2, 10, 20)).toBe(true)
    expect(input.startLook(4, 0, 0)).toBe(false)
    expect(input.move(3, 40, 0, 40)).toBeNull()
    expect(input.move(1, 40, 0, 40)).toEqual([1, -0])
    expect(input.look(2, 14, 18)).toEqual([4, -2])
    expect(input.look(2, 15, 21)).toEqual([1, 3])
    expect(input.release(2)).toBe(false)
    expect(input.move(1, 40, 0, 40)).toEqual([1, -0])
    expect(input.release(1)).toBe(true)
    expect(input.move(1, 40, 0, 40)).toBeNull()
    expect(input.look(2, 50, 50)).toBeNull()
  })

  it('clears both gestures for pause, visibility loss and unmount', () => {
    const input = createWalkTouch()
    input.startMove(1); input.startLook(2, 1, 1)
    input.clear()
    expect(input.move(1, 50, 0, 50)).toBeNull()
    expect(input.look(2, 20, 20)).toBeNull()
    expect(input.startMove(3)).toBe(true)
    expect(input.startLook(4, 0, 0)).toBe(true)
  })
})
