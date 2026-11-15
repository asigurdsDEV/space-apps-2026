// Live engineering check for the design sandbox. Every red or yellow row comes from the sim's
// own evaluateDesign rules (mass, power, battery, radio, delta-v, budget). A design the sim
// accepts is not marked failed here. Thermal and avionics have no separate catalog columns;
// those rows say so instead of inventing a fault.
import type { Entity, Issue, Params } from '../../shared'
import { evaluateDesign, type Budgets } from '../../sim'

export type CheckStatus = 'green' | 'yellow' | 'red'

export interface CheckRow {
  id: string
  label: string
  status: CheckStatus
  /** The number on the dashboard. */
  value: string
  /** Why, in the sim's own words when it raised an issue. */
  detail: string
  /** What to change. Empty when the row is green. */
  fix: string
}

export interface EngineeringReport {
  rows: CheckRow[]
  /** Share of rows that are fully satisfied. A yellow row counts as half. */
  readiness: number
  /** Red if any row is red, yellow if any row is yellow, otherwise green. */
  status: CheckStatus
  /** True when nothing is red. Yellow still allows launch; the sim carries those limits into the flight. */
  ready: boolean
  headline: string
}

const n = (value: number, digits = 0) => {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const text = abs >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(digits)
  return text
}

function statusOf(issues: Issue[], codes: string[]): CheckStatus {
  const mine = issues.filter((issue) => codes.includes(issue.code))
  if (mine.some((issue) => issue.severity === 'error')) return 'red'
  if (mine.some((issue) => issue.severity === 'warning')) return 'yellow'
  return 'green'
}

function detailOf(issues: Issue[], codes: string[], ok: string): { detail: string; fix: string } {
  const mine = issues.filter((issue) => codes.includes(issue.code))
  const worst = mine.find((issue) => issue.severity === 'error') ?? mine[0]
  if (!worst) return { detail: ok, fix: '' }
  return { detail: worst.message, fix: worst.message }
}

function row(id: string, label: string, status: CheckStatus, value: string, detail: string, fix = ''): CheckRow {
  return { id, label, status, value, detail, fix: status === 'green' ? '' : fix || detail }
}

/** The sandbox, including its easy and hard ids. */
export function isEngineeringSandbox(scenarioId: string | undefined): boolean {
  return (scenarioId ?? '').replace(/-(easy|hard)$/, '') === 'sandbox'
}

export function engineeringReport(state: { entities: Entity[]; params: Params }): EngineeringReport {
  const report = evaluateDesign(state.params, state.entities)
  const issues = report.issues
  const b = report.budgets
  const rows = rowsFrom(b, issues)
  const score = rows.reduce((sum, item) => sum + (item.status === 'green' ? 1 : item.status === 'yellow' ? 0.5 : 0), 0)
  const readiness = rows.length === 0 ? 0 : Math.round((score / rows.length) * 100)
  const status: CheckStatus = rows.some((item) => item.status === 'red') ? 'red' : rows.some((item) => item.status === 'yellow') ? 'yellow' : 'green'
  const headline = status === 'red' ? 'NOT READY' : status === 'yellow' ? 'READY WITH WARNINGS' : 'MISSION READY'
  return { rows, readiness, status, ready: status !== 'red', headline }
}

function rowsFrom(b: Budgets, issues: Issue[]): CheckRow[] {
  const powerCodes = ['missing_solar', 'unknown_solar', 'wrong_type_solar', 'power_negative', 'power_short', 'power_fades']
  const batteryCodes = ['missing_battery', 'unknown_battery', 'wrong_type_battery', 'battery_small']
  const massCodes = ['mass_over_limit', 'orbit_unreachable', 'mass_margin_low']
  const structureCodes = ['added_mass_over_bus', 'too_many_instruments', 'bus_too_small', 'missing_bus']
  const commsCodes = ['missing_comms', 'unknown_comms', 'wrong_type_comms', 'link_weak', 'downlink_short']
  const propulsionCodes = ['delta_v_short', 'orbit_life_short']
  const payloadCodes = ['missing_instrument', 'unknown_instrument', 'off_best_orbit']
  const compatCodes = issues.filter((issue) => issue.code.startsWith('wrong_type_') || issue.code.startsWith('unknown_') || issue.code === 'bus_too_small').map((issue) => issue.code)
  const missionCodes = ['over_budget', 'behind_schedule', 'science_short', 'orbit_unreachable']

  const power = statusOf(issues, powerCodes)
  const powerText = detailOf(issues, powerCodes, `The arrays average ${n(b.power_available_w)} W and the spacecraft draws ${n(b.power_w)} W.`)
  const thermal: CheckStatus = power === 'red' ? 'yellow' : 'green'
  const thermalDetail = power === 'red'
    ? 'Waste heat follows the power budget, and that budget is already short. Fix the power source before treating heat as its own fault.'
    : 'This catalog has no separate thermal limit. A design inside its power budget stays in the game\'s operating range.'

  const fuelStatus = statusOf(issues, ['delta_v_short', 'orbit_life_short'])
  const fuelTight = fuelStatus === 'green' && b.delta_v_required_ms > 0 && b.delta_v_ms < b.delta_v_required_ms * 1.1
  const fuel: CheckStatus = fuelTight ? 'yellow' : fuelStatus

  const antenna: CheckStatus = statusOf(issues, ['missing_comms', 'unknown_comms', 'wrong_type_comms', 'link_weak'])

  return [
    row('mass', 'Satellite mass', statusOf(issues, massCodes), `${n(b.mass_kg)} kg / ${n(b.mass_limit_kg)} kg lift`, detailOf(issues, massCodes, `The spacecraft is ${n(b.mass_kg)} kg. The rocket can lift ${n(b.mass_limit_kg)} kg to this orbit.`).detail),
    row('power', 'Power generation', power, `${n(b.power_available_w)} W available`, powerText.detail),
    row('draw', 'Power consumption', power === 'red' && issues.some((issue) => issue.code === 'power_negative' || issue.code === 'power_short') ? power : 'green', `${n(b.power_w)} W drawn`, `Bus, radio and instruments draw ${n(b.power_w)} W together.`),
    row('battery', 'Battery capacity', statusOf(issues, batteryCodes), `${n(b.battery_wh)} Wh / ${n(b.battery_needed_wh)} Wh eclipse`, detailOf(issues, batteryCodes, `The battery holds ${n(b.battery_wh)} Wh. One eclipse needs ${n(b.battery_needed_wh)} Wh.`).detail),
    row('thermal', 'Thermal range', thermal, thermal === 'green' ? 'Inside the power budget' : 'Tied to the power fault', thermalDetail),
    row('comms', 'Communications', statusOf(issues, commsCodes), `${n(b.data_rate_bps)} bit/s`, detailOf(issues, commsCodes, `The radio can send about ${n(b.downlink_gb_per_day, 1)} GB a day from this orbit.`).detail),
    row('antenna', 'Antenna match', antenna, b.link_factor >= 0.995 ? 'Full link' : `${Math.round(b.link_factor * 100)}% of rated speed`, detailOf(issues, ['link_weak', 'missing_comms'], 'The antenna\'s rated range covers this orbit.').detail),
    row('propulsion', 'Propulsion', statusOf(issues, propulsionCodes), `${n(b.delta_v_ms)} m/s on board`, detailOf(issues, propulsionCodes, `The bus can change speed by ${n(b.delta_v_ms)} m/s. This orbit asks for ${n(b.delta_v_required_ms)} m/s.`).detail),
    row('fuel', 'Fuel capacity', fuel, `${n(b.delta_v_ms)} / ${n(b.delta_v_required_ms)} m/s`, fuel === 'green' ? 'The bus carries enough delta-v for this orbit. In this game, that figure is the fuel.' : fuel === 'red' ? 'The bus cannot make the burn this orbit needs. Pick a bus with a larger engine, or an easier orbit.' : 'The bus carries less delta-v than this orbit lists. The sim still launches. A shortfall below a capture burn is drift, not a lost rocket.'),
    row('payload', 'Payload fit', statusOf(issues, payloadCodes), `${b.instrument_count} instrument${b.instrument_count === 1 ? '' : 's'}`, detailOf(issues, payloadCodes, 'Every instrument is in the catalog and can fly this orbit.').detail),
    row('avionics', 'Computer and avionics', statusOf(issues, ['missing_bus', 'unknown_bus']), b.bus_reliability > 0 ? `${Math.round(b.bus_reliability * 100)}% bus survival` : 'No bus', detailOf(issues, ['missing_bus', 'unknown_bus'], 'The bus includes the flight computer and the attitude control. This catalog has no separate avionics part.').detail),
    row('solar', 'Solar array', statusOf(issues, ['missing_solar', 'unknown_solar', 'wrong_type_solar', 'power_fades']), `${n(b.power_available_w)} W average`, detailOf(issues, ['missing_solar', 'power_fades', 'power_negative'], 'A power source is fitted and covers the orbit average.').detail),
    row('compat', 'Component fit', statusOf(issues, compatCodes), compatCodes.length === 0 ? 'Parts agree' : `${compatCodes.length} mismatch${compatCodes.length === 1 ? '' : 'es'}`, detailOf(issues, compatCodes, 'Every part fits the bus class and the slot it was placed in.').detail),
    row('structure', 'Structure', statusOf(issues, structureCodes), `${n(b.added_mass_kg)} / ${n(b.added_mass_limit_kg)} kg on the bus`, detailOf(issues, structureCodes, 'The bus can carry the instruments, power and radio that are bolted to it.').detail),
    row('mission', 'Mission rules', statusOf(issues, missionCodes), missionCodes.some((code) => issues.some((issue) => issue.code === code)) ? 'See the note' : 'Within the scenario', detailOf(issues, missionCodes, 'Budget, schedule and the science goal are all inside the scenario, or this scenario does not set them.').detail),
  ]
}
