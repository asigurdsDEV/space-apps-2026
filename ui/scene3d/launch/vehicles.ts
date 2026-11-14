// Pure: what each launch vehicle looks like and when its real flight events happen. No three.js.
// Sizes are the real vehicles' published dimensions, rounded; event times are typical flights.
import type { Entity } from '../../../shared'

export type Propellant = 'kerolox' | 'methalox' | 'hydrolox' | 'solid'
export type Livery = 'electron' | 'falcon' | 'vulcan' | 'sls' | 'pegasus' | 'shared' | 'generic'
export type VehicleLike = Pick<Entity, 'id' | 'name' | 'props'>

/** Seconds after T0 (lift-off, or the drop for an air launch). */
export interface LaunchEvents {
  maxq: number
  /** Side-booster burnout and separation. */
  boosters?: number
  /** First-stage engine cut-off; the stage separates 3 s later. */
  staging: number
  fairing: number
  /** End of the burn that reaches orbit. */
  seco: number
  /** Spacecraft separation. */
  deploy: number
}

export interface RocketSpec {
  id: string
  name: string
  livery: Livery
  /** Dropped from a carrier aircraft instead of lifting off a pad. */
  airLaunch: boolean
  /** The player's spacecraft shares the fairing with many other satellites. */
  rideshare: boolean
  /** First stage: radius and length in meters (without the interstage). */
  s1: { radius: number; length: number; engines: number; propellant: Propellant }
  /** Adapter between the stages; it stays with the first stage. */
  interstage: { length: number; topRadius: number }
  s2: { radius: number; length: number; engines: number; propellant: Propellant }
  fairing: { radius: number; length: number }
  boosters: { count: number; radius: number; length: number } | null
  /** A small extra stage under the spacecraft (Electron's kick stage, Pegasus's third stage). */
  kickStage: boolean
  legs: boolean
  wing: boolean
  events: LaunchEvents
  /** 0 to 1, from the catalog row; 1 when the row has none. */
  reliability: number
}

type Shape = Omit<RocketSpec, 'id' | 'name' | 'reliability'>

const BASE = { airLaunch: false, rideshare: false, boosters: null, kickStage: false, legs: false, wing: false }

const KNOWN: Record<string, Shape> = {
  electron: {
    ...BASE, livery: 'electron', kickStage: true,
    s1: { radius: 0.6, length: 11, engines: 9, propellant: 'kerolox' },
    interstage: { length: 1.4, topRadius: 0.6 },
    s2: { radius: 0.6, length: 3.1, engines: 1, propellant: 'kerolox' },
    fairing: { radius: 0.6, length: 2.5 },
    events: { maxq: 71, staging: 144, fairing: 184, seco: 552, deploy: 3240 },
  },
  'falcon-9': {
    ...BASE, livery: 'falcon', legs: true,
    s1: { radius: 1.85, length: 41.2, engines: 9, propellant: 'kerolox' },
    interstage: { length: 6.5, topRadius: 1.85 },
    s2: { radius: 1.85, length: 9.5, engines: 1, propellant: 'kerolox' },
    fairing: { radius: 2.6, length: 13.1 },
    events: { maxq: 72, staging: 145, fairing: 195, seco: 518, deploy: 780 },
  },
  'vulcan-centaur': {
    ...BASE, livery: 'vulcan',
    s1: { radius: 2.7, length: 33.3, engines: 2, propellant: 'methalox' },
    interstage: { length: 3.6, topRadius: 2.7 },
    s2: { radius: 2.7, length: 9.2, engines: 2, propellant: 'hydrolox' },
    fairing: { radius: 2.7, length: 15.5 },
    boosters: { count: 6, radius: 0.8, length: 21.9 },
    events: { maxq: 76, boosters: 110, staging: 299, fairing: 323, seco: 945, deploy: 3000 },
  },
  'sls-block-1': {
    ...BASE, livery: 'sls',
    s1: { radius: 4.2, length: 64.6, engines: 4, propellant: 'hydrolox' },
    interstage: { length: 8.4, topRadius: 2.55 },
    s2: { radius: 2.55, length: 6, engines: 1, propellant: 'hydrolox' },
    fairing: { radius: 2.55, length: 19 },
    boosters: { count: 2, radius: 1.86, length: 54 },
    // The fairing goes before the core stage is empty: the core burns for eight minutes.
    events: { maxq: 70, boosters: 132, fairing: 210, staging: 486, seco: 3180, deploy: 7500 },
  },
  'pegasus-xl': {
    ...BASE, livery: 'pegasus', airLaunch: true, kickStage: true, wing: true,
    s1: { radius: 0.635, length: 10.3, engines: 1, propellant: 'solid' },
    interstage: { length: 0.8, topRadius: 0.635 },
    s2: { radius: 0.635, length: 3.1, engines: 1, propellant: 'solid' },
    fairing: { radius: 0.635, length: 3.4 },
    events: { maxq: 32, staging: 88, fairing: 131, seco: 502, deploy: 660 },
  },
  rideshare: {
    ...BASE, livery: 'shared', rideshare: true,
    s1: { radius: 1.85, length: 41, engines: 9, propellant: 'kerolox' },
    interstage: { length: 6, topRadius: 1.85 },
    s2: { radius: 1.85, length: 10, engines: 1, propellant: 'kerolox' },
    fairing: { radius: 2.6, length: 13 },
    events: { maxq: 72, staging: 145, fairing: 200, seco: 510, deploy: 3540 },
  },
}

/** Largest payload_*_kg column of the row: how much the vehicle can lift anywhere. */
export function payloadCapacityKg(vehicle: VehicleLike | undefined): number {
  let best = 0
  for (const [key, v] of Object.entries(vehicle?.props ?? {})) {
    if (/^payload_.*_kg$/.test(key) && typeof v === 'number' && Number.isFinite(v)) best = Math.max(best, v)
  }
  return best
}

/** A plain two-stage rocket sized by what it can lift: 300 kg gives about 18 m, 17 t about 70 m. */
function generic(payload_kg: number): Shape {
  const height = Math.min(110, Math.max(14, 2.7 * Math.cbrt(Math.max(payload_kg, 1))))
  const radius = height / 38
  const big = payload_kg >= 40_000
  return {
    ...BASE, livery: 'generic',
    s1: { radius, length: height * 0.58, engines: payload_kg >= 5_000 ? 5 : 3, propellant: 'kerolox' },
    interstage: { length: height * 0.08, topRadius: radius },
    s2: { radius, length: height * 0.15, engines: 1, propellant: 'kerolox' },
    fairing: { radius: height > 30 ? radius * 1.3 : radius, length: height * 0.19 },
    boosters: big ? { count: 2, radius: radius * 0.45, length: height * 0.45 } : null,
    events: { maxq: 70, ...(big ? { boosters: 125 } : {}), staging: 150, fairing: 190, seco: 520, deploy: 900 },
  }
}

/** The look and flight plan for a launch-vehicle row. Unknown ids get a generic rocket; never throws. */
export function rocketSpec(vehicle: VehicleLike | undefined): RocketSpec {
  const id = vehicle?.id ?? ''
  const text = `${id} ${vehicle?.name ?? ''}`
  const shape = KNOWN[id] ?? (/rideshare|shared/i.test(text) ? KNOWN.rideshare! : generic(payloadCapacityKg(vehicle)))
  const r = vehicle?.props.reliability
  return { ...shape, id, name: vehicle?.name || 'The rocket', reliability: typeof r === 'number' && r > 0 && r <= 1 ? r : 1 }
}

export function rocketHeight(spec: RocketSpec): number {
  return spec.s1.length + spec.interstage.length + spec.s2.length + spec.fairing.length
}
