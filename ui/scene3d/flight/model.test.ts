import { describe, expect, it } from 'vitest'
import { trainingRoute } from '../../../data/pilot-training'
import type { HudFocus } from '../../flight-hud/model'
import { chase, groundLatLon, MAX_SPEED, nextFocus, pickTarget, R_MAX, R_MIN, SPOTS, startPose, stepPose, type Pose, type Vec3 } from './model'

type Intent = Parameters<typeof stepPose>[1]
const IDLE: Intent = { forward: 0, right: 0, up: 0, brake: false }
const len = (a: Vec3) => Math.hypot(...a)
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const unit = (a: Vec3): Vec3 => add([0, 0, 0], a, 1 / len(a))
const between = (a: Vec3, b: Vec3) => len(add(a, b, -1))

/** `seconds` of flight at 60 frames a second. */
function fly(pose: Pose, intent: Partial<Intent>, seconds: number): Pose {
  for (let i = 0; i < seconds * 60; i++) pose = stepPose(pose, { ...IDLE, ...intent }, 1 / 60)
  return pose
}

/** On the equator at lon 0, facing +z, so "up" is +x and "right" is +y. */
const level = (r = 1.3): Pose => ({ pos: [r, 0, 0], heading: [0, 0, 1], vel: [0, 0, 0] })

/** Hovering just short of a target and a little above it, facing it: in the crosshair and in range. */
function facing(id: string): Pose {
  const spot = SPOTS[id]!.at
  const up = unit(spot)
  const toward = unit([-up[2], 0, up[0]]) // any direction level with the ground at the target
  const pos = add(add(spot, up, 0.2), toward, -0.3)
  return { pos, heading: unit(add(toward, unit(pos), -dot(toward, unit(pos)))), vel: [0, 0, 0] }
}

describe('groundLatLon', () => {
  it('reads the latitude and longitude under the craft', () => {
    const under = groundLatLon(startPose().pos)
    expect(under.lat).toBeCloseTo(12, 5)
    expect(under.lon).toBeCloseTo(-15, 5)
  })
})

describe('stepPose', () => {
  it('moves the craft forward while the key is held, around the planet at the same altitude, never past the speed cap', () => {
    const start = level()
    const flown = fly(start, { forward: 1 }, 2)
    expect(flown.pos[2]).toBeGreaterThan(0.3)
    expect(len(flown.pos)).toBeCloseTo(1.3, 5)
    expect(len(flown.vel)).toBeGreaterThan(0.3)
    expect(len(flown.vel)).toBeLessThanOrEqual(MAX_SPEED + 1e-9)
    // Still facing the way it flies, level with the ground.
    expect(dot(flown.heading, flown.pos)).toBeCloseTo(0, 9)
    expect(len(flown.heading)).toBeCloseTo(1, 9)
  })

  it('stops soon after the keys are let go, and sooner with the brake', () => {
    const moving = fly(level(), { forward: 1 }, 2)
    const coasting = fly(moving, {}, 0.5)
    expect(len(fly(moving, {}, 2.5).vel)).toBeLessThan(0.01)
    expect(len(fly(moving, { brake: true }, 0.5).vel)).toBeLessThan(len(coasting.vel) / 4)
    expect(between(fly(moving, {}, 6).pos, fly(moving, {}, 5).pos)).toBeLessThan(1e-4)
  })

  it('turns right and left, and climbs and descends', () => {
    expect(fly(level(), { right: 1 }, 0.3).heading[1]).toBeGreaterThan(0.2)
    expect(fly(level(), { right: -1 }, 0.3).heading[1]).toBeLessThan(-0.2)
    expect(len(fly(level(), { up: 1 }, 1).pos)).toBeGreaterThan(1.4)
    expect(len(fly(level(), { up: -1 }, 0.3).pos)).toBeLessThan(1.3)
  })

  it('keeps the craft between the planet and the top of the play area, however long a key is held', () => {
    const high = fly(level(), { up: 1, forward: 1 }, 30)
    const low = fly(level(), { up: -1, forward: 1 }, 30)
    expect(len(high.pos)).toBeLessThan(R_MAX + 0.05)
    expect(len(low.pos)).toBeGreaterThan(R_MIN - 0.03)
    // Let go and it settles back inside the band.
    expect(len(fly(high, {}, 3).pos)).toBeLessThanOrEqual(R_MAX + 0.005)
    expect(len(fly(low, {}, 3).pos)).toBeGreaterThanOrEqual(R_MIN - 0.005)
  })
})

describe('chase camera', () => {
  it('sits behind and above the craft and follows it', () => {
    const start = level()
    const view = chase(start)
    expect(view.eye[0]).toBeGreaterThan(start.pos[0]) // above
    expect(view.eye[2]).toBeLessThan(start.pos[2]) // behind
    expect(view.aim[2]).toBeGreaterThan(0) // looks ahead
    expect(view.aim[0]).toBeLessThan(0) // and down at the planet
    const flown = fly(start, { forward: 1 }, 2)
    expect(between(chase(flown).eye, flown.pos)).toBeCloseTo(between(view.eye, start.pos), 9)
  })
})

describe('targets', () => {
  const targets = trainingRoute.targets
  const ids = targets.map((t) => t.id)

  it('has a place for every target of the V4 route, clear of the planet and inside the play area', () => {
    for (const id of ids) {
      const r = len(SPOTS[id]!.at)
      expect(r).toBeGreaterThan(1)
      expect(r).toBeLessThan(R_MAX)
    }
  })

  it('starts with the first target ahead but out of range', () => {
    expect(pickTarget(startPose(), ids)).toMatchObject({ id: 'hurricane', inRange: false })
  })

  it('focuses the target in the crosshair, in range once close, and nothing when it is behind', () => {
    for (const id of ids) expect(pickTarget(facing(id), ids)).toMatchObject({ id, inRange: true })
    // Turned around: still in range, so it stays focused without aim (the craft cannot pitch up at a relay).
    const near = facing('wildfire')
    const back: Vec3 = add([0, 0, 0], near.heading, -1)
    expect(pickTarget({ ...near, heading: back }, ['wildfire'])).toMatchObject({ id: 'wildfire', inRange: true })
    // Turned around and backed off: behind the camera and out of range.
    expect(pickTarget({ ...near, pos: add(near.pos, near.heading, -0.3), heading: back }, ['wildfire'])).toBeNull()
  })

  it('counts the hold up to hold_s while interact is held in range, and resets when it is let go or aim is lost', () => {
    const pose = facing('hurricane')
    let focus: HudFocus | null = null
    for (let i = 0; i < 60; i++) focus = nextFocus(focus, pose, targets, [], true, 1 / 60, 6_371_000)
    expect(focus).toMatchObject({ id: 'hurricane', inRange: true })
    expect(focus!.held_s).toBeCloseTo(1, 5)
    expect(focus!.distance_m).toBeGreaterThan(1_000_000)
    for (let i = 0; i < 600; i++) focus = nextFocus(focus, pose, targets, [], true, 1 / 60, 6_371_000)
    expect(focus!.held_s).toBe(3) // hold_s
    expect(nextFocus(focus, pose, targets, [], false, 1 / 60, 6_371_000)!.held_s).toBe(0)
    expect(nextFocus(focus, startPose(), targets, [], true, 1 / 60, 6_371_000)!.held_s).toBe(0) // out of range
    expect(nextFocus(focus, facing('wildfire'), targets, [], true, 1 / 60, 6_371_000)).toMatchObject({ id: 'wildfire', held_s: 1 / 60 })
  })

  it('does not count on a finished target or a locked one', () => {
    expect(nextFocus(null, facing('hurricane'), targets, ['hurricane'], true, 0.5, 1)).toMatchObject({ id: 'hurricane', held_s: 0 })
    expect(nextFocus(null, facing('tdrs-relay'), targets, ['hurricane'], true, 0.5, 1)).toMatchObject({ id: 'tdrs-relay', held_s: 0 })
    expect(nextFocus(null, facing('tdrs-relay'), targets, ['hurricane', 'wildfire'], true, 0.5, 1)!.held_s).toBe(0.5)
  })

  it('prefers a target still to do over a nearer finished one', () => {
    // Right over the storm, looking at the fire: both count as aimed at.
    const pos = add(SPOTS.hurricane!.at, unit(SPOTS.hurricane!.at), 0.2)
    const toFire = add(SPOTS.wildfire!.at, pos, -1)
    const pose: Pose = { pos, heading: unit(add(toFire, unit(pos), -dot(toFire, unit(pos)))), vel: [0, 0, 0] }
    expect(nextFocus(null, pose, targets, [], false, 0, 1)).toMatchObject({ id: 'hurricane' })
    expect(nextFocus(null, pose, targets, ['hurricane'], false, 0, 1)).toMatchObject({ id: 'wildfire', inRange: false })
  })
})
