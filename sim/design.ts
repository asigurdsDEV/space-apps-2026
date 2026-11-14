// Design evaluation: turn the player's choices into budgets and a list of problems.
// Pure and cheap, so the sim re-runs it every step and the budget bars stay live.
//
// The rules follow the "Suggested budget math" in data/README.md. Each one is a single
// sentence in sim/README.md. A rule whose column is missing from the catalog is off.

import type { Entity, Issue, Params } from '../shared'
import { orbitPeriodS } from './orbit'
import { instrumentIds, resolveAliases, SLOTS, type Slot, type SlotKey } from './params'
import { busClassRank, findPart, has, num, partsOf, str } from './parts'

/** An instrument flown outside its `best_orbit` earns this share of its science. */
export const OFF_ORBIT_SCIENCE_FACTOR = 0.5

/**
 * Share of an instrument's science it earns in this orbit: all of it in its `best_orbit`, half
 * elsewhere. An imager off its best orbit also misses the part of the planet that orbit never
 * passes over (`coverage_fraction`: an ISS-like orbit sees 80% of Earth, geostationary 42%).
 */
export function orbitScienceFactor(part: Entity, orbit: Entity | undefined): number {
  const best = str(part.props, 'best_orbit', 'any')
  if (!orbit || best === 'any' || best === '' || best === orbit.id) return 1
  const coverage = str(part.props, 'category') === 'imager' ? clamp01(num(orbit.props, 'coverage_fraction', 1)) : 1
  return OFF_ORBIT_SCIENCE_FACTOR * coverage
}
/** Warn when the spacecraft uses more than this share of what the launcher can lift. */
export const MASS_MARGIN_WARNING = 0.9
/**
 * Orbits that need more delta-v than this need an engine burn just to arrive, so a bus
 * without it cannot launch. Smaller amounts are station-keeping: the mission still flies.
 */
export const CAPTURE_DELTA_V_MS = 100
/** A spacecraft that cannot station-keep stays in its orbit for this share of the orbit's lifetime. */
export const DRIFT_LIFETIME_FACTOR = 0.5
/** Warn when the chance of the bus surviving the mission is below this (only when random failures are on). */
export const SURVIVAL_WARNING = 0.9
/**
 * Science is added up day by day, so a design worth exactly the goal lands a hair above or
 * below it depending on the step size. Within this many points of the goal counts as reaching it.
 */
export const SCIENCE_TOLERANCE = 1e-6
const MAX_GROUND_STATIONS = 6
const DAY_S = 86400
/** One year, as data/ counts it (365.25 days). */
export const YEAR_S = 31557600
const BITS_PER_GB = 8e9

/** Every number the dashboard needs. All of these are copied into `SimState.metrics`. */
export interface Budgets {
  /** Bus dry mass plus everything bolted on. */
  mass_kg: number
  /** What the launch vehicle can lift to the chosen orbit. 0 = cannot reach it. */
  mass_limit_kg: number
  /** Instruments + power source + battery + radio. */
  added_mass_kg: number
  /** The bus's `max_added_mass_kg`. 0 = no limit known. */
  added_mass_limit_kg: number
  /** Instruments only. */
  payload_mass_kg: number
  instrument_count: number
  /** The bus's `max_instruments`. 0 = no limit known. */
  instrument_limit: number
  /** Total draw with everything on: bus + radio + every instrument. */
  power_w: number
  /** Orbit-average generation at launch (sunlit share of the array output; an RTG gives its full output). */
  power_available_w: number
  battery_wh: number
  /** Energy needed to run everything through one eclipse. */
  battery_needed_wh: number
  /** Share of the time the instruments can run at launch, 0 to 1 (power and eclipse). */
  instrument_uptime: number
  /** Whole-mission cost: parts + launch + operations. */
  cost_usd: number
  budget_usd: number
  build_cost_usd: number
  launch_cost_usd: number
  ops_cost_usd: number
  ops_cost_usd_per_day: number
  data_generated_gb_per_day: number
  downlink_gb_per_day: number
  /** Radio rate while in contact with the ground, after the range penalty. */
  data_rate_bps: number
  /** 1 = the radio runs at full speed at this orbit's range. */
  link_factor: number
  storage_gb: number
  /** Science per day at launch if all the data gets home. */
  science_per_day: number
  /** Science this design returns over the whole mission if nothing breaks: the flight, run ahead of time. */
  science_expected: number
  /** The scenario's `target_science_score`. */
  science_goal: number
  /** The bus's `propulsion_delta_v_ms`. */
  delta_v_ms: number
  /** The orbit's `delta_v_required_ms`. */
  delta_v_required_ms: number
  schedule_months: number
  deadline_months: number
  ground_stations: number
  launch_reliability: number
  /** Chance the bus survives this mission, from launch to its planned end, in this orbit's radiation. */
  bus_reliability: number
  cruise_days: number
  /** Planned mission length, counted from launch. */
  mission_days: number
  /** Days from launch until the mission ends: the planned length, or sooner if the bus or orbit gives out. */
  lifetime_days: number
}

/** What the flight loop needs on top of the budgets. Not copied into metrics. */
export interface FlightModel {
  /** Bus + radio: what must stay on. */
  base_load_w: number
  instrument_load_w: number
  /** Orbit-average generation at launch. */
  power_available_w: number
  degradation_per_year: number
  /** 1, or the sunlit share of the orbit when the battery cannot carry the instruments through eclipse. */
  shadow_uptime: number
  /** With the instruments always available. */
  science_per_day_full: number
  /** With the instruments always available. */
  data_gb_per_day_full: number
  /** One per instrument that makes data, most science per GB first: the order the radio sends them in. */
  streams: { gb_per_day: number; science_per_gb: number }[]
  downlink_gb_per_day: number
  storage_gb: number
  /** Chance the bus gets through one more day in this orbit's radiation. */
  survival_per_day: number
  /** Why the mission will end: the plan, the bus wearing out, or the orbit decaying. */
  end_reason: 'mission' | 'bus_life' | 'orbit_life'
}

export interface DesignReport {
  budgets: Budgets
  flight: FlightModel
  issues: Issue[]
  /** True when nothing blocks launch (no `error` issues). */
  ready: boolean
}

/**
 * Share of the time the instruments can run, `years` after launch. The power source
 * loses `degradation_per_year` of its output each year; the bus and radio are fed first
 * and the instruments share what is left.
 */
export function uptimeAt(
  flight: Pick<FlightModel, 'base_load_w' | 'instrument_load_w' | 'power_available_w' | 'degradation_per_year' | 'shadow_uptime'>,
  years: number,
): number {
  const available = flight.power_available_w * Math.max(0, 1 - flight.degradation_per_year * Math.max(0, years))
  const spare = available - flight.base_load_w
  if (spare < 0) return 0
  const powerShare = flight.instrument_load_w > 0 ? Math.min(1, spare / flight.instrument_load_w) : 1
  // Not the product: `power_available_w` is already an orbit average, so eclipse is counted in it once.
  return Math.min(powerShare, flight.shadow_uptime)
}

/**
 * One day (or part of one) of making and sending data. The radio sends the most valuable
 * data first, so adding an instrument never lowers the science returned. Used by the
 * flight loop and by the design forecast, so the two cannot disagree.
 * shortcut: data left over from earlier days is valued at the design's average science per GB
 * (exact after a ground station outage, slightly generous after a solar storm on a
 * downlink-limited design); track a backlog per instrument if that ever matters.
 */
export function dayOfData(
  flight: Pick<FlightModel, 'science_per_day_full' | 'data_gb_per_day_full' | 'streams' | 'downlink_gb_per_day' | 'storage_gb'>,
  stored_gb: number,
  uptime: number,
  generatingDays: number,
  downlinkDays: number,
): { made_gb: number; sent_gb: number; stored_gb: number; lost_gb: number; science: number } {
  const full = flight.data_gb_per_day_full
  const made_gb = full * uptime * generatingDays
  const sent_gb = Math.min(stored_gb + made_gb, flight.downlink_gb_per_day * downlinkDays)
  const fresh = full > 0 ? made_gb / full : 0
  let left = Math.min(sent_gb, made_gb)
  let dataScience = 0
  let science = 0
  for (const stream of flight.streams) {
    const take = Math.min(left, stream.gb_per_day * fresh)
    left -= take
    science += take * stream.science_per_gb
    dataScience += stream.gb_per_day * stream.science_per_gb
  }
  if (full > 0) science += Math.max(0, sent_gb - made_gb) * (dataScience / full)
  // Instruments that make no data have nothing to send home: their science counts as it is made.
  science += Math.max(0, flight.science_per_day_full - dataScience) * uptime * generatingDays
  const waiting = stored_gb + made_gb - sent_gb
  const lost_gb = waiting > flight.storage_gb + 1e-12 ? waiting - flight.storage_gb : 0
  return { made_gb, sent_gb, stored_gb: waiting - lost_gb, lost_gb, science }
}

export function formatUsd(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

const ONE_DECIMAL = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

/** 1,234.5 (at most one decimal). */
function n1(value: number): string {
  return ONE_DECIMAL.format(value)
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`
}

function formatBps(bps: number): string {
  if (bps >= 1e6) return `${n1(bps / 1e6)} Mbps`
  if (bps >= 1e3) return `${n1(bps / 1e3)} kbps`
  return bps > 0 && bps < 1 ? 'less than 1 bps' : `${Math.round(bps)} bps`
}

function formatGb(gb: number): string {
  return gb > 0 && gb < 1 ? `${Math.round(gb * 1000)} MB` : `${n1(gb)} GB`
}

function formatYears(seconds: number): string {
  const years = seconds / YEAR_S
  return years >= 1 ? `${n1(years)} ${years < 1.05 ? 'year' : 'years'}` : `${Math.round(seconds / DAY_S)} days`
}

/** "A", "A and B", "A, B and C". */
function list(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function evaluateDesign(rawParams: Params, entities: Entity[]): DesignReport {
  const isBattery = (id: string) => str(findPart(entities, 'power_system', id)?.props ?? {}, 'type') === 'battery'
  const params = resolveAliases(rawParams, isBattery)

  const issues: Issue[] = []
  const error = (code: string, resource: string, message: string) =>
    issues.push({ code, severity: 'error', resource, message })
  const warning = (code: string, resource: string, message: string) =>
    issues.push({ code, severity: 'warning', resource, message })

  // ---- Which parts are picked.
  const pick = (slot: Slot): Entity | undefined => {
    const id = str(params, slot.key)
    if (id === '') {
      if (slot.required) error(`missing_${slot.key}`, 'design', `Pick ${slot.label}.`)
      return undefined
    }
    const part = findPart(entities, slot.kind, id)
    if (!part) {
      error(`unknown_${slot.key}`, 'design', `"${id}" is not in the catalog. Pick ${slot.label}.`)
      return undefined
    }
    const type = str(part.props, 'type')
    if (slot.types && type !== '' && !slot.types.includes(type)) {
      error(`wrong_type_${slot.key}`, 'design', `${part.name} is not ${slot.label}. Pick ${slot.label}.`)
      return undefined
    }
    return part
  }
  const picked = Object.fromEntries(SLOTS.map((slot) => [slot.key, pick(slot)])) as Record<SlotKey, Entity | undefined>
  const { launch_vehicle: launcher, orbit, bus, solar, battery, comms } = picked

  const instruments: Entity[] = []
  const unknownInstruments: string[] = []
  for (const id of instrumentIds(params)) {
    const part = findPart(entities, 'instrument', id)
    if (part) instruments.push(part)
    else unknownInstruments.push(`"${id}"`)
  }
  if (unknownInstruments.length > 0) {
    error('unknown_instrument', 'design', `${list(unknownInstruments)} ${unknownInstruments.length === 1 ? 'is' : 'are'} not in the instrument catalog. Remove ${unknownInstruments.length === 1 ? 'it' : 'them'} and pick from the list.`)
  }
  if (instruments.length === 0) {
    error('missing_instrument', 'design', 'Add at least one instrument. Without one the mission returns no science.')
  }

  const prop = (part: Entity | undefined, key: string, fallback = 0) => (part ? num(part.props, key, fallback) : fallback)
  const sum = (parts: (Entity | undefined)[], key: string) => parts.reduce((total, part) => total + prop(part, key), 0)
  const added = [...instruments, solar, battery, comms]

  // ---- Mass: the bus can only carry so much, and the rocket can only lift so much to this orbit.
  const payload_mass_kg = sum(instruments, 'mass_kg')
  const added_mass_kg = sum(added, 'mass_kg')
  const added_mass_limit_kg = prop(bus, 'max_added_mass_kg')
  const mass_kg = prop(bus, 'dry_mass_kg') + added_mass_kg
  const capacityColumn = orbit ? str(orbit.props, 'launch_capacity_column') : ''
  const mass_limit_kg = launcher && capacityColumn !== '' ? num(launcher.props, capacityColumn) : 0
  if (launcher && orbit) {
    if (mass_limit_kg <= 0) {
      const able = partsOf(entities, 'launch_vehicle').filter((part) => num(part.props, capacityColumn) > 0).map((part) => part.name)
      error('orbit_unreachable', 'mass', `${launcher.name} cannot reach ${orbit.name}. ${able.length > 0 ? `${list(able)} can go there` : 'No launch vehicle in the catalog goes there'}. Pick a launch vehicle that goes there, or a different orbit.`)
    } else if (mass_kg > mass_limit_kg) {
      error(
        'mass_over_limit',
        'mass',
        `The spacecraft weighs ${n1(mass_kg)} kg, but ${launcher.name} can only lift ${n1(mass_limit_kg)} kg to ${orbit.name}. Drop ${n1(mass_kg - mass_limit_kg)} kg or pick a bigger launch vehicle.`,
      )
    } else if (mass_kg > mass_limit_kg * MASS_MARGIN_WARNING) {
      warning(
        'mass_margin_low',
        'mass',
        `Only ${n1(mass_limit_kg - mass_kg)} kg of launch margin is left. Real missions keep at least 10% spare because designs grow. Trim some mass or pick a bigger launch vehicle.`,
      )
    }
  }
  if (bus && has(bus, 'max_added_mass_kg') && added_mass_kg > added_mass_limit_kg) {
    error(
      'added_mass_over_bus',
      'mass',
      `${bus.name} can carry ${n1(added_mass_limit_kg)} kg of instruments, power and radio, but you picked ${n1(added_mass_kg)} kg. Remove ${n1(added_mass_kg - added_mass_limit_kg)} kg or pick a bigger bus.`,
    )
  }
  const instrument_limit = prop(bus, 'max_instruments')
  if (bus && has(bus, 'max_instruments') && instruments.length > instrument_limit) {
    error(
      'too_many_instruments',
      'design',
      `${bus.name} has room for ${instrument_limit} ${instrument_limit === 1 ? 'instrument' : 'instruments'}, but you picked ${instruments.length}. Remove ${instruments.length - instrument_limit} or pick a bigger bus.`,
    )
  }

  // ---- Bus size: big parts need a big bus.
  if (bus) {
    const busRank = busClassRank(str(bus.props, 'class'))
    const tooBig = added.filter((part): part is Entity => part !== undefined && busClassRank(str(part.props, 'min_bus_class')) > busRank)
    if (busRank >= 0 && tooBig.length > 0) {
      const needed = tooBig.reduce((max, part) => (busClassRank(str(part.props, 'min_bus_class')) > busClassRank(max) ? str(part.props, 'min_bus_class') : max), '')
      error(
        'bus_too_small',
        'design',
        `${list(tooBig.map((part) => part.name))} ${tooBig.length === 1 ? 'is' : 'are'} too big for ${bus.name}. You need at least a ${needed}-class bus, or smaller parts.`,
      )
    }
  }

  // ---- Propulsion: the bus's own engine has to finish the trip and hold the orbit.
  const delta_v_ms = prop(bus, 'propulsion_delta_v_ms')
  const delta_v_required_ms = prop(orbit, 'delta_v_required_ms')
  let drifting = false
  if (bus && orbit && delta_v_ms < delta_v_required_ms) {
    if (delta_v_required_ms > CAPTURE_DELTA_V_MS) {
      const cheapest = partsOf(entities, 'bus')
        .filter((part) => num(part.props, 'propulsion_delta_v_ms') >= delta_v_required_ms)
        .sort((a, b) => num(a.props, 'cost_usd') - num(b.props, 'cost_usd'))[0]
      error(
        'delta_v_short',
        'design',
        `Getting into ${orbit.name} takes an engine burn of ${n1(delta_v_required_ms)} m/s, but ${bus.name} can only manage ${n1(delta_v_ms)} m/s. Pick a bus with a bigger engine${cheapest ? ` (the cheapest that can do it is ${cheapest.name})` : ''} or an orbit that is easier to reach.`,
      )
    } else {
      drifting = true
    }
  }

  // ---- Lifetime: the mission ends at the earliest of the plan, the bus wearing out and the orbit decaying.
  const mission_s = Math.max(0, num(params, 'mission_duration_s'))
  const busLife_s = prop(bus, 'design_life_s') > 0 ? prop(bus, 'design_life_s') : Infinity
  const orbitLife_s = (prop(orbit, 'max_lifetime_s') > 0 ? prop(orbit, 'max_lifetime_s') : Infinity) * (drifting ? DRIFT_LIFETIME_FACTOR : 1)
  const lifetime_s = Math.min(mission_s, busLife_s, orbitLife_s)
  const end_reason: FlightModel['end_reason'] =
    lifetime_s >= mission_s ? 'mission' : busLife_s <= orbitLife_s ? 'bus_life' : 'orbit_life'
  // Drifting only matters when it cuts the mission short, and `orbit_life_short` says so then.
  if (bus && busLife_s < mission_s) {
    warning(
      'bus_life_short',
      'time',
      `${bus.name} is built to last ${formatYears(busLife_s)}, but the mission is ${formatYears(mission_s)} long. It will stop early and miss the rest of the science. Pick a bus with a longer design life.`,
    )
  }
  if (orbit && orbitLife_s < mission_s) {
    warning(
      'orbit_life_short',
      'time',
      `A spacecraft stays in ${orbit.name} for about ${formatYears(orbitLife_s)}, but the mission is ${formatYears(mission_s)} long. It will end early. Pick a longer-lived orbit${drifting ? ' or a bus with a thruster' : ''}.`,
    )
  }
  const cruise_days = Math.max(0, has(orbit, 'cruise_s') ? prop(orbit, 'cruise_s') / DAY_S : prop(orbit, 'cruise_days'))
  const mission_days = mission_s / DAY_S
  const lifetime_days = lifetime_s / DAY_S

  // ---- Power: solar arrays only make power in sunlight, and an RTG makes it all the time.
  const eclipse = clamp01(prop(orbit, 'eclipse_fraction'))
  const isRtg = solar !== undefined && str(solar.props, 'type') === 'rtg'
  // Sunlight thins with distance from the Sun (1 / distance squared): Mars gets about 43% of Earth's.
  const sunlight = isRtg ? 1 : prop(orbit, 'solar_flux_factor', 1)
  const power_available_w = prop(solar, 'power_w') * (isRtg ? 1 : 1 - eclipse) * sunlight
  const dimSun = sunlight < 1 && orbit ? ` Sunlight at ${orbit.name} is only ${pct(sunlight)} as strong as at Earth.` : ''
  const base_load_w = prop(bus, 'base_power_w') + prop(comms, 'power_w')
  const instrument_load_w = sum(instruments, 'power_w')
  const power_w = base_load_w + instrument_load_w
  const degradation_per_year = clamp01(prop(solar, 'degradation_per_year'))

  // ---- Battery: it has to run everything while the spacecraft is in shadow.
  const battery_wh = prop(battery, 'capacity_wh')
  let battery_needed_wh = 0
  let shadow_uptime = 1
  if (solar && orbit && !isRtg && eclipse > 0) {
    const period_s = has(orbit, 'period_s') ? prop(orbit, 'period_s') : orbitPeriodS(str(orbit.props, 'central_body', 'earth'), prop(orbit, 'altitude_m'))
    battery_needed_wh = (power_w * eclipse * period_s) / 3600
    if (battery_wh < battery_needed_wh) {
      shadow_uptime = 1 - eclipse
      warning(
        'battery_small',
        'power',
        battery
          ? `${battery.name} holds ${n1(battery_wh)} Wh, but running through each eclipse takes ${n1(battery_needed_wh)} Wh. The instruments will switch off in shadow (${pct(eclipse)} of each orbit). Pick a bigger battery.`
          : `There is no battery, so the instruments will switch off in shadow (${pct(eclipse)} of each orbit). Add a battery that holds at least ${n1(battery_needed_wh)} Wh.`,
      )
    }
  }

  const flightPower = { base_load_w, instrument_load_w, power_available_w, degradation_per_year, shadow_uptime }
  const instrument_uptime = uptimeAt(flightPower, 0)
  if (solar && (bus || comms)) {
    const endOfLife_w = power_available_w * Math.max(0, 1 - (degradation_per_year * lifetime_s) / YEAR_S)
    if (base_load_w > power_available_w) {
      error(
        'power_negative',
        'power',
        `The bus and radio need ${n1(base_load_w)} W, but ${solar.name} averages ${n1(power_available_w)} W over an orbit. The spacecraft cannot stay alive.${dimSun} Pick a bigger power source.`,
      )
    } else if (power_w > power_available_w) {
      warning(
        'power_short',
        'power',
        `Everything on at once needs ${n1(power_w)} W, but ${solar.name} averages ${n1(power_available_w)} W over an orbit. The instruments will take turns and run ${pct(instrument_uptime)} of the time.${dimSun} Pick a bigger power source or fewer instruments.`,
      )
    } else if (power_w > endOfLife_w) {
      warning(
        'power_fades',
        'power',
        `${solar.name} loses ${pct(degradation_per_year)} of its output each year. By the end of the mission it makes ${n1(endOfLife_w)} W, less than the ${n1(power_w)} W the spacecraft needs, so the instruments will run less. Pick a bigger power source.`,
      )
    }
  }

  // ---- Science: each instrument earns its `science_value` over the full planned mission.
  let scienceFull = 0
  const offOrbit: string[] = []
  for (const part of instruments) {
    const factor = orbitScienceFactor(part, orbit)
    if (factor < 1) {
      const best = str(part.props, 'best_orbit', 'any')
      const bestOrbit = findPart(entities, 'orbit', best)
      offOrbit.push(`${part.name} (${pct(factor)} of its science, best in ${bestOrbit ? bestOrbit.name : best})`)
    }
    scienceFull += num(part.props, 'science_value') * factor
  }
  if (orbit && offOrbit.length > 0) {
    warning(
      'off_best_orbit',
      'design',
      `${list(offOrbit)} ${offOrbit.length === 1 ? 'earns' : 'earn'} less science in ${orbit.name}. Fly ${offOrbit.length === 1 ? 'it' : 'them'} in the right orbit or swap ${offOrbit.length === 1 ? 'it' : 'them'} out.`,
    )
  }
  const science_per_day_full = mission_days > 0 ? scienceFull / mission_days : 0
  const instrumentGbPerDay = (part: Entity) => (num(part.props, 'data_rate_bps') * clamp01(num(part.props, 'duty_cycle', 1)) * DAY_S) / BITS_PER_GB
  const streams = instruments
    .filter((part) => instrumentGbPerDay(part) > 0 && mission_days > 0)
    .map((part) => {
      const gb_per_day = instrumentGbPerDay(part)
      return { gb_per_day, science_per_gb: (num(part.props, 'science_value') * orbitScienceFactor(part, orbit)) / mission_days / gb_per_day }
    })
    .sort((a, b) => b.science_per_gb - a.science_per_gb)

  // ---- Data: science only counts once the data reaches the ground.
  const data_gb_per_day_full =
    instruments.reduce((bits, part) => bits + num(part.props, 'data_rate_bps') * clamp01(num(part.props, 'duty_cycle', 1)) * DAY_S, 0) / BITS_PER_GB
  const science_per_day = science_per_day_full * instrument_uptime
  const data_generated_gb_per_day = data_gb_per_day_full * instrument_uptime
  const link_factor =
    has(comms, 'reference_range_m') && has(orbit, 'comm_range_m') && prop(orbit, 'comm_range_m') > 0
      ? Math.min(1, (prop(comms, 'reference_range_m') / prop(orbit, 'comm_range_m')) ** 2)
      : 1
  const data_rate_bps = prop(comms, 'data_rate_bps') * link_factor
  // Extra ground stations are an optional feature: off (1 station) unless the scenario puts a price on them.
  const ground_stations =
    num(params, 'ground_station_cost_usd_per_day') > 0 ? Math.min(MAX_GROUND_STATIONS, Math.max(1, Math.round(num(params, 'ground_stations', 1)))) : 1
  const contact_s_per_day = Math.min(DAY_S, prop(orbit, 'contact_s_per_day') * ground_stations)
  const downlink_gb_per_day = (data_rate_bps * contact_s_per_day) / BITS_PER_GB
  // No storage column in the catalog: the recorder holds one day of observations.
  const storage_gb = has(bus, 'storage_gb') ? prop(bus, 'storage_gb') : data_gb_per_day_full
  if (comms && orbit && link_factor < 1) {
    warning(
      'link_weak',
      'comms',
      `${comms.name} is built for links up to ${n1(prop(comms, 'reference_range_m') / 1000)} km, but in ${orbit.name} the ground is ${n1(prop(orbit, 'comm_range_m') / 1000)} km away. At that range it runs at ${link_factor < 0.005 ? 'less than 1%' : pct(link_factor)} of its speed (${formatBps(data_rate_bps)}). ${
        // Only give advice the catalog can keep: no radio may reach further than this one.
        partsOf(entities, 'comms_system').some((part) => num(part.props, 'reference_range_m') > prop(comms, 'reference_range_m'))
          ? 'Pick a radio with a longer range.'
          : 'No radio reaches further, so plan for the slower link.'
      }`,
    )
  }
  const flight: FlightModel = {
    ...flightPower,
    science_per_day_full,
    data_gb_per_day_full,
    streams,
    downlink_gb_per_day,
    storage_gb,
    survival_per_day: 1, // set in the risk section below
    end_reason,
  }
  const returnedShare = data_generated_gb_per_day > 0 ? Math.min(1, downlink_gb_per_day / data_generated_gb_per_day) : 1
  if (comms && orbit && returnedShare < 1 - 1e-9) {
    // The radio sends the most valuable data first, so the science share can be well above the data share.
    const scienceShare = science_per_day > 0 ? dayOfData(flight, 0, instrument_uptime, 1, 1).science / science_per_day : 0
    warning(
      'downlink_short',
      'comms',
      `Your instruments make ${formatGb(data_generated_gb_per_day)} a day, but ${comms.name} can only send ${formatGb(downlink_gb_per_day)} a day home from ${orbit.name}. The most valuable data goes first, so ${scienceShare < 0.005 ? 'almost none' : pct(scienceShare)} of the science arrives. Pick a faster radio, an orbit with more contact time, or instruments that make less data.`,
    )
  }
  // The forecast is the flight run ahead of time with no bad luck: same days, same fading power, same radio.
  const start_s = cruise_days * DAY_S
  // shortcut: missions over ~10 years are forecast in 3660 equal chunks instead of days, so a huge mission_duration_s cannot stall the design screen.
  const chunk_s = Math.max(DAY_S, (lifetime_s - start_s) / 3660)
  let science_expected = 0
  let instrumentTime_s = 0
  for (let t = start_s, waiting = 0; t < lifetime_s - 1e-6; ) {
    const dayIndex = Math.floor(t / DAY_S + 1e-9)
    const advance = Math.min(chunk_s > DAY_S ? chunk_s : (dayIndex + 1) * DAY_S - t, lifetime_s - t)
    const uptime = uptimeAt(flightPower, (dayIndex * DAY_S) / YEAR_S)
    const day = dayOfData(flight, waiting, uptime, advance / DAY_S, advance / DAY_S)
    science_expected += day.science
    instrumentTime_s += uptime * advance
    waiting = day.stored_gb
    t += advance
  }
  const missionUptime = lifetime_s > start_s ? instrumentTime_s / (lifetime_s - start_s) : instrument_uptime
  const science_goal = Math.max(0, num(params, 'target_science_score'))

  // ---- Budget: parts + launch (some rockets also charge per kilogram) + running the mission.
  const build_cost_usd = sum([bus, ...added], 'cost_usd')
  const launch_cost_usd = prop(launcher, 'cost_usd') + prop(launcher, 'cost_per_kg_usd') * mass_kg
  const ops_cost_usd_per_day =
    num(params, 'ops_cost_usd_per_day') + ground_stations * num(params, 'ground_station_cost_usd_per_day')
  const ops_cost_usd = ops_cost_usd_per_day * lifetime_days
  const cost_usd = build_cost_usd + launch_cost_usd + ops_cost_usd
  const budget_usd = Math.max(0, num(params, 'budget_usd'))
  if (budget_usd > 0 && cost_usd > budget_usd) {
    error(
      'over_budget',
      'budget',
      `The mission costs ${formatUsd(cost_usd)} (${formatUsd(build_cost_usd)} spacecraft, ${formatUsd(launch_cost_usd)} launch${ops_cost_usd > 0 ? `, ${formatUsd(ops_cost_usd)} operations` : ''}), which is ${formatUsd(cost_usd - budget_usd)} over the ${formatUsd(budget_usd)} budget. ${launch_cost_usd >= build_cost_usd ? 'The launch is the biggest cost: look for a cheaper launch vehicle first.' : 'The spacecraft is the biggest cost: swap something for a cheaper part.'}`,
    )
  }

  // ---- Schedule (only when the catalog has `build_months`): the slowest part sets the pace.
  const timed = [bus, ...added].filter((part): part is Entity => part !== undefined && has(part, 'build_months'))
  const schedule_months =
    timed.length > 0
      ? timed.reduce((max, part) => Math.max(max, num(part.props, 'build_months')), 0) +
        num(params, 'integration_months_per_instrument', 1) * instruments.length
      : 0
  const deadline_months = Math.max(0, num(params, 'deadline_months'))
  if (deadline_months > 0 && schedule_months > deadline_months) {
    error(
      'behind_schedule',
      'time',
      `Building this spacecraft takes ${n1(schedule_months)} months, but the launch window closes in ${n1(deadline_months)}. Pick parts that are faster to build or fly fewer instruments.`,
    )
  }

  // ---- Risk: `reliability` is the chance of lasting the whole design life near Earth; radiation multiplies the failure rate.
  const radiation = Math.max(0, prop(orbit, 'radiation_factor', 1))
  const ratedLife_s = Number.isFinite(busLife_s) ? busLife_s : mission_s
  const survival_per_day = ratedLife_s > 0 ? Math.pow(clamp01(prop(bus, 'reliability', 1)), (radiation * DAY_S) / ratedLife_s) : 1
  flight.survival_per_day = survival_per_day
  const bus_reliability = Math.pow(survival_per_day, lifetime_days)
  if (params.random_failures === true && bus && orbit && bus_reliability < SURVIVAL_WARNING) {
    warning(
      'radiation_risk',
      'design',
      `${radiation > 1 ? `Radiation in ${orbit.name} is ${n1(radiation)} times as strong as in low Earth orbit, so the` : 'The'} chance of ${bus.name} surviving the mission is only ${pct(bus_reliability)}. A more reliable bus or a calmer orbit improves the odds.`,
    )
  }

  // ---- Forecast: only worth showing once the design can launch.
  if (science_goal > 0 && instruments.length > 0 && !issues.some((issue) => issue.severity === 'error') && science_expected < science_goal - SCIENCE_TOLERANCE) {
    warning(
      'science_short',
      'design',
      `This design can return about ${n1(science_expected)} of the ${n1(science_goal)} science points the mission needs. ${
        returnedShare < 1 - 1e-9
          ? 'Not all of its data gets home, so fix the downlink first.'
          : missionUptime < 1 - 1e-9
            ? 'The instruments are switched off part of the time, so fix the power first.'
            : 'Add instruments, or pick ones that earn more science in this orbit.'
      }`,
    )
  }

  const budgets: Budgets = {
    mass_kg,
    mass_limit_kg,
    added_mass_kg,
    added_mass_limit_kg,
    payload_mass_kg,
    instrument_count: instruments.length,
    instrument_limit,
    power_w,
    power_available_w,
    battery_wh,
    battery_needed_wh,
    instrument_uptime,
    cost_usd,
    budget_usd,
    build_cost_usd,
    launch_cost_usd,
    ops_cost_usd,
    ops_cost_usd_per_day,
    data_generated_gb_per_day,
    downlink_gb_per_day,
    data_rate_bps,
    link_factor,
    storage_gb,
    science_per_day,
    science_expected,
    science_goal,
    delta_v_ms,
    delta_v_required_ms,
    schedule_months,
    deadline_months,
    ground_stations,
    launch_reliability: clamp01(prop(launcher, 'reliability', 1)),
    bus_reliability,
    cruise_days,
    mission_days,
    lifetime_days,
  }
  return { budgets, flight, issues, ready: !issues.some((issue) => issue.severity === 'error') }
}
