// Parts catalogs: `table` Datasets from data/ become Entities in SimState.
// Keeping the catalog in the state means `step` needs nothing but the state,
// and the UI can list the available parts straight from `state.entities`.

import type { Dataset, Entity, Params } from '../shared'

/** One kind per catalog. Solar arrays, RTGs and batteries are all `power_system` (told apart by `props.type`). */
export const PART_KINDS = [
  'launch_vehicle',
  'orbit',
  'bus',
  'power_system',
  'comms_system',
  'instrument',
] as const

export type PartKind = (typeof PART_KINDS)[number]

/** The Dataset id of each catalog, as data/ names them. */
export const DATASET_ID: Record<PartKind, string> = {
  launch_vehicle: 'launch-vehicles',
  orbit: 'orbits',
  bus: 'spacecraft-buses',
  power_system: 'power-systems',
  comms_system: 'comms-systems',
  instrument: 'instruments',
}

/** Bus classes from smallest to largest. A part's `min_bus_class` must not be larger than the bus `class`. */
export const BUS_CLASSES = ['cubesat', 'smallsat', 'medium', 'flagship'] as const

/** Position of a bus class in BUS_CLASSES, or -1 for a class the sim does not know (never blocks). */
export function busClassRank(busClass: string): number {
  return (BUS_CLASSES as readonly string[]).indexOf(busClass)
}

/**
 * Turn every catalog row into an Entity: `id` and `name` come from those columns,
 * every other column goes into `props` unchanged. Rows without a string `id` are skipped.
 * Orbits also get `altitude_km` (from `altitude_m`), which the mission view reads.
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
      if (kind === 'orbit' && typeof props.altitude_m === 'number' && props.altitude_km === undefined) {
        props.altitude_km = props.altitude_m / 1000
      }
      out.push({ id, kind, name: typeof rawName === 'string' && rawName !== '' ? rawName : id, props })
    }
  }
  return out
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

/** True when the part has a number in this column. Rules on a missing column are switched off. */
export function has(part: Entity | undefined, key: string): boolean {
  return part !== undefined && typeof part.props[key] === 'number' && Number.isFinite(part.props[key])
}
