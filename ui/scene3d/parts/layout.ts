// Pure layout: which model each catalog row gets, how big it is and where it mounts. No three.js.
// Sizes are in meters and follow the catalog numbers (mass, power, capacity, data rate x range).
// Every family owns one mount slot, so no combination of picks can collide:
//   wings / RTG: the ±x faces · antenna: zenith deck (+y) · cameras and sounders: nadir deck (-y)
//   telescope: upper anti-Sun face (-z), above the engines · battery and particle detector: lower and upper Sun face (+z)
//   magnetometer boom: a corner of the -z face · radars: the two lower x edges, below the wings.
import type { Entity } from '../../../shared'
import { busClass, busSize, num, str, type CraftSpec } from '../model'
import { ANTENNA, WINGS } from './references'

export type PartKind = 'bus' | 'power' | 'comms' | 'instrument'
export type BusKey = 'cubesat' | 'smallsat' | 'medium' | 'flagship'
export type PowerKey = 'body-cells' | 'wings' | 'rtg' | 'battery' | 'power-box'
export type CommsKey = 'turnstile' | 'patch' | 'reflectarray' | 'dish-gimbal' | 'dish-fixed' | 'dish-deep'
export type InstrumentKey =
  | 'camera' | 'multispectral' | 'weather-imager' | 'spectrometer' | 'sounder' | 'altimeter'
  | 'magnetometer' | 'particles' | 'dipole-radar' | 'sar' | 'telescope' | 'generic'
export type ModelKey = BusKey | PowerKey | CommsKey | InstrumentKey
export type Slot =
  | 'x-faces' | 'skin' | 'sun-low' | 'sun-high' | 'zenith' | 'nadir' | 'anti-sun' | 'corner-boom' | 'edge-x-plus' | 'edge-x-minus'

/** The one place each model mounts. Only `nadir` holds more than one part (packed side by side). */
export const SLOT: Record<Exclude<ModelKey, BusKey>, Slot> = {
  'body-cells': 'skin', wings: 'x-faces', rtg: 'x-faces', battery: 'sun-low', 'power-box': 'sun-low',
  turnstile: 'zenith', patch: 'zenith', reflectarray: 'zenith', 'dish-gimbal': 'zenith', 'dish-fixed': 'zenith', 'dish-deep': 'zenith',
  camera: 'nadir', multispectral: 'nadir', 'weather-imager': 'nadir', spectrometer: 'nadir', sounder: 'nadir', altimeter: 'nadir', generic: 'nadir',
  magnetometer: 'corner-boom', particles: 'sun-high', 'dipole-radar': 'edge-x-minus', sar: 'edge-x-plus', telescope: 'anti-sun',
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const text = (e: Entity) => `${e.id} ${e.name}`

export const busKey: (bus: Entity | undefined) => BusKey = busClass

export function powerKey(e: Entity): PowerKey {
  const type = str(e.props.type)
  if (type === 'rtg' || /\brtg\b|radioisotope/i.test(text(e))) return 'rtg'
  if (type === 'battery' || /batter/i.test(text(e)) || (num(e.props.capacity_wh, 0) > 0 && num(e.props.power_w, 0) <= 0)) return 'battery'
  if (type === 'solar' || /solar/i.test(text(e))) return /body/i.test(text(e)) ? 'body-cells' : 'wings'
  return 'power-box'
}

/** How hard the link is: log10(bits per second x range squared). UHF in low orbit is 16, a Mars dish is 29. */
export function linkEffort(e: Entity): number {
  return Math.log10(Math.max(num(e.props.data_rate_bps, 1e5), 1) * Math.max(num(e.props.reference_range_m, 1e6), 1) ** 2)
}

export function commsKey(e: Entity): CommsKey {
  const band = str(e.props.band)
  const t = text(e)
  if (/dish|high.gain|hga/i.test(t) || linkEffort(e) >= 22.5) {
    if (num(e.props.reference_range_m, 0) >= 1e10) return 'dish-deep'
    return /transponder|DSN/i.test(`${t} ${band}`) ? 'dish-fixed' : 'dish-gimbal'
  }
  if (/UHF|VHF/i.test(`${band} ${t}`)) return 'turnstile'
  if (/^X|^K/i.test(band) || /reflectarray/i.test(t)) return 'reflectarray'
  return 'patch'
}

export function instrumentKey(e: Entity): InstrumentKey {
  const t = `${str(e.props.category)} ${text(e)}`
  const mass = num(e.props.mass_kg, 2)
  if (/telescope/i.test(t)) return 'telescope'
  if (/radar/i.test(t)) return /subsurface|sounding|ground.penetrating/i.test(t) || mass < 50 ? 'dipole-radar' : 'sar'
  if (/fields|magnet/i.test(t)) return 'magnetometer'
  if (/particle|radiation|plasma|dust/i.test(t)) return 'particles'
  if (/spectromet/i.test(t)) return 'spectrometer'
  if (/radiometer|sounder|microwave/i.test(t)) return 'sounder'
  if (/altimeter|lidar|laser/i.test(t)) return 'altimeter'
  if (/imager|camera/i.test(t)) return /weather|geostationary/i.test(t) || mass >= 60 ? 'weather-imager' : /multi|hyper/i.test(t) || mass >= 5 ? 'multispectral' : 'camera'
  return 'generic'
}

/** The model a catalog row gets, by entity kind. Unknown ids fall back by props and name, never throw. */
export function modelKey(e: Entity): ModelKey {
  return e.kind === 'bus' ? busKey(e) : e.kind === 'power_system' ? powerKey(e) : e.kind === 'comms_system' ? commsKey(e) : instrumentKey(e)
}

export interface WingShape { length: number; width: number; panels: number; mount: 'hinge' | 'drive' | 'yoke'; cant: number }

/**
 * One wing of a pair: the real wing whose power is nearest (MarCO, LunaH-Map, MAVEN, MRO), with its area
 * scaled to the catalog power.
 */
export function wingShape(power_w: number, bus: [number, number, number]): WingShape {
  const p = Math.max(power_w, 1)
  const ref = WINGS.reduce((a, b) => (Math.abs(Math.log(p / b.power_w)) < Math.abs(Math.log(p / a.power_w)) ? b : a))
  const k = Math.sqrt(p / ref.power_w)
  // shortcut: a wing taller than the bus or longer than 2.2 bus lengths is drawn smaller than its real area, so it clears the decks.
  const fit = Math.min(1, bus[1] / (ref.width * k), (2.2 * Math.max(...bus)) / (ref.length * k))
  return { length: ref.length * k * fit, width: ref.width * k * fit, panels: ref.panels, mount: ref.mount, cant: ref.cant }
}

/** Dish diameter in meters: the real antenna of its family (LRO 0.75 m, Mars Odyssey 1.3 m, MRO 3 m). */
export const dishDiameter = (e: Entity) => ANTENNA.dish[commsKey(e)] ?? 0.75

/** Footprint side of an instrument in meters, from its mass (0.4 kg camera: 11 cm, 100 kg imager: 70 cm). */
export const instrumentSize = (e: Entity) => 0.15 * Math.cbrt(clamp(num(e.props.mass_kg, 2), 0.05, 2000))

/** Battery box in meters from its mass: [width, height, thickness]. */
export function batterySize(e: Entity): [number, number, number] {
  const w = Math.cbrt(clamp(num(e.props.mass_kg, 1), 0.05, 500) / 1800 / 0.28)
  return [w, w * 0.8, w * 0.35]
}

export interface Placed { x: number; z: number; size: number }

/**
 * Squares packed in rows on a deck of w by d, biggest first, all shrunk by one factor until they fit.
 * Returns the centre and final side of each square, in input order, centred on the deck.
 */
export function packDeck(sizes: number[], w: number, d: number): Placed[] {
  const order = sizes.map((_, i) => i).sort((a, b) => sizes[b]! - sizes[a]!)
  for (let k = 1; ; k *= 0.92) {
    const rows: { items: number[]; width: number; depth: number }[] = []
    for (const i of order) {
      const s = sizes[i]! * k
      const row = rows[rows.length - 1]
      if (row && row.width + s <= w) {
        row.items.push(i)
        row.width += s
      } else rows.push({ items: [i], width: s, depth: s })
    }
    const depth = rows.reduce((sum, r) => sum + r.depth, 0)
    if (depth > d || rows.some((r) => r.width > w)) continue
    const out: Placed[] = []
    let z = -depth / 2
    for (const row of rows) {
      let x = -row.width / 2
      for (const i of row.items) {
        const s = sizes[i]! * k
        // 8% of the cell is left as a gap between neighbours.
        out[i] = { x: x + s / 2, z: z + row.depth / 2, size: s * 0.92 }
        x += s
      }
      z += row.depth
    }
    return out
  }
}

export interface Mount {
  part: Exclude<PartKind, 'bus'>
  id: string
  key: Exclude<ModelKey, BusKey>
  slot: Slot
  entity: Entity
  /** Nadir deck only: where on the deck (meters from its centre) and how wide. */
  at?: Placed
}

export interface CraftLayout {
  bus: { key: BusKey; id: string; size: [number, number, number]; entity?: Entity }
  mounts: Mount[]
}

/** Share of the deck that parts may use. */
export const DECK_INSET = 0.9

/** Every picked part with its model and slot. A second part for a single-part slot is drawn as a generic box on the nadir deck. */
export function craftLayout(spec: CraftSpec): CraftLayout {
  const p = spec.parts ?? { instruments: [] }
  const key = busKey(p.bus)
  const size = p.bus ? busSize(p.bus).size : spec.bus
  const mounts: Mount[] = []
  const taken = new Set<Slot>()
  const add = (part: Mount['part'], entity: Entity, wanted: Mount['key']) => {
    const full = SLOT[wanted] !== 'nadir' && taken.has(SLOT[wanted])
    // A power or comms part that lost its slot is skipped; only instruments can move to the deck.
    if (full && part !== 'instrument') return
    const k = full ? 'generic' : wanted
    taken.add(SLOT[k])
    mounts.push({ part, id: entity.id, key: k, slot: SLOT[k], entity })
  }
  if (p.solar) add('power', p.solar, powerKey(p.solar))
  if (p.battery) add('power', p.battery, powerKey(p.battery))
  if (p.comms) add('comms', p.comms, commsKey(p.comms))
  for (const i of p.instruments) add('instrument', i, instrumentKey(i))

  const deck = mounts.filter((m) => m.slot === 'nadir')
  const placed = packDeck(deck.map((m) => instrumentSize(m.entity)), size[0] * DECK_INSET, size[2] * DECK_INSET)
  deck.forEach((m, i) => (m.at = placed[i]))
  return { bus: { key, id: p.bus?.id ?? 'bus', size, entity: p.bus }, mounts }
}
