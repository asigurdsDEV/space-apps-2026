import { describe, expect, it } from 'vitest'
import { aimAt, EYE, lookDir, step, type Interactable, type Obstacle } from './model'

const item = (id: string, at: [number, number, number]): Interactable => ({ id, at, label: id, use: () => {} })

describe('step', () => {
  it('walks forward down −z at yaw 0, and diagonals are not faster', () => {
    const [x, , z] = step([0, EYE, 0], 0, { forward: 1, right: 0 }, 0.1, 10, [])
    expect(x).toBeCloseTo(0)
    expect(z).toBeCloseTo(-1)
    const d = step([0, EYE, 0], 0, { forward: 1, right: 1 }, 0.1, 10, [])
    expect(Math.hypot(d[0], d[2])).toBeCloseTo(1)
  })

  it('stops at a wall and slides along it', () => {
    const wall: Obstacle = { min: [-5, 0, -1], max: [5, 3, -0.9] }
    let p: [number, number, number] = [0, EYE, 0]
    for (let i = 0; i < 20; i++) p = step(p, Math.PI / 4, { forward: 1, right: 0 }, 0.05, 4, [wall]) // walking into it at 45°
    expect(p[2]).toBeGreaterThan(-0.9 + 0.29)
    expect(p[0]).toBeLessThan(-1) // slid sideways along it
  })

  it('a long frame cannot tunnel through a thin wall', () => {
    const wall: Obstacle = { min: [-5, 0, -1], max: [5, 3, -0.95] }
    expect(step([0, EYE, 0], 0, { forward: 1, right: 0 }, 5, 6, [wall])[2]).toBeGreaterThan(-1)
  })
})

describe('aimAt', () => {
  const eye: [number, number, number] = [0, EYE, 0]
  it('picks what is in front and in reach, closest to the centre', () => {
    const items = [item('left', [-0.6, EYE, -1.5]), item('centre', [0.05, EYE, -1.8]), item('behind', [0, EYE, 1])]
    expect(aimAt(eye, lookDir(0, 0), items)?.id).toBe('centre')
  })
  it('ignores things out of reach or off to the side', () => {
    expect(aimAt(eye, lookDir(0, 0), [item('far', [0, EYE, -5])])).toBeUndefined()
    expect(aimAt(eye, lookDir(0, 0), [item('side', [1.5, EYE, -1])])).toBeUndefined()
  })
  it('counts a desk below eye level without tilting the head, but not the floor at your feet', () => {
    expect(aimAt(eye, lookDir(0, 0), [item('desk', [0, 1.0, -1.6])])?.id).toBe('desk')
    expect(aimAt(eye, lookDir(0, 0), [item('floor', [0, 0, -0.4])])).toBeUndefined()
  })
  it('follows the look direction', () => {
    expect(aimAt(eye, lookDir(Math.PI / 2, 0), [item('west', [-1.5, EYE, 0])])?.id).toBe('west')
  })
})
