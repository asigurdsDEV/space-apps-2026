// Pure: the cruise view's layout and text (Earth → the Moon or Mars on a transfer arc). No three.js.
import type { SimState } from '../../shared'
import { BODY_NAMES, BODY_RADIUS_M, num, type Body } from './model'

export type Destination = Exclude<Body, 'earth'>
export type Vec3 = [number, number, number]

/**
 * The destination sits at the origin with radius 1 (like every other mode); Earth sits at
 * (-distance, 0, 0). Sizes are the real ratio of the two radii.
 * shortcut: the distance is not to scale (Mars would be ~12,000 radii away); the caption gives the real trip time.
 */
export function cruiseLayout(body: Destination): { earthRadius: number; distance: number } {
  return { earthRadius: BODY_RADIUS_M.earth / BODY_RADIUS_M[body], distance: body === 'moon' ? 9 : 7 }
}

/** A point `s` (0 = leaving Earth, 1 = arriving) along a half-ellipse, like a Hohmann transfer seen side-on. */
export function transferPoint(body: Destination, s: number): Vec3 {
  const { earthRadius, distance } = cruiseLayout(body)
  const x0 = -distance + earthRadius * 1.2
  const x1 = -1.2
  const a = (x1 - x0) / 2
  const t = Math.PI * Math.min(1, Math.max(0, s))
  return [x0 + a - a * Math.cos(t), 0, a * 0.45 * Math.sin(t)]
}

export function transferArc(body: Destination, points = 96): Vec3[] {
  return Array.from({ length: points + 1 }, (_, i) => transferPoint(body, i / points))
}

/** How far along the cruise the mission is, 0–1, from sim time. No cruise (0 days) counts as arrived. */
export function cruiseProgress(t_s: number, cruise_days: number): number {
  if (!(cruise_days > 0)) return 1
  return Math.min(1, Math.max(0, t_s / (cruise_days * 86_400)))
}

/** The picked orbit's `cruise_days` (data/catalogs/orbits.json), 0 when it has none. */
export function cruiseDays(state: Pick<SimState, 'entities' | 'params'>): number {
  const orbit = state.entities.find((e) => e.kind === 'orbit' && e.id === state.params.orbit)
  return num(orbit?.props.cruise_days, 0)
}

/** "Cruise to Mars · 210 days", plus "· day 84" when the mission's progress is known. */
export function cruiseCaption(body: Destination, days: number, progress?: number): string {
  const total = days > 0 ? ` · ${days} day${days === 1 ? '' : 's'}` : ''
  const day = progress !== undefined && days > 0 ? ` · day ${Math.min(days, Math.floor(progress * days) + 1)}` : ''
  return `Cruise to ${BODY_NAMES[body]}${total}${day}`
}
