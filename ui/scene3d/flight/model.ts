// Pure flight-training model: how the craft moves, where the chase camera sits and which target is
// in the crosshair. No three.js, so it is easy to test. The planet is a unit sphere at the origin
// (as in ../world.ts), so 1 = one planet radius. Local training only: nothing here reaches the sim.
import type { HudFocus } from '../../flight-hud/model'
import type { PilotIntent } from '../../pilot-input/model'

export type Vec3 = readonly [number, number, number]

/** The craft: where it is, the way it faces (unit, level with the ground below) and how it is moving. */
export interface Pose {
  pos: Vec3
  heading: Vec3
  vel: Vec3
}

/** What the scene needs from a route target. `TrainingTarget` (data/pilot-training) fits as is. */
export interface FlightTarget {
  id: string
  label: string
  /** Seconds of steady aim to finish it. */
  hold_s: number
  /** Target ids that must be finished first. */
  requires: readonly string[]
}

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const unit = (a: Vec3) => scale(a, 1 / (len(a) || 1))
/** `a` without its part along the unit vector `n`. */
const flat = (a: Vec3, n: Vec3) => add(a, n, -dot(a, n))

/** A point `r` planet radii from the centre, by latitude and longitude in degrees (+x at lon 0, as in ../shaders.ts). */
const at = (lat: number, lon: number, r: number): Vec3 => {
  const a = (lat * Math.PI) / 180
  const b = (lon * Math.PI) / 180
  return [r * Math.cos(a) * Math.cos(b), r * Math.sin(a), r * Math.cos(a) * Math.sin(b)]
}

/**
 * Where each V4 target sits, how close counts as in range and how big it is drawn (all in planet radii).
 * shortcut: classroom scale, not real sizes or orbits; the storm and the fire sit on the day side.
 */
export const SPOTS: Readonly<Record<string, { at: Vec3; range: number; size: number }>> = {
  hurricane: { at: at(20, -10, 1.02), range: 0.45, size: 0.14 },
  wildfire: { at: at(-12, 55, 1.012), range: 0.45, size: 0.07 },
  'tdrs-relay': { at: at(25, 110, 1.75), range: 0.5, size: 0.1 },
}

// Tuned by flying it: top speed crosses a quarter of the planet in about 5 s, and the craft stops about 1 s after the keys are let go.
const THRUST = 0.7
const CLIMB = 0.6
const TURN = 1.5
const DRAG = 1.7
const BRAKE = 7
export const MAX_SPEED = 0.45
/** The band the craft flies in. Past either edge a spring pushes it back; FLOOR and CEIL are the hard stops. */
export const R_MIN = 1.14
export const R_MAX = 2.0
const SPRING = 40
const R_FLOOR = 1.1
const R_CEIL = 2.08

/** Low over the day side, facing the first target. */
export function startPose(): Pose {
  const pos = at(5, -50, 1.25)
  const up = unit(pos)
  return { pos, heading: unit(flat(add(SPOTS.hurricane!.at, pos, -1), up)), vel: [0, 0, 0] }
}

/**
 * One frame of flight. Forward/back thrusts along the heading and up/down along the line from the planet,
 * with drag so the craft stops when the keys are let go.
 * Left/right turn the craft: PilotIntent has no yaw, and a craft that cannot turn cannot aim.
 */
export function stepPose(pose: Pose, intent: Pick<PilotIntent, 'forward' | 'right' | 'up' | 'brake'>, dt: number): Pose {
  const r = len(pose.pos)
  const up = unit(pose.pos)
  const turn = -intent.right * TURN * dt
  const heading = unit(flat(add(scale(pose.heading, Math.cos(turn)), cross(up, pose.heading), Math.sin(turn)), up))

  let vel = add(pose.vel, add(scale(heading, intent.forward * THRUST), up, intent.up * CLIMB), dt)
  vel = add(vel, up, (r < R_MIN ? R_MIN - r : r > R_MAX ? R_MAX - r : 0) * SPRING * dt)
  vel = scale(vel, Math.exp(-(intent.brake ? BRAKE : DRAG) * dt))
  const speed = len(vel)
  if (speed > MAX_SPEED) vel = scale(vel, MAX_SPEED / speed)

  // Fly around the planet, not off on a tangent: level speed follows the curve and only the climb changes the altitude.
  const climb = dot(vel, up)
  const level = flat(vel, up)
  const nextUp = unit(add(pose.pos, level, dt))
  const pos = scale(nextUp, Math.min(R_CEIL, Math.max(R_FLOOR, r + climb * dt)))
  return {
    pos,
    heading: unit(flat(heading, nextUp)),
    vel: add(scale(unit(flat(level, nextUp)), len(level)), nextUp, climb),
  }
}

const CAM_BACK = 0.17
const CAM_UP = 0.17
/** Over the shoulder: the craft sits left of the crosshair, clear of the HUD's target panel under it. */
const CAM_SIDE = 0.11
const CAM_PITCH = 0.58
/** Half-angle of the crosshair's cone. Wide on purpose: aiming is "put it near the middle of the screen". */
const AIM_COS = Math.cos(0.5)

/**
 * The chase camera: behind, above and a little right of the craft, looking ahead and down so the planet is in frame.
 * `aim` is the crosshair's direction. `side` (0 to 1) brings the camera back in line with the craft for narrow views.
 */
export function chase(pose: Pose, side = 1): { eye: Vec3; aim: Vec3; up: Vec3 } {
  const up = unit(pose.pos)
  return {
    eye: add(add(add(pose.pos, pose.heading, -CAM_BACK), up, CAM_UP), cross(pose.heading, up), CAM_SIDE * side),
    aim: unit(add(scale(pose.heading, Math.cos(CAM_PITCH)), up, -Math.sin(CAM_PITCH))),
    up,
  }
}

/** The nearest target that is in the crosshair's cone, or so close that aim no longer matters. Distance is in planet radii. */
export function pickTarget(pose: Pose, ids: readonly string[]): { id: string; distance: number; inRange: boolean } | null {
  const { eye, aim } = chase(pose)
  let best: { id: string; distance: number; inRange: boolean } | null = null
  for (const id of ids) {
    const spot = SPOTS[id]
    if (!spot) continue
    const distance = len(add(spot.at, pose.pos, -1))
    const aimed = dot(unit(add(spot.at, eye, -1)), aim) >= AIM_COS
    if ((aimed || distance <= spot.range / 2) && (!best || distance < best.distance)) best = { id, distance, inRange: distance <= spot.range }
  }
  return best
}

/**
 * The focus to report after `dt` more seconds. `held_s` counts up to the target's `hold_s` while the player
 * holds interact on an in-range target that is still to do (not finished, not locked), and drops to 0 otherwise.
 * `unit_m`: metres per planet radius.
 */
export function nextFocus(
  prev: HudFocus | null,
  pose: Pose,
  targets: readonly FlightTarget[],
  done: readonly string[],
  holding: boolean,
  dt: number,
  unit_m: number,
): HudFocus | null {
  const pick = pickTarget(pose, targets.map((t) => t.id))
  const target = targets.find((t) => t.id === pick?.id)
  if (!pick || !target) return null
  const open = !done.includes(target.id) && target.requires.every((id) => done.includes(id))
  const held_s = holding && open && pick.inRange ? Math.min(target.hold_s, (prev?.id === target.id ? prev.held_s : 0) + dt) : 0
  return { id: target.id, distance_m: Math.round((pick.distance * unit_m) / 1000) * 1000, inRange: pick.inRange, held_s }
}
