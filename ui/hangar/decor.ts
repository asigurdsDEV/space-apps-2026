// The mission control hall itself (Ethan's reference: a dim operations room, rows of long curved desks,
// a video wall, wood panels, teal edge lights): carpet, walls, ceiling, the frames the screens hang in,
// and the operator desks with their monitors, chairs, keyboards and phones. Geometry and canvas textures
// only. Everything repeated is merged: the whole room is eleven draw calls. What the screens show is drawn by
// control.ts (screens.ts); the layout, and what blocks the player, is layout.ts.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { fuse } from '../scene3d/parts/kit'
import { CALL_WALL, DESK, DESK_ROWS, DESK_XS, ROOM, SIDE_WALL, STAND, deskPoint, type DeskRow } from './layout'
import { CALL_GRID, TILE_GRID } from './screens'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, g: c.getContext('2d')! }
}

function repeating(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

/** The same "random" number every time for `n`: 0 to 1. */
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}

/** How wide one wall panel is, metres: the wood texture repeats once per panel. */
const PANEL = 2

/**
 * A dark wood wall, floor to ceiling, already lit: the hall is dim, so the light on the walls is painted in.
 * A recessed washer above each panel throws a soft scallop down the planks, the rail and wainscot stay in
 * shadow, and the teal floor strip glows up the last few centimetres.
 */
function woodTexture(): THREE.CanvasTexture {
  const W = 512
  const H = 1280
  const { c, g } = canvas(W, H)
  const planks = 8
  const pw = W / planks
  for (let p = 0; p < planks; p++) {
    const v = hash(p)
    g.fillStyle = `rgb(${Math.round(84 + v * 26)},${Math.round(45 + v * 14)},${Math.round(28 + v * 9)})`
    g.fillRect(p * pw, 0, pw, H)
    for (let k = 0; k < 30; k++) {
      g.fillStyle = k % 3 ? `rgba(24,9,4,${0.05 + hash(k * 7 + p) * 0.12})` : `rgba(170,115,80,${0.04 + hash(k * 5 + p) * 0.07})`
      g.fillRect(p * pw + hash(p * 31 + k) * pw, 0, 1 + hash(k + p * 3) * 2, H)
    }
    g.fillStyle = 'rgba(0,0,0,0.6)'
    g.fillRect(p * pw, 0, 2, H)
  }
  const rail = H - 232 // 0.9 m up
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.fillRect(0, rail, W, H - rail)
  g.fillStyle = 'rgba(0,0,0,0.75)'
  g.fillRect(0, rail, W, 6)
  g.fillStyle = 'rgba(255,205,160,0.14)'
  g.fillRect(0, rail + 6, W, 3)
  const fall = g.createLinearGradient(0, 0, 0, H)
  fall.addColorStop(0, 'rgba(0,0,0,0.62)')
  fall.addColorStop(0.07, 'rgba(0,0,0,0.12)')
  fall.addColorStop(0.5, 'rgba(0,0,0,0.6)')
  fall.addColorStop(1, 'rgba(0,0,0,0.86)')
  g.fillStyle = fall
  g.fillRect(0, 0, W, H)
  g.save()
  g.translate(W / 2, 40)
  g.scale(0.42, 1)
  const scallop = g.createRadialGradient(0, 0, 0, 0, 0, 760)
  scallop.addColorStop(0, 'rgba(0,0,0,0)')
  scallop.addColorStop(0.55, 'rgba(0,0,0,0.22)')
  scallop.addColorStop(1, 'rgba(0,0,0,0.7)')
  g.fillStyle = scallop
  g.fillRect(-W * 2, -40, W * 4, H)
  g.restore()
  g.globalCompositeOperation = 'lighter'
  const glow = g.createLinearGradient(0, H - 110, 0, H)
  glow.addColorStop(0, 'rgba(37,194,196,0)')
  glow.addColorStop(1, 'rgba(37,194,196,0.26)')
  g.fillStyle = glow
  g.fillRect(0, H - 110, W, 110)
  return repeating(c)
}

/** How far apart the ceiling's downlights are, metres. */
const BAY = 2.5

/** A black acoustic ceiling: faint tile joints, one small recessed downlight per bay, turned right down. */
function ceilingTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(256, 256)
  g.fillStyle = '#07080b'
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#0d0f13'
  for (let i = 0; i < 256; i += 64) {
    g.fillRect(i, 0, 2, 256)
    g.fillRect(0, i, 256, 2)
  }
  const light = g.createRadialGradient(128, 128, 0, 128, 128, 30)
  light.addColorStop(0, 'rgba(255,238,210,1)')
  light.addColorStop(0.2, 'rgba(255,226,185,0.95)')
  light.addColorStop(0.32, 'rgba(150,120,90,0.3)')
  light.addColorStop(1, 'rgba(150,120,90,0)')
  g.fillStyle = light
  g.fillRect(96, 96, 64, 64)
  return repeating(c)
}

/** Carpet tiles, two by two with the pile turned a quarter each time; `tone` is the grey of the yarn, `joint` how dark the gaps are. */
function carpetTexture(tone: number, joint: number): THREE.CanvasTexture {
  const { c, g } = canvas(256, 256)
  for (let t = 0; t < 4; t++) {
    const x = (t % 2) * 128
    const y = Math.floor(t / 2) * 128
    const base = tone + ((t % 3) - 1) * 3
    g.fillStyle = `rgb(${base},${base + 1},${base + 4})`
    g.fillRect(x, y, 128, 128)
    for (let k = 0; k < 500; k++) {
      const v = base + Math.round((hash(t * 977 + k) - 0.5) * 16)
      g.fillStyle = `rgb(${v},${v + 1},${v + 4})`
      g.fillRect(x + hash(k * 3 + t) * 126, y + hash(k * 11 + t * 5) * 126, 2, 2)
    }
    g.fillStyle = `rgba(0,0,0,${joint})`
    g.fillRect(x, y, 128, 2)
    g.fillRect(x, y, 2, 128)
  }
  return repeating(c)
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z)

/** `geo` in one colour, so furniture of many colours can share one material and one draw call. */
function paint(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const { r, g, b } = new THREE.Color(hex)
  const colours = new Float32Array(geo.attributes.position!.count * 3)
  for (let i = 0; i < colours.length; i += 3) colours.set([r, g, b], i)
  return geo.setAttribute('color', new THREE.BufferAttribute(colours, 3))
}

/** A flat sheet's texture repeated `u` x `v` times. */
function tiled(geo: THREE.BufferGeometry, u: number, v: number): THREE.BufferGeometry {
  const uv = geo.attributes.uv!
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v)
  return geo
}

/** A bar that follows a desk's curve: from `s0` to `s1` along it, `d0` to `d1` across it, `y0` to `y1` high. */
function along(row: DeskRow, s0: number, s1: number, d0: number, d1: number, y0: number, y1: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(s1 - s0, y1 - y0, d1 - d0, Math.max(1, Math.ceil((s1 - s0) / 0.4)), 1, 1).translate((s0 + s1) / 2, (y0 + y1) / 2, (d0 + d1) / 2)
  const pos = geo.attributes.position!
  for (let i = 0; i < pos.count; i++) {
    const p = deskPoint(row, pos.getX(i), pos.getZ(i))
    pos.setXYZ(i, p.x, pos.getY(i), p.z)
  }
  geo.computeVertexNormals()
  return geo
}

/** `geo` (built facing +z, standing on y = 0) put on a desk at `s`, `d`, facing its operators, turned a further `turn`. */
function put(geo: THREE.BufferGeometry, row: DeskRow, s: number, d: number, y: number, turn = 0): THREE.BufferGeometry {
  const p = deskPoint(row, s, d)
  return geo.rotateY(p.yaw + turn).translate(p.x, y, p.z)
}

/** A flat monitor on a low stand, leaning back a little: its dark body, and the sheet its picture goes on. */
function monitor(w: number, h: number, lift: number): { body: THREE.BufferGeometry; screen: THREE.BufferGeometry } {
  const lean = -0.07
  return {
    body: fuse([
      box(w, h, 0.024, 0, h / 2, 0).rotateX(lean).translate(0, lift, 0),
      box(0.05, lift + h * 0.4, 0.02, 0, (lift + h * 0.4) / 2, -0.03),
      box(0.24, 0.012, 0.17, 0, 0.006, -0.02),
    ]),
    screen: new THREE.PlaneGeometry(w - 0.03, h - 0.03).translate(0, h / 2, 0.0135).rotateX(lean).translate(0, lift, 0),
  }
}

/** `screen` showing cell `index` of a canvas laid out as a grid. */
function showing(screen: THREE.BufferGeometry, index: number, grid: { cols: number; rows: number }): THREE.BufferGeometry {
  const uv = screen.attributes.uv!
  const col = index % grid.cols
  const row = Math.floor(index / grid.cols)
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / grid.cols, 1 - (row + 1 - uv.getY(i)) / grid.rows)
  return screen
}

const FABRIC = 0x0b0c0f
const STEEL = 0x30343a

/** A cushion: a box with its edges rounded off, `seg` cuts per corner. Indexed, so it merges with the plain boxes. */
function pad(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  const geo = new RoundedBoxGeometry(w, h, d, seg, r)
  return geo.setIndex([...Array(geo.attributes.position!.count).keys()])
}

/** A high-backed swivel chair on a five-star base: padded seat, back and headrest that wrap round the sitter. It stands on the floor at the origin, facing -z. */
function chair(): THREE.BufferGeometry {
  // A back cushion standing on y = 0, its sides curved forward round the sitter, leaning back on the seat.
  const back = (w: number, h: number, y: number) => {
    const geo = pad(w, h, 0.09, 0.04).translate(0, y + h / 2, 0)
    const pos = geo.attributes.position!
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) - 1.1 * pos.getX(i) ** 2)
    geo.computeVertexNormals()
    return geo.rotateX(0.14).translate(0, 0.5, 0.27)
  }
  return fuse([
    paint(pad(0.5, 0.1, 0.48, 0.045).translate(0, 0.47, 0), FABRIC),
    paint(back(0.46, 0.6, 0), FABRIC),
    paint(back(0.3, 0.17, 0.63), FABRIC),
    ...[-1, 1].flatMap((side) => [paint(pad(0.07, 0.04, 0.28, 0.018, 1).translate(side * 0.28, 0.7, 0.02), FABRIC), paint(box(0.03, 0.22, 0.04, side * 0.28, 0.58, 0.1), STEEL)]),
    paint(new THREE.CylinderGeometry(0.028, 0.028, 0.36, 8).translate(0, 0.25, 0), STEEL),
    ...[0, 1, 2, 3, 4].flatMap((k) => [paint(box(0.3, 0.03, 0.05, 0.15, 0.075, 0).rotateY((k * Math.PI * 2) / 5), STEEL), paint(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8).rotateZ(Math.PI / 2).translate(0.29, 0.03, 0).rotateY((k * Math.PI * 2) / 5), FABRIC)]),
  ])
}

/** A soft pool of light for a desk top: bright at the monitor's foot, gone a hand's length in front of it. */
function spillTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(64, 64)
  // The top of the canvas lies at the monitor; half as wide as it is long, so it fades out before every edge of its sheet.
  g.translate(32, 0)
  g.scale(0.5, 1)
  const fade = g.createRadialGradient(0, 0, 0, 0, 0, 64)
  fade.addColorStop(0, 'rgba(255,255,255,1)')
  fade.addColorStop(0.5, 'rgba(255,255,255,0.3)')
  fade.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = fade
  g.fillRect(-64, 0, 128, 64)
  return new THREE.CanvasTexture(c)
}

/** Where the monitors stand along a desk, metres from its middle: the GO / NO-GO four on the front desk, small ones everywhere else. */
const MAIN = { w: 1, h: 0.625, lift: 0.12 }
const SMALL = { w: 0.56, h: 0.33, lift: 0.09 }
const smallMonitors = (row: DeskRow) => (row === DESK_ROWS[0] ? [-3.85, -3.25, -1.6, 0, 1.6, 3.25, 3.85] : [-1.2, -0.6, 0, 0.6, 1.2])

/**
 * Builds the hall into `scene`: floor, walls, ceiling, the frames of the wall screens, and every desk.
 * `tiles` is the picture the small monitors share and `calls` the GO / NO-GO monitors' (screens.ts lays both out as grids).
 * Plain meshes: `disposeObject(scene)` cleans them up.
 */
export function addMissionControlDecor(scene: THREE.Scene, pictures: { tiles: THREE.Texture; calls: THREE.Texture }): void {
  const [x0, , z0] = ROOM.min
  const [x1, y1, z1] = ROOM.max
  const w = x1 - x0
  const d = z1 - z0
  const cz = (z0 + z1) / 2
  const lit = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, toneMapped: false })
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => scene.add(new THREE.Mesh(geo, mat))
  const flat = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => geo.rotateX(-Math.PI / 2).translate(x, y, z)

  // ---- Floor: dark carpet tiles wall to wall, and a lighter walkway from the door to the round plaza the holograms stand on.
  const carpet = carpetTexture(46, 0.4)
  carpet.repeat.set(w, d)
  add(flat(new THREE.PlaneGeometry(w, d), 0, 0, cz), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }))
  const walkway = fuse([flat(new THREE.CircleGeometry(5.7, 72), STAND[0], 0.004, STAND[2]), flat(new THREE.PlaneGeometry(3.2, z1 - STAND[2] - 5), STAND[0], 0.004, (z1 + STAND[2] + 5) / 2)])
  const at = walkway.attributes.position!
  // Tiles 0.6 m square, laid from the room's corner whatever the shape of the walkway.
  for (let i = 0; i < at.count; i++) walkway.attributes.uv!.setXY(i, at.getX(i) / 1.2, at.getZ(i) / 1.2)
  add(walkway, new THREE.MeshStandardMaterial({ map: carpetTexture(92, 0.7), roughness: 0.9 }))

  // ---- Walls and ceiling: painted with their own dim light (see woodTexture), so they cost no lamps.
  const wall = (pw: number, x: number, z: number, turn: number) => tiled(new THREE.PlaneGeometry(pw, y1), pw / PANEL, 1).rotateY(turn).translate(x, y1 / 2, z)
  add(fuse([wall(w, 0, z0, 0), wall(w, 0, z1, Math.PI), wall(d, x0, cz, Math.PI / 2), wall(d, x1, cz, -Math.PI / 2)]), lit(woodTexture()))
  add(tiled(new THREE.PlaneGeometry(w, d), w / BAY, d / BAY).rotateX(Math.PI / 2).translate(0, y1, cz), lit(ceilingTexture()))

  // ---- Dark trim: the frames the screens hang in, pilasters between the wall panels, the door you came in by.
  const trim: THREE.BufferGeometry[] = [
    box(w - 0.6, CALL_WALL.h + 0.3, 0.08, 0, CALL_WALL.y, z0 + 0.04),
    box(w - 0.6, 0.05, 0.16, 0, CALL_WALL.y - CALL_WALL.h / 2 - 0.175, z0 + 0.08),
    box(1.9, 2.3, 0.07, 0, 1.15, z1 - 0.035),
    box(2.14, 0.12, 0.12, 0, 2.36, z1 - 0.06),
  ]
  const slots: THREE.BufferGeometry[] = [box(1.7, 0.02, 0.03, 0, 2.29, z1 - 0.1)]
  for (const side of [-1, 1]) {
    const x = side * (x1 - 0.04)
    trim.push(box(0.08, SIDE_WALL.h + 0.24, SIDE_WALL.w + 0.24, x, SIDE_WALL.y, SIDE_WALL.z), box(0.12, 2.36, 0.12, side * 1.01, 1.18, z1 - 0.06))
    for (const z of [-4, 0, 4]) {
      trim.push(box(0.16, y1, 0.5, side * (x1 - 0.08), y1 / 2, z))
      slots.push(box(0.02, 2.6, 0.05, side * (x1 - 0.17), 2.7, z))
    }
    for (const px of [2, 6]) {
      trim.push(box(0.5, y1, 0.16, side * px, y1 / 2, z1 - 0.08))
      slots.push(box(0.05, 2.6, 0.02, side * px, 2.7, z1 - 0.17))
    }
  }
  add(fuse(trim), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.55, metalness: 0.35 }))
  // A thin warm slot of light down each pilaster and over the door.
  add(fuse(slots), new THREE.MeshBasicMaterial({ color: 0xc79a66, toneMapped: false }))

  // ---- The operator desks: light tops on dark bases, a line of monitors, keyboards, a few phones, chairs.
  const furniture: THREE.BufferGeometry[] = []
  const tiles: THREE.BufferGeometry[] = []
  const calls: THREE.BufferGeometry[] = []
  const spill: THREE.BufferGeometry[] = []
  /** The light a monitor `mw` wide throws on the desk in front of it. */
  const pool = (row: DeskRow, s: number, mw: number) => put(new THREE.PlaneGeometry(mw * 1.5, 0.62).rotateX(-Math.PI / 2).translate(0, 0, 0.31), row, s, -0.24, DESK.top + 0.002)
  // Teal edge lights: where the walls meet the floor, and along every desk.
  const teal: THREE.BufferGeometry[] = [box(w, 0.03, 0.05, 0, 0.05, z0 + 0.04), box(w, 0.03, 0.05, 0, 0.05, z1 - 0.04), box(0.05, 0.03, d, x0 + 0.04, 0.05, cz), box(0.05, 0.03, d, x1 - 0.04, 0.05, cz)]
  const TOP = 0xb9b3a7
  const BASE = 0x1b2a2f
  const RISER = 0x10171a
  const BLACK = 0x08090b
  const seat = chair()
  const small = monitor(SMALL.w, SMALL.h, SMALL.lift)
  const main = monitor(MAIN.w, MAIN.h, MAIN.lift)
  const under = DESK.top - 0.04
  let shown = 0
  DESK_ROWS.forEach((row, r) => {
    const half = row.len / 2
    furniture.push(
      paint(along(row, -half, half, DESK.back + 0.08, DESK.front, under, DESK.top), TOP),
      // A riser behind the monitors hides their stands and cables from the video wall's side.
      paint(along(row, -half, half, DESK.back, DESK.back + 0.08, 0, 1), RISER),
      paint(along(row, -half + 0.05, half - 0.05, DESK.back + 0.08, -0.08, 0.06, under), BASE),
      paint(along(row, -half, -half + 0.05, DESK.back + 0.08, DESK.front - 0.03, 0, under), BASE),
      paint(along(row, half - 0.05, half, DESK.back + 0.08, DESK.front - 0.03, 0, under), BASE),
    )
    teal.push(
      along(row, -half, half, DESK.back + 0.025, DESK.back + 0.055, 1, 1.012),
      along(row, -half, half, DESK.front, DESK.front + 0.006, under + 0.006, under + 0.03),
      along(row, -half, half, DESK.back - 0.006, DESK.back, 0.86, 0.885),
    )
    for (const s of smallMonitors(row)) {
      furniture.push(paint(put(small.body.clone(), row, s, -0.26, DESK.top), BLACK))
      // Neighbours show different readouts: step through the grid in fives.
      tiles.push(put(showing(small.screen.clone(), (shown++ * 5) % (TILE_GRID.cols * TILE_GRID.rows), TILE_GRID), row, s, -0.26, DESK.top))
      spill.push(pool(row, s, SMALL.w))
    }
    if (r === 0) {
      DESK_XS.forEach((s, i) => {
        furniture.push(paint(put(main.body.clone(), row, s, -0.26, DESK.top), BLACK), paint(put(box(0.44, 0.02, 0.15, 0, 0.01, 0), row, s, 0.2, DESK.top), BLACK))
        calls.push(put(showing(main.screen.clone(), i, CALL_GRID), row, s, -0.26, DESK.top))
        spill.push(pool(row, s, MAIN.w))
      })
    }
    row.chairs.forEach((s, i) => {
      // Pushed back and turned as people leave them, never in a parade line.
      const n = r * 7 + i
      furniture.push(
        put(seat.clone(), row, s + (hash(n) - 0.5) * 0.16, DESK.chair + hash(n + 40) * 0.1, 0, (hash(n + 80) - 0.5) * 1.1),
        paint(put(box(0.44, 0.02, 0.15, 0, 0.01, 0), row, s, 0.2, DESK.top, (hash(n + 3) - 0.5) * 0.12), BLACK),
        paint(put(box(0.06, 0.028, 0.1, 0, 0.014, 0), row, s + 0.34, 0.22, DESK.top), BLACK),
      )
    })
    // One desk phone per desk, two on the long one: a wedge base with the handset across it.
    for (const s of r === 0 ? [-4.35, 0.42] : [1.48]) {
      furniture.push(paint(put(fuse([box(0.17, 0.05, 0.2, 0, 0.025, 0), box(0.05, 0.035, 0.19, -0.05, 0.0675, 0)]), row, s, 0.12, DESK.top, 0.25), BLACK))
    }
  })
  seat.dispose()
  small.body.dispose()
  small.screen.dispose()
  main.body.dispose()
  main.screen.dispose()
  add(fuse(furniture), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.08 }))
  add(fuse(teal), new THREE.MeshBasicMaterial({ color: 0x25c2c4, toneMapped: false }))
  add(fuse(tiles), lit(pictures.tiles))
  add(fuse(calls), lit(pictures.calls))
  // Screens are the light on the desks: a pool of it lies in front of each one.
  add(fuse(spill), new THREE.MeshBasicMaterial({ map: spillTexture(), color: 0x86b4d8, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
}
