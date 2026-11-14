// Pure: what each launch vehicle looks like and when its real flight events happen. No three.js.
// Sizes are the real vehicles' published dimensions (sources: REFERENCES.md); event times are typical flights.
import type { Entity } from '../../../shared'

export type Propellant = 'kerolox' | 'methalox' | 'hydrolox' | 'solid'
/** Which real rocket rocket.ts builds. 'generic' is the fallback for ids nobody has modelled. */
export type ModelId = 'electron' | 'falcon-9' | 'falcon-heavy' | 'pegasus-xl' | 'vulcan-centaur' | 'atlas-v' | 'delta-iv-heavy' | 'sls-block-1' | 'generic'
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
  model: ModelId
  /** Dropped from a carrier aircraft instead of lifting off a pad. */
  airLaunch: boolean
  /** The player's spacecraft shares the fairing with many other satellites. */
  rideshare: boolean
  /** First stage: radius and length in meters (without the interstage). */
  s1: { radius: number; length: number; engines: number; propellant: Propellant }
  /** Adapter between the stages; it stays with the first stage. */
  interstage: { length: number; topRadius: number }
  /** The part of the upper stage that shows between the interstage and the fairing. */
  s2: { radius: number; length: number; engines: number; propellant: Propellant }
  /** Everything above the upper stage that comes off to uncover the spacecraft (on SLS: Orion's panels and abort tower). */
  fairing: { radius: number; length: number }
  /** Strap-ons: solid motors, or whole liquid cores on the heavies. `length` includes the nose cone. */
  boosters: { count: number; radius: number; length: number } | null
  events: LaunchEvents
  /** 0 to 1, from the catalog row; 1 when the row has none. */
  reliability: number
}

type Shape = Omit<RocketSpec, 'id' | 'name' | 'reliability'>

const BASE = { airLaunch: false, rideshare: false, boosters: null }

// Falcon 9 Block 5: 70 m tall, 3.66 m body, 5.2 m x 13.1 m fairing, 9 + 1 Merlin engines.
const FALCON: Shape = {
  ...BASE, model: 'falcon-9',
  s1: { radius: 1.83, length: 41.2, engines: 9, propellant: 'kerolox' },
  interstage: { length: 6.5, topRadius: 1.83 },
  s2: { radius: 1.83, length: 9.2, engines: 1, propellant: 'kerolox' },
  fairing: { radius: 2.6, length: 13.1 },
  events: { maxq: 72, staging: 145, fairing: 195, seco: 518, deploy: 780 },
}

/** Keyed by catalog id. Ids without a catalog row yet (atlas-v, delta-iv-heavy, falcon-heavy) work the moment a row is added. */
export const KNOWN: Record<string, Shape> = {
  // Electron: 18 m tall, 1.2 m carbon-composite body, 9 + 1 Rutherford engines, Curie kick stage.
  electron: {
    ...BASE, model: 'electron',
    s1: { radius: 0.6, length: 11, engines: 9, propellant: 'kerolox' },
    interstage: { length: 1.4, topRadius: 0.6 },
    s2: { radius: 0.6, length: 3.1, engines: 1, propellant: 'kerolox' },
    fairing: { radius: 0.6, length: 2.5 },
    events: { maxq: 71, staging: 144, fairing: 184, seco: 552, deploy: 3240 },
  },
  'falcon-9': FALCON,
  // A Transporter-style shared Falcon 9: the same rocket with a dispenser stack under the fairing.
  rideshare: { ...FALCON, rideshare: true, events: { maxq: 72, staging: 145, fairing: 200, seco: 510, deploy: 3540 } },
  // Falcon Heavy as flown for Psyche: three Falcon 9 cores, 12.2 m wide; the side cores are 47 m with their nose cones.
  'falcon-heavy': {
    ...FALCON, model: 'falcon-heavy',
    boosters: { count: 2, radius: 1.83, length: 47 },
    events: { maxq: 71, boosters: 149, staging: 235, fairing: 265, seco: 506, deploy: 3740 },
  },
  // Vulcan Centaur VC6: 61.6 m tall, 5.4 m body, 2 BE-4, six 21.9 m x 1.6 m GEM 63XL, Centaur V with 2 RL10, 15.5 m fairing.
  'vulcan-centaur': {
    ...BASE, model: 'vulcan-centaur',
    s1: { radius: 2.7, length: 33.3, engines: 2, propellant: 'methalox' },
    interstage: { length: 3.6, topRadius: 2.7 },
    s2: { radius: 2.7, length: 9.2, engines: 2, propellant: 'hydrolox' },
    fairing: { radius: 2.7, length: 15.5 },
    boosters: { count: 6, radius: 0.8, length: 21.9 },
    events: { maxq: 76, boosters: 110, staging: 299, fairing: 323, seco: 945, deploy: 3000 },
  },
  // Atlas V 401 (MAVEN, LRO): 58.3 m tall, 3.81 m x 32.5 m booster with one twin-nozzle RD-180, 3.05 m Centaur, 4.2 m x 12 m fairing.
  'atlas-v': {
    ...BASE, model: 'atlas-v',
    s1: { radius: 1.905, length: 32.5, engines: 2, propellant: 'kerolox' },
    interstage: { length: 3.8, topRadius: 1.525 },
    s2: { radius: 1.525, length: 10, engines: 1, propellant: 'hydrolox' },
    fairing: { radius: 2.1, length: 12 },
    events: { maxq: 92, staging: 242, fairing: 266, seco: 810, deploy: 3160 },
  },
  // Delta IV Heavy (Parker Solar Probe): 72 m tall, three 5.1 m x 40.8 m common booster cores, 5 m upper stage, 19.1 m fairing.
  'delta-iv-heavy': {
    ...BASE, model: 'delta-iv-heavy',
    s1: { radius: 2.55, length: 36.6, engines: 1, propellant: 'hydrolox' },
    interstage: { length: 4.2, topRadius: 2.55 },
    s2: { radius: 2.55, length: 12, engines: 1, propellant: 'hydrolox' },
    fairing: { radius: 2.55, length: 19.1 },
    boosters: { count: 2, radius: 2.55, length: 40.8 },
    events: { maxq: 80, boosters: 237, staging: 336, fairing: 365, seco: 637, deploy: 2598 },
  },
  // SLS Block 1 (Artemis I): 98 m tall, 8.4 m x 64.6 m core with 4 RS-25, two 54 m x 3.7 m boosters,
  // an 8.4 m adapter cone down to the 5 m ICPS, then Orion under its panels and abort tower.
  'sls-block-1': {
    ...BASE, model: 'sls-block-1',
    s1: { radius: 4.2, length: 64.6, engines: 4, propellant: 'hydrolox' },
    interstage: { length: 8.4, topRadius: 2.5 },
    s2: { radius: 2.5, length: 6, engines: 1, propellant: 'hydrolox' },
    fairing: { radius: 2.5, length: 19 },
    boosters: { count: 2, radius: 1.85, length: 54 },
    // Orion's panels and tower go before the core stage is empty: the core burns for eight minutes.
    events: { maxq: 70, boosters: 132, fairing: 210, staging: 486, seco: 3180, deploy: 7500 },
  },
  // Pegasus XL: 16.9 m long, 1.27 m body, 6.7 m delta wing, three solid stages, dropped from an L-1011 at about 12 km.
  'pegasus-xl': {
    ...BASE, model: 'pegasus-xl', airLaunch: true,
    s1: { radius: 0.635, length: 9, engines: 1, propellant: 'solid' },
    interstage: { length: 0.9, topRadius: 0.635 },
    s2: { radius: 0.635, length: 2.6, engines: 1, propellant: 'solid' },
    fairing: { radius: 0.635, length: 4.4 },
    events: { maxq: 32, staging: 88, fairing: 131, seco: 502, deploy: 660 },
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
    ...BASE, model: 'generic',
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
  const shape = (Object.hasOwn(KNOWN, id) ? KNOWN[id] : undefined) ?? (/rideshare|shared/i.test(text) ? KNOWN.rideshare! : generic(payloadCapacityKg(vehicle)))
  const r = vehicle?.props.reliability
  return { ...shape, id, name: vehicle?.name || 'The rocket', reliability: typeof r === 'number' && r > 0 && r <= 1 ? r : 1 }
}

export function rocketHeight(spec: RocketSpec): number {
  return spec.s1.length + spec.interstage.length + spec.s2.length + spec.fairing.length
}
