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
  /** Seeded RNG state carried between steps. Only sim/ reads or writes it. */
  rng_state: number
}

// -------------------------------------------------------------- Commands

export type Command =
  | { type: 'pause'; payload: Record<string, never> }
  | { type: 'resume'; payload: Record<string, never> }
  | { type: 'set_speed'; payload: { multiplier: number } }
  | { type: 'reset'; payload: Record<string, never> }
  | { type: 'set_param'; payload: { key: string; value: ParamValue } }
  | { type: 'select_entity'; payload: { id: Id | null } }

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
    | { type: 'scenario_ended'; payload: { reason: string; summary: Summary } }
    | { type: 'warning'; payload: { message: string } }
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
