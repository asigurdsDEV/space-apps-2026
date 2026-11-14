// Pure helpers for the mission builder. No React here, so they're easy to test.
import type { Dataset, Id, Metrics, ParamValue, TableDataset } from '../../shared'

/** One design choice on the builder screen: a param key filled from a parts catalog. */
export interface Slot {
  /** `set_param` key, e.g. "launch_vehicle". */
  key: string
  label: string
  /** Id of the `table` Dataset that lists the parts for this slot. */
  dataset: Id
  /** Several parts at once (stored as a comma-separated id list, e.g. "camera,spectrometer"). */
  multi?: boolean
  /** One-line explainer for students. */
  hint?: string
}

// Proposed keys + catalog ids. data/ (claude@jamie) and sim/ (claude@ethan) should match these,
// or the app passes its own `slots` prop.
export const DEFAULT_SLOTS: Slot[] = [
  { key: 'orbit', label: 'Orbit', dataset: 'orbits', hint: 'Where the spacecraft flies. Higher orbits see more but cost more to reach.' },
  { key: 'bus', label: 'Spacecraft bus', dataset: 'buses', hint: 'The body: structure, computer and attitude control everything else bolts onto.' },
  { key: 'instruments', label: 'Science instruments', dataset: 'instruments', multi: true, hint: 'More instruments mean more science, but also more mass, power, data and cost.' },
  { key: 'power', label: 'Power system', dataset: 'power-systems', hint: 'Solar panels and batteries. Must cover what everything else draws.' },
  { key: 'comms', label: 'Communications', dataset: 'comms-systems', hint: 'How fast data gets back to Earth. Too slow and science is lost.' },
  { key: 'launch_vehicle', label: 'Launch vehicle', dataset: 'launch-vehicles', hint: 'Must lift the total mass to your orbit, and it is often the biggest bill.' },
]

/** Ids picked in a multi slot. */
export function parseIds(value: ParamValue | undefined): string[] {
  if (typeof value !== 'string' || value === '') return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Add or remove one id from a multi slot value, keeping order. */
export function toggleId(value: ParamValue | undefined, id: string): string {
  const ids = parseIds(value)
  return (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]).join(',')
}

export function findTable(datasets: Dataset[], id: Id): TableDataset | undefined {
  const ds = datasets.find((d) => d.id === id)
  return ds?.kind === 'table' ? ds : undefined
}

export type Row = Record<string, ParamValue | null>

/** Table rows as objects keyed by column name. */
export function tableRows(ds: TableDataset): Row[] {
  return ds.data.rows.map((r) => Object.fromEntries(ds.data.columns.map((c, i) => [c, r[i] ?? null])))
}

/** Columns worth showing as stats (everything but the label columns). */
export function statColumns(ds: TableDataset): string[] {
  return ds.data.columns.filter((c) => !['id', 'name', 'description'].includes(c))
}

/** Column header without its unit suffix: "cost_usd" → "cost". */
export function columnLabel(column: string): string {
  return column.replace(/_(kg|w|usd|bps|km|m|s)$/i, '').replace(/_/g, ' ')
}

/** Units formatValue renders itself ($M, Mbps), so headers skip them. */
export const SELF_FORMATTED_UNITS = ['USD', 'bps']

export interface Bar {
  resource: string
  label: string
  used: number
  limit: number
  unit: string
  /** used / limit; > 1 means over. */
  ratio: number
  over: boolean
}

const BAR_PAIRS = [
  { resource: 'mass', label: 'Mass', used: 'mass_kg', limit: 'mass_limit_kg', unit: 'kg' },
  { resource: 'power', label: 'Power', used: 'power_w', limit: 'power_available_w', unit: 'W' },
  { resource: 'budget', label: 'Budget', used: 'cost_usd', limit: 'budget_usd', unit: 'USD' },
] as const

/** Budget bars for whichever used/limit pairs the sim reports. */
export function budgetBars(metrics: Metrics): Bar[] {
  return BAR_PAIRS.flatMap((p) => {
    const used = metrics[p.used]
    const limit = metrics[p.limit]
    if (typeof used !== 'number' || typeof limit !== 'number') return []
    const ratio = limit > 0 ? used / limit : used > 0 ? Infinity : 0
    return [{ resource: p.resource, label: p.label, used, limit, unit: p.unit, ratio, over: used > limit }]
  })
}

export function formatValue(n: number, unit: string): string {
  if (unit === 'USD') return `$${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
  if (unit === 'bps') return n >= 1e6 ? `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} Mbps` : `${(n / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 })} kbps`
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit ? ' ' + unit : ''}`
}
