// Design evaluation: turn the player's choices into budgets and a list of problems.
// Pure and cheap, so the sim re-runs it every step and the budget bars stay live.

import type { Entity, Issue, Params } from '../shared'
import { orbitPeriodS } from './orbit'
import { findPart, num, str, type PartKind } from './parts'

/** Instruments that match the scenario's `objective` earn this much more science. */
export const OBJECTIVE_BONUS = 1.5
/** Warn when the spacecraft uses more than this share of what the launcher can lift. */
export const MASS_MARGIN_WARNING = 0.9
const MAX_GROUND_STATIONS = 6

/** Every number the dashboard needs. All of these are copied into `SimState.metrics`. */
export interface Budgets {
  mass_kg: number
  mass_limit_kg: number
  payload_mass_kg: number
  payload_limit_kg: number
  /** Total draw with every instrument on. */
  power_w: number
  /** Orbit-average generation (sunlit share of the array output). */
  power_available_w: number
  /** Share of the time the instruments can run, 0 to 1 (power and eclipse). */
  duty_cycle: number
  /** Whole-mission cost: parts + launch + operations. */
  cost_usd: number
  budget_usd: number
  build_cost_usd: number
  launch_cost_usd: number
  ops_cost_usd: number
  ops_cost_usd_per_day: number
  data_generated_gb_per_day: number
  downlink_gb_per_day: number
  /** Raw radio rate while in contact with a ground station. */
  data_rate_bps: number
  storage_gb: number
  science_per_day: number
  science_goal: number
  schedule_months: number
  deadline_months: number
  ground_stations: number
  launch_reliability: number
  bus_reliability: number
  cruise_days: number
  mission_days: number
}

export interface DesignReport {
  budgets: Budgets
  issues: Issue[]
  /** True when nothing blocks launch (no `error` issues). */
  ready: boolean
}

/** The `instruments` param is a comma-separated list of instrument ids. */
export function instrumentIds(params: Params): string[] {
  const raw = params.instruments ?? params.instrument
  if (typeof raw !== 'string') return []
  return [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => s !== ''))]
}

export function formatUsd(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function round1(value: number): string {
  return (Math.round(value * 10) / 10).toString()
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

const SLOT_LABEL: Record<Exclude<PartKind, 'instrument'>, string> = {
  launch_vehicle: 'a launch vehicle',
  orbit: 'an orbit',
  bus: 'a spacecraft bus',
  power_system: 'a power system',
  comms_system: 'a comms system',
}

export function evaluateDesign(params: Params, entities: Entity[]): DesignReport {
  const issues: Issue[] = []
  const error = (code: string, resource: string, message: string) =>
    issues.push({ code, severity: 'error', resource, message })
  const warning = (code: string, resource: string, message: string) =>
    issues.push({ code, severity: 'warning', resource, message })

  const slot = (kind: Exclude<PartKind, 'instrument'>): Entity | undefined => {
    const id = params[kind]
    if (typeof id !== 'string' || id === '') {
      error(`missing_${kind}`, 'design', `Pick ${SLOT_LABEL[kind]}.`)
      return undefined
    }
    const part = findPart(entities, kind, id)
    if (!part) error('unknown_part', 'design', `"${id}" is not in the catalog. Pick ${SLOT_LABEL[kind]}.`)
    return part
  }
  const prop = (part: Entity | undefined, key: string, fallback = 0) =>
    part ? num(part.props, key, fallback) : fallback

  const launcher = slot('launch_vehicle')
  const orbit = slot('orbit')
  const bus = slot('bus')
  const power = slot('power_system')
  const comms = slot('comms_system')

  const instruments: Entity[] = []
  for (const id of instrumentIds(params)) {
    const part = findPart(entities, 'instrument', id)
    if (part) instruments.push(part)
    else error('unknown_part', 'design', `"${id}" is not in the instrument catalog.`)
  }
  if (instruments.length === 0) {
    error('missing_instrument', 'design', 'Add at least one instrument. Without one the mission returns no science.')
  }
  const sum = (key: string) => instruments.reduce((total, part) => total + num(part.props, key), 0)

  // ---- Mass: everything has to fit on the launch vehicle, for the chosen orbit.
  const payload_mass_kg = sum('mass_kg')
  const payload_limit_kg = prop(bus, 'max_payload_kg')
  const mass_kg = prop(bus, 'mass_kg') + prop(power, 'mass_kg') + prop(comms, 'mass_kg') + payload_mass_kg
  const orbitClass = orbit ? str(orbit.props, 'class') : ''
  const mass_limit_kg = launcher && orbitClass ? num(launcher.props, `capacity_${orbitClass}_kg`) : 0
  if (launcher && orbit) {
    if (mass_limit_kg <= 0) {
      error('orbit_unreachable', 'mass', `${launcher.name} cannot reach ${orbit.name}. Pick a bigger launch vehicle or a closer orbit.`)
    } else if (mass_kg > mass_limit_kg) {
      error(
        'mass_over_limit',
        'mass',
        `The spacecraft weighs ${round1(mass_kg)} kg, but ${launcher.name} can only lift ${round1(mass_limit_kg)} kg to ${orbit.name}. Drop ${round1(mass_kg - mass_limit_kg)} kg or pick a bigger launch vehicle.`,
      )
    } else if (mass_kg > mass_limit_kg * MASS_MARGIN_WARNING) {
      warning(
        'mass_margin_low',
        'mass',
        `Only ${round1(mass_limit_kg - mass_kg)} kg of launch margin is left. Real missions keep at least 10% spare because designs grow.`,
      )
    }
  }
  if (bus && payload_mass_kg > payload_limit_kg) {
    error(
      'payload_over_bus',
      'mass',
      `${bus.name} can carry ${round1(payload_limit_kg)} kg of instruments, but you picked ${round1(payload_mass_kg)} kg. Remove an instrument or pick a bigger bus.`,
    )
  }

  // ---- Power: solar arrays only make power in sunlight.
  const eclipse = clamp01(prop(orbit, 'eclipse_fraction'))
  const power_available_w = prop(power, 'power_w') * (1 - eclipse)
  const baseDraw = prop(bus, 'power_draw_w') + prop(comms, 'power_draw_w')
  const instrumentDraw = sum('power_draw_w')
  const power_w = baseDraw + instrumentDraw
  let duty_cycle = instrumentDraw > 0 ? clamp01((power_available_w - baseDraw) / instrumentDraw) : 1
  if (power && (bus || comms)) {
    if (baseDraw > power_available_w) {
      error(
        'power_negative',
        'power',
        `The bus and radio need ${round1(baseDraw)} W, but the power system averages ${round1(power_available_w)} W over an orbit. The spacecraft cannot stay alive. Pick a bigger power system.`,
      )
    } else if (power_w > power_available_w) {
      warning(
        'power_short',
        'power',
        `Everything on at once needs ${round1(power_w)} W, but only ${round1(power_available_w)} W is available on average. Instruments will run ${Math.round(duty_cycle * 100)}% of the time.`,
      )
    }
  }
  if (power && orbit && eclipse > 0) {
    const eclipseHours = (orbitPeriodS(str(orbit.props, 'body', 'earth'), num(orbit.props, 'altitude_km')) / 3600) * eclipse
    const needed_wh = power_w * eclipseHours
    if (num(power.props, 'battery_wh') < needed_wh) {
      duty_cycle *= 1 - eclipse
      warning(
        'battery_small',
        'power',
        `The battery holds ${round1(num(power.props, 'battery_wh'))} Wh, but running through each eclipse takes ${round1(needed_wh)} Wh. Instruments will switch off in Earth's shadow (${Math.round(eclipse * 100)}% of each orbit).`,
      )
    }
  }

  // ---- Science and data: science only counts once the data reaches the ground.
  const objective = str(params, 'objective')
  const scienceMultiplier = prop(orbit, 'science_multiplier', 1)
  let rawScience = 0
  let matchesObjective = false
  for (const part of instruments) {
    const matches = objective !== '' && str(part.props, 'objective') === objective
    if (matches) matchesObjective = true
    rawScience += num(part.props, 'science_per_day') * (matches ? OBJECTIVE_BONUS : 1)
  }
  const science_per_day = rawScience * scienceMultiplier * duty_cycle
  if (objective !== '' && instruments.length > 0 && !matchesObjective) {
    warning(
      'objective_mismatch',
      'design',
      `None of your instruments is built for this mission's objective ("${objective}"). Matching instruments earn ${OBJECTIVE_BONUS}x the science.`,
    )
  }

  const ground_stations = Math.min(MAX_GROUND_STATIONS, Math.max(1, Math.round(num(params, 'ground_stations', 1))))
  const data_generated_gb_per_day = sum('data_gb_per_day') * duty_cycle
  const data_rate_mbps = prop(comms, 'data_rate_mbps')
  const contactSecondsPerDay = prop(orbit, 'contact_min_per_day') * 60 * ground_stations
  // megabits -> gigabytes: /8 for megabytes, /1000 for gigabytes
  const downlink_gb_per_day = (data_rate_mbps * Math.min(86400, contactSecondsPerDay)) / 8 / 1000
  const storage_gb = prop(bus, 'storage_gb')
  if (comms && orbit && data_generated_gb_per_day > downlink_gb_per_day + 1e-9) {
    const share = Math.round((downlink_gb_per_day / data_generated_gb_per_day) * 100)
    const fillDays = storage_gb / (data_generated_gb_per_day - downlink_gb_per_day)
    warning(
      'downlink_short',
      'comms',
      `Your instruments make ${round1(data_generated_gb_per_day)} GB a day, but the radio can only send ${round1(downlink_gb_per_day)} GB a day home. Only ${share}% of the science arrives, and storage fills in ${round1(fillDays)} days. Add ground stations, pick a faster radio, or pick an orbit with more contact time.`,
    )
  }

  // ---- Budget: parts + launch + running the mission.
  const build_cost_usd =
    prop(bus, 'cost_usd') + prop(power, 'cost_usd') + prop(comms, 'cost_usd') + sum('cost_usd')
  const launch_cost_usd = prop(launcher, 'cost_usd')
  const mission_days = Math.max(0, num(params, 'mission_days'))
  const ops_cost_usd_per_day =
    num(params, 'ops_cost_usd_per_day') + ground_stations * num(params, 'ground_station_cost_usd_per_day')
  const ops_cost_usd = ops_cost_usd_per_day * mission_days
  const cost_usd = build_cost_usd + launch_cost_usd + ops_cost_usd
  const budget_usd = num(params, 'budget_usd')
  if (budget_usd > 0 && cost_usd > budget_usd) {
    error(
      'over_budget',
      'budget',
      `The mission costs ${formatUsd(cost_usd)} (${formatUsd(build_cost_usd)} spacecraft, ${formatUsd(launch_cost_usd)} launch, ${formatUsd(ops_cost_usd)} operations), which is ${formatUsd(cost_usd - budget_usd)} over the ${formatUsd(budget_usd)} budget.`,
    )
  }

  // ---- Time: the slowest part sets the schedule, and each instrument adds integration time.
  const parts = [bus, power, comms, ...instruments].filter((part): part is Entity => part !== undefined)
  const slowest = parts.reduce((max, part) => Math.max(max, num(part.props, 'build_months')), 0)
  const schedule_months = slowest + num(params, 'integration_months_per_instrument', 1) * instruments.length
  const deadline_months = num(params, 'deadline_months')
  if (deadline_months > 0 && schedule_months > deadline_months) {
    error(
      'behind_schedule',
      'time',
      `Building this spacecraft takes ${round1(schedule_months)} months, but the launch window closes in ${round1(deadline_months)}. Pick parts that are faster to build or fly fewer instruments.`,
    )
  }

  const budgets: Budgets = {
    mass_kg,
    mass_limit_kg,
    payload_mass_kg,
    payload_limit_kg,
    power_w,
    power_available_w,
    duty_cycle,
    cost_usd,
    budget_usd,
    build_cost_usd,
    launch_cost_usd,
    ops_cost_usd,
    ops_cost_usd_per_day,
    data_generated_gb_per_day,
    downlink_gb_per_day,
    data_rate_bps: data_rate_mbps * 1e6,
    storage_gb,
    science_per_day,
    science_goal: num(params, 'science_goal'),
    schedule_months,
    deadline_months,
    ground_stations,
    launch_reliability: clamp01(prop(launcher, 'reliability', 1)),
    bus_reliability: clamp01(prop(bus, 'reliability', 1)),
    cruise_days: Math.max(0, prop(orbit, 'cruise_days')),
    mission_days,
  }
  return { budgets, issues, ready: !issues.some((issue) => issue.severity === 'error') }
}
