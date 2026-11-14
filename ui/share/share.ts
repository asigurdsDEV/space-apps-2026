// Share links and saved designs. Pure functions, no React.
import type { Command, SimState } from '../../shared'
import { num } from '../mission/format'

export const DESIGN_KEYS = ['launch_vehicle', 'orbit', 'bus', 'solar', 'battery', 'comms', 'instruments'] as const
export type DesignKey = (typeof DESIGN_KEYS)[number]
export type Design = Partial<Record<DesignKey, string>>

export interface SavedDesign {
  name: string
  design: Design
  mass_kg: number
  cost_usd: number
  power_w: number
  science_per_day: number
  has_error: boolean
}

const PART_IDS = /^[a-z0-9,-]*$/
// Every instrument in the catalog picked at once is about 170 characters.
const MAX_VALUE = 256
// Fits seven full-length values, so anything encodeDesign makes decodes again.
const MAX_HASH = 2048
const MAX_NAME = 40
const STORAGE_KEY = 'space-apps-2026.designs'

/** The only way a Design is made: links and storage are both untrusted. */
function pickDesign(source: Record<string, unknown>): Design {
  const design: Design = {}
  for (const key of DESIGN_KEYS) {
    const value = source[key]
    if (typeof value === 'string' && value.length <= MAX_VALUE && PART_IDS.test(value)) design[key] = value
  }
  return design
}

/** Text for the URL hash (no leading "#"), e.g. "orbit=leo&instruments=camera,radar". */
export function encodeDesign(params: Record<string, unknown>): string {
  return Object.entries(pickDesign(params))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

/** Reads a hash anyone could have written. Unknown keys and bad values are dropped; never throws. */
export function decodeDesign(hash: string): Design {
  if (typeof hash !== 'string' || hash.length > MAX_HASH) return {}
  const query = new URLSearchParams(hash.replace(/^#/, ''))
  return pickDesign(Object.fromEntries(DESIGN_KEYS.map((key) => [key, query.get(key)])))
}

/** One set_param per choice in the design. */
export function loadCommands(design: Design): Command[] {
  return Object.entries(pickDesign(design)).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }))
}

/** Commands that apply a shared link, for the app to send on startup. Empty when the hash holds no design. */
export function designFromHash(hash: string): Command[] {
  return loadCommands(decodeDesign(hash))
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function clean(entry: unknown): SavedDesign[] {
  if (typeof entry !== 'object' || entry === null) return []
  const e = entry as Record<string, unknown>
  if (typeof e.name !== 'string' || e.name === '') return []
  return [
    {
      name: e.name.slice(0, MAX_NAME),
      design: pickDesign(typeof e.design === 'object' && e.design !== null ? (e.design as Record<string, unknown>) : {}),
      mass_kg: finite(e.mass_kg),
      cost_usd: finite(e.cost_usd),
      power_w: finite(e.power_w),
      science_per_day: finite(e.science_per_day),
      has_error: e.has_error === true,
    },
  ]
}

/** Saved designs, oldest first. Missing or corrupted storage gives an empty list. */
export function listDesigns(): SavedDesign[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.flatMap(clean) : []
  } catch {
    return []
  }
}

function write(designs: SavedDesign[]): SavedDesign[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs))
  } catch {
    // storage full or missing: what was stored before stays
  }
  return listDesigns()
}

/**
 * Save the current design under `name`, replacing a design with the same name.
 * Returns what is now stored, so a failed save shows up as the name being absent.
 */
export function saveDesign(name: string, state: SimState): SavedDesign[] {
  const trimmed = name.trim().slice(0, MAX_NAME)
  if (trimmed === '') return listDesigns()
  const saved: SavedDesign = {
    name: trimmed,
    design: pickDesign(state.params),
    mass_kg: num(state.metrics, 'mass_kg'),
    cost_usd: num(state.metrics, 'cost_usd'),
    power_w: num(state.metrics, 'power_w'),
    science_per_day: num(state.metrics, 'science_per_day'),
    has_error: state.issues.some((issue) => issue.severity === 'error'),
  }
  return write([...listDesigns().filter((d) => d.name !== trimmed), saved])
}

export function deleteDesign(name: string): SavedDesign[] {
  return write(listDesigns().filter((d) => d.name !== name))
}
