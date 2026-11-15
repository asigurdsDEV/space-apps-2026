// What the open fairing uncovers, built like flight hardware: the top of the upper stage, the payload
// adapter, the rideshare dispenser and the small satellites that ride on it. Everything here wears one
// material (an atlas of eight surface finishes), so each satellite and the whole dispenser are one draw call each.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { foilRelief } from '../parts/kit'
import { dome, lathe, pipe, skin } from './kit'

type G = THREE.BufferGeometry
type Ctx = CanvasRenderingContext2D

/** The finishes in the atlas, four across and two down. */
const TILE = { gold: 0, silver: 1, black: 2, cells: 3, isogrid: 4, alu: 5, dark: 6, white: 7 } as const
export type Tile = keyof typeof TILE
const S = 256
/** Texels kept clear at a tile's edge, so a neighbour never bleeds in when the texture is seen small. */
const INSET = 6 / S

/** Paints the atlas: colour on `c`; height (red), roughness (green) and metalness (blue) on `d`. */
function paintHardware(c: Ctx, _w: number, _h: number, d: Ctx): void {
  const at = (tile: Tile): [number, number] => [(TILE[tile] % 4) * S, Math.floor(TILE[tile] / 4) * S]
  const finish = (height: number, rough: number, metal: number) => `rgb(${Math.round(height * 255)},${Math.round(rough * 255)},${Math.round(metal * 255)})`
  const flat = (tile: Tile, colour: string, rough: number, metal: number): [number, number] => {
    const [x, y] = at(tile)
    c.fillStyle = colour
    c.fillRect(x, y, S, S)
    d.fillStyle = finish(0.5, rough, metal)
    d.fillRect(x, y, S, S)
    return [x, y]
  }

  // Multi-layer insulation: one crumple pattern in three foils. The creases are shaded into the colour too,
  // so foil still reads as foil when a satellite is a few pixels across.
  const n = S / 2
  const relief = foilRelief(n)
  const peak = relief.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-6)
  const small = document.createElement('canvas')
  small.width = small.height = n
  const sc = small.getContext('2d')!
  const foil = (tile: Tile, rgb: [number, number, number], rough: number, metal: number) => {
    const [x, y] = at(tile)
    const colour = sc.createImageData(n, n)
    const height = sc.createImageData(n, n)
    const h = (i: number, j: number) => relief[((j + n) % n) * n + ((i + n) % n)]!
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const lit = Math.max(0.55, Math.min(1.2, 0.86 + 0.5 * (h(i - 1, j) - h(i + 1, j)) + 0.65 * (h(i, j + 1) - h(i, j - 1))))
      const k = (j * n + i) * 4
      for (let ch = 0; ch < 3; ch++) colour.data[k + ch] = Math.min(255, rgb[ch]! * lit)
      height.data[k] = 128 + (110 * h(i, j)) / peak
      height.data[k + 1] = rough * 255
      height.data[k + 2] = metal * 255
      colour.data[k + 3] = height.data[k + 3] = 255
    }
    for (const [ctx, img] of [[c, colour], [d, height]] as const) {
      sc.putImageData(img, 0, 0)
      ctx.drawImage(small, x, y, S, S)
    }
    // Blankets are cut to fit and taped along the joins, with a tie-down button here and there.
    c.fillStyle = 'rgba(255,240,200,0.16)'
    c.fillRect(x, y + 150, S, 5)
    c.fillRect(x + 96, y, 5, S)
    c.fillStyle = 'rgba(30,20,10,0.5)'
    for (const [bx, by] of [[40, 60], [170, 60], [40, 210], [170, 210]] as const) c.fillRect(x + bx, y + by, 3, 3)
  }
  foil('gold', [232, 170, 62], 0.42, 0.7)
  foil('silver', [216, 220, 228], 0.42, 0.7)
  foil('black', [46, 47, 54], 0.45, 0.6)

  // Solar cells: blue-black cells under cover glass, the silver interconnect grid showing between them.
  {
    const [x, y] = flat('cells', '#9aa2b2', 0.4, 0.9)
    const cw = S / 4
    const ch = S / 6
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
      c.fillStyle = (i + j) % 2 ? '#0b1330' : '#0d1736'
      c.fillRect(x + i * cw + 1.5, y + j * ch + 1.5, cw - 3, ch - 3)
      d.fillStyle = finish(0.5, 0.14, 0.45)
      d.fillRect(x + i * cw + 1.5, y + j * ch + 1.5, cw - 3, ch - 3)
      c.fillStyle = 'rgba(150,165,215,0.1)'
      for (let f = 6; f < cw - 4; f += 5) c.fillRect(x + i * cw + f, y + j * ch + 2, 1, ch - 4)
    }
  }

  // Isogrid: triangular pockets milled out of plate, the ribs left standing.
  {
    const [x, y] = flat('isogrid', '#a2a7b0', 0.5, 0.8)
    const side = S / 4
    const rise = S / 4
    const rib = 3.5
    c.save()
    d.save()
    for (const ctx of [c, d]) {
      ctx.beginPath()
      ctx.rect(x, y, S, S)
      ctx.clip()
    }
    c.fillStyle = '#6a6f78'
    d.fillStyle = finish(0.18, 0.6, 0.8)
    for (let row = 0; row < 4; row++) for (let col = -1; col < 9; col++) {
      // Triangles alternate point-up and point-down along a row; odd rows are mirrored so the ribs line up.
      const up = (col + row) % 2 === 0
      const cx = x + (col * side) / 2
      const y0 = y + row * rise + (up ? rise - rib : rib)
      const y1 = y + row * rise + (up ? rib : rise - rib)
      for (const ctx of [c, d]) {
        ctx.beginPath()
        ctx.moveTo(cx - side / 2 + rib * 1.6, y0)
        ctx.lineTo(cx + side / 2 - rib * 1.6, y0)
        ctx.lineTo(cx, y1)
        ctx.fill()
      }
    }
    c.restore()
    d.restore()
  }

  // Machined aluminium: fine turning marks and a fastener row along two edges.
  {
    const [x, y] = flat('alu', '#b0b4bc', 0.42, 0.85)
    for (let j = 3; j < S; j += 5) {
      c.fillStyle = j % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
      c.fillRect(x, y + j, S, 1)
    }
    for (const row of [18, S - 18]) for (let i = 16; i < S; i += 32) {
      c.fillStyle = '#4b4e55'
      d.fillStyle = finish(0.85, 0.3, 0.95)
      for (const ctx of [c, d]) {
        ctx.beginPath()
        ctx.arc(x + i, y + row, 4, 0, 7)
        ctx.fill()
      }
    }
  }

  // Black anodise and carbon overwrap: dull, with a faint weave.
  {
    const [x, y] = flat('dark', '#17181c', 0.52, 0.55)
    c.fillStyle = 'rgba(255,255,255,0.035)'
    for (let j = 0; j < S; j += 8) c.fillRect(x, y + j, S, 2)
  }

  // White thermal paint: a panel with its edge line and corner fasteners.
  {
    const [x, y] = flat('white', '#e2e4e8', 0.5, 0.02)
    c.strokeStyle = 'rgba(70,76,88,0.5)'
    c.lineWidth = 2
    c.strokeRect(x + 12, y + 12, S - 24, S - 24)
    c.fillStyle = 'rgba(60,64,72,0.7)'
    for (const [i, j] of [[22, 22], [S - 22, 22], [22, S - 22], [S - 22, S - 22]] as const) c.fillRect(x + i - 2, y + j - 2, 4, 4)
  }
}

/** The one material all this hardware wears. Its textures are painted once and shared between rockets. */
export function hardware(): THREE.MeshStandardMaterial {
  const mat = skin({ base: '#9a9ea6', key: 'payload-hardware', extra: paintHardware, roughness: 0.4, metalness: 0.85, relief: 2.5 }, 4 * S, 2 * S, 1)
  // Metal mirrors its surroundings, and space is mostly black: the reflections are turned up so foil and machined faces catch the light.
  mat.envMapIntensity = 1.6
  return mat
}

/** Where a texture coordinate lands in a tile repeated `n` times, each repeat the mirror of the last: no seam anywhere. */
export function fold(x: number, n = 1): number {
  const m = (((x * n) % 2) + 2) % 2
  return INSET + (m > 1 ? 2 - m : m) * (1 - 2 * INSET)
}

/** Dresses a shape in one finish, repeated `nu` by `nv` times. The repeats mirror, so they must fall on the shape's own edges. */
export function on<T extends G>(geo: T, tile: Tile, nu = 1, nv = 1): T {
  const uv = geo.getAttribute('uv')
  const col = TILE[tile] % 4
  const row = Math.floor(TILE[tile] / 4)
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + fold(uv.getX(i), nu)) / 4, 1 - (row + 1 - fold(uv.getY(i), nv)) / 2)
  return geo
}

/** Many shapes as one mesh's worth. */
export const fuse = (parts: G[]): G => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))

/** A box with its edges broken, as machined and blanketed parts have. Plates and brackets too thin for that to show stay plain. */
const box = (w: number, h: number, d: number, tile: Tile, r = 0.02) =>
  on(Math.min(w, h, d) < 0.07 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(r, 0.45 * Math.min(w, h, d))), tile)
/** A flat sheet with square edges: a solar panel. */
const sheet = (w: number, h: number, d: number, tile: Tile) => on(new THREE.BoxGeometry(w, h, d), tile)
/** A cylinder or cone along y, centred: radius `r` at the bottom, `top` at the top. */
const rod = (r: number, len: number, tile: Tile, seg = 12, top = r, nu = 1) => on(new THREE.CylinderGeometry(top, r, len, seg), tile, nu)
/** Turns a shape built along +y to point along +z, the way a satellite faces out from the dispenser. */
const toZ = <T extends G>(g: T) => g.rotateX(Math.PI / 2) as T
const UP = new THREE.Vector3(0, 1, 0)
type P = [number, number, number]

/** A separation ring facing -z at z = 0: the two machined halves and the dark line of the joint between them. */
const sepRing = (r: number, len = 0.08): G[] => [
  toZ(rod(r * 0.93, len, 'dark', 12)).translate(0, 0, len / 2),
  toZ(rod(r, len * 0.42, 'alu', 18, r, 3)).translate(0, 0, len * 0.21),
  toZ(rod(r, len * 0.42, 'alu', 18, r, 3)).translate(0, 0, len * 0.79),
]

/** A star tracker: a dark conical light baffle on a small electronics box, looking along `dir` from `at`. */
function starTracker(at: P, dir: P): G[] {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize())
  const place = (g: G, lift: number) => g.translate(0, lift, 0).applyQuaternion(q).translate(...at)
  return [place(box(0.09, 0.06, 0.09, 'alu', 0.01), 0.03), place(rod(0.03, 0.15, 'dark', 12, 0.058), 0.135)]
}

/** Small thrusters on the outer face: nozzles that open along +z. */
const thrusters = (spots: [number, number][], z: number): G[] => spots.map(([x, y]) => toZ(rod(0.012, 0.06, 'dark', 8, 0.034)).translate(x, y, z + 0.03))

// Each satellite is built in meters with its separation ring at the origin facing -z (toward the dispenser)
// and its body reaching out along +z. Our own designs in the classes that really share rides.

/** An imaging microsatellite: gold-blanketed bus, two-leaf solar wings folded against the sides, a telescope looking out. */
function microsat(): G {
  const w = 0.62
  const h = 0.7
  const d = 0.8
  const z0 = 0.08
  const zc = z0 + d / 2
  const parts = [
    ...sepRing(0.15),
    box(w, h, d, 'gold', 0.05).translate(0, 0, zc),
    box(w * 0.8, 0.016, d * 0.75, 'white', 0.006).translate(0, -h / 2 - 0.006, zc),
    // Telescope barrel and its trim ring.
    toZ(rod(0.13, 0.16, 'dark', 16)).translate(0, -0.06, z0 + d + 0.07),
    on(new THREE.TorusGeometry(0.135, 0.014, 5, 14), 'alu').translate(0, -0.06, z0 + d + 0.15),
    // Patch antenna on its ground plane, and a GPS puck.
    box(0.26, 0.012, 0.26, 'dark', 0.004).translate(-0.12, h / 2 + 0.006, zc - 0.16),
    box(0.2, 0.02, 0.2, 'white', 0.006).translate(-0.12, h / 2 + 0.02, zc - 0.16),
    rod(0.035, 0.03, 'white').translate(0.17, h / 2 + 0.015, zc - 0.24),
    ...starTracker([0.14, h / 2, zc + 0.2], [0.5, 1, 0.3]),
    ...thrusters([[-0.22, 0.26], [0.22, 0.26], [-0.22, -0.28], [0.22, -0.28]], z0 + d),
  ]
  for (const s of [-1, 1]) {
    for (let leaf = 0; leaf < 2; leaf++) parts.push(sheet(0.016, h * 0.9, d * 0.88, 'cells').translate(s * (w / 2 + 0.03 + leaf * 0.028), 0, zc))
    // The hinge line, and the hold-downs that let the wing go once in orbit.
    parts.push(rod(0.014, h * 0.8, 'alu', 8).translate(s * (w / 2 + 0.03), 0, z0 + 0.03))
    for (const y of [-0.24, 0.24]) parts.push(box(0.03, 0.06, 0.06, 'alu', 0.006).translate(s * (w / 2 + 0.072), y, zc + d * 0.3))
  }
  return fuse(parts)
}

/** A data-relay satellite: a six-sided bus in black blankets with cells on three faces and a dish on the outer end. */
function relaysat(): G {
  const R = 0.34
  const d = 0.75
  const z0 = 0.08
  const zc = z0 + d / 2
  // Flat facets, not a shaded cylinder: the faces of a hexagonal bus are flat panels.
  const bus = toZ(on(new THREE.CylinderGeometry(R, R, d, 6), 'black', 6)).toNonIndexed().translate(0, 0, zc)
  bus.computeVertexNormals()
  const parts: G[] = [...sepRing(0.15), bus]
  const flatR = R * Math.cos(Math.PI / 6)
  for (const deg of [90, 210, 330]) {
    const a = (deg * Math.PI) / 180
    parts.push(sheet(R * 0.86, 0.012, d * 0.86, 'cells').rotateZ(a + Math.PI).translate(Math.sin(a) * (flatR + 0.01), -Math.cos(a) * (flatR + 0.01), zc))
  }
  // The dish is a closed shell (back, rim, face), so it shows from behind too.
  const zd = z0 + d
  parts.push(
    toZ(rod(0.07, 0.06, 'alu', 12)).translate(0, 0, zd + 0.03),
    toZ(on(lathe([[0, 0], [0.12, 0.012], [0.22, 0.04], [0.3, 0.085], [0.3, 0.095], [0.2, 0.055], [0.1, 0.03], [0, 0.022]], 20), 'white')).translate(0, 0, zd + 0.05),
    toZ(rod(0.024, 0.05, 'alu', 8)).translate(0, 0, zd + 0.3),
  )
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5
    parts.push(on(pipe([Math.sin(a) * 0.27, Math.cos(a) * 0.27, zd + 0.13], [0, 0, zd + 0.29], 0.006, 5), 'alu'))
  }
  // Two tape antennas held down along bare faces of the body until release.
  for (const [nx, ny] of [[0.5, -0.866], [-1, 0]] as const) {
    const r = flatR + 0.012
    parts.push(on(pipe([nx * r, ny * r, z0 + 0.04], [nx * r, ny * r, zd - 0.03], 0.006, 5), 'alu'))
  }
  parts.push(...starTracker([0.5 * flatR, 0.866 * flatR, zc - 0.15], [0.5, 0.866, 0]))
  return fuse(parts)
}

/** An Earth-observation satellite: a long silver-blanketed bus, a wide telescope with a sunshade, panels on three sides. */
function scopesat(): G {
  const w = 0.5
  const h = 0.52
  const d = 0.9
  const z0 = 0.08
  const zc = z0 + d / 2
  const zd = z0 + d
  return fuse([
    ...sepRing(0.15),
    box(w, h, d, 'silver', 0.045).translate(0, 0, zc),
    toZ(rod(0.215, 0.05, 'white', 20)).translate(0, 0, zd + 0.02),
    toZ(rod(0.19, 0.3, 'dark', 20)).translate(0, 0, zd + 0.17),
    on(new THREE.TorusGeometry(0.195, 0.012, 5, 16), 'alu').translate(0, 0, zd + 0.32),
    sheet(0.016, h * 0.9, d * 0.9, 'cells').translate(w / 2 + 0.03, 0, zc),
    sheet(0.016, h * 0.9, d * 0.9, 'cells').translate(-w / 2 - 0.03, 0, zc),
    sheet(w * 0.9, 0.016, d * 0.9, 'cells').translate(0, h / 2 + 0.03, zc),
    ...[-1, 1].flatMap((s) => [box(0.04, 0.03, 0.05, 'alu', 0.006).translate(s * 0.15, h / 2 + 0.015, z0 + 0.06), box(0.04, 0.03, 0.05, 'alu', 0.006).translate(s * 0.15, h / 2 + 0.015, zd - 0.06)]),
    // Downlink array and a helical antenna on the Earth-facing side.
    box(0.3, 0.016, 0.3, 'white', 0.005).translate(0, -h / 2 - 0.008, zc + 0.15),
    rod(0.022, 0.13, 'alu', 8).translate(0.12, -h / 2 - 0.065, z0 + 0.14),
    ...starTracker([-0.1, -h / 2, z0 + 0.14], [-0.6, -1, -0.2]),
    ...thrusters([[-0.2, -0.21], [0.2, -0.21]], zd),
  ])
}

/** Two CubeSat dispensers on an adapter plate: sealed boxes on rails, a sprung door on the outer end of each. */
function cubesatPods(): G {
  const parts: G[] = [box(0.52, 0.44, 0.03, 'alu', 0.008).translate(0, 0, 0.015), toZ(rod(0.15, 0.03, 'alu', 24, 0.15, 3)).translate(0, 0, -0.01)]
  for (const s of [-1, 1]) {
    const x = s * 0.125
    parts.push(
      box(0.22, 0.36, 0.5, 'alu', 0.012).translate(x, 0, 0.28),
      box(0.2, 0.34, 0.02, 'dark', 0.006).translate(x, 0, 0.54),
      rod(0.012, 0.32, 'alu', 8).translate(x + s * 0.11, 0, 0.545),
      box(0.04, 0.06, 0.03, 'alu', 0.006).translate(x - s * 0.085, 0, 0.56),
      box(0.14, 0.012, 0.36, 'white', 0.004).translate(x, 0.186, 0.28),
    )
    for (const y of [-0.19, 0.19]) parts.push(box(0.024, 0.02, 0.48, 'dark', 0.004).translate(x + s * 0.09, y, 0.28))
  }
  return fuse(parts)
}

/** The kinds of satellite that share a ride, one geometry each: every copy on the dispenser reuses it. */
export const SATELLITES = [microsat, relaysat, scopesat, cubesatPods]

/** `n` copies of a part built facing +z, stood round the axis at radius `r` and height `y`. */
const around = (make: (i: number) => G, n: number, r: number, y: number, turn = 0): G[] =>
  Array.from({ length: n }, (_, i) => make(i).translate(0, 0, r).rotateY(turn + (i / n) * Math.PI * 2).translate(0, y, 0))

/** A flange round the axis: a machined ring with its bolt circle. */
const flange = (r: number, thick: number, y: number) => rod(r, thick, 'alu', 24, r, 3).translate(0, y + thick / 2, 0)

/**
 * The top of the upper stage at height `y`, `b` meters in radius: the blanketed forward dome, the ring of
 * avionics boxes and pressure bottles round it, and their harness.
 */
export function stageTop(y: number, b: number): G[] {
  const Rd = b * 1.1
  const rise = Rd * 0.2
  const deck = y + rise * 0.42
  const boxes = around((i) => box(b * (i % 3 ? 0.3 : 0.22), b * (i % 2 ? 0.1 : 0.14), b * 0.17, (['white', 'alu', 'dark'] as const)[i % 3]!, b * 0.015), 8, b * 0.97, deck + b * 0.05)
  // Helium bottles: carbon-wrapped spheres with a metal boss.
  const bottles = around(() => on(new THREE.SphereGeometry(b * 0.085, 12, 8), 'dark'), 4, b * 0.99, deck + b * 0.07, Math.PI / 8)
  const bosses = around(() => rod(b * 0.025, b * 0.05, 'alu', 8), 4, b * 0.99, deck + b * 0.16, Math.PI / 8)
  return [
    on(lathe([[Rd, 0], ...dome(Rd, rise)], 24), 'silver', 12, 2).translate(0, y, 0),
    on(new THREE.TorusGeometry(b * 0.86, b * 0.012, 5, 32), 'gold', 8).rotateX(Math.PI / 2).translate(0, deck + b * 0.035, 0),
    ...boxes, ...bottles, ...bosses,
  ]
}

/**
 * A payload attach fitting standing on height `y`: an isogrid cone from radius `r0` up to `r1`, a bolted flange
 * at its foot and at its top the interface ring with the clamp band that lets the payload go.
 */
export function attachFitting(y: number, h: number, r0: number, r1: number): G[] {
  const lip = Math.min(h * 0.12, r1 * 0.2)
  return [
    on(new THREE.CylinderGeometry(r1, r0, h, 24, 2, true), 'isogrid', 12, 2).translate(0, y + h / 2, 0),
    flange(r0 * 1.04, lip * 0.6, y),
    flange(r1 * 1.03, lip, y + h - lip * 0.5),
    on(new THREE.TorusGeometry(r1 * 1.045, lip * 0.22, 6, 32), 'dark').rotateX(Math.PI / 2).translate(0, y + h, 0),
    // The band's two tensioners.
    ...around(() => box(lip * 0.9, lip * 0.7, lip * 0.5, 'alu', lip * 0.08), 2, r1 * 1.07, y + h),
  ]
}

/**
 * A rideshare dispenser from height `y` to `y + height`: a column of five isogrid rings of radius `rc`, four
 * round ports each, with the harness that tells every satellite when to go. `ports` is where the satellites
 * mount: [angle round the axis, radius, height].
 */
export function dispenser(y: number, height: number, rc: number, u: number): { parts: G[]; ports: [number, number, number][] } {
  const tiers = 5
  const each = 4
  // The top of the column stays bare: the satellites keep clear of the spacecraft that rides above them.
  const tier = (height * 0.93) / tiers
  const parts: G[] = [on(new THREE.CylinderGeometry(rc, rc, height, 24, tiers * 3, true), 'isogrid', 12, tiers * 3).translate(0, y + height / 2, 0)]
  const ports: [number, number, number][] = []
  const lip = 0.06 * u
  for (let t = 0; t <= tiers; t++) parts.push(flange(rc * 1.07, lip, y + t * tier - (t ? lip / 2 : 0)))
  parts.push(flange(rc * 1.07, lip, y + height - lip))
  for (let t = 0; t < tiers; t++) {
    const yc = y + (t + 0.5) * tier
    const turn = (t % 2) * (Math.PI / each)
    parts.push(...around(() => toZ(rod(0.2 * u, 0.14 * u, 'alu', 24, 0.2 * u, 3)), each, rc - 0.01 * u, yc, turn))
    for (let i = 0; i < each; i++) ports.push([turn + (i / each) * Math.PI * 2, rc + 0.065 * u, yc])
    // A connector box beside each harness run.
    parts.push(...around(() => box(0.09 * u, 0.14 * u, 0.05 * u, 'dark', 0.008 * u), 4, rc + 0.02 * u, yc + tier * 0.36, Math.PI / 8))
  }
  // Four harness runs up the column, clear of the ports.
  parts.push(...around(() => rod(0.016 * u, height * 0.96, 'gold', 6), 4, rc + 0.018 * u, y + height / 2, Math.PI / 8))
  return { parts, ports }
}
