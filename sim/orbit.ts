// Circular-orbit helpers. Good enough for a teaching game: no perturbations, no inclination.
// SI units: metres, seconds.

import type { Vec3 } from '../shared'

export interface Body {
  name: string
  /** Gravitational parameter, m^3/s^2. */
  mu_m3s2: number
  radius_m: number
}

/** Keyed by the orbit catalog's `central_body`. */
export const BODIES: Record<string, Body> = {
  earth: { name: 'Earth', mu_m3s2: 3.986004418e14, radius_m: 6.371e6 },
  moon: { name: 'Moon', mu_m3s2: 4.9048695e12, radius_m: 1.7374e6 },
  mars: { name: 'Mars', mu_m3s2: 4.282837e13, radius_m: 3.3895e6 },
}

/** Unknown body names fall back to Earth. */
export function bodyOf(id: string): Body {
  return BODIES[id] ?? BODIES.earth
}

export function orbitRadiusM(bodyId: string, altitude_m: number): number {
  return bodyOf(bodyId).radius_m + Math.max(0, altitude_m)
}

export function orbitPeriodS(bodyId: string, altitude_m: number): number {
  const r = orbitRadiusM(bodyId, altitude_m)
  return 2 * Math.PI * Math.sqrt((r * r * r) / bodyOf(bodyId).mu_m3s2)
}

/** Position and velocity on a circular orbit in the x-y plane, body at the origin. */
export function circularState(
  bodyId: string,
  altitude_m: number,
  t_s: number,
): { position: Vec3; velocity: Vec3 } {
  const r = orbitRadiusM(bodyId, altitude_m)
  const speed = Math.sqrt(bodyOf(bodyId).mu_m3s2 / r)
  const angle = (speed / r) * t_s
  return {
    position: [r * Math.cos(angle), r * Math.sin(angle), 0],
    velocity: [-speed * Math.sin(angle), speed * Math.cos(angle), 0],
  }
}

/**
 * Where to draw the spacecraft while it climbs to its orbit: a spiral from the
 * surface out to the final radius. `progress` runs from 0 to 1. Not real physics.
 */
export function transferState(
  bodyId: string,
  altitude_m: number,
  progress: number,
): { position: Vec3; velocity: Vec3 } {
  const p = Math.min(1, Math.max(0, progress))
  const r0 = bodyOf(bodyId).radius_m
  const r = r0 + (orbitRadiusM(bodyId, altitude_m) - r0) * p
  const angle = p * 3 * Math.PI
  const speed = Math.sqrt(bodyOf(bodyId).mu_m3s2 / r)
  return {
    position: [r * Math.cos(angle), r * Math.sin(angle), 0],
    velocity: [-speed * Math.sin(angle), speed * Math.cos(angle), 0],
  }
}
