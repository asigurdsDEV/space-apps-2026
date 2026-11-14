// Public surface of the sim core. See sim/README.md and .agents/CONTRACTS.md.

import type { SimCore } from '../shared'
import { init, step, summary } from './sim'

export { init, step, summary, DEFAULT_PARAMS, SPACECRAFT_ID } from './sim'
export type { Outcome } from './sim'
export { evaluateDesign, instrumentIds, formatUsd, OBJECTIVE_BONUS } from './design'
export type { Budgets, DesignReport } from './design'
export { PART_KINDS, DATASET_ID, partsOf, findPart, catalogEntities } from './parts'
export type { PartKind } from './parts'
export { BODIES, orbitPeriodS } from './orbit'

/** The three contract functions as one object, typed against shared/. */
export const simCore: SimCore = { init, step, summary }
