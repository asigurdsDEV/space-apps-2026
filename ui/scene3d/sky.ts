// What else is in the sky around each body, at its real size and distance. No three.js here.
// Numbers are from NASA's planetary fact sheets:
//   https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
//   https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html (Phobos and Deimos)
import { BODY_RADIUS_M, type Body } from './model'

type Vec3 = [number, number, number]

export interface Companion {
  name: string
  /** A body the planet shader draws, or a small dark rock. */
  look: Body | 'rock'
  /** Centre to centre, in radii of the body being orbited (world.ts draws that body with radius 1). */
  distance: number
  /** Half-axes in the same unit: [along the orbit, pole to pole, towards the planet]. */
  size: Vec3
  /** Laps around the planet for each turn of the planet on its axis. */
  lapsPerSpin: number
  /** Turns on its own axis per turn of the planet. Left out: one face always points at the planet. */
  turnsPerSpin?: number
  /** `equator`: circles over the planet's equator. `ecliptic`: circles in the plane that holds the Sun. */
  plane: 'equator' | 'ecliptic'
  /** Where it starts, in radians around the orbit from the Sun's side. */
  phase: number
}

const MOON_ORBIT_M = 384_400_000
const MOON_MONTH_D = 27.3217 // one orbit, and one turn on its axis
const EARTH_DAY_D = 0.99727
const MARS_DAY_D = 1.02596
const ball = (radius_m: number, around: Body): Vec3 => [radius_m / BODY_RADIUS_M[around], radius_m / BODY_RADIUS_M[around], radius_m / BODY_RADIUS_M[around]]
const km = (half_axes_km: Vec3, around: Body) => half_axes_km.map((a) => (a * 1000) / BODY_RADIUS_M[around]) as Vec3

export const COMPANIONS: Record<Body, Companion[]> = {
  earth: [
    { name: 'the Moon', look: 'moon', distance: MOON_ORBIT_M / BODY_RADIUS_M.earth, size: ball(BODY_RADIUS_M.moon, 'earth'), lapsPerSpin: EARTH_DAY_D / MOON_MONTH_D, plane: 'ecliptic', phase: 2.27 },
  ],
  moon: [
    // The Moon keeps one face to Earth, so from lunar orbit Earth stays over the same ground while it turns once a day.
    { name: 'Earth', look: 'earth', distance: MOON_ORBIT_M / BODY_RADIUS_M.moon, size: ball(BODY_RADIUS_M.earth, 'moon'), lapsPerSpin: 1, turnsPerSpin: MOON_MONTH_D / EARTH_DAY_D, plane: 'ecliptic', phase: 2.0 },
  ],
  mars: [
    // Phobos laps Mars three times a Martian day, so from the ground it rises in the west.
    { name: 'Phobos', look: 'rock', distance: 9_378_000 / BODY_RADIUS_M.mars, size: km([11.4, 9.1, 13.0], 'mars'), lapsPerSpin: MARS_DAY_D / 0.31891, plane: 'equator', phase: 2.4 },
    { name: 'Deimos', look: 'rock', distance: 23_459_000 / BODY_RADIUS_M.mars, size: km([6.0, 5.1, 7.8], 'mars'), lapsPerSpin: MARS_DAY_D / 1.26244, plane: 'equator', phase: 4.1 },
  ],
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / length, a[1] / length, a[2] / length]
}
/** The unit vector of `a` with its part along `axis` taken out. */
export const without = (a: Vec3, axis: Vec3): Vec3 => unit([a[0] - dot(a, axis) * axis[0], a[1] - dot(a, axis) * axis[1], a[2] - dot(a, axis) * axis[2]])

/**
 * Where a companion is, in planet radii, with the planet's north pole along +y.
 * `spin` is how far the planet has turned (radians); `sun` is the unit vector to the Sun.
 * Everything here orbits the same way its planet turns.
 */
export function companionPosition(c: Companion, spin: number, sun: Vec3): Vec3 {
  const north: Vec3 = [0, 1, 0]
  const normal = c.plane === 'equator' ? north : without(north, sun)
  const start = c.plane === 'equator' ? without(sun, north) : sun
  const ahead = cross(normal, start)
  const angle = c.phase + spin * c.lapsPerSpin
  return [0, 1, 2].map((i) => c.distance * (Math.cos(angle) * start[i] + Math.sin(angle) * ahead[i])) as Vec3
}
