// TypeScript types for every shape in .agents/CONTRACTS.md (v0.1).
// CONTRACTS.md is the source of truth. If this file and CONTRACTS.md disagree,
// fix this file. Changing a shape needs a decision record (see AGENTS.md).
//
// This folder depends on nothing: no React, no DOM, no imports from sim/ui/data/app.

export const CONTRACT_VERSION = '0.1'

/** Flat scenario/part value. Everything crossing a module boundary is plain JSON. */
export type ParamValue = number | string | boolean
export type Params = Record<string, ParamValue>

/** ISO 8601 UTC timestamp, e.g. "2026-11-14T09:00:00Z". */
export type UtcString = string

/** Lowercase kebab-case id, stable for the whole run, e.g. "falcon-9". */
export type Id = string

/** [x, y, z] in SI units, in the frame named by SimState.frame. */
export type Vec3 = [number, number, number]

// ---------------------------------------------------------------- Config

/** Scenario setup. Lives in data/scenarios/<id>.json. */
export interface Config {
  contract_version: string
  scenario_id: Id
  title: string
  seed: number
  dt_s: number
  duration_s: number
  start_utc: UtcString
  /** Ids of the Datasets this scenario needs. */
  datasets: Id[]
  entities: Entity[]
  /** Scenario tunables and the player's design choices (launch_vehicle, instruments, ...). */
  params: Params
}

// --------------------------------------------------------------- Dataset

export type DatasetKind = 'timeseries' | 'grid' | 'table' | 'points'

interface DatasetBase {
  id: Id
  /** e.g. "NASA <mission/portal name>" */
  source: string
  source_url: string
  license: string
  retrieved_utc: UtcString
  /** column/field name -> unit */
  units: Record<string, string>
}

/** `t` plus one array per column; all arrays have the same length. */
export interface TimeseriesData {
  t: (number | UtcString)[]
  [column: string]: (number | UtcString)[]
}

export interface TableData {
  columns: string[]
  rows: (ParamValue | null)[][]
}

export interface PointsData {
  points: ({ lat_rad: number; lon_rad: number } & Record<string, number>)[]
}

export interface GridData {
  width: number
  height: number
  origin: Record<string, number>
  cell_size: Record<string, number>
  /** Row-major, length = width * height. */
  values: number[]
}

export interface TimeseriesDataset extends DatasetBase {
  kind: 'timeseries'
  data: TimeseriesData
}
export interface TableDataset extends DatasetBase {
  kind: 'table'
  data: TableData
}
export interface PointsDataset extends DatasetBase {
  kind: 'points'
  data: PointsData
}
export interface GridDataset extends DatasetBase {
  kind: 'grid'
  data: GridData
}

/** What data/ hands to sim/. Narrow on `kind`. */
export type Dataset = TimeseriesDataset | TableDataset | PointsDataset | GridDataset

// ---------------------------------------------------------------- Entity

/** Anything the sim tracks. `kind` is open: "spacecraft", "body", "station", "sensor", "region", ... */
export interface Entity {
  id: Id
  kind: string
  name: string
  position?: Vec3
  velocity?: Vec3
  props: Params
}

// ----------------------------------------------------------------- Issue

/**
 * A problem with the current design, written so a student can read it.
 * `error` blocks launch; `warning` lets the mission fly but costs performance.
 */
export interface Issue {
  /** Stable machine-readable code, e.g. "mass_over_limit". */
  code: string
  severity: 'error' | 'warning'
  /** Which resource it is about: "mass" | "power" | "budget" | "data" | "comms" | "time" | "design". */
  resource: string
  message: string
}

// -------------------------------------------------------------- SimState

export type SimStatus = 'running' | 'paused' | 'ended'

/**
 * Metric keys to use when they apply, so the UI can chart them without asking.
 * Other keys are allowed.
 */
export interface KnownMetrics {
  mass_kg?: number
  mass_limit_kg?: number
  power_w?: number
  power_available_w?: number
  cost_usd?: number
  budget_usd?: number
  data_rate_bps?: number
  delta_v_ms?: number
  science_score?: number
  /** "design" | "launch" | "cruise" | "operations" | ... */
  phase?: string
}
export type Metrics = KnownMetrics & Record<string, number | string | undefined>

/** Snapshot after each step. The UI treats it as read-only. */
export interface SimState {
  contract_version: string
  scenario_id: Id
  tick: number
  /** Seconds since the scenario started. */
  t_s: number
  utc: UtcString
  /** Coordinate frame for entity positions, e.g. "scene", "earth-centered-inertial", "lat-lon". */
  frame: string
  status: SimStatus
  entities: Entity[]
  metrics: Metrics
  /** Current design choices and tunables; starts as Config.params, changed by `set_param`. */
  params: Params
  /** Problems with the current design, re-checked every step. Empty when the design is clean. */
  issues: Issue[]
  /** Seeded RNG state carried between steps. Only sim/ reads or writes it. */
  rng_state: number
}

// ------------------------------------------------------- Anomaly cards (decision 004)

export interface DecisionOption {
  id: string
  label: string
  /** Plain-words consequence, e.g. "Science −40% from now on. No risk." */
  effect_text: string
}

/** An anomaly card waiting for an answer: the payload of `decision_required`. */
export interface Decision {
  decision_id: string
  card_id: string
  title: string
  body: string
  /** The co-op role that answers it (a `Role` from shared/net.ts). Whoever holds it answers (decision 013: roles nobody picked are shared out). */
  console: string
  options: DecisionOption[]
  story?: { mission: string; year: number | string; text: string; source_url?: string }
}

// -------------------------------------------------------------- Commands

export type Command =
  | { type: 'pause'; payload: Record<string, never> }
  | { type: 'resume'; payload: Record<string, never> }
  | { type: 'set_speed'; payload: { multiplier: number } }
  | { type: 'reset'; payload: Record<string, never> }
  | { type: 'set_param'; payload: { key: string; value: ParamValue } }
  | { type: 'select_entity'; payload: { id: Id | null } }
  /**
   * Leave the design phase and fly the mission. Refused (with a `warning` event) while there are `error` issues,
   * unless `override` is true and every error is one a crew may launch anyway (sim/ LAUNCH_ANYWAY): then it flies and is lost.
   */
  | { type: 'launch'; payload: { override?: boolean } }
  /** Answer the anomaly card that is waiting. Time does not move until it is answered. */
  | { type: 'resolve_decision'; payload: { decision_id: string; option_id: string } }

export type CommandType = Command['type']

// ---------------------------------------------------------------- Events

export type Summary = Record<string, number | string>

interface SimEventBase {
  tick: number
  t_s: number
}

export type SimEvent = SimEventBase &
  (
    | { type: 'scenario_started'; payload: { scenario_id: Id } }
    | { type: 'entity_added'; payload: { entity: Entity } }
    | { type: 'entity_removed'; payload: { id: Id; reason: string } }
    | {
        type: 'threshold_crossed'
        payload: { metric: string; value: number; threshold: number; direction: 'up' | 'down' }
      }
    | { type: 'phase_changed'; payload: { from: string; to: string } }
    | { type: 'scenario_ended'; payload: { reason: string; summary: Summary } }
    | { type: 'warning'; payload: { message: string } }
    /** An anomaly card was drawn. The sim stops the clock until `resolve_decision` arrives. */
    | { type: 'decision_required'; payload: Decision }
    /** The card was answered; `message` says what happened in plain words. */
    | { type: 'decision_resolved'; payload: { decision_id: string; card_id: string; option_id: string; message: string } }
  )

export type SimEventType = SimEvent['type']

// ---------------------------------------------------------- Sim core API

export interface StepResult {
  state: SimState
  events: SimEvent[]
}

/**
 * What sim/ exports. All three are pure: no I/O, no Date.now(), no Math.random(),
 * and `step` never mutates the state it is given.
 */
export interface SimCore {
  init(config: Config, datasets: Dataset[]): SimState
  /** Commands are applied at the start of the step, in array order. */
  step(state: SimState, commands: Command[], dt_s: number): StepResult
  summary(state: SimState): Summary
}
