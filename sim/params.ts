// Param keys: which `Config.params` / `set_param` keys the sim reads, and every
// alias it still accepts. This is the only file that knows about old key names.

import type { Params, ParamValue } from '../shared'
import type { PartKind } from './parts'

/** One design slot: a param key that holds one part id. (`instruments` is a list, handled apart.) */
export interface Slot {
  /** The `Config.params` / `set_param` key, as data/README.md names it. */
  key: 'launch_vehicle' | 'orbit' | 'bus' | 'solar' | 'battery' | 'comms'
  /** Entity kind (one per catalog) the id must belong to. */
  kind: Exclude<PartKind, 'instrument'>
  /** Used in "Pick ..." messages. */
  label: string
  /** false = the mission can launch with this slot empty. */
  required: boolean
  /** Allowed values of the part's `type` column. Parts without a `type` are accepted. */
  types?: readonly string[]
}

export type SlotKey = Slot['key']

export const SLOTS: readonly Slot[] = [
  { key: 'launch_vehicle', kind: 'launch_vehicle', label: 'a launch vehicle', required: true },
  { key: 'orbit', kind: 'orbit', label: 'an orbit', required: true },
  { key: 'bus', kind: 'bus', label: 'a spacecraft bus', required: true },
  { key: 'solar', kind: 'power_system', label: 'a power source (solar panels or an RTG)', required: true, types: ['solar', 'rtg'] },
  { key: 'battery', kind: 'power_system', label: 'a battery', required: false, types: ['battery'] },
  { key: 'comms', kind: 'comms_system', label: 'a radio', required: true },
]

/**
 * Old or UI-side names for player params.
 * - Reading: the alias is used when the real key is unset.
 * - Writing: `set_param` on an alias also sets the real key, so the builder keeps working.
 * - `mirror`: the real key's value is copied back into the alias, because ui/builder
 *   reads `state.params.power` to show which part is picked.
 * An alias of `solar` that names a battery part goes to `battery` instead: the builder
 * has one "power" list holding both kinds of part.
 */
export const PARAM_ALIASES: readonly { alias: string; key: SlotKey; mirror?: boolean }[] = [
  { alias: 'power', key: 'solar', mirror: true },
  { alias: 'power_system', key: 'solar' },
  { alias: 'comms_system', key: 'comms' },
]

/** Old scenario keys, with the factor that converts them to the real key's unit. */
export const SCENARIO_ALIASES: readonly { alias: string; key: string; factor: number }[] = [
  { alias: 'science_goal', key: 'target_science_score', factor: 1 },
  { alias: 'mission_days', key: 'mission_duration_s', factor: 86400 },
]

function isSet(value: ParamValue | undefined): value is string {
  return typeof value === 'string' && value !== ''
}

function targetKey(key: SlotKey, value: ParamValue, isBattery: (id: string) => boolean): SlotKey {
  return key === 'solar' && typeof value === 'string' && isBattery(value) ? 'battery' : key
}

/**
 * Returns a copy of `params` with every real key filled from its alias where the real
 * key is unset, and mirrored aliases filled from the real key. Never overwrites a set key.
 */
export function resolveAliases(params: Params, isBattery: (id: string) => boolean = () => false): Params {
  const out: Params = { ...params }
  for (const { alias, key } of PARAM_ALIASES) {
    const value = out[alias]
    if (!isSet(value)) continue
    const target = targetKey(key, value, isBattery)
    if (!isSet(out[target])) out[target] = value
  }
  for (const { alias, key, mirror } of PARAM_ALIASES) {
    const value = out[key]
    if (mirror && isSet(value) && !isSet(out[alias])) out[alias] = value
  }
  for (const { alias, key, factor } of SCENARIO_ALIASES) {
    const value = out[alias]
    if (typeof out[key] !== 'number' && typeof value === 'number') out[key] = value * factor
  }
  return out
}

/** Apply one `set_param` to `params` (changed in place; pass a copy). Aliases write through to the real key. */
export function applyParam(params: Params, key: string, rawValue: unknown, isBattery: (id: string) => boolean): boolean {
  const value = cleanParam(key, rawValue)
  if (value === undefined) return false
  params[key] = value
  const entry = PARAM_ALIASES.find((a) => a.alias === key)
  const real = entry ? targetKey(entry.key, value, isBattery) : key
  if (entry) params[real] = value
  for (const { alias, key: mirrored, mirror } of PARAM_ALIASES) {
    if (mirror && mirrored === real) params[alias] = value
  }
  return true
}

/** Keys the sim reads as numbers. A number sent as a string ("100") is converted, because `num()` would read it as missing. */
const NUMERIC_KEYS = new Set([
  'budget_usd',
  'target_science_score',
  'science_goal',
  'mission_duration_s',
  'mission_days',
  'ground_stations',
  'deadline_months',
  'ops_cost_usd_per_day',
  'ground_station_cost_usd_per_day',
  'integration_months_per_instrument',
  'event_rate_per_day',
  'anomaly_cards',
])

/**
 * Params arrive from scenario files and from guests over net/, so they are checked here.
 * Returns the value to store, or undefined when it must be refused (NaN, null, objects,
 * or text where a number is needed).
 */
export function cleanParam(key: string, value: unknown): ParamValue | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined
  if (key === 'random_failures' && (value === 'true' || value === 'false')) return value === 'true'
  if (!NUMERIC_KEYS.has(key)) return value
  return value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined
}

/** A copy of `params` without the values `cleanParam` refuses. */
export function cleanParams(params: Record<string, unknown>): Params {
  const out: Params = {}
  for (const [key, raw] of Object.entries(params ?? {})) {
    const value = cleanParam(key, raw)
    if (value !== undefined) out[key] = value
  }
  return out
}

/** The `instruments` param is a comma-separated list of instrument ids, e.g. "camera-basic,magnetometer". */
export function instrumentIds(params: Params): string[] {
  const raw = params.instruments ?? params.instrument
  if (typeof raw !== 'string') return []
  return [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => s !== ''))]
}
