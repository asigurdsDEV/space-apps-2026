// The builder's design slots, with the param keys and catalog ids that data/ and sim/ use.
// ui/builder's DEFAULT_SLOTS proposed a `buses` catalog and one `power` slot; the sim stores
// `solar` and `battery` (both from the power-systems catalog) and reads `spacecraft-buses`.

import type { Dataset } from '../shared'
import { DATASET_ID } from '../sim'
import { DEFAULT_SLOTS, type Slot } from '../ui/builder'

const POWER = DATASET_ID.power_system
/** Ids of the two halves of the power-systems catalog that builderDatasets adds. */
const POWER_SOURCES = `${POWER}:sources`
const BATTERIES = `${POWER}:batteries`

/** The builder's labels, hints and order; the sim's param key and catalog for each slot. */
export const BUILDER_SLOTS: Slot[] = DEFAULT_SLOTS.flatMap((slot): Slot[] => {
  if (slot.key === 'bus') return [{ ...slot, dataset: DATASET_ID.bus }]
  if (slot.key === 'comms') return [{ ...slot, dataset: DATASET_ID.comms_system }]
  if (slot.key !== 'power') return [slot]
  return [
    { ...slot, key: 'solar', label: 'Power source', dataset: POWER_SOURCES, hint: 'Solar panels or an RTG. Must cover what everything else draws.' },
    // shortcut: a picked battery cannot be removed (the builder's single slots are radio buttons). Add a "none" row if a scenario needs it.
    { ...slot, key: 'battery', label: 'Battery', dataset: BATTERIES, hint: 'Keeps the spacecraft running in Earth’s shadow.' },
  ]
})

/**
 * The datasets to hand to MissionBuilder: `datasets` plus the power-systems table split into
 * power sources and batteries (by its `type` column), because the builder cannot filter rows.
 */
export function builderDatasets(datasets: Dataset[]): Dataset[] {
  const power = datasets.find((dataset) => dataset.id === POWER)
  if (!power || power.kind !== 'table') return datasets
  const typeColumn = power.data.columns.indexOf('type')
  const half = (id: string, batteries: boolean): Dataset => ({
    ...power,
    id,
    data: { ...power.data, rows: power.data.rows.filter((row) => (row[typeColumn] === 'battery') === batteries) },
  })
  return [...datasets, half(POWER_SOURCES, false), half(BATTERIES, true)]
}
