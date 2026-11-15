// What the mission control wall screens work out from the design before drawing it. Pure: no canvas, no three.js.

import type { Body } from '../scene3d/model'
import type { Metrics } from '../../shared'

/** One turn of the body under the orbit (sidereal), seconds. */
export const BODY_DAY_S: Record<Body, number> = { earth: 86_164, moon: 2_360_592, mars: 88_643 }

const wrap = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180

/** How far west (degrees) each pass crosses the equator after the one before: the body turns under the orbit. */
export const westShift = (period_s: number, day_s: number) => (360 * period_s) / day_s

/** Passes to draw so the track shows how the orbit covers the ground: three for a low orbit, more where the body turns slowly (the Moon). */
export function trackRevs(period_s: number, day_s: number): number {
  return Math.max(3, Math.min(14, Math.round(60 / westShift(period_s, day_s))))
}

/**
 * Where a circular orbit passes over the ground: [longitude, latitude] in degrees, `steps` points per pass,
 * starting northbound over the equator at `lon0`. An orbit as slow as the body's day (geostationary) stays on one spot.
 */
export function groundTrack(inclination_rad: number, period_s: number, day_s: number, revs: number, steps = 96, lon0 = 0): [number, number][] {
  const out: [number, number][] = []
  const si = Math.sin(inclination_rad)
  const ci = Math.cos(inclination_rad)
  for (let k = 0; k <= revs * steps; k++) {
    const u = (k / steps) * 2 * Math.PI
    const lat = Math.asin(si * Math.sin(u))
    const lon = Math.atan2(ci * Math.sin(u), Math.cos(u))
    out.push([wrap(lon0 + (lon * 180) / Math.PI - westShift(period_s, day_s) * (k / steps)), (lat * 180) / Math.PI])
  }
  return out
}

/** The track cut where it leaves one edge of the map and comes back on the other, so no line is drawn across the map. */
export function trackLines(points: readonly [number, number][]): [number, number][][] {
  const lines: [number, number][][] = []
  let line: [number, number][] = []
  points.forEach((p, i) => {
    if (i && Math.abs(p[0] - points[i - 1]![0]) > 180) {
      lines.push(line)
      line = []
    }
    line.push(p)
  })
  lines.push(line)
  return lines.filter((l) => l.length > 1)
}

export interface Phase {
  label: string
  days: number
}

export interface FlightPlan {
  /** Build, cruise (only if the orbit is far away), science: in order, each with its length. */
  phases: Phase[]
  /** ISO days (YYYY-MM-DD) when known. */
  launch?: string
  end?: string
  /** Months the launch window allows for building; 0 when the mission has no deadline. */
  deadline_months: number
}

const MONTH_DAYS = 30.44
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** The mission from first bolt to last downlink, from the sim's own numbers. */
export function flightPlan(metrics: Metrics, launchUtc?: string): FlightPlan {
  const cruise = n(metrics.cruise_days)
  const mission = n(metrics.mission_days)
  const phases: Phase[] = [{ label: 'Build', days: n(metrics.schedule_months) * MONTH_DAYS }]
  if (cruise > 0) phases.push({ label: 'Cruise', days: cruise })
  phases.push({ label: 'Science', days: Math.max(0, mission - cruise) })
  const t0 = launchUtc ? Date.parse(launchUtc) : NaN
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  return {
    phases,
    launch: Number.isNaN(t0) ? undefined : day(t0),
    end: Number.isNaN(t0) ? undefined : day(t0 + mission * 86_400_000),
    deadline_months: n(metrics.deadline_months),
  }
}
