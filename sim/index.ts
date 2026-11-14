// Public surface of the sim core. See sim/README.md and .agents/CONTRACTS.md.

import type { SimCore } from '../shared'
import { init, step, summary } from './sim'

export { init, step, summary, DEFAULT_PARAMS, SPACECRAFT_ID } from './sim'
export type { Outcome } from './sim'
export {
  evaluateDesign,
  uptimeAt,
  formatUsd,
  OFF_ORBIT_SCIENCE_FACTOR,
  CAPTURE_DELTA_V_MS,
  DRIFT_LIFETIME_FACTOR,
  YEAR_S,
} from './design'
export type { Budgets, DesignReport, FlightModel } from './design'
export { SLOTS, PARAM_ALIASES, SCENARIO_ALIASES, resolveAliases, instrumentIds } from './params'
export type { Slot, SlotKey } from './params'
export { PART_KINDS, DATASET_ID, BUS_CLASSES, partsOf, findPart, catalogEntities } from './parts'
export type { PartKind } from './parts'
export { BODIES, orbitPeriodS } from './orbit'
export { whatIf, successRate, flyMission, designOf, oneChangeDesigns } from './analysis'
export type { WhatIfFix } from './analysis'

/** The three contract functions as one object, typed against shared/. */
export const simCore: SimCore = { init, step, summary }
