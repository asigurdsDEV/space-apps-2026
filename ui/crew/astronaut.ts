// A crew member for co-op: a white spacesuit with a round helmet and dark visor, chest pack, backpack, ribbed
// knees and elbows, cuff rings, gloves and boots. Drawn in code, so it needs no model file and works offline.
// The shapes are built once and shared by every astronaut. The body is one mesh per material; each arm and leg is
// two more groups (upper and lower) that turn at the shoulder, elbow, hip and knee: 32 draw calls an astronaut, plus
// the name above the helmet. `poseAstronaut` moves them; the angles come from `./motion`.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { HIP, THIGH, type Pose } from './motion'

/** One material each: suit cloth, hard white shell, ribbed joint cloth, dark rubber, anodised rings, visor glass. */
type Look = 'fabric' | 'shell' | 'ribbed' | 'rubber' | 'metal' | 'visor'
const LOOKS: Look[] = ['fabric', 'shell', 'ribbed', 'rubber', 'metal', 'visor']
type V3 = [number, number, number]

/** A small repeating picture drawn on a canvas; null where there is no page (tests). */
function drawn(size: number, repeat: [number, number], draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return null
  draw(g, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(...repeat)
  return texture
}

function materials(): Record<Look, THREE.MeshStandardMaterial> {
  // The same numbers every time, so every player sees the same suit.
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  // Worn suit cloth: grey-white, with soft grime, creases and a fine weave. Read as colour and as height.
  const cloth = drawn(256, [3, 3], (g, s) => {
    g.fillStyle = '#cbc9c3'
    g.fillRect(0, 0, s, s)
    for (let i = 0; i < 90; i++) {
      const x = rnd() * s, y = rnd() * s, r = 14 + rnd() * 34
      // Drawn at each edge too, so the picture repeats without a seam.
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        const blot = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
        blot.addColorStop(0, `rgba(70, 66, 58, ${0.05 + rnd() * 0.08})`)
        blot.addColorStop(1, 'rgba(70, 66, 58, 0)')
        g.fillStyle = blot
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
      }
    }
    g.lineCap = 'round'
    for (let i = 0; i < 46; i++) {
      const x = rnd() * s, y = rnd() * s, w = 26 + rnd() * 60, bend = (rnd() - 0.5) * 22
      for (const [shift, ink, wide] of [[0, 'rgba(60, 58, 52, 0.3)', 3], [3, 'rgba(255, 255, 250, 0.35)', 2]] as const) {
        g.strokeStyle = ink
        g.lineWidth = wide
        g.beginPath()
        g.moveTo(x, y + shift)
        g.quadraticCurveTo(x + w / 2, y + bend + shift, x + w, y + shift)
        g.stroke()
      }
    }
    g.fillStyle = 'rgba(60, 58, 52, 0.07)'
    for (let i = 0; i < s; i += 4) {
      g.fillRect(i, 0, 1, s)
      g.fillRect(0, i, s, 1)
    }
  })
  if (cloth) cloth.colorSpace = THREE.SRGBColorSpace
  // Ribbed joints: raised bands across the limb.
  const ribs = drawn(64, [1, 11], (g, s) => {
    g.fillStyle = '#c4c3bd'
    g.fillRect(0, 0, s, s)
    g.fillStyle = '#7f7e78'
    g.fillRect(0, s * 0.66, s, s * 0.34)
  })
  if (ribs) ribs.colorSpace = THREE.SRGBColorSpace
  return {
    fabric: new THREE.MeshStandardMaterial({ color: cloth ? 0xffffff : 0xcbc9c3, roughness: 0.95, map: cloth, bumpMap: cloth, bumpScale: 2.2 }),
    shell: new THREE.MeshStandardMaterial({ color: 0xd9d8d2, roughness: 0.5, metalness: 0.05 }),
    ribbed: new THREE.MeshStandardMaterial({ color: ribs ? 0x9a9993 : 0x8a8983, roughness: 0.9, map: ribs, bumpMap: ribs, bumpScale: 1.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.82 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x6aa797, roughness: 0.34, metalness: 0.75 }),
    visor: new THREE.MeshStandardMaterial({ color: 0x090b0f, roughness: 0.07, metalness: 0.92 }),
  }
}

const cyl = (top: number, bottom: number, height: number) => new THREE.CylinderGeometry(top, bottom, height, 18, 1)
const ball = (r: number) => new THREE.SphereGeometry(r, 22, 16)
const slab = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r)
/** A ring lying flat (its hole points up) once turned by FLAT. */
const ring = (r: number, tube: number) => new THREE.TorusGeometry(r, tube, 8, 26)
const FLAT: V3 = [Math.PI / 2, 0, 0]
const SIDEWAYS: V3 = [0, 0, Math.PI / 2]
const FORWARD: V3 = [Math.PI / 2, 0, 0]

/** One geometry per material, for the materials a part uses. */
type Geo = Partial<Record<Look, THREE.BufferGeometry>>
/** Shapes waiting to be merged. `y` is the height of this part's own pivot in the frame its shapes are given in. */
interface Bin { looks: Partial<Record<Look, THREE.BufferGeometry[]>>; y: number }
/** An arm or leg: hangs from `at`, swung outwards by `swing` radians, with a joint `joint` down its length. */
interface LimbShapes { at: V3; swing: number; joint: number; upper: Geo; lower: Geo }
/** Legs first, then arms; within each the -X side first. */
interface Suit { body: Geo; limbs: LimbShapes[] }
const ELBOW = 0.345

/** Every shape of the suit, merged into one geometry per material and moving part. Front is -Z, up is +Y, feet at y = 0. */
function shapes(): Suit {
  const bin = (y = 0): Bin => ({ looks: {}, y })
  const body = bin()
  const legs: LimbShapes[] = []
  const arms: LimbShapes[] = []
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  /** Adds a shape: scaled, turned (radians) and moved, in the body's frame or in the frame of the limb part given. */
  const add = (look: Look, shape: THREE.BufferGeometry, at: V3, turn: V3 = [0, 0, 0], into: Bin = body, scale: V3 = [1, 1, 1]) => {
    m.compose(new THREE.Vector3(at[0], at[1] - into.y, at[2]), q.setFromEuler(e.set(...turn)), new THREE.Vector3(...scale))
    const flat = shape.index ? shape.toNonIndexed() : shape // merging needs every shape in the same form
    ;(into.looks[look] ??= []).push(flat.applyMatrix4(m))
  }
  const merged = (part: Bin): Geo => Object.fromEntries(Object.entries(part.looks).map(([look, list]) => [look, mergeGeometries(list)]))

  for (const s of [-1, 1]) {
    // ---- Leg: thigh, ribbed knee-to-shin pad, shin, ankle ring, boot. Thin rings of cloth are the folds of a loose suit.
    // The leg's shapes are given from the hip; the knee is THIGH down it.
    const thigh = bin()
    const shin = bin(-THIGH)
    add('fabric', cyl(0.132, 0.11, 0.42), [0, -0.22, 0], undefined, thigh)
    for (const y of [-0.09, -0.19, -0.3]) add('fabric', ring(0.132 + y * 0.05, 0.009), [0, y, 0], FLAT, thigh)
    add('fabric', ball(0.114), [0, -0.44, 0], undefined, thigh)
    add('ribbed', slab(0.18, 0.36, 0.07, 0.022), [0, -0.52, -0.086], undefined, shin)
    add('fabric', cyl(0.108, 0.092, 0.36), [0, -0.61, 0], undefined, shin)
    for (const y of [-0.66, -0.72]) add('fabric', ring(0.096, 0.008), [0, y, 0], FLAT, shin)
    add('metal', ring(0.096, 0.013), [0, -0.775, 0], FLAT, shin)
    add('shell', cyl(0.096, 0.102, 0.08), [0, -0.815, 0], undefined, shin)
    add('shell', slab(0.165, 0.12, 0.32, 0.05), [0, -0.862, -0.05], undefined, shin)
    add('ribbed', slab(0.172, 0.04, 0.09, 0.012), [0, -0.83, -0.06], [0.25, 0, 0], shin) // instep strap
    add('rubber', slab(0.175, 0.045, 0.345, 0.016), [0, -0.913, -0.05], undefined, shin)
    add('rubber', slab(0.15, 0.07, 0.09, 0.026), [0, -0.88, -0.195], undefined, shin)
    legs.push({ at: [s * 0.125, HIP, 0], swing: s * 0.06, joint: -THIGH, upper: merged(thigh), lower: merged(shin) })
    // Harness strap from the hip down to the crotch.
    add('ribbed', slab(0.06, 0.3, 0.022, 0.008), [s * 0.09, 0.93, -0.158], [0, 0, -s * 0.45])

    // ---- Arm, held a little out from the body: shoulder, upper arm, ribbed elbow, forearm, wrist ring, glove.
    const upper = bin()
    const fore = bin(-ELBOW)
    add('fabric', ball(0.118), [s * 0.285, 1.452, 0])
    add('fabric', cyl(0.098, 0.087, 0.3), [0, -0.16, 0], undefined, upper)
    for (const y of [-0.1, -0.2]) add('fabric', ring(0.092, 0.008), [0, y, 0], FLAT, upper)
    add('ribbed', cyl(0.093, 0.089, 0.12), [0, -0.345, 0], undefined, upper)
    add('ribbed', ball(0.086), [0, -ELBOW, 0], undefined, upper) // hidden inside the elbow until it bends
    add('fabric', cyl(0.087, 0.068, 0.25), [0, -0.5, 0], undefined, fore)
    add('fabric', ring(0.073, 0.007), [0, -0.57, 0], FLAT, fore)
    add('ribbed', slab(0.03, 0.17, 0.08, 0.01), [s * 0.068, -0.48, 0], undefined, fore)
    add('metal', ring(0.072, 0.013), [0, -0.635, 0], FLAT, fore)
    add('shell', cyl(0.07, 0.06, 0.045), [0, -0.662, 0], undefined, fore)
    // Dark panel down the side of the body, under the arm.
    add('ribbed', slab(0.03, 0.3, 0.13, 0.012), [s * 0.212, 1.2, 0.01])
    // Glove: palm towards the leg, four fingers curled a little, thumb forward.
    add('rubber', slab(0.046, 0.1, 0.088, 0.016), [0, -0.728, 0], undefined, fore)
    for (let f = 0; f < 4; f++) add('rubber', new THREE.CapsuleGeometry(0.0115, 0.05, 3, 8), [-s * 0.008, -0.805, -0.033 + f * 0.022], [0, 0, -s * 0.25], fore)
    add('rubber', new THREE.CapsuleGeometry(0.013, 0.04, 3, 8), [0, -0.735, -0.058], [-0.8, 0, 0], fore)
    arms.push({ at: [s * 0.29, 1.45, 0], swing: s * 0.42, joint: -ELBOW, upper: merged(upper), lower: merged(fore) })
    // Strap from the chest pack over the shoulder.
    add('ribbed', slab(0.05, 0.17, 0.03, 0.01), [s * 0.105, 1.475, -0.165], [0.35, 0, 0])
    // Helmet side module with its ring.
    add('shell', cyl(0.05, 0.05, 0.035), [s * 0.172, 1.715, 0.01], SIDEWAYS)
    add('metal', ring(0.035, 0.008), [s * 0.192, 1.715, 0.01], [0, Math.PI / 2, 0])
    // Chest pack knob, and two suit connectors on that side of the belly.
    add('rubber', cyl(0.015, 0.015, 0.03), [s * 0.062, 1.335, -0.247], FORWARD)
    add('rubber', cyl(0.019, 0.019, 0.02), [s * 0.068, 1.18, -0.184], FORWARD)
    add('rubber', cyl(0.019, 0.019, 0.02), [s * 0.064, 1.07, -0.18], FORWARD)
  }

  // ---- Body: hips, belt, torso, shoulder yoke, chest pack.
  add('fabric', ball(0.17), [0, 0.95, 0], undefined, undefined, [1.32, 0.85, 0.96])
  add('ribbed', ring(0.2, 0.022), [0, 1.0, 0], FLAT, undefined, [1.14, 0.86, 1])
  add('fabric', new THREE.CapsuleGeometry(0.2, 0.26, 6, 22), [0, 1.24, 0], undefined, undefined, [1.15, 1, 0.88])
  // Folds across the belly.
  for (const y of [1.03, 1.125]) add('fabric', ring(0.203, 0.009), [0, y, 0], FLAT, undefined, [1.15, 0.88, 1])
  add('shell', slab(0.4, 0.1, 0.31, 0.045), [0, 1.5, 0])
  add('shell', slab(0.2, 0.13, 0.08, 0.02), [0, 1.36, -0.2])
  add('rubber', slab(0.1, 0.03, 0.012, 0.004), [0, 1.385, -0.241])

  // ---- Backpack (life support): hard case, grey service panel, vent.
  add('shell', slab(0.38, 0.5, 0.16, 0.05), [0, 1.27, 0.225])
  add('ribbed', slab(0.27, 0.16, 0.03, 0.01), [0, 1.1, 0.308])
  add('rubber', slab(0.2, 0.04, 0.02, 0.006), [0, 1.45, 0.305])
  add('shell', slab(0.2, 0.14, 0.1, 0.04), [0, 1.66, 0.14])

  // ---- Neck ring and helmet. On a sphere the front (-Z) is at 270 degrees round.
  add('shell', cyl(0.125, 0.15, 0.06), [0, 1.54, 0])
  add('metal', ring(0.127, 0.018), [0, 1.567, 0], FLAT)
  const head: V3 = [0, 1.715, 0]
  const front = Math.PI * 1.5
  add('shell', new THREE.SphereGeometry(0.168, 30, 22), head)
  add('visor', new THREE.SphereGeometry(0.1715, 26, 14, front - 1.05, 2.1, 0.95, 1.1), head)
  add('shell', new THREE.SphereGeometry(0.177, 26, 6, front - 1.18, 2.36, 0.6, 0.38), head) // brow shade
  add('shell', new THREE.SphereGeometry(0.177, 26, 5, front - 1.1, 2.2, 2.03, 0.34), head) // chin guard
  add('shell', slab(0.07, 0.03, 0.06, 0.01), [0, 1.868, -0.07])
  add('rubber', slab(0.04, 0.016, 0.012, 0.004), [0, 1.868, -0.102])

  return { body: merged(body), limbs: [...legs, ...arms] }
}

let shared: { suit: Suit; materials: Record<Look, THREE.MeshStandardMaterial> } | null = null

/** Short name that still fits over the helmet. */
export function crewLabel(name: string): string {
  const trimmed = name.trim() || 'Crew'
  return trimmed.length > 18 ? `${trimmed.slice(0, 17)}…` : trimmed
}

function nameTag(name: string): THREE.Object3D {
  const label = crewLabel(name)
  if (typeof document === 'undefined') {
    const holder = new THREE.Object3D()
    holder.name = label
    holder.position.y = TAG
    return holder
  }
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const g = canvas.getContext('2d')!
  g.font = '600 64px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineWidth = 12
  g.strokeStyle = 'rgba(8, 10, 16, 0.85)'
  g.strokeText(label, 256, 68, 480)
  g.fillStyle = '#f7f1e6'
  g.fillText(label, 256, 68, 480)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.position.y = TAG
  sprite.scale.set(1.7, 0.42, 1)
  sprite.name = label
  return sprite
}

/** The moving parts of one astronaut. `rest` is the limb's outward swing when standing. */
interface Rig {
  body: THREE.Group
  tag: THREE.Object3D
  limbs: { upper: THREE.Group; lower: THREE.Group; rest: number; leg: boolean }[]
}
const rigs = new WeakMap<THREE.Object3D, Rig>()
const TAG = 2.15
const HEAD = 1.715

/**
 * A standing astronaut, about 1.9 m, origin at the feet.
 * The visor faces local -Z, the same way the first-person camera looks when yaw is 0.
 */
export function createAstronaut(name: string): THREE.Group {
  const { suit, materials: looks } = (shared ??= { suit: shapes(), materials: materials() })
  const put = (parent: THREE.Group, geo: Geo) => {
    for (const look of LOOKS) {
      if (!geo[look]) continue
      const mesh = new THREE.Mesh(geo[look], looks[look])
      mesh.name = look
      parent.add(mesh)
    }
  }
  const crew = new THREE.Group()
  crew.name = crewLabel(name)
  const body = new THREE.Group()
  put(body, suit.body)
  const limbs = suit.limbs.map((limb, i) => {
    const upper = new THREE.Group()
    upper.position.set(...limb.at)
    upper.rotation.z = limb.swing
    put(upper, limb.upper)
    const lower = new THREE.Group()
    lower.position.y = limb.joint
    put(lower, limb.lower)
    upper.add(lower)
    body.add(upper)
    return { upper, lower, rest: limb.swing, leg: i < 2 }
  })
  const tag = nameTag(name)
  crew.add(body, tag)
  rigs.set(crew, { body, tag, limbs })
  return crew
}

/** Puts an astronaut from `createAstronaut` into a pose from `./motion`. The body turns about the hips. */
export function poseAstronaut(crew: THREE.Object3D, pose: Pose): void {
  const rig = rigs.get(crew)
  if (!rig) return
  const { body, tag } = rig
  body.rotation.set(-pose.pitch, 0, -pose.roll)
  body.position.set(0, -HIP, 0).applyEuler(body.rotation)
  body.position.x += pose.sway
  body.position.y += HIP + pose.lift
  body.position.z -= pose.slide // forwards is -Z
  // The name stays upright, over the helmet wherever the lean has taken it.
  tag.position.set(0, HEAD, 0).applyEuler(body.rotation).add(body.position)
  tag.position.y += TAG - HEAD
  rig.limbs.forEach(({ upper, lower, rest, leg }, i) => {
    const limb = (leg ? pose.legs : pose.arms)[i % 2]!
    upper.rotation.set(limb.swing, 0, rest + Math.sign(rest) * limb.spread)
    lower.rotation.x = leg ? -limb.bend : limb.bend
  })
}
