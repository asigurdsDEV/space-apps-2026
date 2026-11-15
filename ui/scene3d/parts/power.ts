// Power, each modelled on real flight hardware (REFERENCES.md):
//   body-mounted CubeSat cells · MarCO fold-out panels · LunaH-Map gimballed wings · MAVEN gull wings ·
//   MRO's two big wings · the MMRTG of Curiosity and Perseverance · 18650 CubeSat packs · rover-type 8-cell batteries.
// Sizes come from layout.ts and references.ts (watts, watt-hours, kilograms).
import * as THREE from 'three'
import type { Entity } from '../../../shared'
import { num } from '../model'
import { box, cyl, fuse, mats, partGroup, put, sheeted, strut } from './kit'
import { batterySize, type CraftLayout, type WingShape } from './layout'
import { BATTERY, MMRTG } from './references'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Both wings, in craft axes: along ±x from the bus faces, cells facing +z (the Sun). */
export function buildWings(id: string, w: WingShape, [bx, by, bz]: [number, number, number]): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const s = Math.max(bx, by, bz)
  const t = Math.max(0.012 * w.width, 0.003)
  const arm = w.mount === 'yoke' ? Math.max(0.3 * w.width, 0.08 * s) : Math.max(0.14 * w.width, 0.02 * s)
  const pl = w.length / w.panels
  const gap = Math.min(0.03 * pl, 0.03)
  // One texture tile is 2 x 4 cells: real cells are a few centimeters, so big wings show a fine grid.
  const cell = clamp(w.width / 5, 0.08, 0.32)
  // The cells stop short of the panel edge, so the substrate shows as a frame all round.
  const rim = 0.03 * w.width
  const tray: THREE.BufferGeometry[] = [box(pl - gap, w.width, t)]
  // Hold-down points: where the folded stack was bolted to the bus for launch.
  for (const a of [-1, 1]) for (const b of [-1, 1]) tray.push(cyl(0.022 * w.width, 0.022 * w.width, t * 1.5, 10).rotateX(Math.PI / 2).translate(a * 0.3 * pl, b * 0.3 * w.width, 0))
  const panel = sheeted(fuse(tray), pl - gap - 2 * rim, w.width - 2 * rim, t * 0.58, Math.max(1, Math.round(pl / cell)), Math.max(1, Math.round(w.width / cell)))
  const barrel = cyl(t * 1.3, t * 1.3, 0.1 * w.width, 8)
  const faces = [m.alu, m.cells, m.cellBack]
  for (const side of [-1, 1]) {
    let frame: THREE.Object3D = new THREE.Group()
    frame.position.x = (side * bx) / 2
    g.add(frame)
    if (w.mount === 'yoke') {
      // A drive at the root turns the wing to the Sun; a V-shaped yoke holds the first panel clear of the bus.
      put(frame, cyl(0.06 * w.width, 0.06 * w.width, 0.08 * w.width, 16), m.aluDark, side * 0.04 * w.width, 0, 0, 0, 0, Math.PI / 2)
      put(frame, cyl(0.075 * w.width, 0.075 * w.width, 0.02 * w.width, 16), m.alu, side * 0.085 * w.width, 0, 0, 0, 0, Math.PI / 2)
      const root = V(side * 0.08 * w.width, 0, 0)
      for (const a of [-1, 1]) strut(frame, root, V(side * arm, a * 0.32 * w.width, 0), 0.016 * w.width, m.alu)
      strut(frame, V(side * arm * 0.72, -0.21 * w.width, 0), V(side * arm * 0.72, 0.21 * w.width, 0), 0.012 * w.width, m.alu)
      // The harness that carries the current to the bus.
      strut(frame, root, V(side * arm, 0, -t), 0.008 * w.width, m.kapton)
    } else if (w.mount === 'drive') {
      // LunaH-Map: a small drive on each side turns the whole wing.
      put(frame, cyl(0.07 * w.width, 0.07 * w.width, arm * 0.5, 14), m.aluDark, side * arm * 0.25, 0, 0, 0, 0, Math.PI / 2)
      put(frame, box(arm * 0.5, 0.5 * w.width, t), m.alu, side * arm * 0.75, 0, 0)
    } else {
      // MarCO: spring hinges. The panels were folded flat against the CubeSat for launch.
      for (const a of [-1, 1]) {
        put(frame, box(arm, 0.08 * w.width, t), m.alu, (side * arm) / 2, a * 0.3 * w.width, 0)
        put(frame, barrel, m.steel, side * arm * 0.5, a * 0.3 * w.width, -t)
      }
    }
    let x = arm
    for (let i = 0; i < w.panels; i++) {
      if (w.cant && i === Math.ceil(w.panels / 2)) {
        // MAVEN's gull wing: the outer panels are bent back, away from the Sun side.
        const outer = new THREE.Group()
        outer.position.x = side * x
        outer.rotation.y = side * w.cant
        frame.add(outer)
        frame = outer
        x = 0
      }
      put(frame, panel, faces, side * (x + pl / 2), 0, 0)
      if (i > 0) for (const a of [-0.32, 0, 0.32]) put(frame, barrel, m.steel, side * x, a * w.width, -t)
      x += pl
    }
  }
  return g
}

/** Solar cells glued straight onto the bus sides, in craft axes. A CubeSat is covered; a big bus gets a patch of the same area. */
export function buildBodyCells(id: string, e: Entity, bus: CraftLayout['bus']): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const [bx, by, bz] = bus.size
  const s = Math.max(bx, by, bz)
  const t = 0.004 * s
  const cube = bus.key === 'cubesat'
  // The catalog power is what one sunlit face makes.
  const side = Math.sqrt(Math.max(num(e.props.power_w, 7), 1) / 220)
  const faces: [number, number, number][] = [[0, 1, bx], [1, 0, bz], [-1, 0, bz]]
  if (cube) faces.push([0, -1, bx])
  for (const [nx, nz, face] of faces) {
    // On a CubeSat: one panel per 10 cm unit, between the corner rails.
    const faceW = cube ? face - 0.022 : face
    const n = cube ? Math.max(1, Math.round(face / 0.1135)) : 1
    const rows = cube ? Math.max(1, Math.round(by / 0.1135)) : 1
    const w = cube ? faceW / n - 0.05 * faceW : Math.min(0.86 * faceW, side)
    const h = cube ? by / rows - 0.02 * by : Math.min(0.3 * by, (side * side) / w)
    const rim = 0.04 * Math.min(w, h)
    const slab = sheeted(box(w, h, t), w - 2 * rim, h - 2 * rim, t * 0.58, cube ? 1 : Math.max(1, Math.round(w / 0.16)), cube ? 1 : Math.max(1, Math.round(h / 0.16)), false)
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
      const across = (i + 0.5) * (faceW / n) - faceW / 2
      const p = put(g, slab, [m.alu, m.cells], 0, (j + 0.5) * (by / rows) - by / 2, 0)
      p.rotation.y = Math.atan2(nx, nz)
      p.position.x = nx * (bx / 2 + t / 2) + nz * across
      p.position.z = nz * (bz / 2 + t / 2) - nx * across
    }
  }
  return g
}

/** The MMRTG on a short boom, mounted at y = 0 and pointing along +y: 64 cm across its eight fins, 66 cm long, scaled by mass. */
export function buildRtg(id: string, e: Entity): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const k = Math.cbrt(clamp(num(e.props.mass_kg, MMRTG.mass_kg), 1, 500) / MMRTG.mass_kg)
  const [boom, len, rc, rf] = [0.6 * k, MMRTG.length * k, (MMRTG.core / 2) * k, (MMRTG.diameter / 2) * k]
  // The boom keeps the hot, radioactive generator away from the instruments.
  strut(g, V(0, 0, 0), V(0, boom, 0), 0.022 * k, m.alu, 8)
  for (const a of [-1, 1]) strut(g, V(0, 0, a * 0.13 * k), V(0, boom, a * 0.04 * k), 0.012 * k, m.alu)
  // Mounting flange with its bolt circle.
  put(g, cyl(rc * 1.18, rc * 1.18, 0.03 * k, 24), m.alu, 0, boom + 0.015 * k, 0)
  const bolt = cyl(0.008 * k, 0.008 * k, 0.012 * k, 6)
  for (let i = 0; i < 12; i++) put(g, bolt, m.steel, Math.sin((i / 12) * Math.PI * 2) * rc * 1.08, boom + 0.034 * k, Math.cos((i / 12) * Math.PI * 2) * rc * 1.08)
  put(g, cyl(rc, rc, len, 24), m.rtgCore, 0, boom + len / 2, 0)
  for (const y of [0.06, 0.94]) put(g, cyl(rc * 1.06, rc * 1.06, 0.03 * k, 24), m.alu, 0, boom + len * y, 0)
  // The far end: a domed cover over the heat source, with the gas vent in the middle.
  put(g, new THREE.SphereGeometry(rc, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.rtgCore, 0, boom + len, 0).scale.y = 0.35
  put(g, cyl(0.03 * k, 0.03 * k, 0.03 * k, 10), m.steel, 0, boom + len + rc * 0.35, 0)
  // Eight fins radiate the waste heat; a cooling tube runs along each one and loops to the next at the far end.
  const fin = box(0.008 * k, len * 0.88, rf - rc)
  const tube = cyl(0.008 * k, 0.008 * k, len * 0.8, 6)
  const rt = rc + (rf - rc) * 0.38
  for (let i = 0; i < MMRTG.fins; i++) {
    const a = (i / MMRTG.fins) * Math.PI * 2
    const [sin, cos] = [Math.sin(a), Math.cos(a)]
    put(g, fin, m.white, sin * (rc + rf) / 2, boom + len * 0.5, cos * (rc + rf) / 2, 0, a, 0)
    put(g, tube, m.steel, sin * rt + cos * 0.012 * k, boom + len * 0.5, cos * rt - sin * 0.012 * k)
    const b = ((i + 1) / MMRTG.fins) * Math.PI * 2
    if (i % 2 === 0) strut(g, V(sin * rt, boom + len * 0.9, cos * rt), V(Math.sin(b) * rt, boom + len * 0.9, Math.cos(b) * rt), 0.008 * k, m.steel, 5)
  }
  return g
}

/** The box a battery may take on the Sun face: its real size, shrunk to fit. */
function fitted(size: [number, number, number], maxW: number, maxH: number): [number, number, number] {
  const k = Math.min(1, maxW / size[0], maxH / size[1])
  return size.map((v) => v * k) as [number, number, number]
}

/**
 * Battery pack, mounted at y = 0: width along x, height along z, cells on show.
 * Up to 100 Wh it is a CubeSat pack of 18650 cells on a board; above that, rover-type modules of eight prismatic cells.
 */
export function buildBattery(id: string, e: Entity, maxW: number, maxH: number): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const wh = num(e.props.capacity_wh, 100)
  if (wh <= 100) {
    const { d, l, wh: each } = BATTERY.cell18650
    const n = clamp(Math.round(wh / each), 2, 8)
    // Real size: the cells side by side on a 9 cm CubeSat board.
    const [w, h] = fitted([Math.max(0.09, n * d * 1.08 + 0.012), 0.096, d + 0.006], maxW, maxH)
    const k = w / Math.max(0.09, n * d * 1.08 + 0.012)
    const r = (d / 2) * k
    put(g, box(w, 0.0016 * k, h), m.pcb, 0, 0.004 * k, 0)
    for (const a of [-1, 1]) for (const b of [-1, 1]) put(g, cyl(0.0025 * k, 0.0025 * k, 0.004 * k, 6), m.steel, a * 0.45 * w, 0.002 * k, b * 0.45 * h)
    const y = 0.005 * k + r
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * d * 1.08 * k
      put(g, cyl(r, r, l * k, 14), m.cellWrap, x, y, 0, Math.PI / 2)
      put(g, cyl(r * 0.55, r * 0.55, l * k * 1.03, 10), m.steel, x, y, 0, Math.PI / 2)
    }
    // Nickel strips join the cell ends; a Kapton strap holds the pack down.
    for (const a of [-1, 1]) put(g, box(n * d * 1.08 * k * 0.92, r * 0.5, 0.0006 * k), m.steel, 0, y, a * l * k * 0.518)
    put(g, box(n * d * 1.08 * k * 1.02, r * 2.06, l * k * 0.2), m.kapton, 0, y, 0)
    put(g, box(0.014 * k, 0.006 * k, 0.008 * k), m.ceramic, w / 2 - 0.012 * k, 0.008 * k, h / 2 - 0.008 * k)
    return g
  }
  const [w, h, t] = fitted(batterySize(e), maxW, maxH)
  const n = clamp(Math.round(wh / BATTERY.module_wh), 1, 6)
  const cells = BATTERY.moduleCells
  const mw = w / n
  put(g, box(w, 0.08 * t, h), m.alu, 0, 0.04 * t, 0)
  const cellBox = box(mw * 0.8, 0.74 * t, (h * 0.86) / cells * 0.9)
  const endPlate = box(mw * 0.88, 0.8 * t, 0.045 * h)
  const rod = cyl(0.03 * t, 0.03 * t, h * 0.97, 6)
  const stud = box(0.1 * mw, 0.07 * t, 0.035 * h)
  const bar = box(0.12 * mw, 0.025 * t, (h * 0.86) / cells)
  for (let j = 0; j < n; j++) {
    const x = (j - (n - 1) / 2) * mw
    for (let i = 0; i < cells; i++) {
      const z = ((i + 0.5) / cells - 0.5) * h * 0.86
      put(g, cellBox, m.cellCase, x, 0.45 * t, z)
      for (const a of [-1, 1]) put(g, stud, m.copper, x + a * 0.24 * mw, 0.855 * t, z)
      // Bus bars link each cell to the next, alternating sides: eight cells in series make 28 volts.
      if (i < cells - 1) put(g, bar, m.copper, x + (i % 2 ? 1 : -1) * 0.24 * mw, 0.9 * t, z + (h * 0.43) / cells)
    }
    for (const a of [-1, 1]) {
      put(g, endPlate, m.aluDark, x, 0.48 * t, a * 0.455 * h)
      for (const b of [0.25, 0.7]) put(g, rod, m.steel, x + a * 0.43 * mw, b * t, 0, Math.PI / 2)
    }
    // Heater strip round the cells: batteries are kept warm.
    put(g, box(mw * 0.82, 0.12 * t, h * 0.87), m.kapton, x, 0.3 * t, 0)
  }
  put(g, box(0.16 * t, 0.2 * t, 0.3 * t), m.aluDark, w / 2 - 0.1 * t, 0.2 * t, h / 2 + 0.08 * t)
  put(g, cyl(0.07 * t, 0.07 * t, 0.1 * t, 10), m.gold, w / 2 - 0.1 * t, 0.2 * t, h / 2 + 0.25 * t, Math.PI / 2)
  return g
}

/** Unknown power part: a blanketed box with a connector, the size of a battery of that mass. */
export function buildPowerBox(id: string, e: Entity, maxW: number, maxH: number): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const [w, h, t] = fitted(batterySize(e), maxW, maxH)
  put(g, box(w, t, h), m.goldMLI, 0, t / 2, 0)
  put(g, cyl(0.12 * t, 0.12 * t, 0.15 * t, 10), m.gold, 0, t * 1.07, 0)
  return g
}
