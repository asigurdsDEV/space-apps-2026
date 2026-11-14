// data/: parts catalogs and scenarios as CONTRACTS.md shapes.
// Everything here is static JSON bundled at build time (decision 002). No I/O at runtime.

import type { Config, Dataset, Id, ParamValue, TableDataset } from '../shared'

import launchVehicles from './catalogs/launch-vehicles.json'
import orbits from './catalogs/orbits.json'
import spacecraftBuses from './catalogs/spacecraft-buses.json'
import instruments from './catalogs/instruments.json'
import powerSystems from './catalogs/power-systems.json'
import commsSystems from './catalogs/comms-systems.json'
import demo from './scenarios/demo.json'

/** Ids of the catalog Datasets, so callers don't hard-code strings. */
export const CATALOG_IDS = {
  launchVehicles: 'launch-vehicles',
  orbits: 'orbits',
  buses: 'spacecraft-buses',
  instruments: 'instruments',
  power: 'power-systems',
  comms: 'comms-systems',
} as const

/**
 * Which Config.params key picks from which catalog.
 * `instruments` holds a comma-separated list of instrument ids, e.g. "camera-basic,magnetometer".
 */
export const PARAM_CATALOG: Record<string, Id> = {
  launch_vehicle: CATALOG_IDS.launchVehicles,
  orbit: CATALOG_IDS.orbits,
  bus: CATALOG_IDS.buses,
  instruments: CATALOG_IDS.instruments,
  solar: CATALOG_IDS.power,
  battery: CATALOG_IDS.power,
  comms: CATALOG_IDS.comms,
}

/** Bus classes from smallest to largest. Parts list a `min_bus_class`. */
export const BUS_CLASSES = ['cubesat', 'smallsat', 'medium', 'flagship'] as const

/** JSON imports widen `kind` to string, so check the shape once and narrow it. */
function asTable(json: unknown): TableDataset {
  const ds = json as TableDataset
  if (ds.kind !== 'table') throw new Error(`data: ${ds.id} is not a table Dataset`)
  const { columns, rows } = ds.data
  if (columns[0] !== 'id') throw new Error(`data: ${ds.id} must have "id" as its first column`)
  for (const row of rows) {
    if (row.length !== columns.length) throw new Error(`data: ${ds.id} row ${String(row[0])} has the wrong length`)
  }
  return ds
}

export const catalogs: TableDataset[] = [
  launchVehicles,
  orbits,
  spacecraftBuses,
  instruments,
  powerSystems,
  commsSystems,
].map(asTable)

export const scenarios: Config[] = [demo as Config]

/** All Datasets, for handing to `sim.init(config, datasets)`. */
export function getDatasets(ids?: Id[]): Dataset[] {
  return ids ? catalogs.filter((d) => ids.includes(d.id)) : catalogs
}

export function getDataset(id: Id): TableDataset | undefined {
  return catalogs.find((d) => d.id === id)
}

export function getScenario(id: Id): Config | undefined {
  return scenarios.find((s) => s.scenario_id === id)
}

export type PartRow = Record<string, ParamValue | null> & { id: Id }

/** Table rows as objects keyed by column name: `{ id: "falcon-9", payload_leo_kg: 17500, ... }`. */
export function rowsAsObjects(ds: TableDataset): PartRow[] {
  const { columns, rows } = ds.data
  return rows.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])) as PartRow)
}

/** One part by id from a catalog, or undefined. */
export function getPart(catalogId: Id, partId: Id): PartRow | undefined {
  const ds = getDataset(catalogId)
  return ds ? rowsAsObjects(ds).find((r) => r.id === partId) : undefined
}

/** Splits the `instruments` param ("a,b") into ids. Empty string → []. */
export function parseIdList(value: ParamValue | undefined): Id[] {
  return typeof value === 'string' && value.trim() ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
}
