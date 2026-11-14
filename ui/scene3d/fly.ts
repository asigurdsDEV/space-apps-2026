// Pure: what the fly scene shows for a SimState, and the maths behind it (display clock, orbit and
// planet angles, ground stations, contact, shadow, part highlight, quality steps). No three.js here.
import type { SimState } from '../../shared'
import { BODY_NAMES, lapSeconds, type Body, type Power } from './model'

/** What <SpaceView> accepts: the builder's narrow state, or a whole SimState unchanged. */
export type FlyState = Pick<SimState, 'entities' | 'params'> & Partial<Pick<SimState, 't_s' | 'status' | 'metrics' | 'issues'>>
export type Phase = 'design' | 'cruise' | 'operations' | 'ended'
export type V3 = [number, number, number]

export interface Flight {
  /** Sim seconds. Undefined when the mission is not flying (the builder): the view then free-runs as before. */
  t_s?: number
  phase: Phase
  /** metrics.outcome as the sim wrote it: success, science_shortfall, launch_failure, spacecraft_failure, ... */
  outcome: string
  /** Ground stations the sim counts (1 to 6). */
  stations: number
  /** The state says there is a working radio and data for it to send. Without this no beam is ever drawn. */
  canDownlink: boolean
  /** The battery cannot carry the instruments through eclipse (sim rule "Battery"). */
  batteryShort: boolean
  /** When cruise ends, in sim seconds (0 when the orbit has no cruise). */
  cruise_s: number
  /** 0 to 1 through the cruise; 1 once in orbit. Hook for the transfer view. */
  cruise: number
  day: number
}

const fin = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const PHASES: readonly string[] = ['design', 'cruise', 'operations', 'ended']

export function flightOf(state: FlyState): Flight {
  const m = state.metrics ?? {}
  const t = fin(state.t_s)
  const named = typeof m.phase === 'string' ? m.phase : undefined
  // A state with a clock but no phase (a bare preview) is flying; a phase we do not know is not ours to draw.
  const phase: Phase =
    state.status === 'ended' ? 'ended' : named === undefined ? (t === undefined ? 'design' : 'operations') : PHASES.includes(named) ? (named as Phase) : 'design'
  const comms = state.entities.some((e) => e.kind === 'comms_system' && e.id === state.params.comms)
  const rate = fin(m.data_rate_bps)
  const perDay = fin(m.downlink_gb_per_day)
  const made = fin(m.data_generated_gb_per_day)
  const stored = fin(m.data_stored_gb)
  const picked = typeof state.params.instruments === 'string' ? state.params.instruments.split(',').map((s) => s.trim()) : []
  // Without metrics (narrow state) an instrument on board stands in for "has data".
  const hasData = made === undefined && stored === undefined ? state.entities.some((e) => e.kind === 'instrument' && picked.includes(e.id)) : (made ?? 0) > 0 || (stored ?? 0) > 0
  const have = fin(m.battery_wh)
  const need = fin(m.battery_needed_wh)
  const cruise_s = (fin(m.cruise_days) ?? 0) * 86_400
  return {
    t_s: phase === 'design' ? undefined : t,
    phase,
    outcome: typeof m.outcome === 'string' ? m.outcome : '',
    stations: clamp(Math.round(fin(m.ground_stations) ?? fin(state.params.ground_stations) ?? 1), 1, STATIONS.length),
    canDownlink: phase === 'operations' && comms && rate !== 0 && perDay !== 0 && hasData,
    batteryShort: !!state.issues?.some((i) => i.code === 'battery_small') || (have !== undefined && need !== undefined && have < need),
    cruise_s,
    cruise: phase === 'cruise' && cruise_s > 0 ? clamp((t ?? 0) / cruise_s, 0, 1) : 1,
    day: fin(m.mission_day) ?? (t ?? 0) / 86_400,
  }
}

// ------------------------------------------------------------ display clock

/** The last time the sim clock moved, and how fast: `rate` is sim seconds per real second. */
export interface Clock { t_s: number; wall_s: number; rate: number; gap_s: number }

/** Feed in each SimState time as it arrives. */
export function tickClock(prev: Clock | null, t_s: number, wall_s: number): Clock {
  if (!prev || t_s < prev.t_s) return { t_s, wall_s, rate: 0, gap_s: 0 }
  if (t_s === prev.t_s) return prev
  const gap_s = Math.max(wall_s - prev.wall_s, 1 / 240)
  return { t_s, wall_s, rate: (t_s - prev.t_s) / gap_s, gap_s }
}

/** The sim speed right now: 0 once the clock has been quiet for longer than its usual gap (paused or ended). */
export function rateNow(clock: Clock | null, wall_s: number): number {
  if (!clock || clock.rate <= 0) return 0
  return wall_s - clock.wall_s > Math.max(1.5 * clock.gap_s, 0.25) ? 0 : clock.rate
}

/** The close-up shows the ground rushing by, so it gets a slower fastest lap than the wide view. */
export const CLOSE_UP_SLOWDOWN = 5

/**
 * Sim seconds the picture advances per real second. The sim can run days per second, which would
 * spin the craft into a blur, so the picture follows the sim exactly up to one lap per
 * lapSeconds() (12 s in low Earth orbit). Above that it is a time-lapse: a faster sim still looks
 * faster, but only by a quarter per tenfold and never more than twice. Craft and planet share this
 * one clock, so ground tracks stay true and a GEO craft still hovers.
 */
export function displayRate(simRate: number, period_s: number, closeUp = false): { rate: number; timeLapse: boolean } {
  const period = Math.max(fin(period_s) ?? 0, 600)
  const exact = period / (lapSeconds(period) * (closeUp ? CLOSE_UP_SLOWDOWN : 1))
  const rate = Math.max(fin(simRate) ?? 0, 0)
  if (rate <= exact) return { rate, timeLapse: false }
  return { rate: exact * Math.min(2, 1 + 0.25 * Math.log10(rate / exact)), timeLapse: true }
}

export function formatRate(simRate: number): string {
  const [n, unit] = simRate >= 86_400 ? [simRate / 86_400, 'day'] : simRate >= 3_600 ? [simRate / 3_600, 'hour'] : simRate >= 60 ? [simRate / 60, 'minute'] : [simRate, 'second']
  const shown = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10
  return `${shown} ${unit}${shown === 1 ? '' : 's'}`
}

// ------------------------------------------------------- orbit and stations

/** One turn of the body, in seconds (sidereal, so a geostationary craft stays over one spot). */
export const DAY_S: Record<Body, number> = { earth: 86_164, moon: 2_360_592, mars: 88_643 }

export interface Station { name: string; lat_deg: number; lon_deg: number }

/**
 * Real sites of NASA's Near Space Network and its partners (approximate coordinates), in the order
 * they are switched on. The planet's continents are procedural, so only the latitudes and the
 * spacing between sites carry over to the picture.
 */
export const STATIONS: readonly Station[] = [
  { name: 'Wallops Island', lat_deg: 37.94, lon_deg: -75.46 },
  { name: 'Svalbard', lat_deg: 78.23, lon_deg: 15.4 },
  { name: 'McMurdo', lat_deg: -77.85, lon_deg: 166.67 },
  { name: 'Santiago', lat_deg: -33.15, lon_deg: -70.67 },
  { name: 'Dongara', lat_deg: -29.05, lon_deg: 115.35 },
  { name: 'Hartebeesthoek', lat_deg: -25.89, lon_deg: 27.69 },
]

/** Stations to draw. Around the Moon and Mars the craft talks to Earth itself (Deep Space Network), so none. */
export function stationsFor(body: Body, count: number): readonly Station[] {
  return body === 'earth' ? STATIONS.slice(0, clamp(Math.round(fin(count) ?? 1), 0, STATIONS.length)) : []
}

const RAD = Math.PI / 180

/** Unit vector to the craft, body pole along +y. `a` is the angle along the orbit from the ascending node; motion is prograde. */
export function craftDirection(a: number, inclination_rad: number): V3 {
  return [Math.cos(a), Math.sin(a) * Math.sin(inclination_rad), -Math.sin(a) * Math.cos(inclination_rad)]
}

/** Unit vector to a station after the body has turned by `spin` (east is positive). */
export function stationDirection(station: Station, spin = 0): V3 {
  const lat = station.lat_deg * RAD
  const lon = station.lon_deg * RAD + spin
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
}

export interface Phasing { a0: number; spin0: number }
type OrbitShape = { body: Body; inclination_rad: number; period_s: number }

/**
 * Where the craft and the planet start, chosen so the craft flies over `station` (or as close as
 * its inclination allows) at sim time `pass_s`. The sim does not model passes, so this is free to pick.
 */
export function phasing(station: Station | undefined, orbit: OrbitShape, pass_s: number): Phasing {
  if (!station) return { a0: 0, spin0: 0 }
  const sinI = Math.sin(orbit.inclination_rad)
  const a = Math.abs(sinI) < 1e-6 ? 0 : Math.asin(clamp(Math.sin(station.lat_deg * RAD) / sinI, -1, 1))
  const [x, , z] = craftDirection(a, orbit.inclination_rad)
  return {
    a0: a - (2 * Math.PI * pass_s) / Math.max(orbit.period_s, 1),
    spin0: Math.atan2(x, z) - station.lon_deg * RAD - (2 * Math.PI * pass_s) / DAY_S[orbit.body],
  }
}

/** Orbit angle and planet turn at a display time. */
export function anglesAt(shown_s: number, orbit: OrbitShape, p: Phasing): { a: number; spin: number } {
  const turn = (x: number) => x % (2 * Math.PI)
  return {
    a: turn(p.a0 + (2 * Math.PI * shown_s) / Math.max(orbit.period_s, 1)),
    spin: turn(p.spin0 + (2 * Math.PI * shown_s) / DAY_S[orbit.body]),
  }
}

/** Stations need the craft at least this high above their horizon. */
export const MIN_ELEVATION_RAD = 5 * RAD

/** Half-angle, seen from the planet's centre, of the cap in which a station sees a craft at this altitude. Real geometry. */
export function contactHalfAngle(radius_m: number, altitude_m: number, minElevation = MIN_ELEVATION_RAD): number {
  return Math.acos((radius_m / (radius_m + Math.max(altitude_m, 0))) * Math.cos(minElevation)) - minElevation
}

/** Index of the nearest station whose cone holds the craft, or -1. All vectors are unit vectors. */
export function stationInContact(craft: V3, stations: readonly V3[], halfAngle: number): number {
  let best = -1
  let bestDot = Math.cos(halfAngle)
  stations.forEach((s, i) => {
    const d = craft[0] * s[0] + craft[1] * s[1] + craft[2] * s[2]
    if (d >= bestDot) {
      best = i
      bestDot = d
    }
  })
  return best
}

/**
 * 1 in sunlight, 0 in the planet's shadow, with a short soft edge. `pos` is in planet radii and
 * `sun` is a unit vector. With Earth's direction for `sun` it answers "can the craft see Earth".
 */
export function sunlight(pos: V3, sun: V3, edge = 0.03): number {
  const along = pos[0] * sun[0] + pos[1] * sun[1] + pos[2] * sun[2]
  if (along >= 0) return 1
  const d = Math.hypot(pos[0] - along * sun[0], pos[1] - along * sun[1], pos[2] - along * sun[2])
  const x = clamp((d - (1 - edge)) / (2 * edge), 0, 1)
  return x * x * (3 - 2 * x)
}

// ----------------------------------------------------------- part highlight

/** Lets the mission screen pass an anomaly card's `console` straight in. */
export const HIGHLIGHT_ALIASES: Record<string, string> = { spacecraft: 'bus', science: 'instrument', 'comms-resources': 'comms' }

export interface Tagged { userData: Record<string, unknown>; children: Tagged[] }

/**
 * The sub-trees to pulse: those tagged userData.part (a family) or userData.id (a catalog id) equal
 * to `highlight`. When nothing carries the tag (older craft builders, unknown ids) it is the whole craft.
 */
export function findHighlighted<T extends Tagged>(root: T, highlight: string): T[] {
  const key = HIGHLIGHT_ALIASES[highlight] ?? highlight
  const out: T[] = []
  const walk = (node: T) => {
    if (node.userData.part === key || node.userData.id === key) out.push(node)
    else for (const child of node.children as T[]) walk(child)
  }
  walk(root)
  return out.length ? out : [root]
}

// ------------------------------------------------------------------ quality

export interface Device { touch: boolean; small: boolean; slow: boolean; dpr: number }
export interface Quality { pixelRatio: number; bloom: boolean; segments: number; octaves: number }
export const MAX_LEVEL = 3

/** Render settings for a device. Level 0 is where it starts; each level up is one automatic step down. */
export function quality(device: Device, level = 0): Quality {
  const low = device.small || device.slow
  const ratio = Math.min(device.dpr || 1, device.touch ? 1.5 : 2, level >= 3 ? 0.75 : level === 2 ? 1 : level === 1 ? 1.5 : 2)
  return { pixelRatio: ratio, bloom: !low && level === 0, segments: low ? 64 : 128, octaves: low || level >= 2 ? 4 : 6 }
}

/** The next level that actually changes something, or the same level when there is nothing left to drop. */
export function stepDown(device: Device, level: number): number {
  const now = JSON.stringify(quality(device, level))
  for (let next = level + 1; next <= MAX_LEVEL; next++) if (JSON.stringify(quality(device, next)) !== now) return next
  return level
}

export const SLOW_FRAME_MS = 22
export interface Governor { avg_ms: number; slow_s: number }

/** Feed in every frame time. Says to step down once the average has stayed above SLOW_FRAME_MS for two seconds. */
export function govern(g: Governor, frame_ms: number): { g: Governor; stepDown: boolean } {
  if (!(frame_ms > 0) || frame_ms > 250) return { g, stepDown: false } // a tab switch, not a slow frame
  const avg_ms = g.avg_ms + (frame_ms - g.avg_ms) * 0.1
  const slow_s = avg_ms > SLOW_FRAME_MS ? g.slow_s + frame_ms / 1000 : 0
  return slow_s >= 2 ? { g: { avg_ms: 16, slow_s: 0 }, stepDown: true } : { g: { avg_ms, slow_s }, stepDown: false }
}

// ------------------------------------------------------------------ caption

/** What the scene reports back each time it changes. */
export interface FlyStatus {
  inShadow: boolean
  /** Name of the station (or "Earth") the downlink beam is going to, or null. */
  link: string | null
  /** Measured sim seconds per real second. */
  rate: number
  timeLapse: boolean
}

export interface Pill { text: string; tone: 'sun' | 'shadow' | 'link' | 'time' | 'good' | 'bad' }

const ENDINGS: Record<string, Pill> = {
  success: { text: 'Mission complete', tone: 'good' },
  science_shortfall: { text: 'Mission over: science goal not reached', tone: 'bad' },
  launch_failure: { text: 'Launch failed: the spacecraft never reached orbit', tone: 'bad' },
  spacecraft_failure: { text: 'Spacecraft lost: no signal', tone: 'bad' },
}

/** The status chips under the view. The builder's close-up (no clock, no orbit to fly) has none, as before. */
export function pills(flight: Flight, status: FlyStatus, craft: { power: Power; body: Body }, mode: 'spacecraft' | 'orbit' = 'orbit'): Pill[] {
  if (flight.phase === 'ended') return [ENDINGS[flight.outcome] ?? { text: 'Mission ended', tone: 'shadow' }]
  if (flight.phase === 'design' && mode === 'spacecraft') return []
  const out: Pill[] = []
  if (flight.phase === 'cruise') out.push({ text: `On the way to ${BODY_NAMES[craft.body]}`, tone: 'time' })
  else if (!status.inShadow) out.push({ text: 'In sunlight', tone: 'sun' })
  else {
    const how = craft.power === 'rtg' ? 'the RTG keeps it powered' : flight.batteryShort ? 'battery too small, instruments off' : 'running on battery'
    out.push({ text: `In shadow: ${how}`, tone: 'shadow' })
  }
  if (status.link) out.push({ text: `Sending data to ${status.link}`, tone: 'link' })
  if (status.timeLapse) out.push({ text: `Time-lapse: ${formatRate(status.rate)} each second`, tone: 'time' })
  return out
}
