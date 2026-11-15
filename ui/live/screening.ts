// Close-approach screening: how near does any tracked object pass to one satellite in the next 100 minutes?
// A screening from public orbit data, not an official conjunction warning: see README.md for what it can and cannot say.
import { altitudeBand, epochIso } from './elements'
import type { Tracked } from './propagate'

export const WINDOW_MINUTES = 100
/** Element sets older than this are left out of the closest-pass search: their position is off by tens of km. */
export const MAX_AGE_DAYS = 10
const STEP_MS = 30_000
// A coarse sample can sit this far above the true closest point and still be worth refining (orbits curve about 4 km in 30 s).
const REFINE_MARGIN_KM = 50
// Mean-element heights wobble about 10 km either way, so a band this far off can still reach the satellite.
const BAND_SLACK_KM = 25
const SLICE_MS = 4
const GOLDEN = (Math.sqrt(5) - 1) / 2

export interface Screening {
  /** The nearest pass found, or null when nothing could be propagated. */
  closest: {
    name: string
    /** NORAD catalogue number. */
    id: number
    /** Index into the `others` list. */
    index: number
    distanceKm: number
    /** ISO UTC time of the pass, and the same as minutes after `from`. */
    at: string
    inMinutes: number
    /** How old that object's orbit data was at `from`. */
    elementsAgeDays: number
  } | null
  /** Objects whose lowest-to-highest height range overlaps the satellite's own. */
  sharingAltitude: number
  /** The satellite's own height range, km. */
  band: { lowKm: number; highKm: number }
  /** Objects searched for the closest pass, and objects left out because their orbit data was older than MAX_AGE_DAYS. */
  screened: number
  tooOld: number
  /** ISO UTC start of the search, which runs WINDOW_MINUTES from here. */
  from: string
  windowMinutes: number
}

const a = new Float64Array(3)
const b = new Float64Array(3)

/**
 * Closest approach between `target.elements[targetIndex]` and every object in `others` over the next 100 minutes:
 * a 30-second sweep, then a fine search around each dip that could beat the best so far. It works in slices of
 * about 4 ms so the globe keeps drawing; about half a second in all for 2,700 objects. Null when `signal` aborts
 * or the satellite itself cannot be propagated.
 */
export async function screenApproaches(target: Tracked, targetIndex: number, others: Tracked, from: Date, signal?: AbortSignal): Promise<Screening | null> {
  const startMs = from.getTime()
  const steps = (WINDOW_MINUTES * 60_000) / STEP_MS
  // One sample before and after the window, so a dip right at an edge is still seen as a dip.
  const samples = steps + 3
  const track = new Float64Array(samples * 3)
  for (let k = 0; k < samples; k++) {
    if (!target.kmAt(targetIndex, startMs + (k - 1) * STEP_MS, a)) return null
    track.set(a, k * 3)
  }
  const distanceAt = (index: number, timeMs: number): number =>
    target.kmAt(targetIndex, timeMs, a) && others.kmAt(index, timeMs, b) ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : Infinity

  const own = target.elements[targetIndex]
  const band = altitudeBand(own)
  const gaps = others.elements.map((el) => {
    const other = altitudeBand(el)
    return Math.max(0, other.lowKm - band.highKm, band.lowKm - other.highKm)
  })
  const ageDays = (index: number) => (startMs - Date.parse(epochIso(others.elements[index]))) / 86_400_000
  // Nearest height range first: once a range is further off than the best pass found, nothing after it can beat it.
  const order = gaps.map((_, i) => i).filter((i) => others.elements[i].NORAD_CAT_ID !== own.NORAD_CAT_ID && ageDays(i) <= MAX_AGE_DAYS).sort((p, q) => gaps[p] - gaps[q])

  const d = new Float64Array(samples)
  let best = Infinity
  let bestIndex = -1
  let bestMs = 0
  let sliceStart = performance.now()
  for (const i of order) {
    if (gaps[i] - BAND_SLACK_KM > best) break
    for (let k = 0; k < samples; k++) {
      d[k] = others.kmAt(i, startMs + (k - 1) * STEP_MS, b) ? Math.hypot(track[k * 3] - b[0], track[k * 3 + 1] - b[1], track[k * 3 + 2] - b[2]) : Infinity
    }
    for (let k = 1; k <= steps + 1; k++) {
      if (d[k] < best) {
        best = d[k]
        bestIndex = i
        bestMs = startMs + (k - 1) * STEP_MS
      }
      if (!(d[k] <= d[k - 1] && d[k] <= d[k + 1]) || d[k + 1] === Infinity || d[k - 1] === Infinity) continue
      // Squared distance is a parabola in time while both move in straight lines: its lowest point estimates the real dip.
      const before = d[k - 1] ** 2
      const here = d[k] ** 2
      const after = d[k + 1] ** 2
      const bend = before - 2 * here + after
      const dip = bend > 0 ? Math.sqrt(Math.max(0, here - (after - before) ** 2 / (8 * bend))) : d[k]
      if (dip > best + REFINE_MARGIN_KM) continue
      // Golden-section search for the lowest distance within one step either side, kept inside the window.
      let lo = Math.max(startMs, startMs + (k - 2) * STEP_MS)
      let hi = Math.min(startMs + steps * STEP_MS, startMs + k * STEP_MS)
      let left = hi - GOLDEN * (hi - lo)
      let right = lo + GOLDEN * (hi - lo)
      let atLeft = distanceAt(i, left)
      let atRight = distanceAt(i, right)
      while (hi - lo > 2) {
        if (atLeft < atRight) {
          hi = right
          right = left
          atRight = atLeft
          left = hi - GOLDEN * (hi - lo)
          atLeft = distanceAt(i, left)
        } else {
          lo = left
          left = right
          atLeft = atRight
          right = lo + GOLDEN * (hi - lo)
          atRight = distanceAt(i, right)
        }
      }
      if (Math.min(atLeft, atRight) < best) {
        best = Math.min(atLeft, atRight)
        bestIndex = i
        bestMs = atLeft < atRight ? left : right
      }
    }
    if (performance.now() - sliceStart > SLICE_MS) {
      await new Promise((resolve) => setTimeout(resolve))
      if (signal?.aborted) return null
      sliceStart = performance.now()
    }
  }

  return {
    closest: bestIndex < 0 ? null : {
      name: others.elements[bestIndex].OBJECT_NAME,
      id: others.elements[bestIndex].NORAD_CAT_ID,
      index: bestIndex,
      distanceKm: best,
      at: new Date(bestMs).toISOString(),
      inMinutes: (bestMs - startMs) / 60_000,
      elementsAgeDays: ageDays(bestIndex),
    },
    sharingAltitude: gaps.filter((gap) => gap === 0).length,
    band,
    screened: order.length,
    tooOld: gaps.filter((_, i) => ageDays(i) > MAX_AGE_DAYS).length,
    from: from.toISOString(),
    windowMinutes: WINDOW_MINUTES,
  }
}
