// Design evaluation: turn the player's choices into budgets and a list of problems.
// Pure and cheap, so the sim re-runs it every step and the budget bars stay live.
//
// The rules follow the "Suggested budget math" in data/README.md. Each one is a single
// sentence in sim/README.md. A rule whose column is missing from the catalog is off.

import type { Entity, Issue, Params } from '../shared'
import { orbitPeriodS } from './orbit'
import { instrumentIds, resolveAliases, SLOTS, type Slot, type SlotKey } from './params'
import { busClassRank, findPart, has, num, str } from './parts'

/** An instrument flown outside its `best_orbit` earns this share of its science. */
export const OFF_ORBIT_SCIENCE_FACTOR = 0.5
/** Warn when the spacecraft uses more than this share of what the launcher can lift. */
export const MASS_MARGIN_WARNING = 0.9
/**
 * Orbits that need more delta-v than this need an engine burn just to arrive, so a bus
 * without it cannot launch. Smaller amounts are station-keeping: the mission still flies.
 */
export const CAPTURE_DELTA_V_MS = 100
/** A spacecraft that cannot station-keep stays in its orbit for this share of the orbit's lifetime. */
export const DRIFT_LIFETIME_FACTOR = 0.5
/** Warn when the chance of the bus surviving the mission is below this. */
export const SURVIVAL_WARNING = 0.7
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
  /** Science this design returns over the whole mission if nothing breaks. */
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
  /** Chance the bus survives the planned mission in this orbit's radiation. */
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
  downlink_gb_per_day: number
  storage_gb: number
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
  return powerShare * flight.shadow_uptime
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
  const percent = share * 100
  return `${percent > 0 && percent < 1 ? n1(percent) : Math.round(percent)}%`
}

function formatBps(bps: number): string {
  if (bps >= 1e6) return `${n1(bps / 1e6)} Mbps`
  if (bps >= 1e3) return `${n1(bps / 1e3)} kbps`
  return `${Math.round(bps)} bps`
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
      error('orbit_unreachable', 'mass', `${launcher.name} cannot reach ${orbit.name}. Pick a launch vehicle that goes there, or a different orbit.`)
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
        `Only ${n1(mass_limit_kg - mass_kg)} kg of launch margin is left. Real missions keep at least 10% spare because designs grow.`,
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
      error(
        'delta_v_short',
        'design',
        `Getting into ${orbit.name} takes an engine burn of ${n1(delta_v_required_ms)} m/s, but ${bus.name} can only manage ${n1(delta_v_ms)} m/s. Pick a bus with a bigger engine or an orbit that is easier to reach.`,
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
  if (drifting && bus && orbit) {
    warning(
      'no_station_keeping',
      'design',
      `${orbit.name} takes ${n1(delta_v_required_ms)} m/s of thruster fuel to hold, and ${bus.name} has ${n1(delta_v_ms)} m/s. It can still fly, but it will drift and stay in this orbit only half as long${Number.isFinite(orbitLife_s) ? ` (${formatYears(orbitLife_s)})` : ''}. A bus with a thruster fixes this.`,
    )
  }
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
  const power_available_w = prop(solar, 'power_w') * (isRtg ? 1 : 1 - eclipse)
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
        `The bus and radio need ${n1(base_load_w)} W, but ${solar.name} averages ${n1(power_available_w)} W over an orbit. The spacecraft cannot stay alive. Pick a bigger power source.`,
      )
    } else if (power_w > power_available_w) {
      warning(
        'power_short',
        'power',
        `Everything on at once needs ${n1(power_w)} W, but ${solar.name} averages ${n1(power_available_w)} W over an orbit. The instruments will take turns and run ${pct(clamp01((power_available_w - base_load_w) / instrument_load_w))} of the time. Pick a bigger power source or fewer instruments.`,
      )
    } else if (power_w > endOfLife_w) {
      warning(
        'power_fades',
        'power',
        `${solar.name} loses ${pct(degradation_per_year)} of its output each year. By the end of the mission it makes ${n1(endOfLife_w)} W, less than the ${n1(power_w)} W the spacecraft needs, so the instruments will run less. Leave more power margin.`,
      )
    }
  }

  // ---- Science: each instrument earns its `science_value` over the full planned mission.
  let scienceFull = 0
  const offOrbit: string[] = []
  for (const part of instruments) {
    const best = str(part.props, 'best_orbit', 'any')
    const suited = !orbit || best === 'any' || best === '' || best === orbit.id
    if (!suited) {
      const bestOrbit = findPart(entities, 'orbit', best)
      offOrbit.push(`${part.name} (best in ${bestOrbit ? bestOrbit.name : best})`)
    }
    scienceFull += num(part.props, 'science_value') * (suited ? 1 : OFF_ORBIT_SCIENCE_FACTOR)
  }
  if (orbit && offOrbit.length > 0) {
    warning(
      'off_best_orbit',
      'design',
      `${list(offOrbit)} ${offOrbit.length === 1 ? 'earns' : 'earn'} only half the science in ${orbit.name}. Fly ${offOrbit.length === 1 ? 'it' : 'them'} in the right orbit or swap ${offOrbit.length === 1 ? 'it' : 'them'} out.`,
    )
  }
  const science_per_day_full = mission_days > 0 ? scienceFull / mission_days : 0

  // ---- Data: science only counts once the data reaches the ground.
  const data_gb_per_day_full =
    instruments.reduce((bits, part) => bits + num(part.props, 'data_rate_bps') * clamp01(num(part.props, 'duty_cycle', 1)) * DAY_S, 0) / BITS_PER_GB
  const data_generated_gb_per_day = data_gb_per_day_full * instrument_uptime
  const link_factor =
    has(comms, 'reference_range_m') && has(orbit, 'comm_range_m') && prop(orbit, 'comm_range_m') > 0
      ? Math.min(1, (prop(comms, 'reference_range_m') / prop(orbit, 'comm_range_m')) ** 2)
      : 1
  const data_rate_bps = prop(comms, 'data_rate_bps') * link_factor
  const ground_stations = Math.min(MAX_GROUND_STATIONS, Math.max(1, Math.round(num(params, 'ground_stations', 1))))
  const contact_s_per_day = Math.min(DAY_S, prop(orbit, 'contact_s_per_day') * ground_stations)
  const downlink_gb_per_day = (data_rate_bps * contact_s_per_day) / BITS_PER_GB
  // No storage column in the catalog: the recorder holds one day of observations.
  const storage_gb = has(bus, 'storage_gb') ? prop(bus, 'storage_gb') : data_gb_per_day_full
  if (comms && orbit && link_factor < 1) {
    warning(
      'link_weak',
      'comms',
      `${comms.name} is built for links up to ${n1(prop(comms, 'reference_range_m') / 1000)} km, but in ${orbit.name} the ground is ${n1(prop(orbit, 'comm_range_m') / 1000)} km away. At that range it runs at ${pct(link_factor)} of its speed (${formatBps(data_rate_bps)}). Pick a radio with a longer range.`,
    )
  }
  const returnedShare = data_generated_gb_per_day > 0 ? Math.min(1, downlink_gb_per_day / data_generated_gb_per_day) : 1
  if (comms && orbit && returnedShare < 1 - 1e-9) {
    warning(
      'downlink_short',
      'comms',
      `Your instruments make ${formatGb(data_generated_gb_per_day)} a day, but ${comms.name} can only send ${formatGb(downlink_gb_per_day)} a day home from ${orbit.name}. Only ${pct(returnedShare)} of the science arrives. Pick a faster radio, an orbit with more contact time, or instruments that make less data.`,
    )
  }
  const science_per_day = science_per_day_full * instrument_uptime
  const science_expected = science_per_day * returnedShare * Math.max(0, lifetime_days - cruise_days)
  const science_goal = Math.max(0, num(params, 'target_science_score'))
  if (science_goal > 0 && instruments.length > 0 && launcher && orbit && bus && solar && comms && science_expected < science_goal) {
    warning(
      'science_short',
      'design',
      `This design can return about ${n1(science_expected)} of the ${n1(science_goal)} science points the mission needs. ${returnedShare < 1 - 1e-9 ? 'Most of its data never gets home, so fix the downlink first.' : 'Add instruments, or pick ones that earn more science in this orbit.'}`,
    )
  }

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
      `The mission costs ${formatUsd(cost_usd)} (${formatUsd(build_cost_usd)} spacecraft, ${formatUsd(launch_cost_usd)} launch${ops_cost_usd > 0 ? `, ${formatUsd(ops_cost_usd)} operations` : ''}), which is ${formatUsd(cost_usd - budget_usd)} over the ${formatUsd(budget_usd)} budget. Swap something for a cheaper part.`,
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

  // ---- Risk: radiation makes failures more likely.
  const radiation = Math.max(0, prop(orbit, 'radiation_factor', 1))
  const bus_reliability = Math.pow(clamp01(prop(bus, 'reliability', 1)), radiation)
  if (params.random_failures !== false && bus && orbit && radiation > 1 && bus_reliability < SURVIVAL_WARNING) {
    warning(
      'radiation_risk',
      'design',
      `Radiation in ${orbit.name} is ${n1(radiation)} times as strong as in low Earth orbit, so ${bus.name} has only a ${pct(bus_reliability)} chance of surviving the mission. A more reliable bus or a calmer orbit improves the odds.`,
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
  const flight: FlightModel = {
    ...flightPower,
    science_per_day_full,
    data_gb_per_day_full,
    downlink_gb_per_day,
    storage_gb,
    end_reason,
  }
  return { budgets, flight, issues, ready: !issues.some((issue) => issue.severity === 'error') }
}
