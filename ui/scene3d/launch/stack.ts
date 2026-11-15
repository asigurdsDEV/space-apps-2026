// The frame every rocket is assembled in: the groups the scene moves (first stage, strap-ons, upper
// stage, fairing halves, payload) and the parts all vehicles share (fairing walls, payload bay; its hardware is in payload.ts).
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { lathe, paint, palette, put, skin, type Palette, type Profile } from './kit'
import { attachFitting, dispenser, fuse, hardware, SATELLITES, stageTop } from './payload'
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

/** The inside of a fairing half: quilted acoustic blankets between ring frames on the bare composite wall, and the split rail down each edge. */
function blanketSkin(st: Stack, R: number, L: number): THREE.MeshStandardMaterial {
  const rows = Math.max(3, Math.round(L / Math.max(0.9, R * 0.5)))
  const cols = Math.max(3, Math.round((Math.PI * R) / Math.max(0.7, R * 0.4)))
  return skin({
    base: '#1c1d21', roughness: 0.55, metalness: 0.15, relief: 2, shell: true, key: `fairing-blankets-${rows}-${cols}`,
    extra: (c, w, h, d) => {
      const rail = Math.max(2, w * 0.014)
      const cw = (w - 2 * rail) / cols
      const ch = h / rows
      for (let j = 0; j < rows; j++) {
        // The nose is too tight a curve for blankets: its top rows stay bare.
        if (j >= 1 && (j + 0.5) / rows > 0.14) for (let i = 0; i < cols; i++) {
          const x = rail + i * cw + cw * 0.06
          const y = j * ch + ch * 0.1
          c.fillStyle = (i + j) % 2 ? '#b3afa2' : '#aba698'
          d.fillStyle = 'rgb(215,225,0)'
          c.fillRect(x, y, cw * 0.88, ch * 0.8)
          d.fillRect(x, y, cw * 0.88, ch * 0.8)
          // Quilting: the stitch lines that hold the batting in place.
          c.fillStyle = 'rgba(70,64,50,0.35)'
          d.fillStyle = 'rgb(150,225,0)'
          for (const ctx of [c, d]) {
            ctx.fillRect(x + cw * 0.44 - 0.5, y, 1, ch * 0.8)
            ctx.fillRect(x, y + ch * 0.4 - 0.5, cw * 0.88, 1)
          }
        }
        // A ring frame under every row.
        c.fillStyle = '#8e9197'
        d.fillStyle = 'rgb(255,100,230)'
        for (const ctx of [c, d]) ctx.fillRect(0, j * ch - 1.5, w, 3)
      }
      c.fillStyle = '#8e9197'
      d.fillStyle = 'rgb(255,100,230)'
      for (const ctx of [c, d]) {
        ctx.fillRect(0, 0, rail, h)
        ctx.fillRect(w - rail, 0, rail, h)
        ctx.fillRect(0, h - 3, w, 3)
      }
    },
  }, Math.PI * R, L, st.px * 2)
}

/**
 * Two shells that split along the plane x = 0, from a profile measured from the fairing base. Each half is a
 * wall with thickness: the painted outside, the blanketed inside, and the cut edge between them.
 */
export function fairingHalves(st: Stack, profile: Profile, mat: THREE.Material, base = st.spec.s2.length): [THREE.Group, THREE.Group] {
  const R = Math.max(...profile.map(([r]) => r))
  const L = profile[profile.length - 1]![1]
  const wall = Math.max(0.03, R * 0.04)
  const inside = blanketSkin(st, R, L)
  // The inner wall, with the foot of the half closing the gap to the outer one.
  const inner: Profile = [profile[0]!, ...profile.map(([r, y]): [number, number] => [Math.max(r - wall, 0.01), y])]
  return [0, Math.PI].map((phi) => {
    const half = new THREE.Group()
    half.position.y = base
    put(half, lathe(profile, 20, phi, Math.PI), mat)
    // The cut edges: a strip between the outer and inner wall down both sides of the split (z = +r and z = -r).
    const pos: number[] = []
    const uv: number[] = []
    const index: number[] = []
    for (const side of [1, -1]) {
      const first = pos.length / 3
      profile.forEach(([r, y], i) => {
        pos.push(0, y, side * r, 0, y, side * Math.max(r - wall, 0.01))
        uv.push(0.004, y / L, 0.004, y / L)
        if (i) index.push(first + 2 * i - 2, first + 2 * i - 1, first + 2 * i, first + 2 * i, first + 2 * i - 1, first + 2 * i + 1)
      })
    }
    const edge = new THREE.BufferGeometry()
    edge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    edge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    edge.setIndex(index)
    edge.computeVertexNormals()
    put(half, mergeGeometries([lathe(inner, 20, phi, Math.PI), edge]), inside)
    st.upper.add(half)
    return half
  }) as [THREE.Group, THREE.Group]
}

/**
 * What sits under the fairing between `base` and `ceiling` (heights in the upper stage's frame): the top of the
 * stage, the payload attach fitting, the rideshare dispenser with its satellites when the launch is shared, and
 * the empty group for the player's spacecraft. When the scene puts the spacecraft in that group, a fitting
 * grows up to meet the underside of its bus.
 */
export function payloadBay(st: Stack, base: number, ceiling: number, radius: number, baseRadius: number): { payload: THREE.Group; payloadRadius: number } {
  const { upper, spec } = st
  const metal = hardware()
  const adapter = (ceiling - base) * 0.07
  const column = radius * 0.24
  // The fitting narrows to the dispenser's column on a shared launch, to the spacecraft's interface ring on a dedicated one.
  let seat = spec.rideshare ? Math.min(column * 1.07, baseRadius * 0.8) : baseRadius * 0.45
  const parts = [...stageTop(base, baseRadius), ...attachFitting(base, adapter, baseRadius * 0.8, seat)]
  let top = base + adapter
  if (spec.rideshare) {
    const tower = (ceiling - base) * 0.38
    // Satellites are drawn in meters for a 5 m fairing; a smaller one gets smaller satellites.
    const u = radius / 2.4
    const stack = dispenser(top, tower, column, u)
    parts.push(...stack.parts)
    const kinds = SATELLITES.map((make) => make())
    stack.ports.forEach(([a, r, y], i) => {
      const tier = Math.floor(i / 4)
      const kind = (i + tier) % kinds.length
      const sat = put(upper, kinds[kind]!, metal, Math.sin(a) * r, y, Math.cos(a) * r)
      // No two neighbours the same size or the same way up.
      sat.rotation.set(0, a, kind === 3 ? 0 : ((i + tier) % 3) * (Math.PI / 2))
      sat.scale.setScalar(u * (1.18 + 0.05 * ((i * 3 + tier) % 4)))
      st.others.push(sat)
    })
    top += tower
    seat = column * 1.07
  }
  put(upper, fuse(parts), metal)
  const payloadRadius = Math.min(radius * 0.87, (ceiling - top) * (spec.rideshare ? 0.3 : 0.36))
  const payload = new THREE.Group()
  payload.position.y = top + payloadRadius * 1.02
  upper.add(payload)
  payload.addEventListener('childadded', ({ child }) => {
    // The spacecraft stands on its bus; whatever hangs below (instruments) goes down inside the fitting.
    let bus = child
    child.traverse((o) => { if (o.userData.part === 'bus') bus = o })
    upper.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(bus)
    const foot = upper.worldToLocal(box.getCenter(new THREE.Vector3()).setY(box.min.y))
    const rise = foot.y - top
    const neck = Math.min(Math.min(box.max.x - box.min.x, box.max.z - box.min.z) * 0.45, seat)
    if (rise < 0.02 || !(neck > 0)) return
    const fitting = fuse(attachFitting(top, rise, Math.min(seat, Math.max(neck * 1.15, neck + rise * 0.3)), neck))
    // A spacecraft with a boom or a big reflector is not centred on its bus: the fitting leans over to stand under the bus.
    const pos = fitting.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const lean = (pos.getY(i) - top) / rise
      pos.setXYZ(i, pos.getX(i) + foot.x * lean, pos.getY(i), pos.getZ(i) + foot.z * lean)
    }
    put(upper, fitting, metal)
  })
  return { payload, payloadRadius }
}

export function finish(st: Stack, parts: Pick<RocketModel, 'fairing' | 'payload' | 'payloadRadius' | 'nozzles' | 'footprint' | 'escape'>): RocketModel {
  const { root, stage1, upper, boosters, others, heat } = st
  return { root, stage1, upper, boosters, others, heat, height: rocketHeight(st.spec), ...parts }
}
