// Building blocks shared by every rocket: painted skins (canvas textures), PBR materials and the
// handful of shapes rockets are made of. Meters; every shape sits on y = 0 and grows up unless it says otherwise.
import * as THREE from 'three'

// Tests build the models in Node, where there is no canvas: skins fall back to their base colour.
const canDraw = typeof document !== 'undefined'

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
}

/** What is painted on a body of revolution. Lengths are fractions from the bottom; `u` is the angle as a fraction of a turn (0 faces +z, 0.25 faces +x). */
export interface Skin {
  base: string
  bands?: [from: number, to: number, color: string][]
  /** Thin dark rings: weld seams, segment joints. */
  seams?: number[]
  /** Lengthwise stripes: [u, width, colour, from, to]. */
  stripes?: [u: number, width: number, color: string, from?: number, to?: number][]
  /** Frost on a cryogenic tank: [from, to, strength 0..1]. */
  frost?: [from: number, to: number, strength: number][]
  /** Soot from earlier flights, 0 to 1; heaviest at the bottom. */
  soot?: number
  /** Blotchiness, 0 to 1: spray-on foam is mottled, paint is not. */
  grain?: number
  /** Anything else, drawn last. x runs around the body, y down from the top. */
  extra?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  roughness?: number
  metalness?: number
  /** Visible from inside too (fairing halves). */
  shell?: boolean
}

export function skin(s: Skin, w = 256, h = 512): THREE.MeshStandardMaterial {
  const params: THREE.MeshStandardMaterialParameters = { roughness: s.roughness ?? 0.5, metalness: s.metalness ?? 0.05, side: s.shell ? THREE.DoubleSide : THREE.FrontSide }
  if (!canDraw) return new THREE.MeshStandardMaterial({ ...params, color: s.base })
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const rand = rng(w * 31 + h + s.base.length * 977 + (s.bands?.length ?? 0) * 131)
  const y = (f: number) => h * (1 - f)
  ctx.fillStyle = s.base
  ctx.fillRect(0, 0, w, h)
  for (const [from, to, color] of s.bands ?? []) {
    ctx.fillStyle = color
    ctx.fillRect(0, y(to), w, y(from) - y(to))
  }
  if (s.grain) {
    for (let i = 0; i < (w * h) / 24; i++) {
      ctx.fillStyle = rand() < 0.5 ? `rgba(60,20,0,${rand() * 0.05 * s.grain})` : `rgba(255,235,200,${rand() * 0.04 * s.grain})`
      const size = 1 + rand() * 7
      ctx.fillRect(rand() * w, rand() * h, size, size * (0.5 + rand() * 2))
    }
  }
  if (s.soot) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, `rgba(40,36,32,${0.4 * s.soot})`)
    g.addColorStop(1, `rgba(40,36,32,${0.92 * s.soot})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(${rand() < 0.3 ? '230,230,230' : '20,18,16'},${rand() * 0.3 * s.soot})`
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 4, h * (0.03 + rand() * 0.15))
    }
  }
  for (const [from, to, strength] of s.frost ?? []) {
    // A soft-edged white coat, patchier toward its ends, with streaks where ice has let go.
    const top = y(to)
    const len = y(from) - top
    const g = ctx.createLinearGradient(0, top, 0, top + len)
    g.addColorStop(0, 'rgba(240,246,252,0)')
    g.addColorStop(0.08, `rgba(240,246,252,${strength})`)
    g.addColorStop(0.9, `rgba(240,246,252,${strength})`)
    g.addColorStop(1, 'rgba(240,246,252,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, top, w, len)
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '120,130,140'},${rand() * 0.25 * strength})`
      ctx.fillRect(rand() * w, top + rand() * len, 1 + rand() * 3, len * (0.05 + rand() * 0.2))
    }
  }
  for (const [u, width, color, from = 0, to = 1] of s.stripes ?? []) {
    ctx.fillStyle = color
    ctx.fillRect(u * w, y(to), Math.max(width * w, 1), y(from) - y(to))
  }
  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  for (const f of s.seams ?? []) ctx.fillRect(0, y(f) - 1, w, 2)
  s.extra?.(ctx, w, h)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.anisotropy = 4
  return new THREE.MeshStandardMaterial({ ...params, map })
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
    /** Engine bells: you see inside them, so both faces draw. */
    bell: paint(0x4a4440, 0.4, 0.9, { side: THREE.DoubleSide }),
    /** Ablative nozzles of solid motors and the RS-68. */
    char: paint(0x221f1d, 0.8, 0.1, { side: THREE.DoubleSide }),
    foil: paint(0xd8a740, 0.35, 1),
    cells: paint(0x16245a, 0.25, 0.6),
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

/** A bell nozzle hanging down from y = 0: throat at the top, exit `len` below. */
export function bell(exitRadius: number, len: number, seg = 18): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    pts.push(new THREE.Vector2(exitRadius * (0.3 + 0.7 * Math.sqrt(u)), -u * len))
  }
  return new THREE.LatheGeometry(pts, seg)
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
