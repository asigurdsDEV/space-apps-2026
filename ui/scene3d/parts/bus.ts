// Spacecraft buses. Each class reads differently: a CubeSat is a stack of 10 cm units in corner rails,
// a smallsat is a silver cube on a launch ring, a medium bus is a black octagon with mirror radiators,
// a flagship is a big gold-blanketed box with louvered radiators.
// The bus is centred on the origin; part families mount on its faces (see layout.ts).
import * as THREE from 'three'
import { num } from '../model'
import { aim, box, cyl, mats, partGroup, put, tile, tileBox } from './kit'
import type { CraftLayout } from './layout'

type Size = [number, number, number]

/** Star tracker: a small camera with a conical baffle, aimed at dark sky. */
function starTracker(g: THREE.Object3D, s: number, x: number, y: number, z: number, dir: THREE.Vector3) {
  const m = mats()
  const t = aim(new THREE.Group(), dir)
  t.position.set(x, y, z)
  g.add(t)
  put(t, box(0.05 * s, 0.05 * s, 0.05 * s), m.aluDark, 0, 0.015 * s, 0)
  put(t, cyl(0.036 * s, 0.02 * s, 0.07 * s, 16, true), m.black, 0, 0.075 * s, 0)
  put(t, cyl(0.019 * s, 0.019 * s, 0.004 * s, 12), m.glass, 0, 0.042 * s, 0)
}

/** Coarse sun sensor: a small black block with a glass window. */
function sunSensor(g: THREE.Object3D, s: number, x: number, y: number, z: number) {
  const m = mats()
  put(g, box(0.03 * s, 0.03 * s, 0.012 * s), m.aluDark, x, y, z + 0.006 * s)
  put(g, box(0.016 * s, 0.016 * s, 0.004 * s), m.glass, x, y, z + 0.013 * s)
}

/** Thruster pod: a bracket with four small nozzles (out, up or down, and both sideways). */
function pod(g: THREE.Object3D, s: number, at: THREE.Vector3, out: THREE.Vector3, up: number) {
  const m = mats()
  const p = new THREE.Group()
  p.position.copy(at).addScaledVector(out, 0.022 * s)
  p.rotation.y = Math.atan2(out.x, out.z)
  g.add(p)
  put(p, box(0.05 * s, 0.05 * s, 0.045 * s), m.goldMLI)
  const nozzle = cyl(0.015 * s, 0.005 * s, 0.032 * s, 10, true)
  for (const d of [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, up, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)]) {
    aim(put(p, nozzle, m.greyDouble, d.x * 0.04 * s, d.y * 0.04 * s, d.z * 0.038 * s), d)
  }
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
  const rail = Math.min(bx, bz) * 0.1
  const [ux, uy, uz] = [bx, by, bz].map((v) => Math.max(1, Math.round(v / 0.1085))) as Size
  put(g, tileBox(box(bx * 0.985, by, bz * 0.985), ux, uy, uz), [m.cubePanel, m.cubePanel, m.deck, m.aluDark, m.cubePanel, m.cubePanel])
  // Corner rails: what the deployer's guides slide on. They stand proud of the panels and past both ends.
  for (const a of [-1, 1]) for (const b of [-1, 1]) put(g, box(rail, by + rail * 1.3, rail), m.alu, (a * (bx - rail * 0.7)) / 2, 0, (b * (bz - rail * 0.7)) / 2)
  // Frame ribs at every unit boundary, so the stack of units shows.
  const rib = rail * 0.45
  for (let k = 0; k <= uy; k++) put(g, box(bx, rib, bz), m.alu, 0, -by / 2 + (k * by) / uy + (k === 0 ? rib / 2 : k === uy ? -rib / 2 : 0), 0)
  for (let k = 1; k < ux; k++) put(g, box(rib, by, bz), m.alu, -bx / 2 + (k * bx) / ux, 0, 0)
  for (let k = 1; k < uz; k++) put(g, box(bx, by, rib), m.alu, 0, 0, -bz / 2 + (k * bz) / uz)
  if (deltaV > 0) {
    // Cold-gas micro-thrusters on the anti-Sun face.
    for (const a of [-1, 1]) put(g, cyl(rail * 0.9, rail * 0.3, rail * 1.4, 10, true), m.greyDouble, a * 0.34 * bx, -0.42 * by, -bz / 2 - rail * 0.7, -Math.PI / 2)
  }
}

function smallsat(g: THREE.Object3D, size: Size, s: number) {
  const m = mats()
  const [bx, by, bz] = size
  put(g, box(bx, by, bz), [m.silverMLI, m.silverMLI, m.deck, m.deck, m.silverMLI, m.silverMLI])
  edges(g, size, 0.02 * s, m.alu)
  // Separation ring: where the satellite was bolted to the rocket's ESPA port.
  put(g, new THREE.TorusGeometry(0.34 * Math.min(bx, by), 0.014 * s, 8, 40), m.alu, 0, 0, -bz / 2)
  for (const a of [-1, 1]) put(g, tile(box(0.008 * s, 0.24 * by, 0.7 * bz), 4, 2), m.osr, a * (bx / 2 + 0.003 * s), 0.31 * by, 0)
  starTracker(g, s, -0.32 * bx, 0.4 * by, -bz / 2, new THREE.Vector3(-0.3, 0.5, -1))
}

function medium(g: THREE.Object3D, [bx, by, bz]: Size, s: number) {
  const m = mats()
  const [hx, hz, cx, cz] = [bx / 2, bz / 2, 0.18 * bx, 0.18 * bz]
  const corners: [number, number][] = [
    [hx - cx, hz], [hx, hz - cz], [hx, cz - hz], [hx - cx, -hz], [cx - hx, -hz], [-hx, cz - hz], [-hx, hz - cz], [cx - hx, hz],
  ]
  const prism = (k: number, depth: number, y: number, mat: THREE.Material | THREE.Material[]) => {
    const outline = new THREE.Shape(corners.map(([x, z]) => new THREE.Vector2(x * k, z * k)))
    return put(g, new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false }).rotateX(-Math.PI / 2), mat, 0, y, 0)
  }
  prism(1, by, -by / 2, [m.deck, m.blackMLI])
  for (const y of [by / 2 - 0.012 * s, -by / 2]) prism(1.012, 0.012 * s, y, m.alu)
  // Bright tape along the eight upright edges outlines the dark body.
  for (const [x, z] of corners) put(g, box(0.014 * s, by, 0.014 * s), m.alu, x, 0, z)
  // Mirror-tile radiators on the four cut corners, with thruster pods above and below them.
  const n = new THREE.Vector3(cz, 0, cx).normalize()
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const out = new THREE.Vector3(a * n.x, 0, b * n.z)
    const mid = new THREE.Vector3(a * (hx - cx / 2), 0, b * (hz - cz / 2))
    const r = put(g, tile(box(Math.hypot(cx, cz) * 0.86, 0.5 * by, 0.01 * s), 2, 5), m.osr)
    r.position.copy(mid).addScaledVector(out, 0.004 * s)
    r.rotation.y = Math.atan2(out.x, out.z)
    for (const up of [-1, 1]) pod(g, s, mid.clone().setY(up * 0.38 * by), out, up)
  }
  for (const x of [-0.2, -0.06]) starTracker(g, s, x * bx, 0.4 * by, -bz / 2, new THREE.Vector3(x * 3 + 0.2, 0.6, -1))
}

function flagship(g: THREE.Object3D, size: Size, s: number) {
  const m = mats()
  const [bx, by, bz] = size
  put(g, tileBox(box(bx, by, bz), 2, 2, 2), [m.goldMLI, m.goldMLI, m.deck, m.deck, m.goldMLI, m.goldMLI])
  edges(g, size, 0.014 * s, m.alu)
  // Louvered radiators above and below the wing roots; a mirror-tile strip on the cold anti-Sun face.
  for (const a of [-1, 1]) for (const b of [-1, 1]) put(g, tile(box(0.01 * s, 0.26 * by, 0.62 * bz), 2, 1), m.louver, a * (bx / 2 + 0.004 * s), b * 0.3 * by, 0)
  put(g, tile(box(0.8 * bx, 0.08 * by, 0.01 * s), 10, 1), m.osr, 0, -0.43 * by, -bz / 2 - 0.004 * s)
  // Harness conduits down the Sun face.
  for (const a of [-1, 1]) put(g, cyl(0.008 * s, 0.008 * s, 0.9 * by, 8), m.kapton, a * 0.455 * bx, 0, bz / 2 + 0.006 * s)
  for (const x of [-0.36, -0.2]) starTracker(g, s, x * bx, 0.42 * by, -bz / 2, new THREE.Vector3(x * 2 + 0.3, 0.6, -1))
}

export function buildBus(bus: CraftLayout['bus']): THREE.Group {
  const g = partGroup('bus', bus.id)
  const [bx, by, bz] = bus.size
  const s = Math.max(bx, by, bz)
  const deltaV = num(bus.entity?.props.propulsion_delta_v_ms, 0)
  if (bus.key === 'cubesat') cubesat(g, bus.size, deltaV)
  else {
    if (bus.key === 'smallsat') smallsat(g, bus.size, s)
    else if (bus.key === 'medium') medium(g, bus.size, s)
    else flagship(g, bus.size, s)
    for (const a of [-1, 1]) sunSensor(g, s, a * (bus.key === 'medium' ? 0.25 : 0.42) * bx, 0.45 * by, bz / 2)
    // Box buses carry their thruster pods on the four upright edges (the octagon has them on its cut corners).
    if (bus.key !== 'medium' && deltaV > 0) {
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const up of [-1, 1]) {
        pod(g, s, new THREE.Vector3((a * bx) / 2, up * 0.3 * by, (b * bz) / 2), new THREE.Vector3(a, 0, b).normalize(), up)
      }
    }
  }
  return g
}
