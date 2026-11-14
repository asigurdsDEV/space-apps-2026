// First-person walking and aiming (decision 007). Pure: no three.js, no DOM, so it is cheap to test.
// Axes as in three.js: y up, the camera looks down −z when yaw = 0, yaw turns left (counter-clockwise from above).

import type { Role } from '../../shared'

export type Vec3 = [number, number, number]

/** Something the player can use with E (CONTRACTS.md → Interactables). */
export interface Interactable {
  id: string
  at: Vec3
  /** Metres; default REACH. */
  reach?: number
  /** The prompt after "E · ", at most 4 words. */
  label: string
  /** The role that owns it; the controller asks `blocked` whether this player may use it. */
  role?: Role
  /** Why it can't be used now, at most 6 words. Shown instead of the label. */
  disabled?: string
  use: () => void
}

/** A box the player can't walk through. */
export interface Obstacle {
  min: Vec3
  max: Vec3
}

export const EYE = 1.7
/** Half the player's width, metres. */
export const RADIUS = 0.3
export const WALK_MS = 3.2
export const RUN_MS = 6
export const REACH = 2.2
/** How far off-centre (metres at the target) still counts as looking at it. */
const AIM_SLACK = 0.45
export const PITCH_LIMIT = 1.35

/** The flat direction the player faces, and their right hand. */
export function facing(yaw: number): { forward: [number, number]; right: [number, number] } {
  return { forward: [-Math.sin(yaw), -Math.cos(yaw)], right: [Math.cos(yaw), -Math.sin(yaw)] }
}

/** Where the eye looks: a unit vector. */
export function lookDir(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch)
  return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]
}

const blocks = (x: number, z: number, o: Obstacle) =>
  x + RADIUS > o.min[0] && x - RADIUS < o.max[0] && z + RADIUS > o.min[2] && z - RADIUS < o.max[2] && o.min[1] < EYE && o.max[1] > 0.05

/**
 * One frame of walking. `move` is -1..1 forward / right (keys or a thumb pad); diagonals are not faster.
 * Each axis is tried on its own, so the player slides along a wall instead of sticking to it.
 */
export function step(pos: Vec3, yaw: number, move: { forward: number; right: number }, dt: number, speed: number, obstacles: readonly Obstacle[]): Vec3 {
  const len = Math.hypot(move.forward, move.right)
  if (len === 0 || dt <= 0) return pos
  const k = (Math.min(dt, 0.1) * speed) / Math.max(1, len) // a long frame (tab switch) can't tunnel through a wall
  const { forward, right } = facing(yaw)
  const dx = (forward[0] * move.forward + right[0] * move.right) * k
  const dz = (forward[1] * move.forward + right[1] * move.right) * k
  let [x, , z] = pos
  if (!obstacles.some((o) => blocks(x + dx, z, o))) x += dx
  if (!obstacles.some((o) => blocks(x, z + dz, o))) z += dz
  return [x, pos[1], z]
}

/** How far above or below where you look still counts (radians), so desks and racks work without tilting your head. */
const AIM_UP_DOWN = 0.75

/**
 * The thing the player is looking at and can reach, if any: the one closest to the centre of the view.
 * Strict left-right (that's how you choose between neighbours), generous up-down.
 */
export function aimAt(eye: Vec3, dir: Vec3, items: readonly Interactable[]): Interactable | undefined {
  const flat = Math.hypot(dir[0], dir[2]) || 1
  const fx = dir[0] / flat
  const fz = dir[2] / flat
  const pitch = Math.atan2(dir[1], flat)
  let best: Interactable | undefined
  let bestScore = Infinity
  for (const it of items) {
    const v: Vec3 = [it.at[0] - eye[0], it.at[1] - eye[1], it.at[2] - eye[2]]
    if (Math.hypot(...v) > (it.reach ?? REACH)) continue
    const along = v[0] * fx + v[2] * fz
    if (along <= 0.05) continue
    const side = Math.abs(v[0] * fz - v[2] * fx)
    if (side > Math.max(AIM_SLACK, along * 0.14)) continue
    const upDown = Math.abs(Math.atan2(v[1], along) - pitch)
    if (upDown > AIM_UP_DOWN) continue
    const score = side / along + upDown * 0.3
    if (score < bestScore) {
      best = it
      bestScore = score
    }
  }
  return best
}

export const clampPitch = (p: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p))
