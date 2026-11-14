// Parts catalogs: `table` Datasets from data/ become Entities in SimState.
// Keeping the catalog in the state means `step` needs nothing but the state,
// and the UI can list the available parts straight from `state.entities`.

import type { Dataset, Entity, Params } from '../shared'

/** One kind per design slot. The kind is also the `Config.params` key that holds the player's choice. */
export const PART_KINDS = [
  'launch_vehicle',
  'orbit',
  'bus',
  'power_system',
  'comms_system',
  'instrument',
] as const

export type PartKind = (typeof PART_KINDS)[number]

/** The Dataset id that data/ must use for each catalog. */
export const DATASET_ID: Record<PartKind, string> = {
  launch_vehicle: 'launch-vehicles',
  orbit: 'orbits',
  bus: 'buses',
  power_system: 'power-systems',
  comms_system: 'comms-systems',
  instrument: 'instruments',
}

/**
 * Turn every catalog row into an Entity: `id` and `name` come from those columns,
 * every other column goes into `props`. Rows without a string `id` are skipped.
 */
export function catalogEntities(datasets: Dataset[]): Entity[] {
  const out: Entity[] = []
  for (const kind of PART_KINDS) {
    const ds = datasets.find((d) => d.id === DATASET_ID[kind])
    if (!ds || ds.kind !== 'table') continue
    const { columns, rows } = ds.data
    const idCol = columns.indexOf('id')
    if (idCol < 0) continue
    const nameCol = columns.indexOf('name')
    for (const row of rows) {
      const id = row[idCol]
      if (typeof id !== 'string' || id === '') continue
      const rawName = nameCol >= 0 ? row[nameCol] : null
      const props: Params = {}
      columns.forEach((column, i) => {
        const value = row[i]
        if (i !== idCol && i !== nameCol && value !== null && value !== undefined) props[column] = value
      })
      out.push({ id, kind, name: typeof rawName === 'string' && rawName !== '' ? rawName : id, props })
    }
  }
  return out
}

export function isPartKind(kind: string): kind is PartKind {
  return (PART_KINDS as readonly string[]).includes(kind)
}

export function partsOf(entities: Entity[], kind: PartKind): Entity[] {
  return entities.filter((e) => e.kind === kind)
}

export function findPart(entities: Entity[], kind: PartKind, id: string): Entity | undefined {
  return entities.find((e) => e.kind === kind && e.id === id)
}

/** Read a number from flat props/params; anything else gives the fallback. */
export function num(props: Params | Record<string, unknown>, key: string, fallback = 0): number {
  const value = props[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Read a string from flat props/params; anything else gives the fallback. */
export function str(props: Params | Record<string, unknown>, key: string, fallback = ''): string {
  const value = props[key]
  return typeof value === 'string' ? value : fallback
}
