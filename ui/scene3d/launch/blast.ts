// The vehicle blown up by range safety, as photos of real ones show it (Firefly Alpha's first flight, 2021): a flash,
// a fireball of burning propellant churning into black soot, a white cloud of vapour round it, and burning pieces
// thrown out on arcs, each drawing a thin white smoke trail, the nose section carried on up the flight path.
// Pure placement: the scene adds the puffs every frame from the seconds since the blast.
import * as THREE from 'three'
import type { Puffs } from './fx'

const hash = (i: number) => {
  const s = Math.sin(i * 91.7 + 47.3) * 43758.5453
  return s - Math.floor(s)
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export const PIECES = 30
/** Puffs of the fireball itself. */
export const FIREBALL = 72
/** Puffs of white vapour round the fireball. */
export const SHELL = 36
/** Smoke puffs along each piece's trail, densest at its burning head. */
export const TRAIL = 56
/** The pieces' smoke trails reach back this many seconds. */
const TRAIL_S = 2

/** A direction spread evenly over the sphere for puff `i`, into `out`. */
function sphere(i: number, out: THREE.Vector3): THREE.Vector3 {
  const y = 2 * hash(i + 0.13) - 1
  const a = hash(i + 0.57) * Math.PI * 2
  const r = Math.sqrt(1 - y * y)
  return out.set(Math.cos(a) * r, y, Math.sin(a) * r)
}

const dir = new THREE.Vector3()
const v = new THREE.Vector3()
const p = new THREE.Vector3()

/**
 * Where piece `i` is `t` seconds after the blast: flung out at `at`, slowed by the air, falling. Piece 0 is the nose,
 * still going up the flight path `up`. `H` is the vehicle's height in scene units.
 */
export function piecePos(i: number, t: number, at: THREE.Vector3, up: THREE.Vector3, H: number, out: THREE.Vector3): THREE.Vector3 {
  if (i === 0) v.copy(up).multiplyScalar(H * 2.2)
  else sphere(i + 40, v).addScaledVector(up, 0.35).normalize().multiplyScalar(H * (0.9 + 2.4 * hash(i + 0.31)))
  const drag = i === 0 ? 0.35 : 0.7 + 0.6 * hash(i + 0.77)
  const gone = (1 - Math.exp(-drag * t)) / drag
  // About real gravity for a rocket some 60 m tall: 0.16 of its height per second, per second.
  return out.copy(at).addScaledVector(v, gone).setY(at.y + v.y * gone - 0.5 * 0.16 * H * t * t)
}

/**
 * Adds the blast `s` seconds after it went off: fire into `fire` (burning puffs), the vapour cloud and the debris
 * trails into `trails` (wisps). `at` is the middle of the vehicle, `up` its heading.
 */
export function addBlast(s: number, at: THREE.Vector3, up: THREE.Vector3, H: number, fire: Puffs, trails: Puffs): void {
  if (s < 0) return
  // The flash: one white-hot ball for the first instant.
  if (s < 0.3) fire.add(at.x, at.y, at.z, H * (0.4 + 1.3 * Math.sqrt(s)), 1 - s / 0.3, 1.3, 0.31)
  // The fireball: thrown out fast and stopped by the air within a second, swelling, stretched a little along the way
  // it was flying, rising as it cools. The outer puffs burn out first and hang on as soot; the core burns longest.
  for (let i = 0; i < FIREBALL; i++) {
    sphere(i, dir).addScaledVector(up, 0.45 * (hash(i + 0.9) - 0.3))
    const out = 0.15 + 0.85 * Math.pow(hash(i + 0.2), 0.7)
    const reach = H * 0.8 * out * (1 - Math.exp(-s * 3.5))
    const size = H * (0.14 + 0.22 * hash(i + 0.4)) * (0.55 + 0.95 * Math.sqrt(s))
    const heat = 1.45 * Math.exp(-s * (0.4 + 0.85 * out + 0.3 * hash(i + 0.6))) * (1.3 - 0.6 * out)
    p.copy(at).addScaledVector(dir, reach)
    p.y += 0.035 * H * s * s
    fire.add(p.x, p.y, p.z, size, clamp01(1.1 - s / 10), heat, hash(i + 0.8) + s * 0.012)
  }
  // The white cloud round it: propellant vapour and the trail's smoke blown outward, mostly below and behind the fire.
  for (let i = 0; i < SHELL; i++) {
    sphere(i + 90, dir).addScaledVector(up, -0.7).normalize()
    const reach = H * (0.5 + 0.9 * hash(i + 0.15)) * (1 - Math.exp(-s * 1.4))
    p.copy(at).addScaledVector(dir, reach)
    p.y += 0.02 * H * s * s
    trails.add(p.x, p.y, p.z, H * (0.3 + 0.35 * hash(i + 0.35)) * (0.5 + Math.sqrt(s)), 0.55 * clamp01(s * 3) * clamp01(1.3 - s / 12), 0.35 * Math.exp(-s * 0.9), hash(i + 0.55))
  }
  // The pieces: a burning head each, and a trail of white smoke that thickens and drifts as it ages.
  for (let i = 0; i < PIECES; i++) {
    const lit = 1 - clamp01((s - 2.5 - 4 * hash(i + 0.66)) / 0.6) // most burn out before they fall far
    if (lit > 0) {
      piecePos(i, s, at, up, H, p)
      const big = i === 0 ? 2.4 : 0.7 + 0.7 * hash(i + 0.44)
      fire.add(p.x, p.y, p.z, H * 0.04 * big, lit, 1.1, hash(i + 0.21) + s * 0.05)
    }
    for (let j = 0; j < TRAIL; j++) {
      // Samples bunch up at the head, where the trail is thin and bright, and spread out behind, where it is wide.
      const back = TRAIL_S * Math.pow(j / (TRAIL - 1), 1.35)
      const t = s - back
      if (t < 0.05) break
      piecePos(i, t, at, up, H, p)
      const age = back
      const wide = H * (i === 0 ? 0.06 : 0.036) * (1 + 3 * age)
      p.y += 0.02 * H * age
      trails.add(p.x, p.y, p.z, wide, 0.7 * (1 - j / TRAIL) * clamp01(lit + 0.6), 0.25 * Math.exp(-age * 6) * lit, hash(i * 7 + j))
    }
  }
}

/** How brightly the blast's fire lights its surroundings `s` seconds after it went off, 0 to 1. */
export const blastGlow = (s: number) => (s < 0 ? 0 : clamp01(1.4 * Math.exp(-s * 0.5)))
