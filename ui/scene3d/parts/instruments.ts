// Science instruments, each modelled on real flight hardware (REFERENCES.md). Deck instruments sit on a square
// footprint of side L at y = 0 and look along +y (the craft turns that to nadir). Booms, radars and the
// telescope have their own mounts (layout.ts).
import * as THREE from 'three'
import { aim, box, cyl, dishGeometry, groupBox, mats, put, strut, tile } from './kit'
import { INSTRUMENT } from './references'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const TAU = Math.PI * 2

/** A secondary mirror on a three-vane spider across a tube of radius r, at height y. */
function spider(g: THREE.Object3D, x: number, y: number, z: number, r: number) {
  const m = mats()
  put(g, cyl(0.3 * r, 0.3 * r, 0.12 * r, 12), m.aluDark, x, y, z)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU
    strut(g, V(x, y, z), V(x + Math.sin(a) * r, y, z + Math.cos(a) * r), 0.025 * r, m.aluDark, 4)
  }
}

/** MarCO's wide-field colour camera: a small board camera, a lens barrel with a focus ring, and a baffle with vanes. */
export function camera(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.76 * L, 0.05 * L, 0.76 * L), m.alu, 0, 0.025 * L, 0)
  put(g, box(0.7 * L, 0.4 * L, 0.7 * L), m.aluDark, 0, 0.25 * L, 0)
  put(g, box(0.02 * L, 0.3 * L, 0.5 * L), m.white, 0.36 * L, 0.25 * L, 0)
  put(g, box(0.12 * L, 0.08 * L, 0.2 * L), m.ceramic, -0.38 * L, 0.14 * L, 0)
  put(g, cyl(0.25 * L, 0.27 * L, 0.4 * L, 20), m.aluDark, 0, 0.65 * L, 0)
  put(g, cyl(0.285 * L, 0.285 * L, 0.07 * L, 20), m.alu, 0, 0.58 * L, 0)
  put(g, cyl(0.23 * L, 0.23 * L, 0.02 * L, 20), m.glass, 0, 0.85 * L, 0)
  put(g, cyl(0.4 * L, 0.26 * L, 0.42 * L, 20, true), m.black, 0, 1.05 * L, 0)
  // Vanes inside the baffle stop light that comes in from the side.
  for (const [y, r] of [[0.98, 0.29], [1.12, 0.345]] as const) put(g, new THREE.TorusGeometry(r * L, 0.012 * L, 4, 20), m.black, 0, y * L, 0, Math.PI / 2)
  put(g, new THREE.TorusGeometry(0.4 * L, 0.015 * L, 6, 20), m.alu, 0, 1.26 * L, 0, Math.PI / 2)
}

/**
 * Landsat's Operational Land Imager: a blanketed telescope bench with a rectangular Earth-view baffle, the
 * round solar-calibration port with its door open, and a white radiator that cools the detectors.
 */
export function multispectral(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.92 * L, 0.05 * L, 0.92 * L), m.alu, 0, 0.025 * L, 0)
  put(g, box(0.66 * L, 0.6 * L, 0.86 * L), m.silverMLI, -0.1 * L, 0.35 * L, 0)
  // Earth-view baffle: the long slot matches the line of detectors that sweeps the ground (push-broom).
  const hood = cyl(0.3 * L, 0.24 * L, 0.34 * L, 4, true).rotateY(Math.PI / 4)
  put(g, hood, m.black, -0.1 * L, 0.82 * L, -0.14 * L).scale.set(1.25, 1, 0.9)
  put(g, box(0.4 * L, 0.01 * L, 0.26 * L), m.glass, -0.1 * L, 0.66 * L, -0.14 * L)
  // One strip of detectors per colour band: blue, green, red and near-infrared show here.
  const bands = [m.filterBlue, m.filterGreen, m.filterRed, m.filterNir]
  bands.forEach((mat, i) => put(g, box(0.36 * L, 0.012 * L, 0.035 * L), mat, -0.1 * L, 0.668 * L, (-0.14 + (i - 1.5) * 0.05) * L))
  // Solar-calibration port: a diffuser inside is shown to the Sun to check the colours.
  put(g, cyl(0.15 * L, 0.15 * L, 0.2 * L, 20), m.silverMLI, -0.1 * L, 0.75 * L, 0.26 * L)
  put(g, cyl(0.12 * L, 0.12 * L, 0.01 * L, 20), m.white, -0.1 * L, 0.852 * L, 0.26 * L)
  const lid = new THREE.Group()
  lid.position.set(-0.1 * L, 0.86 * L, 0.42 * L)
  lid.rotation.x = 1.9
  g.add(lid)
  put(lid, cyl(0.15 * L, 0.15 * L, 0.015 * L, 20), m.white, 0, 0, -0.15 * L)
  put(g, cyl(0.02 * L, 0.02 * L, 0.16 * L, 8), m.steel, -0.1 * L, 0.86 * L, 0.42 * L, 0, 0, Math.PI / 2)
  // Detector radiator, held off the bench so it only sees cold space.
  put(g, box(0.02 * L, 0.62 * L, 0.8 * L), m.white, 0.42 * L, 0.42 * L, 0)
  for (const z of [-0.3, 0.3]) for (const y of [0.2, 0.6]) strut(g, V(0.23 * L, y * L, z * L), V(0.41 * L, y * L, z * L), 0.012 * L, m.alu, 5)
  put(g, box(0.2 * L, 0.02 * L, 0.8 * L), m.white, 0.35 * L, 0.76 * L, 0, 0, 0, 0.5)
}

/** GOES-R's Advanced Baseline Imager: a big box with a scan mirror under a sunshield hood, and a white radiator on one end. */
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

/** OSIRIS-REx's OTES: a blanketed interferometer box with a 15 cm telescope on top, its secondary mirror on a spider, and a sunshade lip. */
export function spectrometer(g: THREE.Object3D, L: number) {
  const m = mats()
  const [w, d] = [INSTRUMENT.otes.size[0], INSTRUMENT.otes.size[1]]
  // The real box is 37.5 x 28.9 cm seen along the telescope, with a 15.2 cm aperture.
  const r = (INSTRUMENT.otes.aperture / w) * 0.86 * L * 0.5
  put(g, box(0.9 * L, 0.04 * L, (0.9 * L * d) / w + 0.1 * L), m.alu, 0, 0.02 * L, 0)
  put(g, box(0.86 * L, 0.5 * L, (0.86 * L * d) / w), m.silverMLI, 0, 0.29 * L, 0)
  put(g, box(0.3 * L, 0.3 * L, 0.03 * L), m.aluDark, 0.22 * L, 0.3 * L, (0.43 * L * d) / w + 0.015 * L)
  const [x, y0, len] = [-0.16 * L, 0.54 * L, 0.42 * L]
  put(g, cyl(r * 1.12, r * 1.12, len, 24, true), m.silverMLI, x, y0 + len / 2, 0)
  put(g, cyl(r, r, len, 24, true), m.black, x, y0 + len / 2, 0)
  put(g, new THREE.TorusGeometry(r * 1.06, 0.06 * r, 6, 24), m.alu, x, y0 + len, 0, Math.PI / 2)
  put(g, cyl(r * 0.96, r * 0.96, 0.02 * L, 24), m.mirror, x, y0 + 0.03 * L, 0)
  spider(g, x, y0 + len * 0.86, 0, r)
  // Sunshade: half a collar on the side the Sun can reach.
  put(g, new THREE.CylinderGeometry(r * 1.2, r * 1.2, 0.24 * L, 16, 1, true, 0, Math.PI), m.whiteDouble, x, y0 + len + 0.12 * L, 0)
  // Radiator plate for the electronics.
  put(g, box(0.34 * L, 0.012 * L, 0.36 * L), m.white, 0.22 * L, 0.547 * L, 0)
  put(g, cyl(0.03 * L, 0.03 * L, 0.08 * L, 8), m.gold, 0.43 * L, 0.2 * L, 0, 0, 0, Math.PI / 2)
}

/** ATMS: two tilted reflectors spinning on one shaft, a big one for the low channels and a small one for the high, each in its shroud. */
export function sounder(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.94 * L, 0.3 * L, 0.64 * L), m.white, 0, 0.15 * L, 0)
  put(g, box(0.9 * L, 0.012 * L, 0.6 * L), m.goldMLI, 0, 0.306 * L, 0)
  // The shaft and its drive: the reflectors sweep the view across the track, then past a warm target and cold space to calibrate.
  put(g, cyl(0.035 * L, 0.035 * L, 0.9 * L, 10), m.steel, 0, 0.56 * L, 0, 0, 0, Math.PI / 2)
  for (const a of [-1, 1]) put(g, box(0.08 * L, 0.36 * L, 0.3 * L), m.aluDark, a * 0.43 * L, 0.48 * L, 0)
  for (const [x, r, w] of [[-0.17, 0.21, 0.36], [0.22, 0.14, 0.26]] as const) {
    put(g, new THREE.CylinderGeometry(r * 1.2 * L, r * 1.2 * L, w * L, 20, 1, true, 0, Math.PI), m.whiteDouble, x * L, 0.56 * L, 0, 0, Math.PI / 2, Math.PI / 2)
    put(g, cyl(r * L, r * L, 0.02 * L, 24), m.steel, x * L, 0.56 * L, 0, 0, 0, -Math.PI / 4).scale.x = 1.35
    // The feed horn each reflector throws the signal into.
    put(g, cyl(0.07 * L, 0.03 * L, 0.1 * L, 12, true), m.gold, (x + w / 2 - 0.02) * L, 0.56 * L, 0, 0, 0, Math.PI / 2)
  }
  put(g, box(0.07 * L, 0.012 * L, 0.5 * L), m.black, 0.02 * L, 0.32 * L, 0)
}

/**
 * LOLA: a 14 cm receiver telescope that catches the laser echo, the beam expander beside it that sends one
 * pulse out as five beams, and five detectors fed by fibres. The laser is infrared, so nothing glows.
 */
export function altimeter(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.95 * L, 0.06 * L, 0.8 * L), m.alu, 0, 0.03 * L, 0)
  put(g, box(0.9 * L, 0.16 * L, 0.74 * L), m.goldMLI, 0, 0.14 * L, 0)
  const [x, r, len] = [-0.18 * L, 0.24 * L, 0.6 * L]
  put(g, cyl(r * 1.06, r * 1.06, len, 24, true), m.goldMLI, x, 0.22 * L + len / 2, 0)
  put(g, cyl(r, r, len, 24, true), m.black, x, 0.22 * L + len / 2, 0)
  put(g, new THREE.TorusGeometry(r * 1.03, 0.04 * r, 6, 24), m.alu, x, 0.22 * L + len, 0, Math.PI / 2)
  put(g, cyl(r * 0.96, r * 0.96, 0.02 * L, 24), m.mirror, x, 0.26 * L, 0)
  spider(g, x, 0.22 * L + len * 0.88, 0, r)
  // Laser beam expander: a smaller tube with a lens, next to the telescope.
  put(g, cyl(0.085 * L, 0.085 * L, 0.5 * L, 16), m.aluDark, 0.26 * L, 0.47 * L, -0.16 * L)
  put(g, cyl(0.07 * L, 0.07 * L, 0.012 * L, 16), m.glass, 0.26 * L, 0.722 * L, -0.16 * L)
  put(g, new THREE.TorusGeometry(0.085 * L, 0.012 * L, 5, 16), m.alu, 0.26 * L, 0.72 * L, -0.16 * L, Math.PI / 2)
  // Five detectors, one per beam, each on its own fibre from the telescope.
  for (let i = 0; i < INSTRUMENT.lola.beams; i++) {
    const z = (0.08 + i * 0.06) * L
    put(g, box(0.1 * L, 0.1 * L, 0.045 * L), m.aluDark, 0.3 * L, 0.27 * L, z)
    strut(g, V(x + r * 0.9, 0.3 * L, z * 0.6), V(0.25 * L, 0.3 * L, z), 0.008 * L, m.kapton, 4)
  }
  put(g, box(0.02 * L, 0.3 * L, 0.5 * L), m.white, 0.46 * L, 0.37 * L, 0.05 * L)
}

/**
 * CRaTER: a telescope of six silicon detectors and tissue-like plastic with an opening at each end (one to
 * the sky, one to the ground), beside its electronics box. Mounted on a side face: the tube runs along z.
 */
export function particles(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.86 * L, 0.04 * L, 0.72 * L), m.alu, 0, 0.02 * L, 0)
  put(g, box(0.46 * L, 0.36 * L, 0.66 * L), m.goldMLI, -0.18 * L, 0.22 * L, 0)
  put(g, cyl(0.03 * L, 0.03 * L, 0.06 * L, 8), m.gold, -0.18 * L, 0.42 * L, 0.2 * L)
  const x = 0.24 * L
  put(g, cyl(0.15 * L, 0.15 * L, 0.6 * L, 20), m.aluDark, x, 0.22 * L, 0, Math.PI / 2)
  // The block of plastic in the middle stands in for human tissue.
  put(g, cyl(0.158 * L, 0.158 * L, 0.2 * L, 20), m.black, x, 0.22 * L, 0, Math.PI / 2)
  for (const a of [-1, 1]) {
    put(g, cyl(0.13 * L, 0.15 * L, 0.06 * L, 20, true), m.black, x, 0.22 * L, a * 0.33 * L, (a * Math.PI) / 2)
    put(g, cyl(0.125 * L, 0.125 * L, 0.006 * L, 20), m.gold, x, 0.22 * L, a * 0.302 * L, Math.PI / 2)
    put(g, box(0.36 * L, 0.2 * L, 0.03 * L), m.alu, x, 0.12 * L, a * 0.2 * L)
  }
}

/** Unknown instrument: a blanketed box with one round aperture. */
export function generic(g: THREE.Object3D, L: number) {
  const m = mats()
  put(g, box(0.7 * L, 0.5 * L, 0.7 * L), m.goldMLI, 0, 0.25 * L, 0)
  put(g, cyl(0.2 * L, 0.2 * L, 0.16 * L, 16), m.aluDark, 0, 0.58 * L, 0)
  put(g, cyl(0.17 * L, 0.17 * L, 0.01 * L, 16), m.glass, 0, 0.662 * L, 0)
}

/** MAVEN-type fluxgate magnetometer: a hinged boom along +y keeps the sensors away from the spacecraft's own magnetic field. */
export function magnetometer(g: THREE.Object3D, len: number) {
  const m = mats()
  const r = Math.max(0.007 * len, 0.003)
  // The sensors are a few centimeters across whatever the boom length.
  const q = Math.min(0.032 * len, 0.045)
  put(g, box(7 * r, 4 * r, 7 * r), m.alu, 0, 2 * r, 0)
  strut(g, V(0, 0, 0), V(0, len, 0), r, m.aluDark, 8)
  strut(g, V(r * 1.4, 0, 0), V(r * 1.4, len, 0), r * 0.35, m.kapton, 4)
  const knuckle = new THREE.SphereGeometry(r * 2, 10, 8)
  for (const k of [1 / 3, 2 / 3]) put(g, knuckle, m.steel, 0, len * k, 0)
  // Two sensors: comparing them cancels what is left of the spacecraft's field.
  put(g, box(1.3 * q, 1.6 * q, 1.3 * q), m.white, 0.9 * q, len * 0.6, 0)
  put(g, cyl(q, q, 2.8 * q, 14), m.silverMLI, 0, len + 1.4 * q, 0)
  put(g, cyl(q * 1.06, q * 1.06, 0.4 * q, 14), m.white, 0, len + 3 * q, 0)
}

/** SHARAD, origin on the lower -x edge of the bus: a dipole of two folding tubes along z. Long radio waves need a long antenna. */
export function dipoleRadar(g: THREE.Object3D, len: number, s: number) {
  const m = mats()
  const b = 0.09 * s
  const r = Math.max(0.004 * len, 0.006 * s)
  put(g, box(b, b, 1.6 * b), m.goldMLI, -0.6 * b, -0.6 * b, 0)
  const knuckle = new THREE.SphereGeometry(r * 1.8, 10, 8)
  for (const a of [-1, 1]) {
    strut(g, V(-0.6 * b, -0.6 * b, a * 0.8 * b), V(-0.6 * b, -0.6 * b, a * (0.8 * b + len / 2)), r, m.tape, 8)
    // The tubes were folded at these joints for launch and sprang straight in orbit.
    for (const k of [0, 0.25, 0.5, 0.75, 1]) put(g, knuckle, m.steel, -0.6 * b, -0.6 * b, a * (0.8 * b + (k * len) / 2))
  }
}

/**
 * NISAR, origin on the lower +x edge of the bus: a gold mesh reflector of diameter D in its ring truss (the
 * "snare drum"), held out on a hinged boom, and the feed on the bus that lights it. The reflector throws
 * the radar beam down and to the side. Everything stays below and outside the bus, clear of the wing.
 */
export function sar(g: THREE.Object3D, D: number, s: number) {
  const m = mats()
  const R = D / 2
  const k = D / INSTRUMENT.nisar.reflector
  const f = 0.9 * D
  const depth = (R * R) / (4 * f)
  const axis = V(-0.5, -0.866, 0)
  const centre = V(0.1 * s + 0.62 * D, -(0.08 * s + 0.36 * D), 0)
  const ref = aim(new THREE.Group(), axis)
  ref.position.copy(centre)
  g.add(ref)
  put(ref, tile(dishGeometry(R, f, 48), 24, 5), m.mesh)
  // Ring truss: two hoops joined by battens and diagonals. It unfolded from a bundle 0.6 m across.
  const back = depth - 0.1 * D
  const hoop = new THREE.TorusGeometry(R, 0.004 * D, 5, 48)
  for (const y of [depth, back]) put(ref, hoop, m.aluDark, 0, y, 0, Math.PI / 2)
  const batten = cyl(0.003 * D, 0.003 * D, 0.1 * D, 5)
  const n = 24
  let diagonal: THREE.Mesh | undefined
  for (let i = 0; i < n; i++) {
    const bay = new THREE.Group()
    bay.rotation.y = (i / n) * TAU
    ref.add(bay)
    put(bay, batten, m.aluDark, 0, (depth + back) / 2, R)
    if (diagonal) bay.add(diagonal.clone())
    else diagonal = strut(bay, V(0, depth, R), V(Math.sin(TAU / n) * R, back, Math.cos(TAU / n) * R), 0.002 * D, m.aluDark, 4)
  }
  ref.updateMatrix()
  // Boom: four hinges, as on NISAR's 9 m boom, from the bus to the rim of the drum.
  const root = V(0.03 * s, -0.03 * s, 0.1 * D)
  const rim = V(R * Math.cos(Math.asin(0.2)), back, 0.2 * R).applyMatrix4(ref.matrix)
  const elbow = root.clone().lerp(rim, 0.5).add(V(0, 0.02 * D, 0))
  const knuckle = new THREE.SphereGeometry(0.014 * D, 8, 6)
  const path = [root, root.clone().lerp(elbow, 0.5), elbow, elbow.clone().lerp(rim, 0.5), rim]
  path.forEach((p, i) => {
    if (i) strut(g, path[i - 1]!, p, 0.009 * D, m.aluDark, 6)
    if (i < 4) put(g, knuckle, m.steel, p.x, p.y, p.z)
  })
  // Feed: a panel of radiating tiles on the bus, facing the reflector. NISAR's is about 2 m long.
  const at = V(0.05 * s + 0.03 * D, -(0.05 * s + 0.02 * D), 0)
  const feed = new THREE.Group()
  feed.position.copy(at)
  feed.rotation.z = Math.atan2(centre.y - at.y, centre.x - at.x)
  g.add(feed)
  const face = groupBox(tile(box(0.012 * D, 0.07 * D, 2 * k), 2, 6), [0, 1, 2, 2, 2, 2])
  put(feed, face, [m.radar, m.aluDark, m.alu])
  put(feed, box(0.03 * D, 0.05 * D, 1.6 * k), m.goldMLI, -0.022 * D, 0, 0)
  strut(g, V(0.01 * s, -0.02 * s, 0), at, 0.012 * D, m.alu, 6)
}

/** GALEX along +y: a blanketed tube around a 50 cm mirror, the secondary on its spider, and the aperture door swung open. `d` is the tube diameter. */
export function telescope(g: THREE.Object3D, d: number) {
  const m = mats()
  const r = d / 2
  const len = (INSTRUMENT.galex.length / INSTRUMENT.galex.tube) * d
  const y0 = 0.4 * d
  put(g, cyl(0.6 * d, 0.6 * d, 0.05 * d, 24), m.alu, 0, 0.025 * d, 0)
  put(g, cyl(0.62 * d, 0.62 * d, 0.36 * d, 8), m.goldMLI, 0, 0.22 * d, 0)
  put(g, cyl(r, r, len, 28, true), m.silverMLI, 0, y0 + len / 2, 0)
  put(g, cyl(r * 0.97, r * 0.97, len, 28, true), m.black, 0, y0 + len / 2, 0)
  for (const k of [0.33, 0.66, 1]) put(g, new THREE.TorusGeometry(r * 1.01, 0.018 * d, 6, 28), m.alu, 0, y0 + len * k, 0, Math.PI / 2)
  // The 50 cm primary mirror fills most of the tube.
  put(g, cyl(r * (INSTRUMENT.galex.aperture / INSTRUMENT.galex.tube) * 1.1, r * 0.93, 0.03 * d, 28), m.mirror, 0, y0 + 0.15 * d, 0)
  spider(g, 0, y0 + 0.8 * len, 0, r * 0.97)
  put(g, cyl(0.06 * d, 0.06 * d, 0.6 * d, 10), m.aluDark, r + 0.07 * d, y0 + len * 0.45, 0)
  put(g, box(0.22 * d, 0.5 * d, 0.012 * d), m.white, 0, y0 + len * 0.4, r + 0.012 * d)
  const door = new THREE.Group()
  door.position.set(0, y0 + len, -r)
  door.rotation.x = -1.75
  g.add(door)
  put(door, cyl(r, r, 0.03 * d, 28), [m.white, m.black, m.white], 0, 0.015 * d, r * 1.04)
  for (const x of [-0.25, 0.25]) put(door, box(0.05 * d, 0.03 * d, 0.2 * d), m.steel, x * d, 0.015 * d, 0.06 * d)
  put(g, cyl(0.035 * d, 0.035 * d, 0.3 * d, 8), m.steel, 0, y0 + len, -r, 0, 0, Math.PI / 2)
}
