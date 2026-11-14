// The frame every rocket is assembled in: the groups the scene moves (first stage, strap-ons, upper
// stage, fairing halves, payload) and the parts all vehicles share (payload bay, rideshare dispenser).
import * as THREE from 'three'
import { lathe, paint, palette, put, tube, type Palette, type Profile } from './kit'
import { rocketHeight, type Propellant, type RocketSpec } from './vehicles'

/** Where a stage's flame starts: the exit plane's height, the radius of the whole cluster, and each engine's place [x, z] and exit radius. */
export interface Nozzle { y: number; radius: number; propellant: Propellant; engines: [number, number][]; exit: number }
/** The throats of a stage's engines: the scene turns up their glow with the thrust. */
export type Heat = Record<'s1' | 'booster' | 's2', THREE.MeshStandardMaterial>

/** Origin: centre of the first stage's base, +y up the stack. */
export interface RocketModel {
  root: THREE.Group
  /** First stage with its engines and interstage. */
  stage1: THREE.Group
  /** Strap-ons; `out` is the unit direction away from the core. Children of `root`. */
  boosters: { group: THREE.Group; out: THREE.Vector3; home: THREE.Vector3 }[]
  /** Upper stage; origin at its base. Carries the fairing and the payload. */
  upper: THREE.Group
  /** The two fairing halves (they open along ±x); origin at the fairing base. Children of `upper`. */
  fairing: [THREE.Group, THREE.Group]
  /** A launch abort tower, pulled off forward when the fairing goes (SLS with Orion). Child of `upper`. */
  escape?: THREE.Group
  /** Empty group at the centre of the payload space, child of `upper`; the scene puts the spacecraft in it. */
  payload: THREE.Group
  /** Radius the spacecraft may fill. */
  payloadRadius: number
  /** Rideshare co-passengers, children of `upper`. */
  others: THREE.Mesh[]
  /** Where the flames start, in the local frame of stage1, a booster and upper. */
  nozzles: { s1: Nozzle; booster: Nozzle | null; s2: Nozzle }
  heat: Heat
  height: number
  /** Widest half-width at the base, strap-ons and wings included. */
  footprint: number
}

export interface Stack {
  spec: RocketSpec
  k: Palette
  heat: Heat
  /** Texels per meter for this rocket's skins: its longest part gets a 1024-texel canvas, so a small rocket is as sharp as a big one. */
  px: number
  root: THREE.Group
  stage1: THREE.Group
  upper: THREE.Group
  boosters: RocketModel['boosters']
  others: THREE.Mesh[]
}

export function newStack(spec: RocketSpec): Stack {
  const root = new THREE.Group()
  const stage1 = new THREE.Group()
  const upper = new THREE.Group()
  upper.position.y = spec.s1.length + spec.interstage.length
  root.add(stage1, upper)
  const throat = () => paint(0x060606, 1, 0, { emissive: 0xffffff, emissiveIntensity: 0 })
  const px = 1024 / Math.max(spec.s1.length, spec.boosters?.length ?? 0)
  return { spec, k: palette(), heat: { s1: throat(), booster: throat(), s2: throat() }, px, root, stage1, upper, boosters: [], others: [] }
}

/**
 * A strap-on at `angle` around the core (0 is +x), its axis `distance` out. Build it in the group this
 * returns: there +x points away from the core, whatever the scene does to the booster as it falls away.
 */
export function strapOn(st: Stack, angle: number, distance: number, y = 0): THREE.Group {
  const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
  const group = new THREE.Group()
  const home = out.clone().multiplyScalar(distance).setY(y)
  group.position.copy(home)
  const inner = new THREE.Group()
  inner.rotation.y = -angle
  group.add(inner)
  st.root.add(group)
  st.boosters.push({ group, out, home })
  return inner
}

/** Two shells that split along the plane x = 0, from a profile measured from the fairing base. */
export function fairingHalves(st: Stack, profile: Profile, mat: THREE.Material, base = st.spec.s2.length): [THREE.Group, THREE.Group] {
  return [0, Math.PI].map((phi) => {
    const half = new THREE.Group()
    half.position.y = base
    put(half, lathe(profile, 20, phi, Math.PI), mat)
    st.upper.add(half)
    return half
  }) as [THREE.Group, THREE.Group]
}

/**
 * What sits under the fairing between `base` and `ceiling` (heights in the upper stage's frame): the adapter
 * cone, the rideshare dispenser when the launch is shared, and the empty group for the player's spacecraft.
 */
export function payloadBay(st: Stack, base: number, ceiling: number, radius: number, baseRadius: number): { payload: THREE.Group; payloadRadius: number } {
  const { k, upper, spec } = st
  const adapter = (ceiling - base) * 0.07
  put(upper, tube(baseRadius, baseRadius * 0.45, adapter, 24), k.metal, 0, base)
  let top = base + adapter
  if (spec.rideshare) {
    // Transporter-style: a central tube with deck plates; satellites and CubeSat dispensers bolt on all round.
    const tower = (ceiling - base) * 0.38
    put(upper, tube(radius * 0.2, radius * 0.2, tower, 16), k.metal, 0, top)
    const deck = tube(radius * 0.62, radius * 0.62, tower * 0.012, 24)
    const sat = new THREE.BoxGeometry(radius * 0.3, tower * 0.17, radius * 0.24)
    const dispenser = new THREE.BoxGeometry(radius * 0.13, tower * 0.1, radius * 0.13)
    for (let tier = 0; tier < 4; tier++) {
      const y = top + tower * (0.02 + tier * 0.25)
      put(upper, deck, k.metal, 0, y)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + tier * 0.4
        const small = (i + tier) % 4 === 3
        const m = put(upper, small ? dispenser : sat, small ? k.metal : (i + tier) % 3 === 0 ? k.cells : k.foil, Math.sin(a) * radius * 0.42, y + tower * (small ? 0.065 : 0.1), Math.cos(a) * radius * 0.42)
        m.rotation.y = a
        st.others.push(m)
      }
    }
    top += tower
  }
  const payloadRadius = Math.min(radius * 0.87, (ceiling - top) * (spec.rideshare ? 0.3 : 0.36))
  const payload = new THREE.Group()
  payload.position.y = top + payloadRadius * 1.02
  upper.add(payload)
  return { payload, payloadRadius }
}

export function finish(st: Stack, parts: Pick<RocketModel, 'fairing' | 'payload' | 'payloadRadius' | 'nozzles' | 'footprint' | 'escape'>): RocketModel {
  const { root, stage1, upper, boosters, others, heat } = st
  return { root, stage1, upper, boosters, others, heat, height: rocketHeight(st.spec), ...parts }
}
