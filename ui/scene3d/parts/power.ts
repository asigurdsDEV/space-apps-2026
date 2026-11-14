// Power: body-mounted cells, deployable wings (hinged on CubeSats, on a yoke and drive for big arrays),
// the RTG on its boom, and battery packs. Sizes come from layout.ts (watts, watt-hours, kilograms).
import * as THREE from 'three'
import type { Entity } from '../../../shared'
import { num } from '../model'
import { box, cyl, mats, partGroup, put, strut, tileBox } from './kit'
import { batterySize, type CraftLayout, type WingShape } from './layout'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Both wings, in craft axes: along ±x from the bus faces, cells facing +z (the Sun). */
export function buildWings(id: string, w: WingShape, [bx, by, bz]: [number, number, number]): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const s = Math.max(bx, by, bz)
  const t = Math.max(0.012 * w.width, 0.003)
  const arm = w.yoke ? Math.max(0.35 * w.width, 0.1 * s) : Math.max(0.14 * w.width, 0.02 * s)
  const pl = w.length / w.panels
  const gap = Math.min(0.04 * pl, 0.03)
  const cell = clamp(w.width / 3, 0.16, 0.5)
  const panel = tileBox(box(pl - gap, w.width, t), Math.max(1, Math.round(pl / cell)), Math.max(1, Math.round(w.width / cell)), 1)
  const barrel = cyl(t * 1.3, t * 1.3, 0.1 * w.width, 8)
  for (const side of [-1, 1]) {
    const x0 = (side * bx) / 2
    if (w.yoke) {
      // Drive motor at the root turns the wing to the Sun; a V-shaped yoke holds the first panel clear of the bus.
      put(g, cyl(0.06 * w.width, 0.06 * w.width, 0.08 * w.width, 16), m.aluDark, x0 + side * 0.04 * w.width, 0, 0, 0, 0, Math.PI / 2)
      const root = V(x0 + side * 0.08 * w.width, 0, 0)
      for (const a of [-1, 1]) strut(g, root, V(x0 + side * arm, a * 0.32 * w.width, 0), 0.016 * w.width, m.aluDark)
      strut(g, V(x0 + side * arm * 0.72, -0.21 * w.width, 0), V(x0 + side * arm * 0.72, 0.21 * w.width, 0), 0.012 * w.width, m.aluDark)
    } else {
      // Spring hinges: the panels were folded flat against the CubeSat for launch.
      for (const a of [-1, 1]) {
        put(g, box(arm, 0.08 * w.width, t), m.alu, x0 + (side * arm) / 2, a * 0.3 * w.width, 0)
        put(g, barrel, m.steel, x0 + side * arm * 0.5, a * 0.3 * w.width, -t)
      }
    }
    for (let i = 0; i < w.panels; i++) {
      put(g, panel, [m.alu, m.alu, m.alu, m.alu, m.cells, m.cellBack], x0 + side * (arm + pl * (i + 0.5)), 0, 0)
      if (i > 0) for (const a of [-0.32, 0, 0.32]) put(g, barrel, m.steel, x0 + side * (arm + pl * i), a * w.width, -t)
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
  const flat = bus.key === 'medium' ? 0.62 : 1
  const faces: [number, number, number][] = [[0, 1, bx], [1, 0, bz], [-1, 0, bz]]
  if (cube) faces.push([0, -1, bx])
  for (const [nx, nz, face] of faces) {
    // On a CubeSat: one panel per 10 cm unit, between the corner rails.
    const faceW = cube ? face - 0.22 * Math.min(bx, bz) : face
    const n = cube ? Math.max(1, Math.round(face / 0.1085)) : 1
    const rows = cube ? Math.max(1, Math.round(by / 0.1085)) : 1
    const w = cube ? faceW / n - 0.05 * faceW : Math.min(0.86 * faceW * flat, side)
    const h = cube ? by / rows - 0.02 * by : Math.min(0.3 * by, (side * side) / w)
    const slab = tileBox(box(w, h, t), cube ? 1 : Math.max(1, Math.round(w / 0.16)), cube ? 1 : Math.max(1, Math.round(h / 0.16)), 1)
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
      const across = (i + 0.5) * (faceW / n) - faceW / 2
      const p = put(g, slab, [m.alu, m.alu, m.alu, m.alu, m.cells, m.alu], 0, (j + 0.5) * (by / rows) - by / 2, 0)
      p.rotation.y = Math.atan2(nx, nz)
      p.position.x = nx * (bx / 2 + t / 2) + nz * across
      p.position.z = nz * (bz / 2 + t / 2) - nx * across
    }
  }
  return g
}

/** RTG on a short boom, mounted at y = 0 and pointing along +y. Drawn at the size of an MMRTG, scaled by mass. */
export function buildRtg(id: string, e: Entity): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const k = Math.cbrt(clamp(num(e.props.mass_kg, 45), 1, 500) / 45)
  const [boom, len, rc, rf] = [0.42 * k, 0.64 * k, 0.105 * k, 0.32 * k]
  // The boom keeps the hot, radioactive generator away from the instruments.
  strut(g, V(0, 0, 0), V(0, boom, 0), 0.022 * k, m.alu, 8)
  for (const a of [-1, 1]) strut(g, V(0, 0, a * 0.13 * k), V(0, boom, a * 0.04 * k), 0.012 * k, m.alu)
  put(g, cyl(rc * 1.3, rc * 1.3, 0.03 * k, 20), m.alu, 0, boom + 0.015 * k, 0)
  put(g, cyl(rc, rc, len, 20), m.rtgCore, 0, boom + len / 2, 0)
  put(g, cyl(rc * 1.12, rc * 1.12, 0.035 * k, 20), m.alu, 0, boom + len - 0.02 * k, 0)
  put(g, new THREE.SphereGeometry(rc, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.rtgCore, 0, boom + len, 0).scale.y = 0.5
  // Eight fins radiate the waste heat.
  const fin = box(0.01 * k, len * 0.88, rf - rc)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const r = (rc + rf) / 2
    put(g, fin, m.white, Math.sin(a) * r, boom + len * 0.5, Math.cos(a) * r, 0, a, 0)
  }
  return g
}

/**
 * Battery pack, mounted at y = 0: width along x, height along z, cells on show.
 * Up to 100 Wh it is a row of round 18650-style cells; above that, a module of flat prismatic cells.
 */
export function buildBattery(id: string, e: Entity, maxW: number, maxH: number): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const size = batterySize(e)
  const k = Math.min(1, maxW / size[0], maxH / size[1])
  const [w, h, t] = size.map((v) => v * k) as [number, number, number]
  const wh = num(e.props.capacity_wh, 100)
  put(g, box(w, 0.12 * t, h), m.alu, 0, 0.06 * t, 0)
  if (wh <= 100) {
    const n = clamp(Math.round(wh / 10), 2, 8)
    const r = Math.min((w / n) * 0.46, t * 0.44)
    const y = 0.12 * t + r
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (w / n)
      put(g, cyl(r, r, h * 0.8, 14), m.cellWrap, x, y, 0, Math.PI / 2)
      put(g, cyl(r * 0.6, r * 0.6, h * 0.84, 10), m.steel, x, y, 0, Math.PI / 2)
    }
    for (const a of [-1, 1]) {
      put(g, box(w * 0.9, r * 0.35, h * 0.015), m.steel, 0, y, a * h * 0.425)
      put(g, box(w, r * 1.2, h * 0.03), m.alu, 0, 0.12 * t + r * 0.6, a * h * 0.47)
    }
    put(g, box(w * 0.98, r * 2.08, h * 0.16), m.kapton, 0, y, 0)
  } else {
    const cols = clamp(Math.round(wh / 400), 2, 10)
    put(g, box(w, 0.42 * t, h), m.aluDark, 0, 0.33 * t, 0)
    put(g, box(w * 1.004, 0.1 * t, h * 1.004), m.orange, 0, 0.3 * t, 0)
    for (let i = 0; i < cols; i++) for (const a of [-1, 1]) {
      const x = (i - (cols - 1) / 2) * (w / cols)
      put(g, box((w / cols) * 0.84, 0.46 * t, h * 0.4), m.cellCase, x, 0.77 * t, a * h * 0.23)
      for (const b of [-1, 1]) put(g, cyl(0.045 * t, 0.045 * t, 0.06 * t, 8), m.copper, x, 1.02 * t, a * h * 0.23 + b * h * 0.1)
    }
    // Bus bars link the cells in series.
    for (const z of [-0.33, -0.13, 0.13, 0.33]) put(g, box(w * 0.9, 0.02 * t, h * 0.05), m.copper, 0, 1.05 * t, z * h)
    put(g, cyl(0.1 * t, 0.1 * t, 0.12 * t, 10), m.gold, w / 2 - 0.1 * t, 0.6 * t, h / 2 + 0.05 * t, Math.PI / 2)
  }
  return g
}

/** Unknown power part: a blanketed box with a connector, the size of a battery of that mass. */
export function buildPowerBox(id: string, e: Entity, maxW: number, maxH: number): THREE.Group {
  const g = partGroup('power', id)
  const m = mats()
  const size = batterySize(e)
  const k = Math.min(1, maxW / size[0], maxH / size[1])
  const [w, h, t] = size.map((v) => v * k) as [number, number, number]
  put(g, box(w, t, h), m.goldMLI, 0, t / 2, 0)
  put(g, cyl(0.12 * t, 0.12 * t, 0.15 * t, 10), m.gold, 0, t * 1.07, 0)
  return g
}
