// Science instruments. Deck instruments sit on a square footprint of side L at y = 0 and look along +y
// (the craft turns that to nadir). Booms, radars and the telescope have their own mounts (layout.ts).
import * as THREE from 'three'
import { box, cyl, mats, put, strut } from './kit'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const TAU = Math.PI * 2

/** Small Earth camera: body, lens barrel with a focus ring, and a flared baffle that keeps stray light out. */
export function camera(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.76 * L, 0.05 * L, 0.76 * L), m.alu, 0, 0.025 * L, 0)
  put(g, box(0.7 * L, 0.4 * L, 0.7 * L), m.aluDark, 0, 0.25 * L, 0)
  put(g, box(0.02 * L, 0.3 * L, 0.5 * L), m.white, 0.36 * L, 0.25 * L, 0)
  put(g, cyl(0.25 * L, 0.27 * L, 0.4 * L, 20), m.aluDark, 0, 0.65 * L, 0)
  put(g, cyl(0.285 * L, 0.285 * L, 0.07 * L, 20), m.alu, 0, 0.58 * L, 0)
  put(g, cyl(0.23 * L, 0.23 * L, 0.02 * L, 20), m.glass, 0, 0.85 * L, 0)
  put(g, cyl(0.4 * L, 0.26 * L, 0.42 * L, 20, true), m.black, 0, 1.05 * L, 0)
  put(g, new THREE.TorusGeometry(0.4 * L, 0.015 * L, 6, 20), m.alu, 0, 1.26 * L, 0, Math.PI / 2)
}

/** Multispectral imager: a blanketed telescope barrel whose aperture shows the colour filter strips, with its cover swung open. */
export function multispectral(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.9 * L, 0.3 * L, 0.9 * L), m.alu, 0, 0.15 * L, 0)
  put(g, box(0.025 * L, 0.5 * L, 0.7 * L), m.white, -0.46 * L, 0.3 * L, 0)
  put(g, cyl(0.34 * L, 0.36 * L, 0.9 * L, 24), m.goldMLI, 0, 0.75 * L, 0)
  put(g, cyl(0.37 * L, 0.37 * L, 0.05 * L, 24), m.alu, 0, 1.2 * L, 0)
  put(g, cyl(0.31 * L, 0.31 * L, 0.012 * L, 24), m.glass, 0, 1.226 * L, 0)
  // One strip per colour band: blue, green, red and near-infrared.
  const bands = [m.filterBlue, m.filterGreen, m.filterRed, m.filterNir]
  bands.forEach((mat, i) => {
    const x = (i - 1.5) * 0.14 * L
    put(g, box(0.12 * L, 0.012 * L, 2 * Math.sqrt(0.3 ** 2 - (x / L) ** 2) * L * 0.92), mat, x, 1.236 * L, 0)
  })
  const lid = new THREE.Group()
  lid.position.set(0.37 * L, 1.22 * L, 0)
  lid.rotation.z = -1.95
  g.add(lid)
  put(lid, cyl(0.33 * L, 0.33 * L, 0.02 * L, 24), m.white, -0.33 * L, 0, 0)
  put(g, cyl(0.03 * L, 0.03 * L, 0.2 * L, 8), m.steel, 0.37 * L, 1.22 * L, 0, Math.PI / 2)
}

/** Geostationary weather imager: a big box with a scan mirror under a sunshield hood, and a white radiant cooler on one end. */
export function weatherImager(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.9 * L, 0.6 * L, 0.8 * L), m.goldMLI, 0, 0.3 * L, 0)
  put(g, box(0.5 * L, 0.012 * L, 0.5 * L), m.black, -0.14 * L, 0.607 * L, 0)
  for (const a of [-1, 1]) put(g, box(0.52 * L, 0.22 * L, 0.02 * L), m.white, -0.14 * L, 0.71 * L, a * 0.26 * L)
  put(g, box(0.02 * L, 0.5 * L, 0.54 * L), m.white, 0.12 * L, 0.85 * L, 0)
  // The mirror sweeps the view across the whole Earth disc, line by line.
  put(g, box(0.5 * L, 0.02 * L, 0.46 * L), m.mirror, -0.14 * L, 0.8 * L, 0, 0, 0, 0.62)
  put(g, box(0.03 * L, 0.5 * L, 0.7 * L), m.white, 0.465 * L, 0.3 * L, 0)
  put(g, box(0.22 * L, 0.02 * L, 0.7 * L), m.white, 0.38 * L, 0.66 * L, 0, 0, 0, -0.55)
  put(g, cyl(0.07 * L, 0.07 * L, 0.12 * L, 14), m.aluDark, 0.28 * L, 0.66 * L, -0.26 * L)
  put(g, cyl(0.055 * L, 0.055 * L, 0.01 * L, 14), m.glass, 0.28 * L, 0.722 * L, -0.26 * L)
}

/** Infrared spectrometer: a slit under a rectangular hood, and a cone-shaped radiator that cools the detector by facing cold space. */
export function spectrometer(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.78 * L, 0.5 * L, 0.62 * L), m.silverMLI, -0.08 * L, 0.25 * L, 0)
  put(g, box(0.34 * L, 0.01 * L, 0.2 * L), m.black, -0.18 * L, 0.506 * L, 0)
  put(g, box(0.3 * L, 0.012 * L, 0.05 * L), m.glass, -0.18 * L, 0.512 * L, 0)
  for (const a of [-1, 1]) {
    put(g, box(0.38 * L, 0.4 * L, 0.02 * L), m.aluDark, -0.18 * L, 0.7 * L, a * 0.11 * L)
    put(g, box(0.02 * L, 0.4 * L, 0.24 * L), m.aluDark, (-0.18 + a * 0.19) * L, 0.7 * L, 0)
  }
  put(g, cyl(0.24 * L, 0.1 * L, 0.2 * L, 20, true), m.whiteDouble, 0.39 * L, 0.27 * L, 0, 0, 0, -Math.PI / 2)
  put(g, cyl(0.1 * L, 0.1 * L, 0.01 * L, 16), m.black, 0.3 * L, 0.27 * L, 0, 0, 0, -Math.PI / 2)
}

/** Microwave sounder: a tilted spinning reflector in a half shroud that sweeps the view, feeding a row of horns. */
export function sounder(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.92 * L, 0.3 * L, 0.6 * L), m.white, 0, 0.15 * L, 0)
  put(g, new THREE.CylinderGeometry(0.29 * L, 0.29 * L, 0.5 * L, 20, 1, true, 0, Math.PI), m.whiteDouble, -0.16 * L, 0.52 * L, 0, 0, Math.PI / 2, Math.PI / 2)
  put(g, cyl(0.1 * L, 0.1 * L, 0.2 * L, 14), m.aluDark, -0.36 * L, 0.52 * L, 0, 0, 0, Math.PI / 2)
  put(g, cyl(0.23 * L, 0.23 * L, 0.02 * L, 24), m.steel, -0.14 * L, 0.54 * L, 0, 0, 0, -Math.PI / 4)
  put(g, box(0.2 * L, 0.34 * L, 0.5 * L), m.aluDark, 0.36 * L, 0.47 * L, 0)
  for (const z of [-0.15, 0, 0.15]) put(g, cyl(0.07 * L, 0.03 * L, 0.14 * L, 12, true), m.gold, 0.2 * L, 0.52 * L, z * L, 0, 0, Math.PI / 2)
}

/** Laser altimeter: laser tubes that fire green pulses at the ground, next to a wide telescope that catches the echo. */
export function altimeter(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.95 * L, 0.12 * L, 0.8 * L), m.alu, 0, 0.06 * L, 0)
  put(g, cyl(0.3 * L, 0.3 * L, 0.8 * L, 24, true), m.whiteDouble, -0.15 * L, 0.52 * L, 0)
  put(g, cyl(0.285 * L, 0.285 * L, 0.02 * L, 24), m.mirror, -0.15 * L, 0.16 * L, 0)
  put(g, cyl(0.07 * L, 0.07 * L, 0.03 * L, 12), m.aluDark, -0.15 * L, 0.86 * L, 0)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU
    strut(g, V(-0.15 * L, 0.86 * L, 0), V((-0.15 + Math.sin(a) * 0.3) * L, 0.86 * L, Math.cos(a) * 0.3 * L), 0.008 * L, m.aluDark, 4)
  }
  put(g, box(0.28 * L, 0.2 * L, 0.6 * L), m.goldMLI, 0.32 * L, 0.22 * L, 0)
  for (const z of [-0.16, 0, 0.16]) {
    put(g, cyl(0.055 * L, 0.055 * L, 0.5 * L, 12), m.aluDark, 0.32 * L, 0.57 * L, z * L)
    put(g, cyl(0.04 * L, 0.04 * L, 0.012 * L, 12), m.laser, 0.32 * L, 0.824 * L, z * L)
  }
}

/** Radiation detector: two collimated particle telescopes looking in different directions, and a dome-shaped analyser. */
export function particles(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.8 * L, 0.42 * L, 0.7 * L), m.goldMLI, 0, 0.21 * L, 0)
  for (const a of [-1, 1]) {
    const t = new THREE.Group()
    t.position.set(a * 0.2 * L, 0.4 * L, 0.12 * L)
    t.rotation.z = -a * 0.5
    g.add(t)
    put(t, cyl(0.12 * L, 0.12 * L, 0.34 * L, 16), m.aluDark, 0, 0.17 * L, 0)
    put(t, cyl(0.15 * L, 0.12 * L, 0.1 * L, 16, true), m.black, 0, 0.39 * L, 0)
    put(t, cyl(0.1 * L, 0.1 * L, 0.006 * L, 16), m.gold, 0, 0.344 * L, 0)
  }
  put(g, new THREE.SphereGeometry(0.15 * L, 16, 8, 0, TAU, 0, Math.PI / 2), m.steel, 0, 0.42 * L, -0.18 * L)
}

/** Unknown instrument: a blanketed box with one round aperture. */
export function generic(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.7 * L, 0.5 * L, 0.7 * L), m.goldMLI, 0, 0.25 * L, 0)
  put(g, cyl(0.2 * L, 0.2 * L, 0.16 * L, 16), m.aluDark, 0, 0.58 * L, 0)
  put(g, cyl(0.17 * L, 0.17 * L, 0.01 * L, 16), m.glass, 0, 0.662 * L, 0)
}

/** Magnetometer: a long boom along +y keeps the sensors away from the spacecraft's own magnetic field. */
export function magnetometer(g: THREE.Object3D, len: number) {
  const m = mats()
  const r = Math.max(0.007 * len, 0.003)
  put(g, box(7 * r, 4 * r, 7 * r), m.alu, 0, 2 * r, 0)
  strut(g, V(0, 0, 0), V(0, len, 0), r, m.alu, 8)
  const knuckle = new THREE.SphereGeometry(r * 2, 10, 8)
  for (const k of [1 / 3, 2 / 3]) put(g, knuckle, m.steel, 0, len * k, 0)
  // Two sensors: comparing them cancels what is left of the spacecraft's field.
  put(g, box(0.04 * len, 0.05 * len, 0.04 * len), m.white, 0.028 * len, len * 0.6, 0)
  put(g, cyl(0.032 * len, 0.032 * len, 0.09 * len, 14), m.silverMLI, 0, len * 1.045, 0)
  put(g, cyl(0.034 * len, 0.034 * len, 0.012 * len, 14), m.white, 0, len * 1.096, 0)
}

/** Subsurface radar, origin on the lower -x edge of the bus: a long thin dipole along z. Long radio waves need a long antenna. */
export function dipoleRadar(g: THREE.Object3D, len: number, s: number) {
  const m = mats()
  const b = 0.09 * s
  const r = Math.max(0.004 * len, 0.006 * s)
  put(g, box(b, b, 1.6 * b), m.goldMLI, -0.6 * b, -0.6 * b, 0)
  const knuckle = new THREE.SphereGeometry(r * 1.8, 10, 8)
  for (const a of [-1, 1]) {
    strut(g, V(-0.6 * b, -0.6 * b, a * 0.8 * b), V(-0.6 * b, -0.6 * b, a * (0.8 * b + len / 2)), r, m.alu, 8)
    for (const k of [0, 1 / 3, 2 / 3, 1]) put(g, knuckle, m.steel, -0.6 * b, -0.6 * b, a * (0.8 * b + (k * len) / 2))
  }
}

/** Synthetic aperture radar, origin on the lower +x edge: a long panel of radiating tiles held below the wing, looking down and sideways. */
export function sar(g: THREE.Object3D, len: number, s: number) {
  const m = mats()
  const w = len / 4.5
  const t = 0.04 * w
  const panel = new THREE.Group()
  panel.position.set(0.433 * w + 0.08 * s, -(0.25 * w + 0.08 * s), 0)
  // 30 degrees off straight down: radar maps by looking to the side of its track.
  panel.rotation.z = Math.PI / 6
  g.add(panel)
  const seg = len / 3
  const face = box(w, t, seg * 0.985)
  const uv = face.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * Math.max(1, Math.round((seg / w) * 2)))
  for (let i = -1; i <= 1; i++) {
    put(panel, face, [m.alu, m.alu, m.aluDark, m.radar, m.alu, m.alu], 0, 0, i * seg)
    for (const x of [-0.3, 0.3]) put(panel, box(0.04 * w, 0.06 * w, seg * 0.9), m.alu, x * w, t / 2 + 0.03 * w, i * seg)
    if (i < 1) for (const x of [-0.35, 0.35]) put(panel, cyl(t, t, 0.12 * w, 8), m.steel, x * w, t, (i + 0.5) * seg, 0, 0, Math.PI / 2)
  }
  panel.updateMatrix()
  for (const z of [-1, 1]) for (const x of [-0.3, 0.3]) {
    strut(g, V(0, 0, z * 0.12 * len), V(x * w, t / 2 + 0.06 * w, z * 0.2 * len).applyMatrix4(panel.matrix), 0.012 * w, m.aluDark)
  }
}

/** Space telescope along +y: blanketed tube, mirrors inside, and an aperture door that doubles as a sunshade. `d` is the tube diameter. */
export function telescope(g: THREE.Object3D, d: number) {
  const m = mats()
  const r = d / 2
  const len = 3 * d
  const y0 = 0.55 * d
  put(g, cyl(0.6 * d, 0.6 * d, 0.05 * d, 24), m.alu, 0, 0.025 * d, 0)
  put(g, cyl(0.62 * d, 0.62 * d, 0.5 * d, 8), m.silverMLI, 0, 0.3 * d, 0)
  put(g, cyl(r, r, len, 28, true), m.silverMLI, 0, y0 + len / 2, 0)
  put(g, cyl(r * 0.97, r * 0.97, len, 28, true), m.black, 0, y0 + len / 2, 0)
  for (const k of [0.33, 0.66, 1]) put(g, new THREE.TorusGeometry(r * 1.01, 0.018 * d, 6, 28), m.alu, 0, y0 + len * k, 0, Math.PI / 2)
  put(g, cyl(r * 0.93, r * 0.93, 0.03 * d, 28), m.mirror, 0, y0 + 0.15 * d, 0)
  put(g, cyl(0.13 * d, 0.13 * d, 0.06 * d, 12), m.aluDark, 0, y0 + 0.8 * len, 0)
  for (const a of [0, Math.PI / 2]) put(g, box(r * 1.94, 0.05 * d, 0.008 * d), m.aluDark, 0, y0 + 0.8 * len, 0, 0, a, 0)
  put(g, cyl(0.06 * d, 0.06 * d, 0.6 * d, 10), m.aluDark, r + 0.07 * d, y0 + len * 0.45, 0)
  const door = new THREE.Group()
  door.position.set(0, y0 + len, -r)
  door.rotation.x = -1.75
  g.add(door)
  put(door, cyl(r, r, 0.03 * d, 28), [m.white, m.black, m.white], 0, 0.015 * d, r * 1.04)
  for (const x of [-0.25, 0.25]) put(door, box(0.05 * d, 0.03 * d, 0.2 * d), m.steel, x * d, 0.015 * d, 0.06 * d)
  put(g, cyl(0.035 * d, 0.035 * d, 0.3 * d, 8), m.steel, 0, y0 + len, -r, 0, 0, Math.PI / 2)
}
