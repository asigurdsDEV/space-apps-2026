// The builder's design slots, with the param keys the sim reads.
// ui/builder proposed `power` and `comms`; sim/ settled on `power_system` and `comms_system`
// (sim/README.md, "Config.params"), so the app passes its own `slots` instead of DEFAULT_SLOTS.

import { DATASET_ID, PART_KINDS } from '../sim'
import { DEFAULT_SLOTS, type Slot } from '../ui/builder'

const PARAM_KEY_BY_DATASET = new Map<string, string>(
  PART_KINDS.map((kind) => [DATASET_ID[kind], kind === 'instrument' ? 'instruments' : kind]),
)

/** The builder's labels, hints and order; the sim's param key for each catalog. */
export const BUILDER_SLOTS: Slot[] = DEFAULT_SLOTS.map((slot) => ({
  ...slot,
  key: PARAM_KEY_BY_DATASET.get(slot.dataset) ?? slot.key,
}))
