// Building blocks shared by every rocket: painted skins (canvas textures), PBR materials and the
// handful of shapes rockets are made of. Meters; every shape sits on y = 0 and grows up unless it says otherwise.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Tests build the models in Node, where there is no canvas: skins fall back to their base colour.
const canDraw = typeof document !== 'undefined'

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
}

/** A marking or fitting painted on the skin, centred at (u, v); `size` is its height in meters. */
export interface Mark {
  kind: 'flag' | 'text' | 'door' | 'vent' | 'checker'
  u: number
  v: number
  size: number
  /** Width in meters of a door, vent or target (default: square). */
  width?: number
  text?: string
  /** Letters one under another, the way lettering runs down a rocket. */
  stacked?: boolean
  color?: string
}

/** What is painted on a body of revolution. Lengths are fractions from the bottom; `u` is the angle as a fraction of a turn (0 faces +z, 0.25 faces +x). */
export interface Skin {
  base: string
  bands?: [from: number, to: number, color: string][]
  /** Weld rings and segment joints: thin dark grooves round the body. */
  seams?: number[]
  /** Lengthwise welds: how many panels make up the circumference. */
  panels?: number
  /** Raised lengthwise ribs (stringers, corrugation, cooling tubes): [from, to, how many round the body]. */
  ribs?: [from: number, to: number, count: number][]
  /** Rows of fasteners round the body. */
  rivets?: number[]
  /** Lengthwise stripes: [u, width, colour, from, to]. */
  stripes?: [u: number, width: number, color: string, from?: number, to?: number][]
  /** Frost on a cryogenic tank: [from, to, strength 0..1]. */
  frost?: [from: number, to: number, strength: number][]
  /** Soot from earlier flights, 0 to 1; heaviest at the bottom. */
  soot?: number
  /** Blotchiness, 0 to 1: spray-on foam is mottled, paint is not. */
  grain?: number
  marks?: Mark[]
  /** Anything else, drawn last on the colour (and on `relief`: red height, green roughness, blue metalness). x runs around the body, y down from the top. Give a `key` so the result can be shared. */
  extra?: (ctx: CanvasRenderingContext2D, w: number, h: number, relief: CanvasRenderingContext2D) => void
  key?: string
  roughness?: number
  metalness?: number
  /** How strongly the relief catches the light. */
  relief?: number
  /** Visible from inside too (fairing halves). */
  shell?: boolean
}

type Ctx = CanvasRenderingContext2D
type SkinMaps = { map: THREE.CanvasTexture; relief: THREE.CanvasTexture }
const TEXT_PX = 100

/**
 * The relief canvas packs three maps: red is height, green roughness, blue metalness.
 * A pen changes one of them and leaves the other two alone: amount -1..0 lowers it, 0..1 raises it.
 */
function pen(d: Ctx, channel: 0 | 1 | 2, amount: number): void {
  const c = amount < 0 ? [255, 255, 255] : [0, 0, 0]
  c[channel] = Math.round(amount < 0 ? 255 * (1 + amount) : 255 * amount)
  d.globalCompositeOperation = amount < 0 ? 'multiply' : 'lighter'
  d.fillStyle = d.strokeStyle = `rgb(${c.join(',')})`
}

function drawMark(c: Ctx, d: Ctx, m: Mark, x: number, y: number, sx: number, sy: number): void {
  const mh = m.size * sy
  const mw = (m.width ?? m.size) * sx
  if (m.kind === 'flag') {
    const fw = m.size * 1.9 * sx
    const x0 = x - fw / 2
    const y0 = y - mh / 2
    for (let i = 0; i < 13; i++) {
      c.fillStyle = i % 2 ? '#f1f1f1' : '#b22234'
      c.fillRect(x0, y0 + (i * mh) / 13, fw, mh / 13 + 0.5)
    }
    c.fillStyle = '#3c3b6e'
    c.fillRect(x0, y0, fw * 0.4, (mh * 7) / 13)
    c.fillStyle = '#ffffff'
    const star = Math.max(1, mh * 0.035)
    for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) c.fillRect(x0 + (fw * 0.4 * (col + 0.5)) / 6 - star / 2, y0 + (mh * 7 * (row + 0.5)) / 65 - star / 2, star, star)
  } else if (m.kind === 'text') {
    const letters = m.stacked ? [...(m.text ?? '')] : [m.text ?? '']
    c.save()
    c.translate(x, y)
    // Texels are not square on the body, so letters are drawn in meters.
    c.scale(sx / TEXT_PX, sy / TEXT_PX)
    c.font = `700 ${m.size * TEXT_PX}px "Helvetica Neue", Arial, sans-serif`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = m.color ?? '#1b1c20'
    letters.forEach((ch, i) => c.fillText(ch, 0, (i - (letters.length - 1) / 2) * m.size * TEXT_PX * 1.08))
    c.restore()
  } else if (m.kind === 'checker') {
    // Black-and-white squares: targets the tracking cameras measure the vehicle by.
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 3 === 0 ? '#16171a' : '#f1f1f1'
      c.fillRect(x - mw / 2 + ((i % 2) * mw) / 2, y - mh / 2 + (Math.floor(i / 2) * mh) / 2, mw / 2, mh / 2)
    }
  } else if (m.kind === 'vent') {
    c.fillStyle = m.color ?? '#131417'
    c.fillRect(x - mw / 2, y - mh / 2, mw, mh)
    pen(d, 0, -0.7)
    d.fillRect(x - mw / 2, y - mh / 2, mw, mh)
  } else {
    // An access door: a cut line round it and a fastener in each corner.
    c.strokeStyle = 'rgba(0,0,0,0.4)'
    c.lineWidth = d.lineWidth = 1
    c.strokeRect(x - mw / 2, y - mh / 2, mw, mh)
    pen(d, 0, -0.55)
    d.strokeRect(x - mw / 2, y - mh / 2, mw, mh)
    c.fillStyle = 'rgba(0,0,0,0.45)'
    for (const [i, j] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) c.fillRect(x + i * (mw / 2 - 2.5) - 0.5, y + j * (mh / 2 - 2.5) - 0.5, 1.5, 1.5)
  }
}

/** Paints a skin's colour canvas and its relief canvas, `w` x `h` texels at `sx` and `sy` texels per meter. */
function paintSkin(s: Skin, w: number, h: number, sx: number, sy: number): SkinMaps {
  const canvas = () => {
    const el = document.createElement('canvas')
    el.width = w
    el.height = h
    return el
  }
  const colour = canvas()
  const height = canvas()
  const c = colour.getContext('2d')!
  const d = height.getContext('2d')!
  const rand = rng(w * 31 + h + s.base.length * 977 + (s.bands?.length ?? 0) * 131)
  const y = (f: number) => h * (1 - f)
  c.fillStyle = s.base
  c.fillRect(0, 0, w, h)
  d.fillStyle = `rgb(128,${Math.round((s.roughness ?? 0.5) * 255)},${Math.round((s.metalness ?? 0.05) * 255)})`
  d.fillRect(0, 0, w, h)
  for (const [from, to, color] of s.bands ?? []) {
    c.fillStyle = color
    c.fillRect(0, y(to), w, y(from) - y(to))
  }
  if (s.grain) {
    // Spray-on foam goes on in passes that weather differently, and its surface is orange-peel rough.
    for (let top = 0; top < h; ) {
      const pass = (0.5 + rand() * 1.6) * sy
      c.fillStyle = rand() < 0.5 ? `rgba(70,25,0,${rand() * 0.07 * s.grain})` : `rgba(255,225,170,${rand() * 0.05 * s.grain})`
      c.fillRect(0, top, w, pass)
      top += pass
    }
    for (let i = 0; i < (w * h) / 24; i++) {
      c.fillStyle = rand() < 0.5 ? `rgba(60,20,0,${rand() * 0.05 * s.grain})` : `rgba(255,235,200,${rand() * 0.04 * s.grain})`
      const size = 1 + rand() * 7
      const px = rand() * w
      const py = rand() * h
      c.fillRect(px, py, size, size * (0.5 + rand() * 2))
      pen(d, 0, (rand() - 0.5) * 0.22 * s.grain)
      d.fillRect(px, py, 1 + size * 0.4, 1 + size * 0.4)
    }
  }
  if (s.soot) {
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, `rgba(40,36,32,${0.4 * s.soot})`)
    g.addColorStop(1, `rgba(40,36,32,${0.92 * s.soot})`)
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    pen(d, 1, 0.3 * s.soot)
    d.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) {
      c.fillStyle = `rgba(${rand() < 0.3 ? '230,230,230' : '20,18,16'},${rand() * 0.3 * s.soot})`
      c.fillRect(rand() * w, rand() * h, 1 + rand() * 4, h * (0.03 + rand() * 0.15))
    }
  }
  for (const [from, to, strength] of s.frost ?? []) {
    // A soft-edged white coat, patchier toward its ends, with streaks where ice has let go.
    const top = y(to)
    const len = y(from) - top
    const g = c.createLinearGradient(0, top, 0, top + len)
    g.addColorStop(0, 'rgba(240,246,252,0)')
    g.addColorStop(0.08, `rgba(240,246,252,${strength})`)
    g.addColorStop(0.9, `rgba(240,246,252,${strength})`)
    g.addColorStop(1, 'rgba(240,246,252,0)')
    c.fillStyle = g
    c.fillRect(0, top, w, len)
    // Frost is matt and crusty, and hides the metal under it.
    pen(d, 1, 0.45 * strength)
    d.fillRect(0, top + len * 0.04, w, len * 0.9)
    pen(d, 2, -0.8 * strength)
    d.fillRect(0, top + len * 0.04, w, len * 0.9)
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '120,130,140'},${rand() * 0.25 * strength})`
      const px = rand() * w
      const py = top + rand() * len
      const streak = len * (0.05 + rand() * 0.2)
      c.fillRect(px, py, 1 + rand() * 3, streak)
      pen(d, 0, (rand() - 0.5) * 0.3 * strength)
      d.fillRect(px, py, 2, streak)
    }
  }
  for (const [u, width, color, from = 0, to = 1] of s.stripes ?? []) {
    c.fillStyle = color
    c.fillRect(u * w, y(to), Math.max(width * w, 1), y(from) - y(to))
  }
  for (const [from, to, count] of s.ribs ?? []) {
    // No finer than four texels a rib, or they blur into grey.
    const n = Math.min(count, Math.floor(w / 4))
    const pitch = w / n
    for (let i = 0; i < n; i++) {
      c.fillStyle = 'rgba(0,0,0,0.13)'
      c.fillRect(i * pitch, y(to), Math.max(pitch * 0.3, 1), y(from) - y(to))
      pen(d, 0, 0.3)
      d.fillRect((i + 0.4) * pitch, y(to), pitch * 0.5, y(from) - y(to))
    }
  }
  for (let i = 0; i < (s.panels ?? 0); i++) {
    const px = ((i + 0.37) * w) / s.panels!
    c.fillStyle = 'rgba(0,0,0,0.16)'
    c.fillRect(px, 0, 1, h)
    pen(d, 0, -0.35)
    d.fillRect(px, 0, 1.5, h)
  }
  for (const f of s.seams ?? []) {
    c.fillStyle = 'rgba(0,0,0,0.38)'
    c.fillRect(0, y(f) - 1, w, 2)
    pen(d, 0, -0.5)
    d.fillRect(0, y(f) - 1, w, 2)
  }
  for (const f of s.rivets ?? []) {
    const pitch = Math.max(3, Math.round(0.3 * sx))
    for (let px = 0; px < w; px += pitch) {
      c.fillStyle = 'rgba(0,0,0,0.3)'
      c.fillRect(px, y(f), 1, 1)
      pen(d, 0, 0.35)
      d.fillRect(px - 0.5, y(f) - 0.5, 2, 2)
    }
  }
  // A mark may straddle the texture's edge: that is the side facing the camera.
  for (const m of s.marks ?? []) for (const turn of [-1, 0, 1]) drawMark(c, d, m, (m.u + turn) * w, y(m.v), sx, sy)
  d.globalCompositeOperation = 'source-over'
  s.extra?.(c, w, h, d)
  const texture = (el: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(el)
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = THREE.RepeatWrapping
    t.anisotropy = 4
    return t
  }
  return { map: texture(colour, true), relief: texture(height, false) }
}

// Painted once and shared by every rocket that uses the same skin. Disposing a scene frees the GPU copies; the canvases stay for the next launch.
const skins = new Map<string, SkinMaps>()

/** Bytes of texture the painted skins take on the GPU, mipmaps included (4 bytes a texel, two canvases a skin). */
export const skinBytes = () => [...skins.values()].reduce((n, t) => n + (t.map.image.width * t.map.image.height * 8 * 4) / 3, 0)

/**
 * The material for a body `around` meters round and `length` meters long, at `density` texels per meter
 * (no canvas is larger than 1024). Identical skins share their textures, across rockets too.
 */
export function skin(s: Skin, around = 1, length = 1, density = 8): THREE.MeshStandardMaterial {
  const side = s.shell ? THREE.DoubleSide : THREE.FrontSide
  if (!canDraw) return new THREE.MeshStandardMaterial({ color: s.base, roughness: s.roughness ?? 0.5, metalness: s.metalness ?? 0.05, side })
  const size = (meters: number) => Math.min(1024, Math.max(4, Math.round(meters * density)))
  const w = size(around)
  const h = size(length)
  const key = s.extra && !s.key ? '' : JSON.stringify([s, w, h])
  const maps = skins.get(key) ?? paintSkin(s, w, h, w / around, h / length)
  if (key) skins.set(key, maps)
  // The relief canvas carries roughness and metalness itself, so the material's own factors stay at 1.
  return new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.relief, bumpScale: s.relief ?? 1.5, roughnessMap: maps.relief, metalnessMap: maps.relief, roughness: 1, metalness: 1, side })
}

export const paint = (color: number, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })

/** The materials most rockets share. One set per rocket, so disposing a scene never touches another. */
export function palette() {
  return {
    white: paint(0xe9ebee, 0.45, 0.05),
    black: paint(0x121316, 0.5, 0.2),
    /** Bare aluminium and steel fittings. */
    metal: paint(0x9a9ea6, 0.4, 0.85),
    /** Heat shields, raceways, anything dark and dull. */
    dark: paint(0x25272c, 0.65, 0.4),
    /** Regeneratively cooled bells: a wall of brazed tubes with stiffening bands, heat-stained toward the throat. Both faces draw: you see inside them. */
    bell: skin({ base: '#5a524d', bands: [[0, 0.2, '#6b5645'], [0.2, 0.34, '#4d4a52']], ribs: [[0, 1, 32]], seams: [0.3, 0.62, 0.93], roughness: 0.38, metalness: 0.9, relief: 2, shell: true }, 1, 1, 128),
    /** Ablative nozzles of solid motors and the RS-68. */
    char: skin({ base: '#221f1d', grain: 0.6, seams: [0.3, 0.9], roughness: 0.85, metalness: 0.1, shell: true }, 1, 1, 64),
    /** Vacuum engines: brazed cooling tubes from the throat down to the coolant manifold, then a thin dark radiation-cooled extension with stiffening rings. */
    vac: skin({ base: '#2b2c31', bands: [[0, 0.3, '#7d5f47'], [0.3, 0.33, '#8e9197']], ribs: [[0, 0.3, 48]], seams: [0.47, 0.64, 0.81, 0.97], rivets: [0.34], roughness: 0.46, metalness: 0.85, relief: 2, shell: true }, 1, 1, 128),
    foil: paint(0xd8a740, 0.35, 1),
  }
}
export type Palette = ReturnType<typeof palette>

export const tube = (rBottom: number, rTop: number, len: number, seg = 40, open = false): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(rTop, rBottom, len, seg, 1, open).translate(0, len / 2, 0)

export type Profile = [r: number, y: number][]

/** A body of revolution through (radius, height) points. Its texture runs by height, so a Skin's fractions mean what they say. */
export function lathe(points: Profile, seg = 40, phiStart = 0, phiLength = Math.PI * 2): THREE.LatheGeometry {
  const geo = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg, phiStart, phiLength)
  const y0 = points[0]![1]
  const span = points[points.length - 1]![1] - y0 || 1
  const pos = geo.getAttribute('position')
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setY(i, (pos.getY(i) - y0) / span)
  return geo
}

/** A rounded tank end: from radius R at y0 to the pole `rise` above (or below, when negative). */
export function dome(R: number, rise: number, y0 = 0, n = 6): Profile {
  const pts: Profile = []
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2)
    pts.push([R * Math.cos(a), y0 + rise * Math.sin(a)])
  }
  return pts
}

/**
 * Points of an ogive nose: from just above radius R at y0 up to the tip at y0 + L. `blunt` rounds the tip off:
 * 0.05 is nearly sharp, 0.3 is the fat rounded nose of a big composite fairing.
 */
export function ogive(R: number, L: number, y0 = 0, blunt = 0.05, n = 10): Profile {
  const long = L * (1 + blunt)
  const rho = (R * R + long * long) / (2 * R)
  const at = (h: number) => Math.sqrt(rho * rho - h * h) + R - rho
  // The curve stops where a dome 0.7 as tall as it is wide closes it off exactly at L.
  let cut = L
  for (let i = 0; i < 4; i++) cut = L - 0.7 * at(cut)
  const pts: Profile = []
  for (let i = 1; i <= n; i++) pts.push([at((i / n) * cut), y0 + (i / n) * cut])
  return [...pts, ...dome(at(cut), L - cut, y0 + cut, 4)]
}

/** A bell nozzle hanging down from y = 0: throat at the top (`throat` of the exit radius), exit `len` below, with a rolled lip. */
export function bell(exitRadius: number, len: number, seg = 18, throat = 0.3): THREE.LatheGeometry {
  const pts: Profile = []
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    pts.push([exitRadius * (throat + (1 - throat) * Math.sqrt(u)), -u * len])
  }
  pts.push([exitRadius * 1.05, -len])
  return lathe(pts, seg)
}

/** Where the engines of a cluster sit, as [x, z]: `n` in a ring of radius `r` (the first at angle `turn`), plus one in the middle. */
export function cluster(n: number, r: number, turn = 0, centre = false): [number, number][] {
  const spots: [number, number][] = centre ? [[0, 0]] : []
  for (let i = 0; i < n; i++) spots.push([Math.sin(turn + (i / n) * Math.PI * 2) * r, Math.cos(turn + (i / n) * Math.PI * 2) * r])
  return spots
}

/** A pipe, cable or strut from a to b, `r` in radius. */
export function pipe(a: [number, number, number], b: [number, number, number], r: number, seg = 8): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a)
  const dir = new THREE.Vector3(...b).sub(from)
  const len = dir.length()
  return new THREE.CylinderGeometry(r, r, len, seg).translate(0, len / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())).translate(...a)
}

/**
 * Engines at `spots`, their throats at height y: one mesh of bells and one of throats, which `glow` lights when they fire.
 * With `vac`, an upper-stage engine you see whole once the first stage is gone: a narrow throat opening into a long
 * two-part bell, and above it the chamber, turbopumps, propellant lines, coolant manifold and gimbal actuators.
 */
export function engines(parent: THREE.Object3D, k: Palette, glow: THREE.Material, spots: [number, number][], exit: number, len: number, y: number, o: { vac?: boolean; mat?: THREE.Material; seg?: number } = {}): void {
  // One mesh per kind of part, however many engines: a Falcon Heavy has 27.
  const all = (geo: THREE.BufferGeometry) => mergeGeometries(spots.map(([x, z]) => geo.clone().translate(x, y, z)))
  const throat = o.vac ? 0.16 : 0.3
  put(parent, all(bell(exit, len, o.seg ?? 18, throat)), o.mat ?? (o.vac ? k.vac : k.bell))
  put(parent, all(new THREE.CircleGeometry(exit * (o.vac ? 0.3 : 0.42), 12).rotateX(Math.PI / 2).translate(0, -len * 0.04, 0)), glow)
  if (!o.vac) return
  // The powerhead of a big-nozzled engine is no bigger than a small one's: the bell is what grows.
  const s = Math.min(exit, 0.8)
  const joint = exit * (throat + (1 - throat) * Math.sqrt(0.3))
  put(parent, all(mergeGeometries([
    // Chamber, injector dome and the gimbal block the engine swivels on.
    new THREE.CylinderGeometry(s * 0.3, exit * (throat + 0.02), s * 0.5, 16).translate(0, s * 0.25, 0),
    new THREE.SphereGeometry(s * 0.3, 16, 8).scale(1, 0.6, 1).translate(0, s * 0.5, 0),
    new THREE.CylinderGeometry(s * 0.1, s * 0.14, s * 0.3, 10).translate(0, s * 0.8, 0),
    // Fuel and oxidiser turbopumps either side, each with its turbine housing.
    new THREE.CylinderGeometry(s * 0.15, s * 0.15, s * 0.55, 12).translate(s * 0.52, s * 0.36, 0),
    new THREE.SphereGeometry(s * 0.18, 12, 8).translate(s * 0.52, s * 0.68, 0),
    new THREE.CylinderGeometry(s * 0.12, s * 0.12, s * 0.45, 12).translate(-s * 0.48, s * 0.34, 0),
    new THREE.SphereGeometry(s * 0.14, 12, 8).translate(-s * 0.48, s * 0.6, 0),
    // Feed lines down from the tanks, the high-pressure lines into the injector, the turbine exhaust duct down the bell.
    pipe([s * 0.52, s * 0.7, 0], [s * 0.34, s * 1.05, s * 0.22], s * 0.07),
    pipe([-s * 0.48, s * 0.62, 0], [-s * 0.3, s * 1.05, -s * 0.2], s * 0.06),
    pipe([s * 0.52, s * 0.2, 0], [s * 0.2, s * 0.52, 0], s * 0.045),
    pipe([-s * 0.48, s * 0.2, 0], [-s * 0.2, s * 0.52, 0], s * 0.045),
    pipe([-s * 0.48, s * 0.14, 0], [-joint * 0.99, -len * 0.3, 0], s * 0.05),
    // The manifold that feeds coolant into the tube wall, where the extension bolts on.
    new THREE.TorusGeometry(joint * 1.02, exit * 0.035, 6, 24).rotateX(Math.PI / 2).translate(0, -len * 0.3, 0),
    // Two actuators that steer the engine.
    pipe([0, s * 0.18, s * 0.32], [0, s * 0.95, s * 0.6], s * 0.035),
    pipe([0, s * 0.18, -s * 0.32], [0, s * 0.95, -s * 0.6], s * 0.035),
  ])), k.metal)
}

/** Lean a shape toward +x as it rises: the canted nose cones of strap-on boosters. */
export function lean<G extends THREE.BufferGeometry>(geo: G, from: number, slope: number): G {
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) + Math.max(pos.getY(i) - from, 0) * slope)
  geo.computeVertexNormals()
  return geo
}

export function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}

/** `n` copies of a part around the axis at radius `r`, each turned to face outward (the part is built facing +z). */
export function ring(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, n: number, r: number, y: number, turn = 0): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * Math.PI * 2
    const m = put(parent, geo, mat, Math.sin(a) * r, y, Math.cos(a) * r)
    m.rotation.y = a
    out.push(m)
  }
  return out
}

/** A flat plate from an outline in (x, y), `thick` deep and centred on z = 0. */
export function plate(outline: [number, number][], thick: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)))
  return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }).translate(0, 0, -thick / 2)
}

/** A panel that hugs a body of radius R and tapers up its length: landing legs, fairings over pipes. Faces +z. */
export function shellPanel(R: number, len: number, wBottom: number, wTop: number, thick: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(2, len, 6, 3)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const t = pos.getY(i) / len + 0.5
    const angle = (x * (wBottom + (wTop - wBottom) * t)) / 2 / R
    const r = R + thick * (1 - 0.7 * x * x)
    pos.setXYZ(i, r * Math.sin(angle), t * len, r * Math.cos(angle))
  }
  geo.computeVertexNormals()
  return geo
}

export function triangles(obj: THREE.Object3D): number {
  let n = 0
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const g = o.geometry as THREE.BufferGeometry
    n += (g.index ? g.index.count : g.getAttribute('position').count) / 3
  })
  return n
}
