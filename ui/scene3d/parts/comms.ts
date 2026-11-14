// Radios. All mount on the zenith deck at y = 0 and point up (+y). Each sets userData.anchor:
// where its radio beam starts, in the group's own coordinates.
// UHF: four tape-measure whips (turnstile). S-band: a flat patch. X-band: a horn on its transmitter.
// Dishes: a gimballed relay dish, a fixed deep-space dish with a low-gain antenna, a big Mars dish.
import * as THREE from 'three'
import { aim, box, cyl, dishGeometry, mats, partGroup, put, strut } from './kit'
import { dishDiameter, linkEffort, type Mount } from './layout'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function turnstile(g: THREE.Group, s: number, foot: number) {
  const m = mats()
  // A quarter wave at 437 MHz is 17 cm; on a big bus it is drawn a little larger so it stays visible.
  const len = Math.max(0.17, 0.12 * s)
  const b = Math.min(clamp(0.09, 0.06 * s, 0.3), foot * 0.8)
  put(g, box(b * 1.08, b * 0.06, b * 1.08), m.alu, 0, b * 0.03, 0)
  put(g, box(b, b * 0.05, b), m.pcb, 0, b * 0.085, 0)
  put(g, box(b * 0.3, b * 0.06, b * 0.3), m.aluDark, 0, b * 0.14, 0)
  const tape = box(len * 0.05, len, len * 0.006).translate(0, len / 2, 0)
  for (const a of [-1, 1]) for (const c of [-1, 1]) {
    put(g, box(b * 0.16, b * 0.1, b * 0.16), m.alu, a * b * 0.42, b * 0.13, c * b * 0.42)
    const t = aim(put(g, tape, m.tape, a * b * 0.42, b * 0.17, c * b * 0.42), V(a, 0.3, c))
    t.rotateY(Math.PI / 4)
  }
  g.userData.anchor = V(0, b * 0.15, 0)
}

function patch(g: THREE.Group, s: number, foot: number) {
  const m = mats()
  const a = Math.min(Math.max(0.09, 0.05 * s), foot * 0.6)
  put(g, box(1.3 * a, 0.1 * a, 1.3 * a), m.alu, 0, 0.05 * a, 0)
  put(g, box(a, 0.08 * a, a), m.ceramic, 0, 0.14 * a, 0)
  // The copper square is the antenna; its two cut corners make the signal circularly polarised.
  put(g, cyl(0.46 * a, 0.46 * a, 0.014 * a, 4), m.copper, 0, 0.187 * a, 0, 0, Math.PI / 4).scale.set(1, 1, 0.86)
  put(g, cyl(0.035 * a, 0.035 * a, 0.03 * a, 8), m.gold, 0.12 * a, 0.2 * a, 0.08 * a)
  put(g, cyl(0.06 * a, 0.06 * a, 0.22 * a, 10), m.gold, 0.74 * a, 0.05 * a, 0, 0, 0, Math.PI / 2)
  for (const x of [-1, 1]) for (const z of [-1, 1]) put(g, cyl(0.035 * a, 0.035 * a, 0.03 * a, 6), m.steel, x * 0.57 * a, 0.105 * a, z * 0.57 * a)
  g.userData.anchor = V(0, 0.2 * a, 0)
}

function horn(g: THREE.Group, effort: number, s: number, foot: number) {
  const m = mats()
  const a = Math.min(Math.max(clamp(0.03 * (effort - 15.5), 0.1, 0.3), 0.06 * s), foot * 0.6)
  // Transmitter box with cooling fins: a fast radio runs hot.
  put(g, box(1.5 * a, 0.5 * a, 1.2 * a), m.aluDark, 0, 0.25 * a, 0)
  for (let i = 0; i < 6; i++) put(g, box(0.12 * a, 0.42 * a, 0.03 * a), m.alu, 0.8 * a, 0.25 * a, (i - 2.5) * 0.2 * a)
  put(g, cyl(0.16 * a, 0.16 * a, 0.3 * a, 12), m.alu, 0, 0.65 * a, 0)
  const h = new THREE.Group()
  h.position.y = 0.8 * a
  h.rotation.x = 0.3
  g.add(h)
  put(h, cyl(0.5 * a, 0.16 * a, 0.8 * a, 24, true), m.gold, 0, 0.4 * a, 0)
  put(h, cyl(0.16 * a, 0.16 * a, 0.01 * a, 12), m.black, 0, 0.02 * a, 0)
  for (const [y, r] of [[0.28, 0.275], [0.54, 0.4], [0.8, 0.5]] as const) put(h, new THREE.TorusGeometry(r * a, 0.022 * a, 6, 24), m.gold, 0, y * a, 0, Math.PI / 2)
  g.userData.anchor = V(0, 0.8 * a + 0.76 * a, 0.24 * a)
}

interface DishStyle { tilt: number; cassegrain: boolean; gimbal: boolean; ribs: number; grey?: boolean; lowGain?: boolean; amps?: boolean }

function dish(g: THREE.Group, d: number, foot: number, o: DishStyle) {
  const m = mats()
  const R = d / 2
  const f = 0.36 * d
  const depth = (R * R) / (4 * f)
  const hub = 0.1 * d
  // High enough that the tilted rim never dips below the deck.
  const pivot = R * Math.sin(o.tilt) + (o.gimbal ? 0.16 * d : 0.1 * d)
  if (o.gimbal) {
    put(g, cyl(0.09 * d, 0.1 * d, 0.05 * d, 16), m.aluDark, 0, 0.025 * d, 0)
    put(g, cyl(0.035 * d, 0.045 * d, pivot - 0.05 * d, 12), m.alu, 0, pivot / 2 + 0.025 * d, 0)
    put(g, cyl(0.055 * d, 0.055 * d, 0.24 * d, 14), m.aluDark, 0, pivot, 0, 0, 0, Math.PI / 2)
  } else {
    put(g, box(0.34 * d, 0.1 * d, 0.24 * d), m.goldMLI, 0, 0.05 * d, 0)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5
      const r = Math.min(0.36 * d, 0.42 * foot)
      strut(g, V(Math.sin(a) * r, 0.03 * d, Math.cos(a) * r), V(Math.sin(a) * 0.08 * d, pivot, Math.cos(a) * 0.08 * d), 0.014 * d, m.alu)
    }
  }
  const head = new THREE.Group()
  head.position.y = pivot
  // Tilted toward the Sun side: from deep space, Earth is always near the Sun in the sky.
  head.rotation.x = o.tilt
  g.add(head)
  put(head, cyl(0.13 * d, 0.07 * d, hub, 16), m.aluDark, 0, hub / 2, 0)
  put(head, dishGeometry(R, f), o.grey ? m.greyDouble : m.whiteDouble, 0, hub, 0)
  put(head, new THREE.TorusGeometry(R, (o.amps ? 0.018 : 0.012) * d, 6, 40), o.amps ? m.gold : m.alu, 0, hub + depth, 0, Math.PI / 2)
  // Stiffening ribs behind the reflector.
  // A straight rib under a curved dish: it follows the tangent at half radius, a quarter of the depth below the vertex.
  const rib = box(0.012 * d, 0.05 * d, R * 0.82).translate(0, -depth / 4 - 0.032 * d, R * 0.52)
  for (let i = 0; i < o.ribs; i++) {
    const r = new THREE.Group()
    r.position.y = hub
    r.rotation.y = (i / o.ribs) * Math.PI * 2
    head.add(r)
    put(r, rib, m.aluDark).rotation.x = -Math.atan2(depth, R)
  }
  // The Mars dish wears a gold blanket on its back, against the cold of deep space.
  if (o.amps) put(head, dishGeometry(R * 0.99, f), m.goldDouble, 0, hub - 0.006 * d, 0)
  if (o.amps) for (const a of [-1, 1]) put(head, box(0.14 * d, 0.07 * d, 0.2 * d), m.goldMLI, a * 0.2 * d, hub * 0.2, 0)
  const top = o.cassegrain ? hub + f * 0.78 : hub + f
  if (o.cassegrain) {
    // Cassegrain: the big dish focuses onto a small mirror, which bounces the beam into the feed cone at the centre.
    put(head, cyl(0.025 * d, 0.06 * d, 0.2 * d, 14), m.gold, 0, hub + 0.1 * d, 0)
    put(head, cyl(0.085 * d, 0.1 * d, 0.02 * d, 20), m.whiteDouble, 0, top, 0)
  } else {
    put(head, cyl(0.04 * d, 0.05 * d, 0.1 * d, 14), m.aluDark, 0, top - 0.02 * d, 0)
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const r = R * (o.cassegrain ? 0.72 : 0.92)
    strut(head, V(Math.sin(a) * r, hub + (r * r) / (4 * f), Math.cos(a) * r), V(Math.sin(a) * 0.07 * d, top, Math.cos(a) * 0.07 * d), 0.008 * d, m.alu)
  }
  if (o.lowGain) {
    // Low-gain antenna: slow, but it works whichever way the spacecraft points.
    put(head, cyl(0.012 * d, 0.012 * d, 0.14 * d, 8), m.alu, 0, top + 0.08 * d, 0)
    put(head, cyl(0.045 * d, 0.02 * d, 0.07 * d, 12), m.gold, 0, top + 0.18 * d, 0)
  }
  head.updateMatrix()
  g.userData.anchor = V(0, top, 0).applyMatrix4(head.matrix)
}

/** The antenna for a comms mount. `bus` is the host bus size in meters. */
export function buildComms(mount: Mount, [bx, by, bz]: [number, number, number]): THREE.Group {
  const g = partGroup('comms', mount.id)
  const s = Math.max(bx, by, bz)
  const foot = Math.min(bx, bz)
  const d = Math.min(dishDiameter(mount.entity), 2 * s)
  if (mount.key === 'turnstile') turnstile(g, s, foot)
  else if (mount.key === 'horn') horn(g, linkEffort(mount.entity), s, foot)
  else if (mount.key === 'dish-gimbal') dish(g, d, foot, { tilt: 0.45, cassegrain: true, gimbal: true, ribs: 8 })
  else if (mount.key === 'dish-fixed') dish(g, d * 0.85, foot, { tilt: 0, cassegrain: false, gimbal: false, ribs: 6, grey: true, lowGain: true })
  else if (mount.key === 'dish-deep') dish(g, d, foot, { tilt: 0.5, cassegrain: true, gimbal: true, ribs: 12, lowGain: true, amps: true })
  else patch(g, s, foot)
  return g
}
