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
import { evaluateDesign, formatUsd, type DesignReport } from './design'
import { bodyOf, circularState, transferState } from './orbit'
import { catalogEntities, findPart, num, str } from './parts'
import { nextRandom } from './rng'

const DAY_S = 86400
const EPSILON_S = 1e-6

export const SPACECRAFT_ID = 'spacecraft'

/** Scenario params the sim reads, with the value used when the scenario leaves one out. */
export const DEFAULT_PARAMS: Params = {
  ground_stations: 1,
  budget_usd: 0,
  science_goal: 0,
  deadline_months: 0,
  ops_cost_usd_per_day: 0,
  ground_station_cost_usd_per_day: 0,
  integration_months_per_instrument: 1,
  /** Chance per day of a random event (solar storm, ground station outage) during operations. */
  event_rate_per_day: 0,
  /** false = sandbox: launches always work, the bus never fails, no random events. */
  random_failures: true,
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

function withBudgets(metrics: Metrics, report: DesignReport): Metrics {
  return { ...metrics, ...report.budgets }
}

export function init(config: Config, datasets: Dataset[]): SimState {
  const params: Params = {
    ...DEFAULT_PARAMS,
    mission_days: config.duration_s / DAY_S,
    ...config.params,
    start_utc: config.start_utc,
  }
  const entities = [...catalogEntities(datasets), ...config.entities]
  const report = evaluateDesign(params, entities)
  const metrics = withBudgets(
    {
      phase: 'design',
      outcome: 'in_design',
      mission_day: 0,
      science_score: 0,
      data_generated_gb: 0,
      data_downlinked_gb: 0,
      data_stored_gb: 0,
      data_lost_gb: 0,
      cost_spent_usd: 0,
    },
    report,
  )
  return {
    contract_version: CONTRACT_VERSION,
    scenario_id: config.scenario_id,
    tick: 0,
    t_s: 0,
    utc: config.start_utc,
    frame: 'body-centered',
    status: 'running',
    entities,
    metrics,
    params,
    issues: report.issues,
    rng_state: config.seed | 0,
  }
}

/** Limits the UI shows as bars. Crossing one in the design phase raises `threshold_crossed`. */
const LIMIT_PAIRS: [string, string][] = [
  ['mass_kg', 'mass_limit_kg'],
  ['payload_mass_kg', 'payload_limit_kg'],
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
  for (const command of commands) {
    if (command.type === 'set_param') {
      if (phase === 'design') params[command.payload.key] = command.payload.value
      else warn(`The design is locked after launch, so "${command.payload.key}" was not changed.`)
    } else if (command.type === 'launch') {
      if (phase === 'design') launchRequested = true
      else warn('The mission has already launched.')
    }
    // pause, resume, set_speed, reset and select_entity belong to app/ and ui/.
  }

  const report = evaluateDesign(params, entities)
  const budgets = report.budgets
  let science = metric(state.metrics, 'science_score')
  let generated = metric(state.metrics, 'data_generated_gb')
  let downlinked = metric(state.metrics, 'data_downlinked_gb')
  let stored = metric(state.metrics, 'data_stored_gb')
  let lost = metric(state.metrics, 'data_lost_gb')
  let spent = metric(state.metrics, 'cost_spent_usd')
  const randomFailures = params.random_failures !== false

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
          const bodyId = orbit ? str(orbit.props, 'body', 'earth') : 'earth'
          const altitude_km = orbit ? num(orbit.props, 'altitude_km') : 0
          const body: Entity = {
            id: bodyId,
            kind: 'body',
            name: bodyOf(bodyId).name,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            props: { radius_m: bodyOf(bodyId).radius_m },
          }
          const spacecraft: Entity = {
            id: SPACECRAFT_ID,
            kind: 'spacecraft',
            name: str(params, 'spacecraft_name', 'Spacecraft'),
            ...transferState(bodyId, altitude_km, 0),
            props: { body: bodyId, orbit: orbit ? orbit.id : '', altitude_km },
          }
          entities = [...entities.filter((e) => e.id !== bodyId && e.id !== SPACECRAFT_ID), body, spacecraft]
          events.push({ type: 'entity_added', tick, t_s: t, payload: { entity: body } })
          events.push({ type: 'entity_added', tick, t_s: t, payload: { entity: spacecraft } })
          outcome = 'in_flight'
          changePhase('cruise')
        }
      }
    }
  } else {
    // ---- Flight: move time forward, crossing phase boundaries inside one step if dt is large.
    const cruiseEnd = budgets.cruise_days * DAY_S
    const opsEnd = cruiseEnd + budgets.mission_days * DAY_S
    let remaining = Math.max(0, dt_s)
    while (phase !== 'ended' && (remaining > EPSILON_S || (phase === 'cruise' && t >= cruiseEnd - EPSILON_S) || (phase === 'operations' && t >= opsEnd - EPSILON_S))) {
      if (phase === 'cruise') {
        const advance = Math.min(remaining, Math.max(0, cruiseEnd - t))
        t += advance
        remaining -= advance
        if (t >= cruiseEnd - EPSILON_S) changePhase('operations')
        continue
      }

      const advance = Math.min(remaining, Math.max(0, opsEnd - t))
      const days = advance / DAY_S
      remaining -= advance

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
          const outage = Math.min(days, 1)
          if (kindRoll.value < 0.5) {
            generatingDays -= outage
            warn('A solar storm put the instruments in safe mode. About a day of observations was lost.')
          } else {
            downlinkDays -= outage
            warn('A ground station went offline for about a day. Data is piling up on board.')
          }
        }
      }

      const made = budgets.data_generated_gb_per_day * generatingDays
      generated += made
      if (budgets.data_generated_gb_per_day > 0) {
        // Science rides on the data: it only counts when the data reaches the ground.
        const sciencePerGb = budgets.science_per_day / budgets.data_generated_gb_per_day
        const sent = Math.min(stored + made, budgets.downlink_gb_per_day * downlinkDays)
        stored = stored + made - sent
        downlinked += sent
        science += sent * sciencePerGb
        if (stored > budgets.storage_gb) {
          if (lost === 0) {
            events.push({
              type: 'threshold_crossed',
              tick,
              t_s: t + advance,
              payload: { metric: 'data_stored_gb', value: stored, threshold: budgets.storage_gb, direction: 'up' },
            })
          }
          lost += stored - budgets.storage_gb
          stored = budgets.storage_gb
        }
      } else {
        science += budgets.science_per_day * generatingDays
      }
      spent += budgets.ops_cost_usd_per_day * days
      t += advance

      const goal = budgets.science_goal
      if (goal > 0 && metric(state.metrics, 'science_score') < goal && science >= goal && !events.some((e) => e.type === 'threshold_crossed' && e.payload.metric === 'science_score')) {
        events.push({
          type: 'threshold_crossed',
          tick,
          t_s: t,
          payload: { metric: 'science_score', value: science, threshold: goal, direction: 'up' },
        })
      }

      // The bus has `bus_reliability` chance of surviving the whole planned mission.
      const failureChance =
        budgets.mission_days > 0 ? 1 - Math.pow(budgets.bus_reliability, days / budgets.mission_days) : 0
      if (randomFailures && failureRoll.value < failureChance) {
        outcome = 'spacecraft_failure'
        changePhase('ended')
      } else if (t >= opsEnd - EPSILON_S) {
        outcome = budgets.science_goal > 0 && science < budgets.science_goal ? 'science_shortfall' : 'success'
        changePhase('ended')
      }
    }

    // Move the spacecraft for the mission view.
    entities = entities.map((entity) => {
      if (entity.id !== SPACECRAFT_ID) return entity
      const bodyId = str(entity.props, 'body', 'earth')
      const altitude_km = num(entity.props, 'altitude_km')
      const motion =
        t < cruiseEnd && cruiseEnd > 0
          ? transferState(bodyId, altitude_km, t / cruiseEnd)
          : circularState(bodyId, altitude_km, t - cruiseEnd)
      return { ...entity, ...motion }
    })
  }

  const cruise_s = budgets.cruise_days * DAY_S
  const metrics: Metrics = withBudgets(
    {
      ...state.metrics,
      phase,
      outcome,
      mission_day: Math.max(0, (t - cruise_s) / DAY_S),
      science_score: science,
      data_generated_gb: generated,
      data_downlinked_gb: downlinked,
      data_stored_gb: stored,
      data_lost_gb: lost,
      cost_spent_usd: spent,
    },
    report,
  )
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

/**
 * Score and plain-language explanation for the results screen.
 * Score (0 to 100): 70 for science against the goal, 10 for budget left over,
 * 10 for launch mass margin, 10 for the share of data that reached the ground.
 */
export function summary(state: SimState): Summary {
  const m = state.metrics
  const outcome = str(m, 'outcome', 'in_design') as Outcome
  const science = metric(m, 'science_score')
  const goal = metric(m, 'science_goal')
  const cost = metric(m, 'cost_usd')
  const budget = metric(m, 'budget_usd')
  const mass = metric(m, 'mass_kg')
  const massLimit = metric(m, 'mass_limit_kg')
  const generated = metric(m, 'data_generated_gb')
  const downlinked = metric(m, 'data_downlinked_gb')
  const lost = metric(m, 'data_lost_gb')
  const day = metric(m, 'mission_day')

  const scienceShare = goal > 0 ? clamp01(science / goal) : science > 0 ? 1 : 0
  const budgetShare = budget > 0 ? clamp01((budget - cost) / budget / 0.2) : 0
  const massShare = massLimit > 0 ? clamp01((massLimit - mass) / massLimit / 0.2) : 0
  const dataShare = generated > 0 ? clamp01(downlinked / generated) : outcome === 'success' ? 1 : 0
  // Nothing is scored until the mission launches.
  const score =
    outcome === 'in_design' ? 0 : Math.round(70 * scienceShare + 10 * budgetShare + 10 * massShare + 10 * dataShare)

  const launcher = findPart(state.entities, 'launch_vehicle', str(state.params, 'launch_vehicle'))
  const bus = findPart(state.entities, 'bus', str(state.params, 'bus'))
  const why: string[] = []
  const points = (value: number) => Math.round(value).toLocaleString('en-US')
  if (outcome === 'success') {
    why.push(goal > 0 ? `Mission success: you returned ${points(science)} science points and needed ${points(goal)}.` : `Mission complete: you returned ${points(science)} science points.`)
  } else if (outcome === 'science_shortfall') {
    why.push(`The spacecraft flew the whole mission but returned ${points(science)} of the ${points(goal)} science points needed.`)
  } else if (outcome === 'launch_failure') {
    why.push(`The launch failed. ${launcher ? launcher.name : 'This launch vehicle'} succeeds about ${Math.round(metric(m, 'launch_reliability') * 100)}% of the time. More reliable launch vehicles cost more.`)
  } else if (outcome === 'spacecraft_failure') {
    why.push(`The spacecraft failed on day ${Math.floor(day)} of ${Math.round(metric(m, 'mission_days'))}. ${bus ? bus.name : 'This bus'} survives a full mission about ${Math.round(metric(m, 'bus_reliability') * 100)}% of the time.`)
  } else if (outcome === 'in_flight') {
    why.push(`The mission is on day ${Math.floor(day)} of ${Math.round(metric(m, 'mission_days'))}.`)
  } else {
    why.push('The mission has not launched yet.')
  }
  if (lost > 0) {
    why.push(`${points(lost)} GB of data was lost because on-board storage filled up before it could be sent home.`)
  }
  for (const issue of state.issues) {
    if (issue.severity === 'warning' && outcome !== 'in_design') why.push(issue.message)
  }
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
