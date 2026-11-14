// Pure: where the rocket is at a mission time. One typical ascent to a 200 km parking orbit, shared
// by every vehicle. It is a picture of the climb, not the sim: the sim only rolls launch success.

type Key = readonly [t: number, value: number]

/** Smooth interpolation through keyframes; flat before the first and after the last. */
function through(keys: readonly Key[], t: number): number {
  if (t <= keys[0]![0]) return keys[0]![1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]!
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]!
      const u = (t - t0) / (t1 - t0)
      // Smoothstep toward the ends only, so the curve has no flat spots in the middle.
      const first = i === 1
      const last = i === keys.length - 1
      const s = first && last ? u * u * (3 - 2 * u) : first ? u * u : last ? 1 - (1 - u) * (1 - u) : u
      return v0 + (v1 - v0) * s
    }
  }
  return keys[keys.length - 1]![1]
}

const ALTITUDE: Key[] = [[0, 0], [8, 110], [20, 1_100], [40, 4_200], [72, 12_000], [110, 36_000], [145, 68_000], [195, 110_000], [300, 160_000], [520, 200_000]]
const PITCH_DEG: Key[] = [[12, 0], [22, 7], [72, 38], [145, 64], [300, 82], [520, 90]]
const AIR_PITCH_DEG: Key[] = [[5, 90], [12, 62], [25, 48], [72, 45], [145, 64], [300, 82], [520, 90]]
const DOWNRANGE: Key[] = [[12, 0], [22, 60], [40, 700], [72, 6_000], [145, 70_000], [195, 170_000], [300, 500_000], [520, 1_900_000]]
const AIR_LAUNCH_M = 12_000

/** Height above the ground, meters. An air launch starts at the carrier aircraft's altitude. */
export function altitudeM(met: number, airLaunch = false): number {
  return airLaunch ? AIR_LAUNCH_M + through(ALTITUDE, Math.max(met - 5, 0)) * 0.94 : through(ALTITUDE, met)
}

/** Tilt away from straight up, radians: 0 on the pad, a quarter turn (flying level) in orbit. */
export function pitchRad(met: number, airLaunch = false): number {
  return (through(airLaunch ? AIR_PITCH_DEG : PITCH_DEG, met) * Math.PI) / 180
}

/** Distance flown over the ground, meters; orbital speed once in orbit. */
export function downrangeM(met: number): number {
  return through(DOWNRANGE, met) + 7_800 * Math.max(met - 520, 0)
}

/** 0 in thick air, 1 where there is practically none (about 60 km up): how far the exhaust spreads. */
export function vacuum(altitude_m: number): number {
  const u = Math.min(1, Math.max(0, (altitude_m - 8_000) / 52_000))
  return u * u * (3 - 2 * u)
}
