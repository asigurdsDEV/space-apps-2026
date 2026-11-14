// Spacecraft buses, each modelled on real flight hardware (REFERENCES.md):
//   CubeSats: the CubeSat Design Specification (3U), MarCO (6U), CAPSTONE (12U, with hydrazine thrusters)
//   smallsat: a GRAIL orbiter · medium: MAVEN · flagship: Mars Reconnaissance Orbiter, scaled to the catalog mass.
// The bus is centred on the origin; part families mount on its faces (see layout.ts). Main engines and the
// launch adapter ring are on the lower anti-Sun face (-z), as on MAVEN and MRO, clear of every mount slot.
import * as THREE from 'three'
import { num } from '../model'
import { aim, bellGeometry, box, cyl, mats, partGroup, put, tile, tileBox } from './kit'
import type { CraftLayout } from './layout'
import { CUBESAT } from './references'

type Size = [number, number, number]
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const AFT = V(0, 0, -1)

/** Star tracker: a small camera with a conical baffle, aimed at dark sky. */
function starTracker(g: THREE.Object3D, s: number, x: number, y: number, z: number, dir: THREE.Vector3) {
  const m = mats()
  const t = aim(new THREE.Group(), dir)
  t.position.set(x, y, z)
  g.add(t)
  put(t, box(0.05 * s, 0.05 * s, 0.05 * s), m.aluDark, 0, 0.015 * s, 0)
  put(t, cyl(0.036 * s, 0.02 * s, 0.07 * s, 16, true), m.black, 0, 0.075 * s, 0)
  put(t, new THREE.TorusGeometry(0.036 * s, 0.003 * s, 5, 16), m.alu, 0, 0.11 * s, 0, Math.PI / 2)
  put(t, cyl(0.019 * s, 0.019 * s, 0.004 * s, 12), m.glass, 0, 0.042 * s, 0)
}

/** Coarse sun sensor: a small black block with a glass window. */
function sunSensor(g: THREE.Object3D, s: number, x: number, y: number, z: number) {
  const m = mats()
  put(g, box(0.03 * s, 0.03 * s, 0.012 * s), m.aluDark, x, y, z + 0.006 * s)
  put(g, box(0.016 * s, 0.016 * s, 0.004 * s), m.glass, x, y, z + 0.013 * s)
}

/** Low-gain antenna: a small cone on a mast. Slow, but it hears Earth whichever way the spacecraft points. */
function lowGain(g: THREE.Object3D, s: number, x: number, y: number, z: number) {
  const m = mats()
  put(g, cyl(0.006 * s, 0.006 * s, 0.05 * s, 6), m.alu, x, y + 0.025 * s, z)
  put(g, cyl(0.024 * s, 0.009 * s, 0.035 * s, 12), m.gold, x, y + 0.065 * s, z)
}

/** Attitude thrusters: a blanketed bracket on an upright edge with `n` small nozzles (out, up or down, sideways). */
function pod(g: THREE.Object3D, s: number, at: THREE.Vector3, out: THREE.Vector3, up: number, n: number) {
  const m = mats()
  const p = new THREE.Group()
  p.position.copy(at).addScaledVector(out, 0.022 * s)
  p.rotation.y = Math.atan2(out.x, out.z)
  g.add(p)
  put(p, box(0.05 * s, 0.05 * s, 0.045 * s), m.goldMLI)
  const nozzle = bellGeometry(0.013 * s, 0.03 * s, 10)
  for (const d of [V(0, 0, 1), V(0, up, 0), V(1, 0, 0), V(-1, 0, 0)].slice(0, n)) {
    aim(put(p, nozzle, m.nozzle, d.x * 0.026 * s, d.y * 0.026 * s, d.z * 0.024 * s), d)
  }
}

/**
 * Main engines on the lower anti-Sun face: `n` nozzles on a circle (one in the middle if n is 1), `small`
 * trim engines between them, a heat shield, and the ring that was bolted to the rocket.
 */
function engines(g: THREE.Object3D, s: number, [bx, by, bz]: Size, n: number, small = 0) {
  const m = mats()
  const R = 0.19 * Math.min(bx, by)
  const c = V(0, -0.27 * by, -bz / 2)
  if (n > 0) {
    // Service panel on the Sun face: the capped valves the propellant tank was filled through.
    put(g, box(0.16 * s, 0.07 * s, 0.006 * s), m.alu, 0.36 * bx, -0.4 * by, bz / 2 + 0.003 * s)
    for (const x of [-1, 0, 1]) put(g, cyl(0.012 * s, 0.012 * s, 0.03 * s, 8), x ? m.gold : m.red, 0.36 * bx + x * 0.045 * s, -0.4 * by, bz / 2 + 0.018 * s, Math.PI / 2)
  }
  put(g, cyl(R, R, 0.05 * s, 40, true), m.greyDouble, c.x, c.y, c.z - 0.025 * s, Math.PI / 2)
  put(g, new THREE.TorusGeometry(R, 0.01 * s, 6, 40), m.alu, c.x, c.y, c.z - 0.05 * s)
  put(g, cyl(R * 0.97, R * 0.97, 0.008 * s, 32), m.goldMLI, c.x, c.y, c.z - 0.004 * s, Math.PI / 2)
  const ring = (count: number, r: number, rExit: number, len: number, phase: number) => {
    const bell = bellGeometry(rExit, len)
    const chamber = cyl(rExit * 0.34, rExit * 0.34, len * 0.5, 8)
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2
      const [x, y] = count === 1 ? [0, 0] : [Math.cos(a) * r, Math.sin(a) * r]
      aim(put(g, chamber, m.steel, c.x + x, c.y + y, c.z - len * 0.25), AFT)
      aim(put(g, bell, m.nozzle, c.x + x, c.y + y, c.z - len * 0.45), AFT)
    }
  }
  ring(n, R * 0.56, 0.2 * R, 0.5 * R, 0)
  if (small) ring(small, R * 0.56, 0.1 * R, 0.28 * R, Math.PI / small)
}

function edges(g: THREE.Object3D, [bx, by, bz]: Size, e: number, mat: THREE.Material) {
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    put(g, box(e, by + e, e), mat, (a * bx) / 2, 0, (b * bz) / 2)
    put(g, box(bx + e, e, e), mat, 0, (a * by) / 2, (b * bz) / 2)
    put(g, box(e, e, bz + e), mat, (a * bx) / 2, (b * by) / 2, 0)
  }
}

function cubesat(g: THREE.Object3D, [bx, by, bz]: Size, deltaV: number) {
  const m = mats()
  const rail = CUBESAT.rail
  const [ux, uy, uz] = [bx, by, bz].map((v) => Math.max(1, Math.round(v / 0.1135))) as Size
  put(g, tileBox(box(bx - 0.002, by, bz - 0.002), ux, uy, uz), [m.cubePanel, m.cubePanel, m.deck, m.aluDark, m.cubePanel, m.cubePanel])
  // Four hard-anodised rails: what the deployer's guides slide on. They stand 6.5 mm past both ends.
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const [x, z] = [(a * (bx - rail)) / 2, (b * (bz - rail)) / 2]
    put(g, box(rail, by + 0.013, rail), m.alu, x, 0, z)
    // Deployment switches on two rail feet keep the satellite off until it leaves the deployer; springs on the other two push it clear.
    put(g, cyl(0.0022, 0.0022, 0.006, 8), a === b ? m.steel : m.copper, x, -by / 2 - 0.0095, z)
  }
  // Frame ribs at every unit boundary, so the stack of units shows.
  const rib = rail * 0.5
  for (let k = 0; k <= uy; k++) put(g, box(bx, rib, bz), m.alu, 0, -by / 2 + (k * by) / uy + (k === 0 ? rib / 2 : k === uy ? -rib / 2 : 0), 0)
  for (let k = 1; k < ux; k++) put(g, box(rib, by, bz), m.alu, -bx / 2 + (k * bx) / ux, 0, 0)
  for (let k = 1; k < uz; k++) put(g, box(bx, by, rib), m.alu, 0, 0, -bz / 2 + (k * bz) / uz)
  if (ux * uz === 2) {
    // MarCO: two white radiators and the star tracker's baffle on the cold face.
    for (const a of [-1, 1]) put(g, box(0.4 * bx, 0.26 * by, 0.002), m.white, a * 0.24 * bx, 0.3 * by, -bz / 2 - 0.001)
    put(g, cyl(0.014, 0.01, 0.012, 14, true), m.black, -0.25 * bx, -0.36 * by, -bz / 2 - 0.006, -Math.PI / 2)
    put(g, cyl(0.0095, 0.0095, 0.002, 12), m.glass, -0.25 * bx, -0.36 * by, -bz / 2 - 0.001, -Math.PI / 2)
  }
  if (deltaV > 0) {
    // CAPSTONE: eight hydrazine thrusters, two in each of four open ports.
    const bell = bellGeometry(0.006, 0.014, 10)
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      put(g, box(0.05, 0.03, 0.003), m.black, a * 0.3 * bx, b * 0.44 * by, -bz / 2 - 0.0015)
      for (const c of [-1, 1]) aim(put(g, bell, m.nozzle, a * 0.3 * bx + c * 0.012, b * 0.44 * by, -bz / 2), V(c * 0.35, b * 0.35, -1))
    }
  }
}

function smallsat(g: THREE.Object3D, size: Size, s: number, deltaV: number) {
  const m = mats()
  const [bx, by, bz] = size
  put(g, tileBox(box(bx, by, bz), 2, 2, 2), [m.silverMLI, m.silverMLI, m.deck, m.deck, m.silverMLI, m.silverMLI])
  edges(g, size, 0.016 * s, m.alu)
  // GRAIL: one 22 N main engine inside the separation ring, and eight small attitude thrusters.
  engines(g, s, size, deltaV > 0 ? 1 : 0)
  if (deltaV > 0) for (const a of [-1, 1]) for (const b of [-1, 1]) pod(g, s, V((a * bx) / 2, a * b * 0.34 * by, (b * bz) / 2), V(a, 0, b).normalize(), a * b, 2)
  for (const a of [-1, 1]) put(g, tile(box(0.008 * s, 0.24 * by, 0.7 * bz), 4, 2), m.osr, a * (bx / 2 + 0.003 * s), 0.31 * by, 0)
  starTracker(g, s, -0.4 * bx, 0.47 * by, -bz / 2, V(-0.3, 0.5, -1))
  lowGain(g, s, 0.42 * bx, by / 2, 0.4 * bz)
  lowGain(g, s, -0.42 * bx, by / 2, -0.4 * bz)
}

function medium(g: THREE.Object3D, size: Size, s: number, deltaV: number) {
  const m = mats()
  const [bx, by, bz] = size
  // MAVEN: a 2.3 m cube of composite panels under black blankets, with a gold-blanketed propulsion deck.
  put(g, tileBox(box(bx, by, bz), 3, 3, 3), [m.blackMLI, m.blackMLI, m.deck, m.deck, m.blackMLI, m.blackMLI])
  put(g, tileBox(box(bx * 1.006, 0.14 * by, bz * 1.006), 4, 1, 4), m.goldMLI, 0, -0.43 * by, 0)
  edges(g, size, 0.012 * s, m.alu)
  engines(g, s, size, deltaV > 0 ? 6 : 0)
  if (deltaV > 0) for (const a of [-1, 1]) for (const b of [-1, 1]) pod(g, s, V((a * bx) / 2, a * b * 0.34 * by, (b * bz) / 2), V(a, 0, b).normalize(), a * b, 3)
  for (const a of [-1, 1]) put(g, tile(box(0.008 * s, 0.22 * by, 0.7 * bz), 6, 2), m.osr, a * (bx / 2 + 0.003 * s), 0.33 * by, 0)
  for (const x of [-0.44, -0.3]) starTracker(g, s, x * bx, 0.47 * by, -bz / 2, V(x * 3 + 0.9, 0.6, -1))
  lowGain(g, s, 0.43 * bx, by / 2, 0.42 * bz)
  lowGain(g, s, -0.43 * bx, by / 2, -0.42 * bz)
}

function flagship(g: THREE.Object3D, size: Size, s: number, deltaV: number) {
  const m = mats()
  const [bx, by, bz] = size
  // MRO: gold blankets, black panels round the top, louvered radiators by the wing roots.
  put(g, tileBox(box(bx, by, bz), 3, 4, 3), [m.goldMLI, m.goldMLI, m.deck, m.deck, m.goldMLI, m.goldMLI])
  put(g, tileBox(box(bx * 1.004, 0.12 * by, bz * 1.004), 4, 1, 4), m.blackMLI, 0, 0.44 * by, 0)
  edges(g, size, 0.01 * s, m.alu)
  // Six 170 N engines for braking into orbit, six 22 N trim engines between them, eight small thrusters in pods.
  engines(g, s, size, deltaV > 0 ? 6 : 0, deltaV > 0 ? 6 : 0)
  if (deltaV > 0) for (const a of [-1, 1]) for (const b of [-1, 1]) pod(g, s, V((a * bx) / 2, a * b * 0.36 * by, (b * bz) / 2), V(a, 0, b).normalize(), a * b, 2)
  for (const a of [-1, 1]) for (const b of [-1, 1]) put(g, tile(box(0.01 * s, 0.2 * by, 0.62 * bz), 2, 1), m.louver, a * (bx / 2 + 0.004 * s), b * 0.26 * by, 0)
  put(g, tile(box(0.8 * bx, 0.06 * by, 0.01 * s), 10, 1), m.osr, 0, -0.46 * by, -bz / 2 - 0.004 * s)
  // Harness conduits down the Sun face.
  for (const a of [-1, 1]) put(g, cyl(0.006 * s, 0.006 * s, 0.86 * by, 8), m.kapton, a * 0.47 * bx, -0.05 * by, bz / 2 + 0.005 * s)
  for (const x of [-0.44, -0.32]) starTracker(g, s, x * bx, 0.47 * by, -bz / 2, V(x * 2 + 0.6, 0.6, -1))
  lowGain(g, s, 0.44 * bx, by / 2, 0.43 * bz)
  lowGain(g, s, -0.44 * bx, by / 2, -0.43 * bz)
}

export function buildBus(bus: CraftLayout['bus']): THREE.Group {
  const g = partGroup('bus', bus.id)
  const [bx, by, bz] = bus.size
  const s = Math.max(bx, by, bz)
  // A bus the catalog does not know still gets engines if it is big enough to need them.
  const deltaV = num(bus.entity?.props.propulsion_delta_v_ms, bus.entity ? 0 : 1)
  if (bus.key === 'cubesat') cubesat(g, bus.size, bus.entity ? deltaV : 0)
  else {
    if (bus.key === 'smallsat') smallsat(g, bus.size, s, deltaV)
    else if (bus.key === 'medium') medium(g, bus.size, s, deltaV)
    else flagship(g, bus.size, s, deltaV)
    for (const a of [-1, 1]) sunSensor(g, s, a * 0.44 * bx, 0.46 * by, bz / 2)
  }
  return g
}
