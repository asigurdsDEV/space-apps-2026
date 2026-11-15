// Pure helpers for the mission builder. No React here, so they're easy to test.
import type { ConsoleCall } from '../gonogo'
import { canSend, ownerRole, roleHolders, type Command, type Entity, type Metrics, type Params, type ParamValue, type Player, type Role, type SimState } from '../../shared'

/** One design choice on the builder screen: a `set_param` key filled from the sim's part entities. */
export interface Slot {
  /** `set_param` key, e.g. "launch_vehicle" (data/README.md "Design params"). */
  key: string
  label: string
  /** Entity kind the sim gives these parts (sim/README.md), e.g. "power_system". */
  kind: string
  /** Only parts whose `props[prop]` is one of `values`, e.g. power systems of type "battery". */
  where?: { prop: string; values: ParamValue[] }
  /** Several parts at once (stored as a comma-separated id list, e.g. "camera-basic,magnetometer"). */
  multi?: boolean
  /** Part props to show as stats, in order. `ORBIT_CAPACITY` = the launcher's payload to the picked orbit. */
  columns: string[]
  /** One-line explainer for students. */
}

/** Stands in for the launch-vehicle column that matches the picked orbit (orbit.props.launch_capacity_column). */
export const ORBIT_CAPACITY = '@orbit_capacity'

// Keys follow data/README.md (claude@jamie); kinds follow sim/README.md (claude@ethan).
export const DEFAULT_SLOTS: Slot[] = [
  { key: 'orbit', label: 'Orbit', kind: 'orbit', columns: ['altitude_m', 'eclipse_fraction', 'contact_s_per_day', 'radiation_factor'] },
  { key: 'bus', label: 'Spacecraft bus', kind: 'bus', columns: ['dry_mass_kg', 'max_added_mass_kg', 'max_instruments', 'base_power_w', 'cost_usd'] },
  { key: 'instruments', label: 'Science instruments', kind: 'instrument', multi: true, columns: ['mass_kg', 'power_w', 'data_rate_bps', 'science_value', 'cost_usd'] },
  { key: 'solar', label: 'Power source', kind: 'power_system', where: { prop: 'type', values: ['solar', 'rtg'] }, columns: ['mass_kg', 'power_w', 'cost_usd'] },
  { key: 'battery', label: 'Battery', kind: 'power_system', where: { prop: 'type', values: ['battery'] }, columns: ['mass_kg', 'capacity_wh', 'cost_usd'] },
  { key: 'comms', label: 'Radio', kind: 'comms_system', columns: ['mass_kg', 'power_w', 'data_rate_bps', 'cost_usd'] },
  { key: 'launch_vehicle', label: 'Launch vehicle', kind: 'launch_vehicle', columns: [ORBIT_CAPACITY, 'cost_usd', 'reliability'] },
]

/** Ids picked in a multi slot. */
export function parseIds(value: ParamValue | undefined): string[] {
  if (typeof value !== 'string' || value === '') return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Add or remove one id from a multi slot value, keeping order. */
export function toggleId(value: ParamValue | undefined, id: string): string {
  const ids = parseIds(value)
  return (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]).join(',')
}

/** The parts a slot offers, from state.entities. */
export function slotParts(entities: Entity[], slot: Slot): Entity[] {
  return entities.filter((e) => e.kind === slot.kind && (!slot.where || slot.where.values.includes(e.props[slot.where.prop])))
}

/** Concrete prop names to show for a slot, resolving ORBIT_CAPACITY from the picked orbit. */
export function slotColumns(slot: Slot, state: Pick<SimState, 'entities' | 'params'>): string[] {
  return slot.columns.map((c) => {
    if (c !== ORBIT_CAPACITY) return c
    const orbit = state.entities.find((e) => e.kind === 'orbit' && e.id === state.params.orbit)
    const col = orbit?.props.launch_capacity_column
    return typeof col === 'string' ? col : 'payload_leo_kg'
  })
}

const LABELS: Record<string, string> = {
  eclipse_fraction: 'In shadow',
  contact_s_per_day: 'Contact time',
  radiation_factor: 'Radiation (×LEO)',
  max_added_mass_kg: 'Max added mass',
  max_instruments: 'Max instruments',
  base_power_w: 'Base power draw',
  data_rate_bps: 'Data rate',
  science_value: 'Science',
  capacity_wh: 'Capacity',
  payload_leo_kg: 'Payload to LEO',
  payload_sso_kg: 'Payload to SSO',
  payload_gto_kg: 'Payload to GTO',
  payload_tli_kg: 'Payload to Moon',
}

/** Column header: a friendly name, else the column without its unit suffix ("cost_usd" → "cost"). */
export function columnLabel(column: string): string {
  return LABELS[column] ?? column.replace(/_(kg|w|wh|usd|bps|km|m|ms|s|rad)$/i, '').replace(/_/g, ' ')
}

/** Display unit inferred from the column name. Entities don't carry units, so names are the contract. */
export function unitOf(column: string): string {
  if (/(_fraction|^reliability|duty_cycle)$/.test(column)) return '%'
  const units: [RegExp, string][] = [
    [/_s_per_day$/, 's/day'], [/_per_kg_usd$/, 'USD/kg'], [/_kg$/, 'kg'], [/_usd$/, 'USD'], [/_bps$/, 'bps'],
    [/_wh$/, 'Wh'], [/_w$/, 'W'], [/_ms$/, 'm/s'], [/_m$/, 'm'], [/_s$/, 's'], [/_rad$/, 'rad'], [/^science_value$/, 'pts'],
  ]
  return units.find(([re]) => re.test(column))?.[1] ?? ''
}

export interface Bar {
  resource: string
  label: string
  used: number
  limit: number
  unit: string
  /** used / limit. For limits > 1 means over; for goals < 1 means short. */
  ratio: number
  /** A goal to reach (science) rather than a limit to stay under. */
  goal: boolean
  /** Limit exceeded, or goal not reached. */
  bad: boolean
}

type BarSpec = { resource: string; label: string; used: (m: Metrics) => unknown; limit: string; unit: string; goal?: boolean; skipZeroLimit?: boolean }

const num = (k: string) => (m: Metrics) => m[k]
const BAR_SPECS: BarSpec[] = [
  { resource: 'mass', label: 'Launch mass', used: num('mass_kg'), limit: 'mass_limit_kg', unit: 'kg' },
  { resource: 'mass', label: 'Bus capacity', used: num('added_mass_kg'), limit: 'added_mass_limit_kg', unit: 'kg' },
  { resource: 'power', label: 'Power', used: num('power_w'), limit: 'power_available_w', unit: 'W' },
  // A goal: the battery has to hold at least one eclipse's worth of energy.
  { resource: 'power', label: 'Battery vs. one eclipse', used: num('battery_wh'), limit: 'battery_needed_wh', unit: 'Wh', goal: true, skipZeroLimit: true },
  { resource: 'budget', label: 'Budget', used: num('cost_usd'), limit: 'budget_usd', unit: 'USD' },
  { resource: 'data', label: 'Data made vs. downlink', used: num('data_generated_gb_per_day'), limit: 'downlink_gb_per_day', unit: 'GB/day' },
  { resource: 'time', label: 'Schedule', used: num('schedule_months'), limit: 'deadline_months', unit: 'months', skipZeroLimit: true },
  {
    resource: 'science',
    label: 'Science (projected)',
    // The sim's forecast includes the radio bottleneck and fading power; the product is only a fallback.
    used: (m) =>
      typeof m.science_expected === 'number'
        ? m.science_expected
        : typeof m.science_per_day === 'number' && typeof m.mission_days === 'number'
          ? m.science_per_day * m.mission_days
          : undefined,
    limit: 'science_goal',
    unit: 'pts',
    goal: true,
    skipZeroLimit: true,
  },
]

/** Budget bars for whichever pairs the sim reports. */
export function budgetBars(metrics: Metrics): Bar[] {
  return BAR_SPECS.flatMap((spec) => {
    const used = spec.used(metrics)
    const limit = metrics[spec.limit]
    if (typeof used !== 'number' || typeof limit !== 'number') return []
    if (spec.skipZeroLimit && limit <= 0) return []
    const ratio = limit > 0 ? used / limit : used > 0 ? Infinity : 0
    const goal = spec.goal ?? false
    return [{ resource: spec.resource, label: spec.label, used, limit, unit: spec.unit, ratio, goal, bad: goal ? used < limit : used > limit }]
  })
}

const n1 = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })

export function formatValue(n: number, unit: string): string {
  switch (unit) {
    case 'USD': return n >= 1e6 ? `$${n1(n / 1e6)}M` : `$${n1(n / 1e3)}k`
    case 'USD/kg': return `$${n1(n)}/kg`
    case 'bps': return n >= 1e6 ? `${n1(n / 1e6)} Mbps` : `${n1(n / 1e3)} kbps`
    case 'm': return n >= 1e3 ? `${n1(n / 1e3)} km` : `${n1(n)} m`
    case 's': return n >= 2 * 365 * 86400 ? `${n1(n / (365 * 86400))} years` : n >= 2 * 86400 ? `${n1(n / 86400)} days` : n >= 120 ? `${n1(n / 60)} min` : `${n1(n)} s`
    case 's/day': return `${n1(n / 60)} min/day`
    case '%': return `${n1(n * 100)}%`
    case '': return n1(n)
    default: return `${n1(n)} ${unit}`
  }
}

// ---------------------------------------------------------------- co-op roles

/** shortcut: same titles as ui/lobby ROLE_DETAILS (codex@jamie); move both to shared/ if a third screen needs them. */
export const ROLE_TITLES: Record<Role, string> = {
  'mission-planning': 'Mission planning',
  spacecraft: 'Spacecraft',
  science: 'Science',
  'comms-resources': 'Communications & resources',
}

export interface Access {
  /** The role that owns this choice (shared/net.ts ROLE_PARAM_KEYS). */
  role: Role
  /** The player holding that role (picked or shared out, shared/net.ts roleHolders), or null with no players. */
  holder: Player | null
  /** Same rule the host enforces (canSend): you hold the role, or nobody does. */
  canEdit: boolean
}

/** Who owns a command and whether `me` may send it. Solo (no players) can always send. */
export function commandAccess(command: Command, players: readonly Player[], me: Player | undefined): Access {
  const role = ownerRole(command) ?? 'mission-planning'
  return { role, holder: roleHolders(players)[role] ?? null, canEdit: canSend(players, me?.player_id, command) }
}

export const slotAccess = (key: string, players: readonly Player[], me: Player | undefined): Access =>
  commandAccess({ type: 'set_param', payload: { key, value: '' } }, players, me)

/** "You", the player's name, or null with no players. */
export function playerLabel(player: Player | null, me: Player | undefined): string | null {
  if (!player) return null
  return player.player_id === me?.player_id ? 'You' : player.name
}

/**
 * Who made each slot change between two params snapshots: slot key → name.
 * The host only accepts a change from the role holder (canSend), so a claimed slot was changed by its holder.
 * An unclaimed slot was changed by me if I sent that key (`mySends`), else by "A teammate".
 * shortcut: inferred, because state messages don't say who sent each command; switch to the sender once the host includes it.
 */
export function changedBy(
  prev: Params,
  next: Params,
  keys: readonly string[],
  players: readonly Player[],
  me: Player | undefined,
  mySends: ReadonlySet<string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of keys) {
    if (prev[key] === next[key]) continue
    const { holder } = slotAccess(key, players, me)
    out[key] = playerLabel(holder, me) ?? (mySends.has(key) ? 'You' : 'A teammate')
  }
  return out
}

// ---------------------------------------------------------------- glossary tooltips

const TERMS: Record<string, string> = {
  // column names
  eclipse_fraction: 'eclipse',
  data_rate_bps: 'data-rate',
  duty_cycle: 'duty-cycle',
  reliability: 'reliability',
  // slot keys
  orbit: 'orbit',
  // budget bar labels
  'Launch mass': 'payload-capacity',
  Power: 'power-budget',
  'Data made vs. downlink': 'downlink',
  'Battery vs. one eclipse': 'eclipse',
}

/** Glossary id (ui/learn) for a column, slot key or budget label, if that word gets a tooltip. */
export function termFor(name: string): string | undefined {
  return TERMS[name] ?? (/^payload_\w+_kg$/.test(name) ? 'payload-capacity' : undefined)
}

// ---------------------------------------------------------------- console lights

/** "GO", "GO · 1 concern" or "NO-GO · 2": a console's call in words, so it never relies on colour. */
export function callText(c: Pick<ConsoleCall, 'call' | 'reasons'>): string {
  const n = c.reasons.length
  if (c.call === 'go') return 'GO'
  if (c.call === 'no-go') return `NO-GO · ${n}`
  return `GO · ${n} concern${n === 1 ? '' : 's'}`
}

// ---------------------------------------------------------------- part compatibility

/** Same order as BUS_CLASSES in sim/parts.ts (screens don't import sim/). */
const BUS_CLASS_ORDER = ['cubesat', 'smallsat', 'medium', 'flagship']
const BUS_CLASS_NAMES: Record<string, string> = { cubesat: 'CubeSat', smallsat: 'SmallSat', medium: 'medium', flagship: 'flagship' }

export interface Badge {
  text: string
  tone: 'good' | 'warn' | 'bad'
}

/**
 * Why a part does or doesn't suit the current design, using the sim's own rules:
 * `min_bus_class` above the picked bus's class is the `bus_too_small` error (the row is dimmed),
 * and an instrument outside its `best_orbit` earns half science (`off_best_orbit`).
 */
export function partFit(part: Entity, state: Pick<SimState, 'entities' | 'params'>): { badges: Badge[]; dim: boolean } {
  const badges: Badge[] = []
  let dim = false

  const needs = part.props.min_bus_class
  const bus = state.entities.find((e) => e.kind === 'bus' && e.id === state.params.bus)
  const busRank = BUS_CLASS_ORDER.indexOf(String(bus?.props.class ?? ''))
  if (typeof needs === 'string' && busRank >= 0 && BUS_CLASS_ORDER.indexOf(needs) > busRank) {
    badges.push({ text: `Needs a ${BUS_CLASS_NAMES[needs] ?? needs} bus or bigger`, tone: 'bad' })
    dim = true
  }

  const best = part.props.best_orbit
  if (typeof best === 'string' && best !== '' && best !== 'any') {
    const orbitName = state.entities.find((e) => e.kind === 'orbit' && e.id === best)?.name ?? best
    if (state.params.orbit === best) badges.push({ text: 'Best in your orbit', tone: 'good' })
    else if (typeof state.params.orbit === 'string' && state.params.orbit !== '')
      badges.push({ text: `Half science here · best in ${orbitName}`, tone: 'warn' })
  }
  return { badges, dim }
}

// ---------------------------------------------------------------- risk meter

/** Test flights of the current design (app/ flies them in the background with sim `successRate`). */
export interface Chance {
  /** Share of the flights so far that succeeded, 0 to 1. null: the design can't launch. */
  rate: number | null
  flown: number
  runs: number
  done: boolean
}

/** "Very likely (95%)": the chance in words first, so it isn't just a number. */
export function chanceText(rate: number): string {
  const pct = `${Math.round(rate * 100)}%`
  if (rate >= 0.9) return `Very likely (${pct})`
  if (rate >= 0.7) return `Likely (${pct})`
  if (rate >= 0.4) return `Risky (${pct})`
  if (rate > 0) return `Unlikely (${pct})`
  return 'Fails every test flight (0%)'
}
