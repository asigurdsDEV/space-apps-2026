// Radios, each modelled on real flight hardware (REFERENCES.md). All mount on the zenith deck at y = 0 and
// point up (+y). Each sets userData.anchor: where its radio beam starts, in the group's own coordinates.
//   UHF: four quarter-wave tape antennas (turnstile) · S-band: a patch · X-band: MarCO's flat reflectarray
//   dishes: LRO's 75 cm Ka-band dish on two gimbals, Mars Odyssey's 1.3 m dish with its horn, MRO's 3 m dish.
import * as THREE from 'three'
import { aim, box, cyl, dishGeometry, groupBox, mats, partGroup, put, strut } from './kit'
import { dishDiameter, type Mount } from './layout'
import { ANTENNA } from './references'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function turnstile(g: THREE.Group, foot: number) {
  const m = mats()
  // Real size: a quarter wave at 437 MHz is 17 cm, on a board that fits a 10 cm CubeSat face.
  const len = ANTENNA.uhfTape
  const b = Math.min(ANTENNA.uhfBoard, foot * 0.9)
  put(g, box(b, b * 0.07, b), m.alu, 0, b * 0.035, 0)
  put(g, box(b * 0.94, b * 0.016, b * 0.94), m.pcb, 0, b * 0.078, 0)
  put(g, box(b * 0.3, b * 0.06, b * 0.3), m.aluDark, 0, b * 0.116, 0)
  put(g, cyl(b * 0.03, b * 0.03, b * 0.08, 8), m.gold, b * 0.3, b * 0.12, 0)
  const tape = box(0.006, len, 0.0004).translate(0, len / 2, 0)
  for (const a of [-1, 1]) for (const c of [-1, 1]) {
    // Each tape was wound in its corner housing and sprang out when a burn wire let go.
    put(g, box(b * 0.16, b * 0.1, b * 0.16), m.aluDark, a * b * 0.4, b * 0.12, c * b * 0.4)
    aim(put(g, tape, m.tape, a * b * 0.4, b * 0.16, c * b * 0.4), V(a, 0.3, c)).rotateY(Math.PI / 4)
  }
  g.userData.anchor = V(0, b * 0.15, 0)
}

function patch(g: THREE.Group, foot: number) {
  const m = mats()
  // Real size: an S-band patch is 7 cm across.
  const a = Math.min(ANTENNA.patch, foot * 0.6)
  put(g, box(1.3 * a, 0.1 * a, 1.3 * a), m.alu, 0, 0.05 * a, 0)
  put(g, box(a, 0.08 * a, a), m.ceramic, 0, 0.14 * a, 0)
  // The copper square is the antenna; its two cut corners make the signal circularly polarised.
  put(g, cyl(0.46 * a, 0.46 * a, 0.014 * a, 4), m.copper, 0, 0.187 * a, 0, 0, Math.PI / 4).scale.set(1, 1, 0.86)
  put(g, cyl(0.035 * a, 0.035 * a, 0.03 * a, 8), m.gold, 0.12 * a, 0.2 * a, 0.08 * a)
  put(g, cyl(0.06 * a, 0.06 * a, 0.22 * a, 10), m.gold, 0.74 * a, 0.05 * a, 0, 0, 0, Math.PI / 2)
  for (const x of [-1, 1]) for (const z of [-1, 1]) put(g, cyl(0.035 * a, 0.035 * a, 0.03 * a, 6), m.steel, x * 0.57 * a, 0.105 * a, z * 0.57 * a)
  g.userData.anchor = V(0, 0.2 * a, 0)
}

/** MarCO: the Iris radio, and a flat three-panel reflectarray that a small feed lights from the front. */
function reflectarray(g: THREE.Group, foot: number) {
  const m = mats()
  const [w, h] = ANTENNA.reflectarray
  const hz = Math.min(0.05, foot * 0.45)
  const b = Math.min(ANTENNA.iris[0], foot * 0.8)
  // The radio: "softball-size", with its coax connectors.
  put(g, box(b, 0.03, b), m.aluDark, 0, 0.015, 0)
  for (const x of [-0.3, 0, 0.3]) put(g, cyl(0.004, 0.004, 0.012, 8), m.gold, x * b, 0.036, 0.3 * b)
  // The panel leans back so the reflected beam leaves along the feed side.
  const lean = 0.4
  const panel = new THREE.Group()
  panel.position.set(0, 0.02, -hz)
  panel.rotation.x = -lean
  g.add(panel)
  const pw = w / 3
  const leaf = groupBox(box(pw - 0.003, h, 0.004), [0, 0, 0, 0, 1, 2])
  for (let i = -1; i <= 1; i++) {
    put(panel, leaf, [m.alu, m.reflectarray, m.cellBack], i * pw, h / 2 + 0.012, 0)
    if (i < 1) for (const y of [0.2, 0.8]) put(panel, cyl(0.003, 0.003, 0.03, 6), m.steel, (i + 0.5) * pw, y * h + 0.012, -0.004)
  }
  for (const x of [-0.3, 0.3]) put(panel, box(0.012, 0.03, 0.006), m.alu, x * pw, 0.004, 0)
  // The feed: a strip of patches on a fold-out arm, looking back at the panel.
  strut(g, V(0, 0.02, hz), V(0, 0.07, hz + 0.05), 0.003, m.alu)
  const feed = new THREE.Group()
  feed.position.set(0, 0.075, hz + 0.052)
  feed.rotation.x = -1.0
  g.add(feed)
  put(feed, box(0.09, 0.003, 0.045), m.pcb)
  for (let i = 0; i < 4; i++) for (const z of [-1, 1]) put(feed, box(0.014, 0.001, 0.014), m.copper, (i - 1.5) * 0.02, -0.002, z * 0.01)
  g.userData.anchor = V(0, 0.02 + Math.cos(lean) * h * 0.5, -hz - Math.sin(lean) * h * 0.5)
}

interface DishStyle { tilt: number; ribs: number; lowGain?: boolean; horn?: boolean; amps?: boolean; goldBack?: boolean }

/** A Cassegrain dish on a two-axis gimbal: the big dish focuses onto a small mirror, which bounces the beam into the feed at the centre. */
function dish(g: THREE.Group, d: number, o: DishStyle) {
  const m = mats()
  const R = d / 2
  const f = 0.36 * d
  const depth = (R * R) / (4 * f)
  const hub = 0.1 * d
  // High enough that the tilted rim never dips below the deck.
  const pivot = R * Math.sin(o.tilt) + 0.16 * d
  // Azimuth drive on the deck, a mast, then the elevation drive in a yoke.
  put(g, cyl(0.09 * d, 0.1 * d, 0.05 * d, 16), m.aluDark, 0, 0.025 * d, 0)
  put(g, cyl(0.06 * d, 0.06 * d, 0.03 * d, 16), m.alu, 0, 0.065 * d, 0)
  put(g, cyl(0.035 * d, 0.045 * d, pivot - 0.05 * d, 12), m.goldMLI, 0, pivot / 2 + 0.025 * d, 0)
  put(g, cyl(0.055 * d, 0.055 * d, 0.24 * d, 14), m.aluDark, 0, pivot, 0, 0, 0, Math.PI / 2)
  for (const a of [-1, 1]) put(g, cyl(0.065 * d, 0.065 * d, 0.012 * d, 14), m.alu, a * 0.125 * d, pivot, 0, 0, 0, Math.PI / 2)
  const head = new THREE.Group()
  head.position.y = pivot
  // Tilted toward the Sun side: from deep space, Earth is always near the Sun in the sky.
  head.rotation.x = o.tilt
  g.add(head)
  put(head, cyl(0.13 * d, 0.07 * d, hub, 16), m.aluDark, 0, hub / 2, 0)
  put(head, dishGeometry(R, f), m.dishFace, 0, hub, 0)
  put(head, new THREE.TorusGeometry(R, 0.01 * d, 6, 48), m.alu, 0, hub + depth, 0, Math.PI / 2)
  // Stiffening ribs behind the reflector, and a ring that ties them together.
  // A straight rib under a curved dish: it follows the tangent at half radius, a quarter of the depth below the vertex.
  const rib = box(0.012 * d, 0.05 * d, R * 0.82).translate(0, -depth / 4 - 0.032 * d, R * 0.52)
  for (let i = 0; i < o.ribs; i++) {
    const r = new THREE.Group()
    r.position.y = hub
    r.rotation.y = (i / o.ribs) * Math.PI * 2
    head.add(r)
    put(r, rib, m.aluDark).rotation.x = -Math.atan2(depth, R)
  }
  // A blanket on the back of the dish, against the cold of deep space.
  if (o.goldBack) put(head, dishGeometry(R * 0.99, f), m.goldDouble, 0, hub - 0.006 * d, 0)
  // Amplifiers ride on the back of the dish, so the signal has only a short way to go to the feed.
  if (o.amps) for (const a of [-1, 1]) {
    put(head, box(0.14 * d, 0.07 * d, 0.2 * d), m.goldMLI, a * 0.2 * d, hub * 0.2, 0)
    put(head, box(0.1 * d, 0.012 * d, 0.16 * d), m.white, a * 0.2 * d, hub * 0.2 - 0.042 * d, 0)
  }
  const top = hub + f * 0.78
  put(head, cyl(0.025 * d, 0.06 * d, 0.2 * d, 14), m.gold, 0, hub + 0.1 * d, 0)
  put(head, cyl(0.085 * d, 0.1 * d, 0.02 * d, 20), m.whiteDouble, 0, top, 0)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const r = R * 0.72
    strut(head, V(Math.sin(a) * r, hub + (r * r) / (4 * f), Math.cos(a) * r), V(Math.sin(a) * 0.07 * d, top, Math.cos(a) * 0.07 * d), 0.008 * d, m.alu)
  }
  if (o.horn) {
    // Mars Odyssey: the medium-gain horn pokes through the dish, beside the centre.
    const hw = ANTENNA.odysseyHorn * d
    const r = 0.45 * R
    put(head, cyl(hw * 0.75, hw * 0.4, hw * 1.6, 4, true), m.gold, r, hub + (r * r) / (4 * f) + hw * 0.6, 0, 0, Math.PI / 4)
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
  const foot = Math.min(bx, bz)
  // shortcut: a dish more than twice as wide as its bus is drawn smaller, so the bus stays visible.
  const d = Math.min(dishDiameter(mount.entity), 2 * Math.max(bx, by, bz))
  if (mount.key === 'turnstile') turnstile(g, foot)
  else if (mount.key === 'reflectarray') reflectarray(g, foot)
  else if (mount.key === 'dish-gimbal') dish(g, d, { tilt: 0.45, ribs: 6 })
  else if (mount.key === 'dish-fixed') dish(g, d, { tilt: 0.3, ribs: 8, horn: true, lowGain: true, amps: true })
  else if (mount.key === 'dish-deep') dish(g, d, { tilt: 0.5, ribs: 12, lowGain: true, amps: true, goldBack: true })
  else patch(g, foot)
  return g
}
