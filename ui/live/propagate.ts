// Where each object is at a moment: SGP4 (the model the published elements are made for), from satellite.js,
// which is downloaded only when this screen first needs it.
import { EARTH_RADIUS_KM, periodMinutes, type Elements } from './elements'

type Sgp4Library = typeof import('satellite.js')
let library: Promise<Sgp4Library> | undefined

/** One object at one moment. */
export interface SatState {
  /** Degrees, north and east positive, of the point on the ground straight below. */
  lat: number
  lon: number
  /** Height above the WGS-84 ellipsoid, km. */
  altKm: number
  /** Speed around the Earth (not over the ground), km/s. */
  speedKmS: number
  /** Position in Earth radii in the globe's own frame (see `positions`). */
  position: [number, number, number]
}

/** Anything the close-approach screening can follow. */
export interface Tracked {
  readonly elements: readonly Elements[]
  /** Writes object `index`'s position at `timeMs` (Unix ms) into out[0..2], km, inertial (TEME). False when it cannot be propagated. */
  kmAt(index: number, timeMs: number, out: Float64Array): boolean
}

export interface Orbits extends Tracked {
  /**
   * Writes every object's position at `at` into `out` (3 numbers each, so `out.length >= 3 * elements.length`) and
   * returns how many could be placed. Units are Earth radii in the Earth-fixed frame the bundled Earth map uses
   * (ui/scene3d `mapUv`): longitude 0 on +X, north on +Y, east towards -Z. Put the points inside the group that
   * holds the globe and they sit over the right ground. An object that cannot be propagated is written at 0,0,0,
   * inside the globe.
   */
  positions(at: Date, out: Float32Array): number
  /** Latitude, longitude, height and speed of one object, or null when it cannot be propagated. Allocates: call it for the picked object a few times a second, not per frame for all. */
  state(index: number, at: Date): SatState | null
  /**
   * One lap of object `index` starting at `at`, as `out.length / 3` points in the same frame and units as `positions`.
   * It is the orbit as it stands in space at `at`, a closed ring, so redraw it every ten seconds or so as the Earth
   * turns under it. False when the object cannot be propagated.
   */
  ring(index: number, at: Date, out: Float32Array): boolean
}

const UNIX_EPOCH_JD = 2440587.5
const scratch = new Float64Array(3)

/** Prepares a list of objects for propagation. The first call downloads satellite.js; null when that download fails (say positions are unavailable). */
export async function loadOrbits(elements: readonly Elements[]): Promise<Orbits | null> {
  const loaded = await (library ??= import('satellite.js')).catch(() => {
    library = undefined
    return null
  })
  if (!loaded) return null
  const lib = loaded
  const records = elements.map((el) => {
    try { return lib.json2satrec({ ...el, OBJECT_ID: '', ELEMENT_SET_NO: 0 }) } catch { return null }
  })
  const epochMs = Float64Array.from(records, (record) => (record ? (record.jdsatepoch - UNIX_EPOCH_JD) * 86_400_000 : 0))

  function kmAt(index: number, timeMs: number, out: Float64Array): boolean {
    const record = records[index]
    const found = record ? lib.sgp4(record, (timeMs - epochMs[index]) / 60_000) : null
    if (!found || !Number.isFinite(found.position.x + found.position.y + found.position.z)) return false
    out[0] = found.position.x
    out[1] = found.position.y
    out[2] = found.position.z
    return true
  }

  /** Inertial km in `scratch` to Earth radii in the map frame, with the Earth turned by `cos`/`sin` of the sidereal angle. */
  function place(out: Float32Array, at: number, cos: number, sin: number): void {
    out[at] = (cos * scratch[0] + sin * scratch[1]) / EARTH_RADIUS_KM
    out[at + 1] = scratch[2] / EARTH_RADIUS_KM
    out[at + 2] = (sin * scratch[0] - cos * scratch[1]) / EARTH_RADIUS_KM
  }

  return {
    elements,
    kmAt,
    positions(at, out) {
      const turn = lib.gstime(at)
      const cos = Math.cos(turn)
      const sin = Math.sin(turn)
      const timeMs = at.getTime()
      let placed = 0
      for (let i = 0; i < records.length; i++) {
        if (kmAt(i, timeMs, scratch)) {
          place(out, i * 3, cos, sin)
          placed++
        } else {
          out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = 0
        }
      }
      return placed
    },
    state(index, at) {
      const record = records[index]
      const found = record ? lib.sgp4(record, (at.getTime() - epochMs[index]) / 60_000) : null
      if (!found || !Number.isFinite(found.position.x + found.position.y + found.position.z)) return null
      scratch[0] = found.position.x
      scratch[1] = found.position.y
      scratch[2] = found.position.z
      const turn = lib.gstime(at)
      const ground = lib.eciToGeodetic(found.position, turn)
      const position = new Float32Array(3)
      place(position, 0, Math.cos(turn), Math.sin(turn))
      return {
        lat: lib.radiansToDegrees(ground.latitude),
        lon: lib.radiansToDegrees(ground.longitude),
        altKm: ground.height,
        speedKmS: Math.hypot(found.velocity.x, found.velocity.y, found.velocity.z),
        position: [position[0], position[1], position[2]],
      }
    },
    ring(index, at, out) {
      const turn = lib.gstime(at)
      const cos = Math.cos(turn)
      const sin = Math.sin(turn)
      const points = Math.floor(out.length / 3)
      const lapMs = periodMinutes(elements[index]) * 60_000
      for (let k = 0; k < points; k++) {
        if (!kmAt(index, at.getTime() + (lapMs * k) / (points - 1), scratch)) return false
        place(out, k * 3, cos, sin)
      }
      return true
    },
  }
}
