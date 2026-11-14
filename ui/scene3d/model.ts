// Pure: turns SimState (picked params + part entities) into what the 3D scene draws.
// No three.js here, so it is easy to test. Columns follow data/README.md (PR #8).
import type { Entity, ParamValue, SimState } from '../../shared'

export type Body = 'earth' | 'moon' | 'mars'
export type Power = 'none' | 'body' | 'wings' | 'rtg'
export type Antenna = 'none' | 'whip' | 'patch' | 'dish'
export type InstrumentShape = 'lens' | 'telescope' | 'box' | 'radar' | 'boom'

export interface CraftSpec {
  /** Bus size in meters: x (wing axis), y (zenith), z (sun side). */
  bus: [number, number, number]
  cubesat: boolean
  power: Power
  /** Length of each solar wing, in multiples of the bus's largest side. */
  wingSpan: number
  antenna: Antenna
  /** Dish diameter in multiples of the bus's largest side. */
  dishSize: number
  instruments: InstrumentShape[]
  /** The picked catalog rows. ui/scene3d/parts turns each into its own model, by id, then by kind and props. */
  parts?: CraftParts
}

export interface CraftParts {
  bus?: Entity
  /** The `solar` pick: a solar array or an RTG. */
  solar?: Entity
  battery?: Entity
  comms?: Entity
  instruments: Entity[]
}

export interface SceneSpec {
  body: Body
  altitude_m: number
  inclination_rad: number
  period_s: number
  craft: CraftSpec
  /** Display names, for the caption and the screen-reader description. */
  names: { orbit?: string; bus?: string; power?: string; battery?: string; comms?: string; instruments: string[] }
}

export const BODY_RADIUS_M: Record<Body, number> = { earth: 6_371_000, moon: 1_737_400, mars: 3_389_500 }
export const BODY_NAMES: Record<Body, string> = { earth: 'Earth', moon: 'the Moon', mars: 'Mars' }

export const num = (v: ParamValue | undefined, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
export const str = (v: ParamValue | undefined) => (typeof v === 'string' ? v : '')
const ids = (v: ParamValue | undefined) => str(v).split(',').map((s) => s.trim()).filter(Boolean)

function picked(state: Pick<SimState, 'entities' | 'params'>, key: string, kind: string): Entity | undefined {
  const id = state.params[key]
  return state.entities.find((e) => e.kind === kind && e.id === id)
}

export function busSize(bus: Entity | undefined): { size: [number, number, number]; cubesat: boolean } {
  if (!bus) return { size: [0.2, 0.34, 0.1], cubesat: true }
  const units = /(\d+)\s*U\b/i.exec(bus.name)?.[1] ?? /cubesat-(\d+)u/i.exec(bus.id)?.[1]
  if (units || bus.props.class === 'cubesat') {
    const u = Number(units ?? 6)
    // 1U = 10 cm cube; 3U is 1x1x3, 6U is 2x1x3, 12U is 2x2x3.
    const [x, z] = u <= 3 ? [0.1, 0.1] : u <= 6 ? [0.2, 0.1] : [0.2, 0.2]
    return { size: [x, 0.34, z], cubesat: true }
  }
  const side = Math.cbrt(num(bus.props.dry_mass_kg, 120) / 300)
  return { size: [side, side * 1.25, side], cubesat: false }
}

export function wingSpan(power_w: number): number {
  return Math.min(3.6, Math.max(0.8, 0.8 + 0.75 * Math.log10(Math.max(power_w, 1) / 10)))
}

function powerOf(solar: Entity | undefined): Power {
  if (!solar) return 'none'
  if (solar.props.type === 'rtg') return 'rtg'
  return /body/i.test(solar.id + ' ' + solar.name) ? 'body' : 'wings'
}

export function antennaOf(comms: Entity | undefined): { antenna: Antenna; dishSize: number } {
  if (!comms) return { antenna: 'none', dishSize: 0 }
  const text = `${comms.id} ${comms.name}`
  const band = str(comms.props.band)
  if (/dish/i.test(text)) return { antenna: 'dish', dishSize: 1 }
  if (/^X/.test(band)) return { antenna: 'dish', dishSize: 0.55 }
  if (/UHF|VHF/i.test(band) || /uhf/i.test(text)) return { antenna: 'whip', dishSize: 0 }
  return { antenna: 'patch', dishSize: 0 }
}

export function instrumentShape(category: ParamValue | undefined): InstrumentShape {
  switch (category) {
    case 'imager': return 'lens'
    case 'telescope': return 'telescope'
    case 'radar': return 'radar'
    case 'fields': return 'boom'
    default: return 'box'
  }
}

/** What to draw for the current design. Missing picks fall back to a plain 6U CubeSat in low Earth orbit. */
export function sceneSpec(state: Pick<SimState, 'entities' | 'params'>): SceneSpec {
  const orbit = picked(state, 'orbit', 'orbit')
  const bus = picked(state, 'bus', 'bus')
  const solar = picked(state, 'solar', 'power_system')
  const battery = picked(state, 'battery', 'power_system')
  const comms = picked(state, 'comms', 'comms_system')
  const instruments = ids(state.params.instruments)
    .map((id) => state.entities.find((e) => e.kind === 'instrument' && e.id === id))
    .filter((e): e is Entity => !!e)
  const body = (['earth', 'moon', 'mars'] as const).find((b) => b === orbit?.props.central_body) ?? 'earth'
  const { size, cubesat } = busSize(bus)
  return {
    body,
    altitude_m: num(orbit?.props.altitude_m, 500_000),
    inclination_rad: num(orbit?.props.inclination_rad, 0.9),
    period_s: num(orbit?.props.period_s, 5_600),
    craft: {
      bus: size,
      cubesat,
      power: powerOf(solar),
      wingSpan: wingSpan(num(solar?.props.power_w, 20)),
      ...antennaOf(comms),
      instruments: instruments.slice(0, 6).map((i) => instrumentShape(i.props.category)),
      parts: { bus, solar, battery, comms, instruments },
    },
    names: { orbit: orbit?.name, bus: bus?.name, power: solar?.name, battery: battery?.name, comms: comms?.name, instruments: instruments.map((i) => i.name) },
  }
}

/**
 * Orbit radius in planet radii, squashed so GEO (5.6 Earth radii up) still fits next to low orbits.
 * shortcut: not to scale; the caption gives the real altitude.
 */
export function orbitRadius(spec: Pick<SceneSpec, 'body' | 'altitude_m'>): number {
  return 1.12 + 0.9 * Math.log10(1 + (8 * spec.altitude_m) / BODY_RADIUS_M[spec.body])
}

/** Seconds of real time per lap on screen: LEO about 12 s, GEO about 47 s. */
export function lapSeconds(period_s: number): number {
  return 12 * Math.sqrt(Math.max(period_s, 600) / 5_550)
}

export function formatAltitude(m: number): string {
  return m >= 10_000 ? `${Math.round(m / 1000).toLocaleString()} km` : `${Math.round(m).toLocaleString()} m`
}

/** One-line caption, e.g. "6U CubeSat · Sun-synchronous orbit · 600 km". */
export function caption(spec: SceneSpec): string {
  return [spec.names.bus ?? 'Your spacecraft', spec.names.orbit, formatAltitude(spec.altitude_m)].filter(Boolean).join(' · ')
}

/** Screen-reader text for the 3D view. */
export function describe(spec: SceneSpec): string {
  const parts = [spec.names.power, spec.names.comms].filter(Boolean) as string[]
  const n = spec.names.instruments.length
  if (n > 0) parts.push(`${n} instrument${n > 1 ? 's' : ''} (${spec.names.instruments.join(', ')})`)
  const kit = parts.length ? ` with ${parts.join(', ')}` : ''
  const where = spec.names.orbit ? `in ${spec.names.orbit}, ` : ''
  return `3D view: ${spec.names.bus ?? 'your spacecraft'}${kit}, ${where}${formatAltitude(spec.altitude_m)} above ${BODY_NAMES[spec.body]}.`
}
