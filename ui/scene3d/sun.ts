// Where the real Sun stands over the Earth at a moment, so every view of the Earth can light the side that really has daylight.
const RAD = Math.PI / 180

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
export function sunDirection(date: Date): [number, number, number] {
  const [lat, lon] = subsolarPoint(date)
  const c = Math.cos(lat * RAD)
  return [c * Math.cos(lon * RAD), Math.sin(lat * RAD), -c * Math.sin(lon * RAD)]
}
