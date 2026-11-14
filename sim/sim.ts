// The sim core: init / step / summary, as defined in .agents/CONTRACTS.md.
// Pure: no I/O, no Date.now(), no Math.random(), and `step` never mutates its input.
//
// Phases (metrics.phase): design -> cruise -> operations -> ended.
// Time only moves after launch. In the design phase each step just re-checks the design.

import type {
  Command,
  Config,
  Dataset,
  Entity,
  Metrics,
  Params,
  SimEvent,
  SimState,
  StepResult,
  Summary,
} from '../shared'
import { CONTRACT_VERSION } from '../shared'
import { dayOfData, evaluateDesign, formatUsd, SCIENCE_TOLERANCE, uptimeAt, YEAR_S } from './design'
import { bodyOf, circularState, transferState } from './orbit'
import { applyParam, cleanParams, resolveAliases } from './params'
import { catalogEntities, findPart, num, str } from './parts'
import { nextRandom } from './rng'

const DAY_S = 86400
const EPSILON_S = 1e-6

export const SPACECRAFT_ID = 'spacecraft'

/** Scenario params the sim reads, with the value used when the scenario leaves one out. 0 = that feature is off. */
export const DEFAULT_PARAMS: Params = {
  budget_usd: 0,
  ground_stations: 1,
  deadline_months: 0,
  ops_cost_usd_per_day: 0,
  ground_station_cost_usd_per_day: 0,
  integration_months_per_instrument: 1,
  /** Chance per day of a random event (solar storm, ground station outage) during operations. */
  event_rate_per_day: 0,
  /**
   * true = launches can fail, the bus can fail, random events happen. Off unless the scenario
   * asks for it: the rolls depend only on the seed, so a scenario must test its seed first.
   */
  random_failures: false,
}

export type Outcome =
  | 'in_design'
  | 'in_flight'
  | 'success'
  | 'science_shortfall'
  | 'launch_failure'
  | 'spacecraft_failure'

function metric(metrics: Metrics, key: string): number {
  const value = metrics[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function utcAt(startUtc: string, t_s: number): string {
  const start = Date.parse(startUtc)
  return Number.isNaN(start) ? startUtc : new Date(start + t_s * 1000).toISOString()
}

function batteryCheck(entities: Entity[]): (id: string) => boolean {
  return (id) => str(findPart(entities, 'power_system', id)?.props ?? {}, 'type') === 'battery'
}

export function init(config: Config, datasets: Dataset[]): SimState {
  const entities = [...catalogEntities(datasets), ...config.entities]
  const params: Params = resolveAliases(
    { ...DEFAULT_PARAMS, ...cleanParams(config.params), start_utc: config.start_utc },
    batteryCheck(entities),
  )
  if (typeof params.mission_duration_s !== 'number') params.mission_duration_s = config.duration_s
  const report = evaluateDesign(params, entities)
  return {
    contract_version: CONTRACT_VERSION,
    scenario_id: config.scenario_id,
    tick: 0,
    t_s: 0,
    utc: config.start_utc,
    frame: 'body-centered',
    status: 'running',
    entities,
    metrics: {
      phase: 'design',
      outcome: 'in_design',
      mission_day: 0,
      science_score: report.budgets.science_expected,
      data_generated_gb: 0,
      data_downlinked_gb: 0,
      data_stored_gb: 0,
      data_lost_gb: 0,
      cost_spent_usd: 0,
      ...report.budgets,
    },
    params,
    issues: report.issues,
    rng_state: config.seed | 0,
  }
}

/** Limits the UI shows as bars. Crossing one in the design phase raises `threshold_crossed`. */
const LIMIT_PAIRS: [string, string][] = [
  ['mass_kg', 'mass_limit_kg'],
  ['added_mass_kg', 'added_mass_limit_kg'],
  ['power_w', 'power_available_w'],
  ['cost_usd', 'budget_usd'],
  ['schedule_months', 'deadline_months'],
]

export function step(state: SimState, commands: Command[], dt_s: number): StepResult {
  if (state.status === 'ended') return { state, events: [] }

  const tick = state.tick + 1
  const events: SimEvent[] = []
  let t = state.t_s
  let rng = state.rng_state
  let entities = state.entities
  let phase = str(state.metrics, 'phase', 'design')
  let outcome = str(state.metrics, 'outcome', 'in_design') as Outcome
  const params: Params = { ...state.params }
  const warn = (message: string) => events.push({ type: 'warning', tick, t_s: t, payload: { message } })
  const changePhase = (to: string) => {
    events.push({ type: 'phase_changed', tick, t_s: t, payload: { from: phase, to } })
    phase = to
  }

  if (state.tick === 0) {
    events.push({ type: 'scenario_started', tick, t_s: t, payload: { scenario_id: state.scenario_id } })
  }

  // ---- Commands, in order, before anything else happens this step.
  let launchRequested = false
  const isBattery = batteryCheck(entities)
  for (const command of commands) {
    // Commands come from guests over net/: a malformed one is skipped, never thrown on.
    if (!command || typeof command !== 'object') continue
    if (command.type === 'set_param') {
      const payload: { key?: unknown; value?: unknown } | undefined = command.payload
      const key = payload?.key
      if (typeof key !== 'string') continue
      if (phase !== 'design' || launchRequested) warn(`The design is locked after launch, so "${key}" was not changed.`)
      else if (!applyParam(params, key, payload?.value, isBattery)) warn(`"${key}" was not changed: the value sent is not text, a number or true/false.`)
    } else if (command.type === 'launch') {
      if (phase === 'design') launchRequested = true
      else warn('The mission has already launched.')
    }
    // pause, resume, set_speed, reset and select_entity belong to app/ and ui/.
  }

  const report = evaluateDesign(params, entities)
  const { budgets, flight } = report
  // In design `science_score` shows the forecast, so nothing has been earned yet.
  const flying = phase !== 'design'
  let science = flying ? metric(state.metrics, 'science_score') : 0
  const scienceBefore = science
  let generated = metric(state.metrics, 'data_generated_gb')
  let downlinked = metric(state.metrics, 'data_downlinked_gb')
  let stored = metric(state.metrics, 'data_stored_gb')
  let lost = metric(state.metrics, 'data_lost_gb')
  let spent = metric(state.metrics, 'cost_spent_usd')
  const randomFailures = params.random_failures === true
  const cruiseEnd = budgets.cruise_days * DAY_S

  if (phase === 'design') {
    // Tell the UI when a budget bar goes over (or comes back under) its limit.
    for (const [key, limitKey] of LIMIT_PAIRS) {
      const limit = budgets[limitKey as keyof typeof budgets]
      const value = budgets[key as keyof typeof budgets]
      if (limit <= 0) continue
      const wasOver = metric(state.metrics, key) > metric(state.metrics, limitKey) && metric(state.metrics, limitKey) > 0
      const isOver = value > limit
      if (wasOver !== isOver) {
        events.push({
          type: 'threshold_crossed',
          tick,
          t_s: t,
          payload: { metric: key, value, threshold: limit, direction: isOver ? 'up' : 'down' },
        })
      }
    }

    if (launchRequested) {
      if (!report.ready) {
        const blockers = report.issues.filter((issue) => issue.severity === 'error')
        warn(`Not ready to launch. Fix ${blockers.length === 1 ? 'this problem' : `these ${blockers.length} problems`} first: ${blockers.map((issue) => issue.message).join(' ')}`)
      } else {
        const roll = nextRandom(rng)
        rng = roll.state
        spent = budgets.build_cost_usd + budgets.launch_cost_usd
        if (randomFailures && roll.value >= budgets.launch_reliability) {
          outcome = 'launch_failure'
          changePhase('ended')
        } else {
          const orbit = findPart(entities, 'orbit', str(params, 'orbit'))
          const bodyId = orbit ? str(orbit.props, 'central_body', 'earth') : 'earth'
          const altitude_m = orbit ? num(orbit.props, 'altitude_m') : 0
          // A scenario may already list the body and the spacecraft; keep their names.
          const listedBody = entities.find((e) => e.id === bodyId && e.kind === 'body')
          const listedCraft = entities.find((e) => e.id === SPACECRAFT_ID)
          const body: Entity = {
            id: bodyId,
            kind: 'body',
            name: listedBody ? listedBody.name : bodyOf(bodyId).name,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            props: { radius_m: bodyOf(bodyId).radius_m },
          }
          const spacecraft: Entity = {
            id: SPACECRAFT_ID,
            kind: 'spacecraft',
            name: str(params, 'spacecraft_name', listedCraft ? listedCraft.name : 'Spacecraft'),
            ...transferState(bodyId, altitude_m, 0),
            props: { body: bodyId, orbit: orbit ? orbit.id : '', altitude_m, altitude_km: altitude_m / 1000 },
          }
          // First in the list, so a view that looks for "the body" finds the one being orbited.
          entities = [body, spacecraft, ...entities.filter((e) => e.id !== bodyId && e.id !== SPACECRAFT_ID)]
          events.push({ type: 'entity_added', tick, t_s: t, payload: { entity: body } })
          events.push({ type: 'entity_added', tick, t_s: t, payload: { entity: spacecraft } })
          outcome = 'in_flight'
          changePhase('cruise')
        }
      }
    }
  } else {
    // ---- Flight: move time forward one day (or less) at a time, so a big dt gives the same result as many small ones.
    const end = Math.max(cruiseEnd, budgets.lifetime_days * DAY_S)
    const finish = () => {
      if (flight.end_reason === 'bus_life') warn(`The spacecraft reached the end of its design life after ${Math.round(t / DAY_S)} days and shut down.`)
      if (flight.end_reason === 'orbit_life') warn(`The spacecraft could not stay in its orbit any longer. The mission ended after ${Math.round(t / DAY_S)} days.`)
      outcome = budgets.science_goal > 0 && science < budgets.science_goal - SCIENCE_TOLERANCE ? 'science_shortfall' : 'success'
      changePhase('ended')
    }
    // NaN or undefined would make every guard below false and the loop would never end.
    let remaining = dt_s > 0 ? dt_s : 0
    while (phase !== 'ended') {
      if (phase === 'cruise') {
        if (t >= cruiseEnd - EPSILON_S) {
          changePhase('operations')
          continue
        }
        if (remaining <= EPSILON_S) break
        const advance = Math.min(remaining, cruiseEnd - t)
        t += advance
        remaining -= advance
        continue
      }
      if (t >= end - EPSILON_S) {
        finish()
        break
      }
      if (remaining <= EPSILON_S) break

      const dayIndex = Math.floor(t / DAY_S + 1e-9)
      const advance = Math.min(remaining, (dayIndex + 1) * DAY_S - t, end - t)
      const days = advance / DAY_S
      remaining -= advance
      // The power source is re-rated at the start of each day.
      const uptime = uptimeAt(flight, (dayIndex * DAY_S) / YEAR_S)

      // Three rolls per chunk, always taken, so the random sequence does not depend on settings.
      const failureRoll = nextRandom(rng)
      const eventRoll = nextRandom(failureRoll.state)
      const kindRoll = nextRandom(eventRoll.state)
      rng = kindRoll.state

      let generatingDays = days
      let downlinkDays = days
      if (randomFailures && days > 0) {
        const eventChance = 1 - Math.pow(1 - Math.min(1, Math.max(0, num(params, 'event_rate_per_day'))), days)
        if (eventRoll.value < eventChance) {
          if (kindRoll.value < 0.5) {
            generatingDays = 0
            warn('A solar storm put the instruments in safe mode. About a day of observations was lost.')
          } else {
            downlinkDays = 0
            warn('A ground station went offline for about a day. Data is piling up on board.')
          }
        }
      }

      // Science rides on the data: it only counts when the data reaches the ground.
      const day = dayOfData(flight, stored, uptime, generatingDays, downlinkDays)
      generated += day.made_gb
      downlinked += day.sent_gb
      science += day.science
      stored = day.stored_gb
      if (day.lost_gb > 0) {
        if (lost === 0) {
          events.push({
            type: 'threshold_crossed',
            tick,
            t_s: t + advance,
            payload: { metric: 'data_stored_gb', value: stored + day.lost_gb, threshold: flight.storage_gb, direction: 'up' },
          })
        }
        lost += day.lost_gb
      }
      spent += budgets.ops_cost_usd_per_day * days
      t += advance

      const goal = budgets.science_goal
      const reached = goal > 0 && science >= goal - SCIENCE_TOLERANCE
      if (reached && scienceBefore < goal - SCIENCE_TOLERANCE && !events.some((e) => e.type === 'threshold_crossed' && e.payload.metric === 'science_score')) {
        events.push({
          type: 'threshold_crossed',
          tick,
          t_s: t,
          payload: { metric: 'science_score', value: science, threshold: goal, direction: 'up' },
        })
      }

      const failureChance = 1 - Math.pow(flight.survival_per_day, days)
      if (randomFailures && failureRoll.value < failureChance) {
        // A spacecraft that dies after returning the science it was sent for did its job.
        outcome = reached ? 'success' : 'spacecraft_failure'
        warn(`The spacecraft failed on day ${Math.floor(t / DAY_S)}.`)
        changePhase('ended')
      } else if (t >= end - EPSILON_S) {
        finish()
      }
    }

    // Move the spacecraft for the mission view.
    entities = entities.map((entity) => {
      if (entity.id !== SPACECRAFT_ID) return entity
      const bodyId = str(entity.props, 'body', 'earth')
      const altitude_m = num(entity.props, 'altitude_m')
      const motion =
        t < cruiseEnd && cruiseEnd > 0
          ? transferState(bodyId, altitude_m, t / cruiseEnd)
          : circularState(bodyId, altitude_m, t - cruiseEnd)
      return { ...entity, ...motion }
    })
  }

  const metrics: Metrics = {
    ...state.metrics,
    phase,
    outcome,
    mission_day: t / DAY_S,
    science_score: phase === 'design' ? budgets.science_expected : science,
    data_generated_gb: generated,
    data_downlinked_gb: downlinked,
    data_stored_gb: stored,
    data_lost_gb: lost,
    cost_spent_usd: spent,
    ...budgets,
  }
  const next: SimState = {
    ...state,
    tick,
    t_s: t,
    utc: utcAt(str(params, 'start_utc', state.utc), t),
    status: phase === 'ended' ? 'ended' : 'running',
    entities,
    metrics,
    params,
    issues: report.issues,
    rng_state: rng,
  }
  if (phase === 'ended') {
    events.push({ type: 'scenario_ended', tick, t_s: t, payload: { reason: outcome, summary: summary(next) } })
  }
  return { state: next, events }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function grade(score: number): string {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

/** Warnings that the first sentence of `why` already covers. */
const NOT_IN_WHY = new Set(['science_short'])
/** Outcomes that are a failed mission: their score stops at a C, however good the rest of the design was. */
const FAILED = new Set<Outcome>(['science_shortfall', 'launch_failure', 'spacecraft_failure'])
const FAILED_SCORE_CAP = 69

/**
 * Score and plain-language explanation for the results screen.
 * Score (0 to 100): 70 for science against the goal, 10 for budget left over,
 * 10 for launch mass margin, 10 for the share of data that reached the ground.
 * A failed mission scores at most 69 (grade C).
 */
export function summary(state: SimState): Summary {
  const m = state.metrics
  const outcome = str(m, 'outcome', 'in_design') as Outcome
  // Before launch `science_score` is only a forecast.
  const science = outcome === 'in_design' ? 0 : metric(m, 'science_score')
  const goal = metric(m, 'science_goal')
  const cost = metric(m, 'cost_usd')
  const budget = metric(m, 'budget_usd')
  const mass = metric(m, 'mass_kg')
  const massLimit = metric(m, 'mass_limit_kg')
  const generated = metric(m, 'data_generated_gb')
  const downlinked = metric(m, 'data_downlinked_gb')
  const lost = metric(m, 'data_lost_gb')
  const day = metric(m, 'mission_day')
  const planned = metric(m, 'mission_days')

  const scienceShare = goal > 0 ? clamp01(science / goal) : science > 0 ? 1 : 0
  const budgetShare = budget > 0 ? clamp01((budget - cost) / budget / 0.2) : 0
  const massShare = massLimit > 0 ? clamp01((massLimit - mass) / massLimit / 0.2) : 0
  const dataShare = generated > 0 ? clamp01(downlinked / generated) : outcome === 'success' ? 1 : 0
  // Nothing is scored until the mission launches.
  const rawScore =
    outcome === 'in_design' ? 0 : Math.round(70 * scienceShare + 10 * budgetShare + 10 * massShare + 10 * dataShare)
  const score = FAILED.has(outcome) ? Math.min(rawScore, FAILED_SCORE_CAP) : rawScore
  // Only a bus failure ends a successful mission before its planned end.
  const cutShort = outcome === 'success' && day < metric(m, 'lifetime_days') - 1e-6

  const launcher = findPart(state.entities, 'launch_vehicle', str(state.params, 'launch_vehicle'))
  const bus = findPart(state.entities, 'bus', str(state.params, 'bus'))
  const why: string[] = []
  const points = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: value < 100 ? 1 : 0 })
  const gb = (value: number) => (value < 1 ? `${Math.round(value * 1000)} MB` : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} GB`)
  if (outcome === 'success') {
    why.push(goal > 0 ? `Mission success: you returned ${points(science)} science points and needed ${points(goal)}.` : `Mission complete: you returned ${points(science)} science points.`)
    if (cutShort) why.push(`The spacecraft failed on day ${Math.floor(day)} of ${Math.round(planned)}, but it had already returned the science it needed.`)
  } else if (outcome === 'science_shortfall') {
    why.push(`The spacecraft flew for ${Math.round(day)} days but returned ${points(science)} of the ${points(goal)} science points needed.`)
  } else if (outcome === 'launch_failure') {
    why.push(`The launch failed. ${launcher ? launcher.name : 'This launch vehicle'} succeeds about ${Math.round(metric(m, 'launch_reliability') * 100)}% of the time. More reliable launch vehicles cost more.`)
  } else if (outcome === 'spacecraft_failure') {
    why.push(`The spacecraft failed on day ${Math.floor(day)} of ${Math.round(planned)}. The chance of ${bus ? bus.name : 'this bus'} surviving a mission like this one is about ${Math.round(metric(m, 'bus_reliability') * 100)}%. A more reliable bus or an orbit with less radiation improves the odds.`)
  } else if (outcome === 'in_flight') {
    why.push(`The mission is on day ${Math.floor(day)} of ${Math.round(planned)}.`)
  } else {
    why.push('The mission has not launched yet.')
  }
  if (lost > 0) {
    why.push(`${gb(lost)} of data never reached the ground: the radio could not send it home fast enough, so it was overwritten on board.`)
  }
  // The design warnings explain a flown mission. A launch failure has nothing to do with them,
  // and a lost spacecraft only with the radiation risk.
  const said = state.issues.filter(
    (issue) =>
      issue.severity === 'warning' &&
      !NOT_IN_WHY.has(issue.code) &&
      outcome !== 'in_design' &&
      outcome !== 'launch_failure' &&
      (outcome !== 'spacecraft_failure' || issue.code === 'radiation_risk'),
  )
  if (said.length > 0) why.push(`Before launch the design check said: ${said.map((issue) => issue.message).join(' ')}`)
  if (outcome === 'success' && budget > 0 && cost < budget) {
    why.push(`You finished ${formatUsd(budget - cost)} under budget.`)
  }

  return {
    outcome,
    score,
    grade: grade(score),
    science_score: science,
    science_goal: goal,
    cost_usd: cost,
    budget_usd: budget,
    mass_kg: mass,
    mass_limit_kg: massLimit,
    data_generated_gb: generated,
    data_downlinked_gb: downlinked,
    data_lost_gb: lost,
    mission_days_flown: day,
    why: why.join(' '),
  }
}
