// A crew member for co-op: our own extravehicular suit, in the style of the white suits worn on spacewalks. Soft
// fabric arms and legs gathered at the shoulders, elbows, knees and ankles; a hard upper torso with a chest control
// unit; a life-support backpack; metal waist, neck, arm and wrist rings; gloves with fingers; boots; and a helmet with
// a clear bubble under a gold sun visor. Drawn in code, so it needs no model file and works offline.
// The whole suit is one shape shared by every astronaut, skinned to nine bones (body, and an upper and a lower bone
// for each arm and leg), so the fabric bends at the joints. One draw call per material: 6 an astronaut, plus the
// name above the helmet. `poseAstronaut` turns the bones; the angles come from `./motion`.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { HIP, THIGH, type Pose } from './motion'

/** One material each: suit cloth, hard shell, metal rings, gold visor, helmet bubble, and the leg stripes that tell crew apart. */
type Look = 'fabric' | 'hard' | 'metal' | 'visor' | 'glass' | 'stripe'
const LOOKS: Look[] = ['fabric', 'hard', 'metal', 'visor', 'glass', 'stripe']
type V3 = [number, number, number]
const TAU = Math.PI * 2
/** How many times the cloth picture repeats in a metre. */
const TILES = 3
const WHITE = 0xe9e8e3
const PATCH = 0xc6c7c3
const PAD = 0x7c8086
const DARK = 0x131518
const STEEL = 0xc3c6ca
/** Leg stripes, as on real suits: red for the first crew member out, none for the second, then our own colours. */
const STRIPES = [0xb3202a, WHITE, 0x1f4fa8, 0xd9861c]

/** A picture drawn on a canvas; null where there is no page (tests). */
function drawn(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')
  if (!g) return null
  draw(g, w, h)
  return new THREE.CanvasTexture(canvas)
}

interface Looks { suit: Record<Exclude<Look, 'stripe'>, THREE.MeshStandardMaterial>; stripes: THREE.MeshStandardMaterial[] }

function materials(): Looks {
  // The same numbers every time, so every player sees the same suit.
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  // Suit cloth, read as height: soft creases across the limb and a fine weave.
  const cloth = drawn(512, 512, (g, s) => {
    g.fillStyle = '#808080'
    g.fillRect(0, 0, s, s)
    g.lineCap = 'round'
    g.filter = 'blur(3px)'
    for (let i = 0; i < 60; i++) {
      const x = rnd() * s, y = rnd() * s, w = 60 + rnd() * 170, bend = (rnd() - 0.5) * 36, tilt = (rnd() - 0.5) * 50
      // Drawn at each edge too, so the picture repeats without a seam. A dark line with a light one under it is a fold.
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) for (const [shift, ink] of [[0, 'rgba(0, 0, 0, 0.3)'], [6, 'rgba(255, 255, 255, 0.28)']] as const) {
        g.strokeStyle = ink
        g.lineWidth = 6
        g.beginPath()
        g.moveTo(x + dx, y + dy + shift)
        g.quadraticCurveTo(x + dx + w / 2, y + dy + bend + shift, x + dx + w, y + dy + tilt + shift)
        g.stroke()
      }
    }
    g.filter = 'none'
    g.fillStyle = 'rgba(0, 0, 0, 0.14)'
    for (let i = 0; i < s; i += 4) {
      g.fillRect(i, 0, 1, s)
      g.fillRect(0, i, s, 1)
    }
  })
  if (cloth) {
    cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping
    cloth.anisotropy = 4
  }
  // What the gold visor mirrors: black sky, the bright curved edge of the Earth with its thin blue air, and the Sun.
  const sky = drawn(1024, 512, (g, w, h) => {
    g.fillStyle = '#010206'
    g.fillRect(0, 0, w, h)
    const horizon = h * 0.47
    const earth = g.createLinearGradient(0, horizon, 0, h)
    earth.addColorStop(0, '#eef6ff')
    earth.addColorStop(0.04, '#8cc0f6')
    earth.addColorStop(0.5, '#5590dc')
    earth.addColorStop(1, '#2c5fae')
    g.fillStyle = earth
    g.fillRect(0, horizon, w, h - horizon)
    for (let i = 0; i < 110; i++) {
      const x = rnd() * w, y = horizon + 8 + rnd() ** 1.6 * (h - horizon), r = 20 + rnd() * 70
      g.fillStyle = `rgba(255, 255, 255, ${0.25 + rnd() * 0.4})`
      for (const dx of [-w, 0, w]) {
        g.beginPath()
        g.ellipse(x + dx, y, r, r * (0.12 + rnd() * 0.16), 0, 0, TAU)
        g.fill()
      }
    }
    const air = g.createLinearGradient(0, horizon - h * 0.045, 0, horizon)
    air.addColorStop(0, 'rgba(70, 140, 255, 0)')
    air.addColorStop(1, 'rgba(200, 230, 255, 1)')
    g.fillStyle = air
    g.fillRect(0, horizon - h * 0.045, w, h * 0.045)
    const sun = g.createRadialGradient(w * 0.17, h * 0.27, 0, w * 0.17, h * 0.27, 70)
    sun.addColorStop(0, 'rgba(255, 255, 255, 1)')
    sun.addColorStop(0.18, 'rgba(255, 255, 255, 1)')
    sun.addColorStop(0.4, 'rgba(255, 244, 220, 0.25)')
    sun.addColorStop(1, 'rgba(255, 244, 220, 0)')
    g.fillStyle = sun
    g.fillRect(w * 0.17 - 70, h * 0.27 - 70, 140, 140)
  })
  if (sky) {
    sky.mapping = THREE.EquirectangularReflectionMapping
    sky.colorSpace = THREE.SRGBColorSpace
  }
  const named = (name: string, material: THREE.MeshStandardMaterial) => Object.assign(material, { name })
  // Both rooms are lit low and tone-mapped, and there true white cloth came out mid-grey (150 of 255). So the white
  // parts give back more light than they get, as a camera exposed for the suit would show them.
  const bright = new THREE.Color().setScalar(1.7)
  const woven = { roughness: 0.92, bumpMap: cloth, bumpScale: 1.2 }
  return {
    suit: {
      fabric: named('fabric', new THREE.MeshStandardMaterial({ color: bright, vertexColors: true, ...woven })),
      hard: named('hard', new THREE.MeshStandardMaterial({ color: bright, vertexColors: true, roughness: 0.45 })),
      metal: named('metal', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.85 })),
      // A little of its own bronze, so the half that mirrors black sky still reads as gold.
      visor: named('visor', new THREE.MeshStandardMaterial({ color: 0xf2b655, roughness: 0.06, metalness: 1, envMap: sky, envMapIntensity: 1.2, emissive: 0x241503 })),
      glass: named('glass', new THREE.MeshStandardMaterial({ color: 0xcfdde2, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false, envMap: sky, envMapIntensity: 0.8 })),
    },
    stripes: STRIPES.map((color) => named('stripe', new THREE.MeshStandardMaterial({ color, ...woven }))),
  }
}

const cyl = (top: number, bottom: number, height: number) => new THREE.CylinderGeometry(top, bottom, height, 16, 1)
const slab = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, r)
const SIDEWAYS: V3 = [0, 0, Math.PI / 2]
const FORWARD: V3 = [Math.PI / 2, 0, 0]
const ZERO: V3 = [0, 0, 0]

/** Repeats the cloth picture `u` by `v` times over a stock shape; 0, 0 leaves it smooth. */
function tiled<T extends THREE.BufferGeometry>(shape: T, u = 0, v = 0): T {
  const uv = shape.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v)
  return shape
}

/** Smooth curves through rows of [height, ...values], top row first: the values at any height. */
const along = (keys: number[][]) => (y: number): number[] => {
  let i = 1
  while (i < keys.length - 1 && y < keys[i]![0]!) i++
  const a = keys[i - 1]!, b = keys[i]!
  const t = Math.min(1, Math.max(0, (a[0]! - y) / (a[0]! - b[0]!)))
  const k = t * t * (3 - 2 * t)
  return a.map((value, n) => value + (b[n]! - value) * k)
}

/** One cross-section of a skin: its height, half-widths, centre, and how square it is (2 is an ellipse). */
interface Ring { y: number; rx: number; rz: number; x?: number; z?: number; p?: number }

/** A skin stretched over cross-sections, top one first. `fold` swells (+) or pinches (-) it at a height and angle round. */
function loft(rings: Ring[], segs: number, fold?: (y: number, a: number) => number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], index: number[] = []
  const girth = (rings.reduce((sum, r) => sum + r.rx + r.rz, 0) / (2 * rings.length)) * TAU
  const wraps = Math.max(1, Math.round(girth * TILES))
  const row = segs + 1
  rings.forEach((ring, i) => {
    const e = 2 / (ring.p ?? 2)
    for (let j = 0; j <= segs; j++) {
      // The seam (angle 0) is at the back, +Z.
      const a = (j / segs) * TAU, sin = Math.sin(a), cos = Math.cos(a), k = 1 + (fold?.(ring.y, a) ?? 0)
      pos.push((ring.x ?? 0) + ring.rx * k * Math.sign(sin) * Math.abs(sin) ** e, ring.y, (ring.z ?? 0) + ring.rz * k * Math.sign(cos) * Math.abs(cos) ** e)
      uv.push((j / segs) * wraps, ring.y * TILES)
      if (i && j) {
        const at = i * row + j
        index.push(at - row - 1, at - 1, at - row, at - row, at - 1, at)
      }
    }
  })
  const shape = new THREE.BufferGeometry()
  shape.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  shape.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  shape.setIndex(index)
  shape.computeVertexNormals()
  // The first and last column are the same place: one normal for both, so no seam shows.
  const normal = shape.getAttribute('normal')
  const n = new THREE.Vector3()
  for (let i = 0; i < rings.length; i++) {
    const a = i * row, b = a + segs
    n.set(normal.getX(a) + normal.getX(b), normal.getY(a) + normal.getY(b), normal.getZ(a) + normal.getZ(b)).normalize()
    normal.setXYZ(a, n.x, n.y, n.z)
    normal.setXYZ(b, n.x, n.y, n.z)
  }
  return shape
}

/** A sleeve or trouser leg from `top` down to `bottom`, `radius(y)` thick, gathered into folds: [height, half-length, depth] each. */
function tube(radius: (y: number) => number, top: number, bottom: number, folds: V3[]): THREE.BufferGeometry {
  const rings: Ring[] = []
  const gathered = (y: number) => folds.some(([at, half]) => Math.abs(y - at) < half)
  for (let y = top; y > bottom + 0.004; y -= gathered(y) ? 0.007 : 0.024) rings.push({ y, rx: radius(y), rz: radius(y) })
  rings.push({ y: bottom, rx: radius(bottom), rz: radius(bottom) })
  // Rolls of cloth with a sharp crease between them, wandering a little round the limb as hand-gathered cloth does.
  return loft(rings, 18, (y, a) => folds.reduce((sum, [at, half, deep]) => {
    const d = Math.abs(y - at) / half
    return d < 1 ? sum + deep * (1 - d * d) ** 2 * (Math.abs(Math.sin((y * Math.PI) / 0.032 + 1.2 * Math.sin(a + at * 9))) - 0.55) : sum
  }, 0))
}

/** A ring round the body or a limb at height `y`: a band `tall` high that stands `proud` of the half-widths given. */
const band = (y: number, rx: number, rz: number, tall: number, proud: number, p = 2) =>
  loft([[0.5, 0], [0.3, 0.75], [0, 1], [-0.3, 0.75], [-0.5, 0]].map(([h, out]) => ({ y: y + h! * tall, rx: rx + out! * proud, rz: rz + out! * proud, p })), 24)

/** Legs first, then arms; within each the -X side first. Each hangs from `at`, swung outwards by `swing` radians, with its joint `joint` down its length. */
const ELBOW = 0.345
const LIMBS: { at: V3; swing: number; joint: number }[] = [
  ...[-1, 1].map((s) => ({ at: [s * 0.125, HIP, 0] as V3, swing: s * 0.06, joint: THIGH })),
  ...[-1, 1].map((s) => ({ at: [s * 0.29, 1.45, 0] as V3, swing: s * 0.3, joint: ELBOW })),
]
/** The lowest point of the boot, from the hip: `./motion` stands the astronaut on it. */
const SOLE = -HIP - 0.0005
/** Where a shape hangs: its resting place, and `weigh`, which writes the bones that carry a point at height `y` and their shares at `at`. */
interface Hang { rest: THREE.Matrix4; weigh(y: number, bones: Uint16Array, shares: Float32Array, at: number): void }
const stiff = (bone: number): Hang['weigh'] => (_y, bones, shares, at) => {
  bones[at] = bone
  shares[at] = 1
}
const ease = (v: number) => {
  const x = Math.min(1, Math.max(0, v))
  return x * x * (3 - 2 * x)
}

/**
 * Every shape of the suit in one geometry: a group per material, each point tied to the bones that move it.
 * Bone 0 is the body; limb i has bones 1 + 2i (upper) and 2 + 2i (lower). Front is -Z, up is +Y, feet at y = 0.
 */
function shapes(): THREE.BufferGeometry {
  const lists: Record<Look, THREE.BufferGeometry[]> = { fabric: [], hard: [], metal: [], visor: [], glass: [], stripe: [] }
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const c = new THREE.Color()
  const body: Hang = { rest: new THREE.Matrix4(), weigh: stiff(0) }
  /** The three ways to hang a shape on limb i. Shapes are given in the limb's own frame: from its pivot, straight down. */
  const limb = (i: number) => {
    const { at, swing, joint } = LIMBS[i]!
    const rest = new THREE.Matrix4().makeRotationZ(swing).setPosition(...at)
    const upper = 1 + 2 * i, lower = 2 + 2 * i
    return {
      upper: { rest, weigh: stiff(upper) },
      lower: { rest, weigh: stiff(lower) },
      // Cloth: shared with the body near the pivot and between the two bones round the joint, so it bends, not hinges.
      soft: {
        rest,
        weigh: (y, bones, shares, at) => {
          const high = y > -0.12
          const share = high ? 0.75 * ease((y + 0.12) / 0.14) : ease((0.07 - joint - y) / 0.14)
          bones[at] = upper
          bones[at + 1] = high ? 0 : lower
          shares[at] = 1 - share
          shares[at + 1] = share
        },
      } satisfies Hang,
    }
  }
  /** Adds a shape: scaled, turned (radians) and moved, in the body's frame or in the frame of the limb it hangs on. */
  const add = (look: Look, shape: THREE.BufferGeometry, colour: number, at: V3, turn: V3 = ZERO, hang: Hang = body, scale: V3 = [1, 1, 1]) => {
    const flat = shape.index ? shape.toNonIndexed() : shape // merging needs every shape in the same form
    flat.applyMatrix4(m.compose(new THREE.Vector3(...at), q.setFromEuler(e.set(...turn)), new THREE.Vector3(...scale)))
    const position = flat.getAttribute('position')
    const colours = new Float32Array(position.count * 3)
    const bones = new Uint16Array(position.count * 4)
    const weights = new Float32Array(position.count * 4)
    c.setHex(colour)
    for (let i = 0; i < position.count; i++) {
      hang.weigh(position.getY(i), bones, weights, i * 4)
      colours[i * 3] = c.r
      colours[i * 3 + 1] = c.g
      colours[i * 3 + 2] = c.b
    }
    flat.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    flat.setAttribute('skinIndex', new THREE.BufferAttribute(bones, 4))
    flat.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4))
    lists[look].push(flat.applyMatrix4(hang.rest))
  }

  for (const s of [-1, 1]) {
    const side = s < 0 ? 0 : 1

    // ---- Leg: one trouser leg gathered at the hip, knee and ankle, with the stripe above the knee.
    const leg = limb(side)
    const legCurve = along([[0.05, 0.118], [-0.06, 0.136], [-0.2, 0.13], [-0.36, 0.112], [-THIGH, 0.115], [-0.5, 0.108], [-0.62, 0.11], [-0.74, 0.096], [-0.815, 0.1]])
    const legR = (y: number) => legCurve(y)[1]!
    add('fabric', tube(legR, 0.05, -0.815, [[-0.1, 0.05, 0.035], [-THIGH, 0.085, 0.11], [-0.77, 0.04, 0.08]]), WHITE, ZERO, ZERO, leg.soft)
    add('stripe', loft([-0.262, -0.29, -0.318].map((y) => ({ y, rx: legR(y) + 0.004, rz: legR(y) + 0.004 })), 18), WHITE, ZERO, ZERO, leg.soft)
    add('fabric', band(-0.8, 0.094, 0.094, 0.045, 0.014), WHITE, ZERO, ZERO, leg.lower)
    // ---- Boot, lying along the foot from the heel (top row) to the toe: [along, half-width, height]. A grey sole under it.
    const boot = along([[0, 0.002, 0.06], [-0.01, 0.055, 0.11], [-0.05, 0.08, 0.15], [-0.15, 0.09, 0.15], [-0.2, 0.094, 0.125], [-0.26, 0.096, 0.1], [-0.32, 0.086, 0.085], [-0.352, 0.06, 0.065], [-0.3625, 0.002, 0.035]])
    const steps = Array.from({ length: 25 }, (_, i) => (-0.3625 * i) / 24)
    const heel: V3 = [0, SOLE, 0.1225]
    add('fabric', loft(steps.map((y) => ({ y, rx: boot(y)[1]!, rz: boot(y)[2]! / 2, z: -0.03 - boot(y)[2]! / 2, p: 2.6 })), 16), WHITE, heel, FORWARD, leg.lower)
    add('fabric', tiled(loft(steps.map((y) => ({ y, rx: boot(y)[1]! + 0.005, rz: 0.019, z: -0.019, p: 4 })), 16)), PAD, heel, FORWARD, leg.lower)

    // ---- Arm: shoulder cap on the body, a sleeve gathered at the shoulder and elbow, arm and wrist rings, glove.
    const arm = limb(2 + side)
    const armCurve = along([[0.04, 0.085], [-0.05, 0.1], [-0.17, 0.094], [-0.29, 0.084], [-ELBOW, 0.088], [-0.42, 0.082], [-0.53, 0.072], [-0.615, 0.062]])
    const armR = (y: number) => armCurve(y)[1]!
    add('fabric', tiled(new THREE.SphereGeometry(0.114, 20, 14), 2, 1), WHITE, [s * 0.272, 1.455, 0])
    add('fabric', tube(armR, 0.04, -0.615, [[-0.06, 0.06, 0.09], [-ELBOW, 0.075, 0.12]]), WHITE, ZERO, ZERO, arm.soft)
    add('metal', band(-0.225, 0.087, 0.087, 0.022, 0.008), STEEL, ZERO, ZERO, arm.upper)
    add('metal', band(-0.622, 0.056, 0.056, 0.034, 0.012), STEEL, ZERO, ZERO, arm.lower)
    // Glove: cuff, palm towards the leg with a grey grip pad, four fingers curled a little, thumb forward; grey fingertips.
    add('fabric', tiled(cyl(0.054, 0.046, 0.06), 1, 0.2), WHITE, [0, -0.668, 0], ZERO, arm.lower, [0.82, 1, 1])
    add('fabric', tiled(slab(0.048, 0.1, 0.092, 0.02), 0.3, 0.3), WHITE, [0, -0.74, 0], ZERO, arm.lower)
    add('fabric', tiled(slab(0.012, 0.075, 0.07, 0.005)), PAD, [-s * 0.021, -0.742, 0], ZERO, arm.lower)
    const digit = (x: number, y: number, z: number, parts: [V3, number][]) => {
      parts.forEach(([turn, length], i) => {
        const dx = Math.sin(turn[2]) * length, dy = -Math.cos(turn[2]) * Math.cos(turn[0]) * length, dz = -Math.sin(turn[0]) * length
        add('fabric', tiled(new THREE.CapsuleGeometry(0.0118, length, 2, 6)), i ? PAD : WHITE, [x + dx / 2, y + dy / 2, z + dz / 2], turn, arm.lower)
        x += dx
        y += dy
        z += dz
      })
    }
    for (let f = 0; f < 4; f++) digit(-s * 0.004, -0.782, -0.034 + f * 0.0225, [[[0, 0, -s * 0.3], 0.038], [[0, 0, -s * 0.95], 0.03]])
    digit(-s * 0.006, -0.712, -0.04, [[[0.9, 0, 0], 0.036], [[0.4, 0, 0], 0.03]])

    // ---- Helmet side: the visor's pivot, a lamp bar with two lamps above it.
    add('hard', cyl(0.052, 0.052, 0.03), WHITE, [s * 0.178, HEAD - 0.005, 0.012], SIDEWAYS)
    add('hard', slab(0.036, 0.052, 0.075, 0.01), PATCH, [s * 0.176, HEAD + 0.085, -0.035])
    for (const y of [0.073, 0.098]) add('hard', cyl(0.0105, 0.0105, 0.01), 0xf6f2e2, [s * 0.176, HEAD + y, -0.074], FORWARD)
    // A service port low on the backpack.
    add('hard', cyl(0.022, 0.022, 0.012), DARK, [s * 0.15, 1.21, 0.342], FORWARD)
    // Chest unit knob.
    add('hard', cyl(0.017, 0.017, 0.018), DARK, [s * 0.105, 1.283, -0.283], FORWARD)
  }

  // ---- Body: brief, waist ring, hard upper torso (squarer, under the same cloth). Rows are [height, half-width, half-depth].
  const skin = (keys: number[][], count: number, p: number) => {
    const at = along(keys)
    const top = keys[0]![0]!, bottom = keys[keys.length - 1]![0]!
    return loft(Array.from({ length: count + 1 }, (_, i) => top + ((bottom - top) * i) / count).map((y) => ({ y, rx: at(y)[1]!, rz: at(y)[2]!, p })), 28)
  }
  add('fabric', skin([[1.1, 0.2, 0.158], [1.02, 0.225, 0.17], [0.95, 0.236, 0.172], [0.89, 0.21, 0.15], [0.845, 0.13, 0.11], [0.825, 0.002, 0.002]], 14, 2.4), WHITE, ZERO)
  add('fabric', skin([[1.59, 0.12, 0.11], [1.565, 0.2, 0.15], [1.52, 0.238, 0.172], [1.44, 0.246, 0.182], [1.33, 0.24, 0.186], [1.2, 0.226, 0.178], [1.085, 0.204, 0.16]], 20, 3.4), WHITE, ZERO)
  add('metal', band(1.09, 0.205, 0.161, 0.034, 0.012, 3), STEEL, ZERO)
  // ---- Chest control unit: a display, four switches, a knob each side.
  add('fabric', tiled(slab(0.3, 0.17, 0.13, 0.022), 0.9, 0.5), WHITE, [0, 1.31, -0.215])
  add('hard', slab(0.12, 0.034, 0.008, 0.003), 0x1c2a25, [0, 1.347, -0.28])
  for (let i = 0; i < 4; i++) add('metal', cyl(0.005, 0.005, 0.022), STEEL, [-0.036 + i * 0.024, 1.283, -0.285], FORWARD)

  // ---- Backpack (life support): the main pack, the reserve pack under it, a raised panel, a hump on top.
  add('fabric', tiled(slab(0.47, 0.52, 0.18, 0.03), 1.5, 1.6), WHITE, [0, 1.4, 0.25])
  add('fabric', tiled(slab(0.47, 0.2, 0.17, 0.025), 1.5, 0.6), WHITE, [0, 1.03, 0.247])
  add('fabric', tiled(slab(0.3, 0.3, 0.014, 0.005), 0.9, 0.9), PATCH, [0, 1.43, 0.342])
  add('fabric', tiled(slab(0.3, 0.06, 0.12, 0.02), 0.9, 0.3), PATCH, [0, 1.68, 0.245])

  // ---- Neck ring and helmet: a dark inside, the clear bubble, the gold visor over its front, and a white shell over
  // the top and back with a rim along the brow. On a sphere the front (-Z) is at 270 degrees round.
  add('metal', band(1.585, 0.14, 0.144, 0.034, 0.012), STEEL, ZERO)
  const head: V3 = [0, HEAD, 0]
  const front = Math.PI * 1.5
  const long: V3 = [1, 1, 1.06]
  add('hard', new THREE.SphereGeometry(0.148, 20, 14), DARK, head, ZERO, body, long)
  add('glass', new THREE.SphereGeometry(0.162, 28, 18), WHITE, head, ZERO, body, long)
  add('visor', new THREE.SphereGeometry(0.173, 28, 16, front - 1.2, 2.4, 0.5, 1.5), WHITE, head, ZERO, body, long)
  add('hard', new THREE.SphereGeometry(0.182, 32, 6, 0, TAU, 0, 0.62), WHITE, head, ZERO, body, long)
  add('hard', new THREE.SphereGeometry(0.182, 24, 12, front + 1.28, TAU - 2.56, 0.62, 1.5), WHITE, head, ZERO, body, long)
  add('hard', new THREE.TorusGeometry(0.106, 0.009, 6, 24, 2.56), WHITE, [0, HEAD + 0.148, 0], [Math.PI / 2, 0, -Math.PI / 2 - 1.28], body, [1.03, 1.03, 1])
  // A camera on top, to one side.
  add('hard', slab(0.04, 0.034, 0.07, 0.008), PATCH, [0.09, HEAD + 0.172, -0.02])
  add('hard', cyl(0.012, 0.012, 0.012), DARK, [0.09, HEAD + 0.172, -0.058], FORWARD)

  return mergeGeometries(LOOKS.map((look) => mergeGeometries(lists[look])), true)
}

let shared: { geometry: THREE.BufferGeometry; looks: Looks } | null = null

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
  body: THREE.Object3D
  tag: THREE.Object3D
  limbs: { upper: THREE.Object3D; lower: THREE.Object3D; rest: number; leg: boolean }[]
}
const rigs = new WeakMap<THREE.Object3D, Rig>()
const TAG = 2.15
const HEAD = 1.735
/** Wide enough for any pose, so a limb reaching into view is never culled with the rest. */
const REACH = new THREE.Sphere(new THREE.Vector3(0, 1.1, 0), 1.9)

/**
 * A standing astronaut, about 1.9 m, origin at the feet. `stripe` picks the colour of the leg stripes.
 * The visor faces local -Z, the same way the first-person camera looks when yaw is 0.
 */
export function createAstronaut(name: string, stripe = 0): THREE.Group {
  const { geometry, looks } = (shared ??= { geometry: shapes(), looks: materials() })
  const crew = new THREE.Group()
  crew.name = crewLabel(name)
  const body = new THREE.Bone()
  const bones = [body]
  const limbs = LIMBS.map((limb, i) => {
    const upper = new THREE.Bone()
    upper.position.set(...limb.at)
    upper.rotation.z = limb.swing
    const lower = new THREE.Bone()
    lower.position.y = -limb.joint
    upper.add(lower)
    body.add(upper)
    bones.push(upper, lower)
    return { upper, lower, rest: limb.swing, leg: i < 2 }
  })
  const suit = new THREE.SkinnedMesh(geometry, LOOKS.map((look) => (look === 'stripe' ? looks.stripes[stripe % looks.stripes.length]! : looks.suit[look])))
  suit.boundingSphere = REACH
  const tag = nameTag(name)
  crew.add(body, suit, tag)
  crew.updateMatrixWorld(true) // the bones must be in place before the suit is tied to them
  suit.bind(new THREE.Skeleton(bones))
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
