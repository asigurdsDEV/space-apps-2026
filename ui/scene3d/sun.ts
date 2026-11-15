// Where the real Sun stands over the Earth at a moment, so every view of the Earth can light the side that really has daylight.
import { cross, unit, without } from './sky'

const RAD = Math.PI / 180
type Vec3 = [number, number, number]

/** The point on Earth with the Sun straight overhead: [latitude, east longitude] in degrees. Good to about one degree. */
export function subsolarPoint(date: Date): [number, number] {
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const day = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000 + hours / 24
  const b = (2 * Math.PI * (day - 81)) / 364
  // The Sun runs up to 16 minutes early or late against the clock over a year (the "equation of time").
  const early_min = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const lat = 23.44 * Math.sin((2 * Math.PI * (day - 81)) / 365)
  const lon = -15 * (hours - 12 + early_min / 60)
  return [lat, ((lon + 540) % 360) - 180]
}

/** Unit vector to the Sun in the Earth map's own frame, the one `mapUv` in shaders.ts reads: longitude 0 on +X, east toward -Z, north on +Y. */
export function sunDirection(date: Date): Vec3 {
  const [lat, lon] = subsolarPoint(date)
  const c = Math.cos(lat * RAD)
  return [c * Math.cos(lon * RAD), Math.sin(lat * RAD), -c * Math.sin(lon * RAD)]
}

/** The scene Sun that lets the Earth stand pole-up (+Y): `compass` swung up or down to the real Sun's height over the equator. */
export function uprightSun(sunInMap: Vec3, compass: Vec3): Vec3 {
  const height = unit(sunInMap)[1]
  const flat = Math.sqrt(1 - height * height)
  const [x, , z] = without(compass, [0, 1, 0])
  return [x * flat, height, z * flat]
}

/**
 * How to turn an Earth globe drawn in the map frame so the real daylight faces the scene's Sun: a quaternion [x, y, z, w]
 * that takes `sunInMap` (from `sunDirection`) onto `sunInScene`, with the north pole as near `poleHint` as that allows.
 * The pole leans toward or away from the Sun by the real amount for the date. Spin the globe about its own +Y after this.
 */
export function earthOrientation(sunInMap: Vec3, sunInScene: Vec3, poleHint: Vec3 = [0, 1, 0]): [number, number, number, number] {
  // The Sun, the pole's side of it, and the third axis: the rotation carries the map's three onto the scene's three.
  // unit(): a Sun vector typed to four decimals is off by 2e-5, enough to turn the globe 28 degrees wrong near a half turn.
  const axes = (anySun: Vec3, pole: Vec3) => {
    const sun = unit(anySun)
    return [sun, without(pole, sun), cross(sun, without(pole, sun))]
  }
  const from = axes(sunInMap, [0, 1, 0])
  const to = axes(sunInScene, poleHint)
  const m = (row: number, col: number) => to[0][row] * from[0][col] + to[1][row] * from[1][col] + to[2][row] * from[2][col]
  // shortcut: can lose the signs at an exact half turn, a moment that comes once a day and lasts under a microsecond; use the four-branch form if that matters.
  const half = (a: number, b: number, c: number) => Math.sqrt(Math.max(0, 1 + a * m(0, 0) + b * m(1, 1) + c * m(2, 2))) / 2
  const sign = (x: number) => (x < 0 ? -1 : 1)
  return [half(1, -1, -1) * sign(m(2, 1) - m(1, 2)), half(-1, 1, -1) * sign(m(0, 2) - m(2, 0)), half(-1, -1, 1) * sign(m(1, 0) - m(0, 1)), half(1, 1, 1)]
}
