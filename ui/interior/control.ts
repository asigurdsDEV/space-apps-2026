// The walk-in spacecraft in three.js (decision 007). Built hardware from merged geometry and shared canvas
// textures, the real part models (ui/scene3d/parts via ui/hangar's partModel) and the real world outside.
// layout.ts says where things stand; this draws them, lights them and animates the alarm.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { roomLoop } from '../fps/room-loop'
import { createFps, type Fps, type FpsOptions } from '../fps/controller'
import { canvasScreen, partModel } from '../hangar/control'
import { face } from '../hangar/screens'
import { buildCraft, disposeObject } from '../scene3d/craft'
import { planetMaps } from '../scene3d/maps'
import { atmosphereShader, cloudShader, planetShader, toScreen } from '../scene3d/shaders'
import { sunDirection } from '../scene3d/sun'
import type { CraftSpec } from '../scene3d/model'
import type { Decision } from '../../shared'
import { choiceSpots, choiceTitleAt, DASH, dialAngle, HATCH, HATCHWAY, moduleFor, ROOM, section, SPEEDS, STANDOFF, START, WINDOW, type Gauge, type Module } from './layout'
import { mountCrew, type CrewPose } from '../crew/crew'

export interface CabinScreens {
  modules: Module[]
  gauges: Gauge[]
  craft: CraftSpec | null
  /** 'earth' | 'moon' | 'mars': the world outside the window. */
  body: string
  /** Days since launch, to turn the world outside. */
  day: number
  paused: boolean
  speed: number
  decision: Decision | null
  /** Storage fill 0..1 for the data core. */
  storage: number
}

export interface Cabin {
  fps: Fps
  /** Off while a cutscene covers the view: nothing is drawn, so two 3D scenes never render at once. */
  setActive(on: boolean): void
  show(screens: CabinScreens): void
  /** Other players in this cabin. Pass an empty list when they leave. */
  setCrew(members: readonly CrewPose[]): void
  dispose(): void
}

// The game's own colours (ui/theme/theme.css --game-*): displays are dark glass, white and grey text.
const TEXT = '#f5f6f8'
const MUTED = '#a0a3a8'
const WARN = '#ffd479'
const BAD = '#ff7a7a'
const NO_RELIEF = { value: 0 }
/** planetShader's uBody. */
const WORLD_INDEX = { earth: 0, moon: 1, mars: 2 } as const

function painted(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** The same numbers every time, so every player sees the same room. */
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

/** One square metre of hull lining (ceiling, stand-offs, end walls): a quiet off-white panel, a seam round it, a fastener in each corner. */
function hullMap() {
  const map = painted(256, 256, (g) => {
    const rnd = seeded(7)
    g.fillStyle = '#e2e4e8'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 120; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.018)' : 'rgba(255,255,255,0.05)'
      g.fillRect(rnd() * 256, rnd() * 256, 30 + rnd() * 90, 1 + rnd() * 3)
    }
    g.strokeStyle = 'rgba(120,128,140,0.5)'
    g.lineWidth = 2
    g.strokeRect(1, 1, 254, 254)
    g.fillStyle = '#8b929c'
    for (const [x, y] of [[12, 12], [244, 12], [12, 244], [244, 244]] as const) {
      g.beginPath()
      g.arc(x, y, 2.6, 0, Math.PI * 2)
      g.fill()
    }
  })
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  return map
}

/** Two metres square of deck: panels a metre square like the rack faces, a seam round each, a quarter-turn latch in every corner, a tie-down ring or a printed label on some, a few scuffs. */
function floorMap() {
  const map = painted(512, 512, (g) => {
    const rnd = seeded(5)
    g.fillStyle = '#c3c7cd'
    g.fillRect(0, 0, 512, 512)
    g.strokeStyle = 'rgba(70, 76, 88, 0.14)'
    g.lineWidth = 2
    for (let i = 0; i < 44; i++) {
      const x = rnd() * 512, y = rnd() * 512
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (rnd() - 0.5) * 24, y + (rnd() - 0.5) * 80)
      g.stroke()
    }
    for (const [i, [col, row]] of ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).entries()) {
      const x = col * 256, y = row * 256
      // A seam: a dark line with a thin bright edge inside it.
      g.strokeStyle = 'rgba(52, 58, 70, 0.62)'
      g.lineWidth = 5
      g.strokeRect(x, y, 256, 256)
      g.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      g.lineWidth = 1.5
      g.strokeRect(x + 4.5, y + 4.5, 247, 247)
      for (const [lx, ly] of [[26, 26], [230, 26], [26, 230], [230, 230]] as const) {
        g.fillStyle = 'rgba(64, 70, 82, 0.8)'
        g.beginPath()
        g.arc(x + lx, y + ly, 7, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = 'rgba(214, 219, 227, 0.9)'
        g.fillRect(x + lx - 5, y + ly - 1, 10, 2)
      }
      if (i % 3 === 0) {
        g.strokeStyle = 'rgba(90, 97, 110, 0.75)'
        g.lineWidth = 3
        g.beginPath()
        g.arc(x + 128, y + 128, 9, 0, Math.PI * 2)
        g.stroke()
      } else {
        g.fillStyle = i === 1 ? 'rgba(232, 235, 240, 0.8)' : 'rgba(61, 111, 196, 0.75)'
        g.fillRect(x + 150, y + 22, 44, 12)
      }
    }
  })
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  return map
}

/** A box whose texture repeats every `u` metres across and every `v` metres up, whatever the box's size. */
function tiledBox(w: number, h: number, d: number, u: number, v: number) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const uv = geo.getAttribute('uv')
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]] as const // +x, -x, +y, -y, +z, -z
  for (let i = 0; i < uv.count; i++) {
    const [across, up] = faces[Math.floor(i / 4)]!
    uv.setXY(i, uv.getX(i) * (across / u), uv.getY(i) * (up / v))
  }
  return geo
}

/** Brushed metal: fine streaks along the grain, tiling. */
function brushedMap() {
  const map = painted(256, 256, (g) => {
    const rnd = seeded(41)
    g.fillStyle = '#d2d4d8'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 700; i++) {
      g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${0.03 + rnd() * 0.09})` : `rgba(255,255,255,${0.04 + rnd() * 0.12})`
      g.fillRect(0, rnd() * 256, 256, 1)
    }
  })
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  return map
}

/** A soft round patch, opaque in the middle: black for contact shade, coloured and added for glow. */
function blobMap() {
  return painted(64, 64, (g) => {
    const fade = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    fade.addColorStop(0, 'rgba(255,255,255,1)')
    fade.addColorStop(0.45, 'rgba(255,255,255,0.55)')
    fade.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = fade
    g.fillRect(0, 0, 64, 64)
  })
}

/** What the inner pane mirrors of the room: the two ceiling light strips running away behind you, and a breath of haze. */
function glassMap() {
  return painted(512, 256, (g) => {
    g.fillStyle = 'rgb(5,7,10)'
    g.fillRect(0, 0, 512, 256)
    for (const side of [0, 1]) {
      const x = (v: number) => (side ? 512 - v : v)
      const streak = g.createLinearGradient(x(0), 0, x(215), 0)
      streak.addColorStop(0, 'rgba(190,205,230,0.5)')
      streak.addColorStop(1, 'rgba(190,205,230,0)')
      g.fillStyle = streak
      g.beginPath()
      g.moveTo(x(0), 0)
      g.lineTo(x(9), 0)
      g.lineTo(x(215), 104)
      g.lineTo(x(215), 106)
      g.lineTo(x(0), 4)
      g.fill()
    }
  })
}

const HAIR = 'rgba(255,255,255,0.16)'
const GLASS = '#0c0e12'

/** A printed plate: a name and a smaller line under it, white on dark, a screw at each end. */
function label(text: string, sub?: string, w = 512, h = 128, accent?: string) {
  const s = canvasScreen(w, h)
  s.g.fillStyle = GLASS
  s.g.fillRect(0, 0, w, h)
  s.g.strokeStyle = accent ?? HAIR
  s.g.lineWidth = 3
  s.g.strokeRect(3, 3, w - 6, h - 6)
  s.g.fillStyle = '#5c616b'
  for (const x of [h * 0.16, w - h * 0.16]) {
    s.g.beginPath()
    s.g.arc(x, h / 2, h * 0.045, 0, Math.PI * 2)
    s.g.fill()
  }
  s.g.textAlign = 'center'
  s.g.textBaseline = 'middle'
  s.g.fillStyle = TEXT
  s.g.font = face(h * 0.34, 500)
  s.g.fillText(text, w / 2, sub ? h * 0.36 : h / 2, w - h * 0.6)
  if (sub) {
    s.g.fillStyle = MUTED
    s.g.font = face(h * 0.22, 400)
    s.g.fillText(sub, w / 2, h * 0.74, w - h * 0.6)
  }
  s.draw()
  return s.texture
}

/** A rectangle with rounded corners, centred on the origin. */
function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = w / 2 - r, y = h / 2 - r
  s.absarc(x, -y, r, -Math.PI / 2, 0)
  s.absarc(x, y, r, 0, Math.PI / 2)
  s.absarc(-x, y, r, Math.PI / 2, Math.PI)
  s.absarc(-x, -y, r, Math.PI, Math.PI * 1.5)
  s.closePath()
  return s
}

/** A frame `rim` wide round a w × h opening, `depth` thick, facing +z from z = 0, its edges bevelled. */
function ring(w: number, h: number, r: number, rim: number, depth: number, bevel: number) {
  const s = roundRect(w + rim * 2, h + rim * 2, r + rim)
  s.holes.push(roundRect(w, h, r))
  return new THREE.ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, bevel)
}

/** A flat screen w × h facing +z, showing cell `i` of `n` across its picture. */
function cell(w: number, h: number, i: number, n: number) {
  const geo = new THREE.PlaneGeometry(w, h)
  const uv = geo.getAttribute('uv')
  for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / n)
  return geo
}

/** A soft-shade strip: dark along its lower edge (local -y), clear along the upper one. */
function fadeStrip(len: number, across: number) {
  const geo = new THREE.PlaneGeometry(len, across)
  const uv = geo.getAttribute('uv')
  for (let k = 0; k < uv.count; k++) uv.setXY(k, 0.5, 0.5 + uv.getY(k) / 2)
  return geo
}

type Pieces = THREE.BufferGeometry[]
/** Every piece as plain triangles, so boxes, lathes and extrusions all merge into one mesh per material. */
const put = (list: Pieces, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, to?: THREE.Matrix4) => {
  const g = (geo.index ? geo.toNonIndexed() : geo).translate(x, y, z)
  list.push(to ? g.applyMatrix4(to) : g)
}
const rounded = (w: number, h: number, d: number, r: number, segments = 2) => new RoundedBoxGeometry(w, h, d, segments, r)
const v3 = (p: readonly number[]) => new THREE.Vector3(p[0], p[1], p[2])

/** Paint a piece one colour, so pieces of many colours share one mesh. */
function tint<G extends THREE.BufferGeometry>(geo: G, hex: number) {
  const c = new THREE.Color(hex)
  const colours = new Float32Array(geo.getAttribute('position').count * 3)
  for (let i = 0; i < colours.length; i += 3) {
    colours[i] = c.r
    colours[i + 1] = c.g
    colours[i + 2] = c.b
  }
  return geo.setAttribute('color', new THREE.BufferAttribute(colours, 3))
}

/** The direction a cross-section path faces at point i: to the left of the way it runs. */
function leftOf(path: readonly THREE.Vector2[], i: number) {
  const a = path[Math.max(0, i - 1)]!
  const b = path[Math.min(path.length - 1, i + 1)]!
  return new THREE.Vector2(a.y - b.y, b.x - a.x).normalize()
}

/** A lining swept along z through a cross-section path, smooth round its curves and facing left of the path. Its picture repeats about every metre. */
function loft(path: readonly THREE.Vector2[], za: number, zb: number) {
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const runs = [0]
  for (let i = 1; i < path.length; i++) runs.push(runs[i - 1]! + path[i]!.distanceTo(path[i - 1]!))
  const whole = Math.round(runs.at(-1)!) / runs.at(-1)! // a whole number of panels round the section, so both sides match
  for (let i = 0; i < path.length - 1; i++) {
    for (const [k, z] of [[i, za], [i + 1, zb], [i + 1, za], [i, za], [i, zb], [i + 1, zb]] as const) {
      const n = leftOf(path, k)
      pos.push(path[k]!.x, path[k]!.y, z)
      nor.push(n.x, n.y, 0)
      uv.push(runs[k]! * whole, z)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}
const smooth = THREE.MathUtils.smoothstep

export function createCabin(host: HTMLElement, options: Omit<FpsOptions, 'start' | 'yaw'> & { onPose?: (pose: { x: number; z: number; yaw: number }) => void }): Cabin {
  const { onPose, ...fpsOptions } = options
  const renderer = new THREE.WebGLRenderer({ antialias: true }) // throws without WebGL; the component shows a fallback
  // 1.25× not the screen's 2×: ~60% fewer pixels to fill every frame.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)
  if (import.meta.env.DEV) Object.assign(window, { __renderer: renderer }) // QA: __renderer.info.render.calls

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000103)
  // Only the world outside and the little craft move: the rest of the cabin's positions are computed once.
  scene.matrixWorldAutoUpdate = false
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 2400)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.16
  pmrem.dispose()

  const [x0, , z0] = ROOM.min
  const [x1, y1, z1] = ROOM.max
  const W = x1 - x0
  const D = z1 - z0

  // ---- Light comes from somewhere: the strips where wall meets ceiling, and the window. The rest falls into shade.
  // Flat, bright and a little cool, like a station lab: the deck sends almost as much light back up as the strips send down.
  const STRIP = 2.3
  const FILL = 0.75
  const fill = new THREE.HemisphereLight(0xdbe4f4, 0x7d838f, FILL)
  scene.add(fill)
  const strips = [-1.4, 1.5].flatMap((z) => [x0 + 1, x1 - 1].map((x) => {
    const lamp = new THREE.PointLight(0xf1f5ff, STRIP, 9, 1.8)
    lamp.position.set(x, y1 - 0.4, z)
    scene.add(lamp)
    return lamp
  }))
  const windowLight = new THREE.PointLight(0xb4cdf2, 0, 8, 1.6)
  windowLight.position.set(WINDOW.x, WINDOW.y + 0.2, z0 + 0.55)
  scene.add(windowLight)

  // ---- Materials and pictures every fitting shares.
  const keep = <M extends THREE.Material>(m: M) => {
    m.userData.shared = true // modules are rebuilt; these outlive them
    return m
  }
  const brushed = brushedMap()
  const blob = blobMap()
  // The same grain, four times finer, for dark machined parts.
  const grain = brushed.clone()
  grain.repeat.set(4, 4)
  const metal = keep(new THREE.MeshStandardMaterial({ map: brushed, color: 0xb4bac4, roughness: 0.36, metalness: 0.85 }))
  const gun = keep(new THREE.MeshStandardMaterial({ map: grain, color: 0x4d535d, roughness: 0.5, metalness: 0.55 }))
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5, metalness: 0.35 }))
  const shadeMat = keep(new THREE.MeshBasicMaterial({ map: blob, color: 0x000000, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false }))
  const glowMat = keep(new THREE.MeshBasicMaterial({ map: blob, color: 0x8fa9cc, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  // Rack fronts, bags and ducts: one painted mesh, each piece its own colour.
  const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.06 })
  const wallMat = new THREE.MeshStandardMaterial({ map: hullMap(), color: 0xaab0ba, roughness: 0.74, metalness: 0.04 })
  const FACING = Math.PI / 2
  const fitted = (list: Pieces, mat: THREE.Material, into: THREE.Object3D = scene) => {
    const mesh = new THREE.Mesh(mergeGeometries(list), mat)
    into.add(mesh)
    return mesh
  }

  // ---- The module: a square section like a space-station lab. All four faces are racks and panels, and the chamfered
  // stand-off corners between them carry the lights, the vents and the cable trays.
  const half = section().map(([x, y]) => new THREE.Vector2(x, y))
  const SECTION = [...half, ...half.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))] // right deck, over the crown, to the left deck
  const CROWN = half.at(-1)!.y
  const hull: Pieces = []
  // cursor@kaipo's survey hatch: a round gold hatch in the floor (E on it goes down to the ground on Earth missions).
  const gold: Pieces = []
  put(gold, new THREE.TorusGeometry(0.45, 0.035, 10, 48).rotateX(FACING), 0, 0.02, 0)
  put(gold, new THREE.LatheGeometry([[0.43, 0.02], [0.41, 0.04], [0.37, 0.04], [0.345, 0.024], [0.3, 0.026], [0.2, 0.046], [0.17, 0.05], [0.14, 0.05], [0.125, 0.03], [0, 0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 48))
  put(gold, rounded(0.24, 0.022, 0.03, 0.01), 0, 0.05, 0) // a pull bar across the well in the middle
  put(gold, rounded(0.22, 0.05, 0.08, 0.02), 0, 0.025, -0.48)
  for (let i = 0; i < 6; i++) put(gold, rounded(0.08, 0.036, 0.05, 0.012).rotateY(-(i + 0.5) * (Math.PI / 3) + FACING), Math.cos((i + 0.5) * (Math.PI / 3)) * 0.47, 0.03, Math.sin((i + 0.5) * (Math.PI / 3)) * 0.47)
  const probeHatch = new THREE.Mesh(mergeGeometries(gold), new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0x6a4e10, emissiveIntensity: 0.16, roughness: 0.34, metalness: 0.7 }))
  probeHatch.position.set(HATCH[0], 0, HATCH[2])
  scene.add(probeHatch)
  fitted([tiledBox(W, 0.1, D, 2, 2).translate(0, -0.05, 0)], new THREE.MeshStandardMaterial({ map: floorMap(), color: 0x7e848e, roughness: 0.6, metalness: 0.15 }))
  put(hull, loft(SECTION, z0 - 0.02, z1 + 0.02))
  const bow = new THREE.Shape(SECTION)
  bow.holes.push(new THREE.Path(roundRect(WINDOW.w - 0.04, WINDOW.h - 0.04, 0.24).getPoints(6).map((p) => p.set(p.x + WINDOW.x, p.y + WINDOW.y))))
  put(hull, new THREE.ShapeGeometry(bow), 0, 0, z0)
  const aft = new THREE.Shape(SECTION)
  aft.holes.push(new THREE.Path(roundRect(HATCHWAY.w + HATCHWAY.rim, HATCHWAY.w + HATCHWAY.rim, HATCHWAY.r + HATCHWAY.rim / 2).getPoints(6).map((p) => p.set(p.x, p.y + HATCHWAY.y))))
  put(hull, new THREE.ShapeGeometry(aft).rotateY(Math.PI), 0, 0, z1)
  fitted(hull, wallMat)

  // Fittings, merged so each material is one draw call.
  const metals: Pieces = []
  const guns: Pieces = []
  const darks: Pieces = []
  const rails: Pieces = []
  const lamps: Pieces = []
  const skins: Pieces = []
  const hatch: Pieces = []
  const shades: Pieces = []
  const glows: Pieces = []
  const flatOn = (w: number, d: number) => new THREE.PlaneGeometry(w, d).rotateX(-FACING)
  put(darks, new THREE.TorusGeometry(0.385, 0.007, 6, 48).rotateX(FACING), HATCH[0], 0.036, HATCH[2])
  put(shades, flatOn(1.5, 1.5), HATCH[0], 0.004, HATCH[2])
  // Its steel collar, bolted to the deck.
  put(metals, new THREE.LatheGeometry([[0.58, 0], [0.58, 0.006], [0.565, 0.014], [0.44, 0.014]].map(([r, y]) => new THREE.Vector2(r, y)), 48), HATCH[0], 0, HATCH[2])
  for (let i = 0; i < 12; i++) put(darks, new THREE.CylinderGeometry(0.012, 0.012, 0.008, 6), HATCH[0] + Math.cos(i * 0.5236) * 0.53, 0.016, HATCH[2] + Math.sin(i * 0.5236) * 0.53)

  // A thin frame in the seam between racks every metre, round the whole section, just proud of the rack fronts.
  const RIB = 0.11
  const band = new THREE.Shape([...SECTION, ...SECTION.map((p, i) => p.clone().addScaledVector(leftOf(SECTION, i), RIB)).reverse()])
  const rib = new THREE.ExtrudeGeometry(band, { depth: 0.036, bevelEnabled: false }).translate(0, 0, -0.018)
  for (let k = 0; k <= D; k++) put(skins, tint(rib.clone(), 0x9aa0aa), 0, 0, z0 + k + (k === 0 ? 0.02 : k === D ? -0.02 : 0))

  // ---- Racks, built once each and stood along the walls. Local frame: u across the rack, y up, z off the wall.
  const SKIN = { white: 0xc9cdd3, pale: 0xb9bec6, fabric: 0xd3d0c6, back: 0x2a2e35, strap: 0x5d626c, skirt: 0x6a707b, blue: 0x3d6fc4, amber: 0xd08a2c }
  type Kit = { skins: Pieces; metals: Pieces; darks: Pieces; lamps: Pieces }
  /** A rounded slab on a rack, centred at (u, y), w × h, standing from `base` to `base + d` off the wall. With a colour it joins the painted mesh. */
  const slab = (list: Pieces, u: number, y: number, w: number, h: number, d: number, base = 0.03, colour?: number, r = 0.02) => {
    const geo = rounded(w, h, d, Math.min(r, w / 2.2, h / 2.2, d / 2.2), 1)
    put(list, colour === undefined ? geo : tint(geo, colour), u, y, base + d / 2)
  }
  /** A pull handle in a dark recess. */
  const pull = (k: Kit, u: number, y: number, w: number, base = 0.1) => {
    slab(k.darks, u, y, w + 0.05, 0.05, 0.008, base - 0.002)
    slab(k.metals, u, y, w, 0.02, 0.026, base + 0.004, undefined, 0.009)
  }
  /** A row of n locker doors, h tall, centred at height y. */
  const lockers = (k: Kit, y: number, h: number, n = 2) => {
    slab(k.skins, 0, y, 0.95, h, 0.045, 0.02, SKIN.back, 0.004) // dark behind the doors, so the gaps between them read as depth
    for (let c = 0; c < n; c++) {
      const w = 0.93 / n
      const u = (c - (n - 1) / 2) * w
      slab(k.skins, u, y, w - 0.02, h - 0.02, 0.07, 0.03, c % 2 ? SKIN.white : SKIN.pale)
      pull(k, u, y + h / 2 - 0.09, Math.min(0.16, w * 0.32))
    }
  }
  const disc = (r: number, d: number, n = 40) => new THREE.CylinderGeometry(r, r, d, n).rotateX(FACING)
  /** The dark backing of an overhead rack face. */
  const backing = (k: Kit) => put(k.skins, tint(new THREE.BoxGeometry(0.95, 0.95, 0.02), SKIN.back), 0, 0, 0.03)
  /** A plain door with a latch at each top corner: lighter than a locker, for the faces you only look up at. */
  const door = (k: Kit, u: number, y: number, w: number, h: number, colour: number) => {
    slab(k.skins, u, y, w - 0.02, h - 0.02, 0.07, 0.03, colour)
    for (const s of [-1, 1]) put(k.darks, new THREE.BoxGeometry(0.07, 0.024, 0.006), u + s * (w / 2 - 0.1), y + h / 2 - 0.07, 0.102)
  }
  const Y0 = 0.18 // racks stand 2.2 m tall above the cove
  const racks = ([
    // Stowage lockers.
    (k) => {
      for (let r = 0; r < 4; r++) lockers(k, Y0 + 0.275 + r * 0.55, 0.55)
      slab(k.skins, -0.36, Y0 + 0.92, 0.08, 0.04, 0.004, 0.099, SKIN.blue)
      slab(k.skins, 0.1, Y0 + 1.47, 0.08, 0.04, 0.004, 0.099, SKIN.amber)
      // A pouch strapped to one door.
      slab(k.skins, -0.2325, Y0 + 1.345, 0.38, 0.34, 0.08, 0.1, SKIN.fabric, 0.04)
      for (const s of [-1, 1]) slab(k.skins, -0.2325 + s * 0.1, Y0 + 1.345, 0.03, 0.28, 0.006, 0.177, SKIN.strap)
    },
    // A systems rack: two drawers, a recessed service bay with a port and plugged-in cables, a control panel, two lockers.
    (k) => {
      lockers(k, Y0 + 0.17, 0.34, 1)
      lockers(k, Y0 + 0.51, 0.34, 1)
      const yc = Y0 + 1.06
      slab(k.skins, 0, yc, 0.92, 0.74, 0.02, 0.02, SKIN.back)
      for (const s of [-1, 1]) {
        slab(k.skins, s * 0.435, yc, 0.05, 0.74, 0.1, 0.03, SKIN.white)
        slab(k.skins, 0, yc + s * 0.345, 0.92, 0.05, 0.1, 0.03, SKIN.white)
      }
      put(k.metals, new THREE.TorusGeometry(0.19, 0.024, 10, 40), -0.16, yc, 0.07)
      put(k.skins, tint(disc(0.175, 0.03), SKIN.white), -0.16, yc, 0.055)
      put(k.darks, new THREE.CylinderGeometry(0.045, 0.055, 0.03, 24).rotateX(FACING), -0.16, yc, 0.08)
      for (const dy of [0.2, 0, -0.2]) put(k.darks, disc(0.028, 0.05, 16), 0.2, yc + dy, 0.065)
      for (const run of [[[0.2, yc + 0.2, 0.08], [0.31, yc + 0.12, 0.13], [0.32, yc - 0.1, 0.13], [0.2, yc - 0.2, 0.08]], [[0.2, yc, 0.08], [0.08, yc - 0.1, 0.125], [0.03, yc - 0.26, 0.11], [0.03, yc - 0.33, 0.05]]])
        put(k.darks, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(run.map(v3)), 16, 0.011, 6))
      const yp = Y0 + 1.66
      slab(k.skins, 0, yp, 0.92, 0.4, 0.08, 0.03, SKIN.pale)
      slab(k.darks, -0.2, yp + 0.03, 0.42, 0.26, 0.01, 0.108)
      for (const [i, w] of [0.14, 0.24, 0.1].entries()) slab(k.lamps, -0.37 + w / 2, yp + 0.11 - i * 0.04, w, 0.012, 0.004, 0.117, 0x39c79a)
      slab(k.darks, 0.25, yp + 0.11, 0.38, 0.05, 0.006, 0.108)
      for (let i = 0; i < 6; i++) put(k.metals, disc(0.007, 0.035, 8), 0.1 + i * 0.06, yp + 0.11, 0.125)
      for (let i = 0; i < 3; i++) put(k.darks, new THREE.CylinderGeometry(0.03, 0.034, 0.03, 20).rotateX(FACING), 0.13 + i * 0.12, yp, 0.125)
      for (let i = 0; i < 5; i++) slab(k.darks, 0.25, yp - 0.09 - i * 0.022, 0.36, 0.01, 0.004, 0.108)
      lockers(k, Y0 + 2.04, 0.3)
    },
    // Soft stowage: a drawer, and fabric bags strapped to the rack above it.
    (k) => {
      lockers(k, Y0 + 0.34, 0.68, 1)
      slab(k.skins, 0, Y0 + 1.44, 0.92, 1.5, 0.02, 0.02, SKIN.back)
      for (const [u, y, w, h, d] of [[-0.235, 1.0, 0.44, 0.6, 0.13], [0.235, 0.94, 0.44, 0.48, 0.1], [0.235, 1.45, 0.44, 0.5, 0.12], [-0.235, 1.56, 0.44, 0.48, 0.09], [0, 2, 0.9, 0.36, 0.11]] as const) {
        slab(k.skins, u, Y0 + y, w, h, d, 0.04, SKIN.fabric, 0.05)
        for (const s of [-1, 1]) slab(k.skins, u + s * w * 0.24, Y0 + y, 0.035, h - 0.1, 0.008, 0.036 + d, SKIN.strap)
        slab(k.skins, u, Y0 + y + h * 0.18, 0.11, 0.06, 0.004, 0.038 + d, SKIN.white)
      }
    },
    // A round port cover with a rim, a ring of bolts and a handle, between lockers.
    (k) => {
      lockers(k, Y0 + 0.275, 0.55)
      const yc = Y0 + 1.02
      slab(k.skins, 0, yc, 0.92, 0.9, 0.05, 0.03, SKIN.pale)
      put(k.metals, new THREE.TorusGeometry(0.36, 0.03, 10, 48), 0, yc, 0.085)
      put(k.skins, tint(disc(0.34, 0.03, 48), SKIN.white), 0, yc, 0.085)
      put(k.darks, new THREE.TorusGeometry(0.2, 0.008, 6, 40), 0, yc, 0.1)
      put(k.darks, new THREE.CylinderGeometry(0.06, 0.075, 0.04, 24).rotateX(FACING), 0, yc, 0.11)
      for (let i = 0; i < 12; i++) put(k.darks, disc(0.011, 0.012, 6), Math.cos(i * 0.5236) * 0.415, yc + Math.sin(i * 0.5236) * 0.415, 0.084)
      slab(k.metals, 0, yc, 0.34, 0.03, 0.03, 0.13, undefined, 0.012)
      for (const s of [-1, 1]) put(k.metals, disc(0.01, 0.05, 8), s * 0.15, yc, 0.115)
      lockers(k, Y0 + 1.75, 0.5)
      slab(k.skins, 0, Y0 + 2.1, 0.92, 0.18, 0.06, 0.03, SKIN.white)
      for (let i = 0; i < 4; i++) slab(k.darks, -0.2, Y0 + 2.14 - i * 0.025, 0.4, 0.012, 0.004, 0.088)
      slab(k.skins, 0.28, Y0 + 2.1, 0.1, 0.05, 0.004, 0.089, SKIN.amber)
    },
    // Overhead lockers, for the end wall above the racks.
    (k) => {
      lockers(k, 2.66, 0.44)
      slab(k.skins, 0.33, 2.56, 0.08, 0.04, 0.004, 0.099, SKIN.blue)
    },
    // Low drawers, for the end wall under the window.
    (k) => lockers(k, Y0 + 0.335, 0.65),
    // Overhead, a metre square about its own middle: two doors.
    (k) => {
      backing(k)
      door(k, -0.2325, 0, 0.465, 0.95, SKIN.pale)
      door(k, 0.2325, 0, 0.465, 0.95, SKIN.white)
      slab(k.skins, 0.33, -0.3, 0.08, 0.04, 0.004, 0.099, SKIN.blue)
    },
    // Overhead: a wide door and an air return grille.
    (k) => {
      backing(k)
      door(k, 0, 0.165, 0.93, 0.62, SKIN.white)
      door(k, 0, -0.31, 0.93, 0.33, SKIN.pale)
      for (let i = 0; i < 5; i++) put(k.darks, new THREE.BoxGeometry(0.42, 0.014, 0.006), -0.17, -0.25 - i * 0.03, 0.102)
      slab(k.skins, 0.3, -0.31, 0.1, 0.05, 0.004, 0.099, SKIN.amber)
    },
    // Overhead: stowage bags under straps.
    (k) => {
      backing(k)
      for (const [u, y, w, h, d] of [[-0.235, 0.2, 0.44, 0.5, 0.13], [0.235, 0.22, 0.44, 0.46, 0.1], [0, -0.27, 0.9, 0.36, 0.12]] as const) {
        slab(k.skins, u, y, w, h, d, 0.04, SKIN.fabric, 0.05)
        for (const s of [-1, 1]) put(k.skins, tint(new THREE.BoxGeometry(0.035, h - 0.1, 0.008), SKIN.strap), u + s * w * 0.24, y, 0.04 + d)
        put(k.skins, tint(new THREE.BoxGeometry(0.11, 0.06, 0.004), SKIN.white), u, y + h * 0.18, 0.04 + d)
      }
    },
  ] as ((k: Kit) => void)[]).map((build) => {
    const k: Kit = { skins: [], metals: [], darks: [], lamps: [] }
    build(k)
    // One piece per material, so standing a rack somewhere copies four geometries, not fifty.
    for (const key of ['skins', 'metals', 'darks', 'lamps'] as const) if (k[key].length) k[key] = [mergeGeometries(k[key])]
    return k
  })
  const fittings: Kit = { skins, metals, darks, lamps }
  const fit = (kind: number, to: THREE.Matrix4) => {
    for (const key of ['skins', 'metals', 'darks', 'lamps'] as const) for (const g of racks[kind]![key]) fittings[key].push(g.clone().applyMatrix4(to))
    // Baked shade: rack fronts darken gently towards the deck, and again up under the stand-off's overhang (not on the ceiling, which the strips light).
    for (const g of skins.slice(-racks[kind]!.skins.length)) {
      const at = g.getAttribute('position')
      const c = g.getAttribute('color')
      for (let i = 0; i < c.count; i++) {
        const k = (0.66 + 0.34 * smooth(at.getY(i), 0.1, 1.5)) * (1 - 0.2 * smooth(at.getY(i), 2, 2.4) * (1 - smooth(at.getY(i), 2.9, 3.3)))
        c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k)
      }
    }
  }
  const rackAt = (kind: number, turn: number, x: number, z: number, y = 0) => fit(kind, new THREE.Matrix4().makeRotationY(turn).setPosition(x, y, z))
  for (let k = 0; k < D; k++) {
    rackAt([1, 0, 3, 2, 0, 1][k]!, FACING, x0, z0 + 0.5 + k)
    rackAt([3, 1, 0, 2, 3, 0][k]!, -FACING, x1, z0 + 0.5 + k)
  }
  for (const [i, x] of [-3.5, -2.5, -1.5, 1.5, 2.5, 3.5].entries()) rackAt([2, 0, 1, 3, 2, 0][i]!, Math.PI, x, z1)
  for (const x of [-2.5, -1.5, 1.5, 2.5]) rackAt(4, Math.PI, x, z1)
  for (let x = -2.5; x < 3; x++) rackAt(4, Math.PI, x, z1, 0.47) // a second row up to the ceiling, right across over the hatchway
  // The ceiling is a face of racks too: doors, air returns, and bags strapped overhead along one side.
  const overhead = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0))
  for (let i = 0; i < 6; i++) for (let k = 0; k < D; k++) fit(i === 0 && k > 2 ? 8 : (i + k) % 3 ? 6 : 7, overhead.clone().setPosition(i - 2.5, CROWN, z0 + 0.5 + k))
  for (let x = -2.5; x < 3; x++) rackAt(5, 0, x, z0)
  rackAt(0, 0, -3.5, z0)
  rackAt(2, 0, 3.5, z0)
  for (const x of [-3, -2, 2, 3]) put(metals, rounded(0.07, 2.26, RIB, 0.01, 1), x, Y0 + 1.1, z1 - RIB / 2)
  // A kick rail where the end walls meet the deck.
  for (const z of [z0 + 0.05, z1 - 0.05]) put(skins, tint(rounded(W - 0.4, 0.16, 0.1, 0.045, 1), SKIN.skirt), 0, 0.08, z)

  // A blue handrail standing off every other frame, and a blue edge to the deck.
  for (const [x, out] of [[x0, 1], [x1, -1]] as const) {
    for (const z of [-2, 0, 2]) {
      put(rails, new THREE.CylinderGeometry(0.017, 0.017, 0.72, 12), x + out * (RIB + 0.07), 1.72, z)
      for (const y of [1.42, 2.02]) put(rails, new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8).rotateZ(FACING), x + out * (RIB + 0.035), y, z)
    }
    // The lower stand-off: a chamfered corner between the racks and the deck, with an air return grille in every other bay.
    const skirt = new THREE.Matrix4().makeRotationZ((-out * Math.PI) / 4).setPosition(x + out * 0.14, 0.08, 0)
    put(skins, tint(new THREE.BoxGeometry(0.25, 0.02, D - 0.1), SKIN.pale), 0, 0, 0, skirt)
    for (let k = 0; k < D; k += 2) for (let i = 0; i < 3; i++) put(darks, new THREE.BoxGeometry(0.024, 0.006, 0.6), (i - 1) * 0.055, 0.012, z0 + 0.5 + k, skirt)
    // Two cables drop from the tray beside a frame and plug into the rack below.
    for (const z of [-1, 1]) {
      for (const [dz, r] of [[0, 0.013], [0.03, 0.009]] as const)
        put(darks, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.21, 2.67, 0.07], [0.2, 2.4, 0.07], [0.19, 2.05, 0.08], [0.17, 1.86, 0.1], [0.125, 1.78, 0.15]].map(([off, y, along]) => new THREE.Vector3(x + out * off!, y, z + along! + dz))), 20, r, 6))
      put(metals, new THREE.BoxGeometry(0.03, 0.03, 0.09), x + out * 0.185, 2.2, z + 0.09)
      put(darks, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16).rotateZ(FACING), x + out * 0.115, 1.78, z + 0.165)
    }
    // Shade where the deck meets the wall.
    put(shades, fadeStrip(D, 0.9).rotateX(-FACING).rotateY(-out * FACING), x + out * 0.45, 0.004, 0)
  }
  // The stand-off corners: a strip light in every bay, an air diffuser in every other one, and a tray of cables the length of the module.
  const rnd = seeded(3)
  const LAMP = 0xeef3ff
  const up = new THREE.Vector2(STANDOFF.to[0] - STANDOFF.from[0], STANDOFF.to[1] - STANDOFF.from[1]).normalize()
  for (const side of [1, -1]) {
    const to = new THREE.Matrix4()
      .makeBasis(new THREE.Vector3(side * up.x, up.y, 0), new THREE.Vector3(-side * up.y, up.x, 0), new THREE.Vector3(0, 0, side))
      .setPosition((side * (STANDOFF.from[0] + STANDOFF.to[0])) / 2, (STANDOFF.from[1] + STANDOFF.to[1]) / 2, 0)
    for (let k = 0; k < D; k++) {
      const z = z0 + 0.5 + k
      put(guns, rounded(0.3, 0.05, 0.9, 0.02), 0.3, 0.022, z, to)
      put(lamps, tint(new THREE.BoxGeometry(0.17, 0.012, 0.84), LAMP), 0.3, 0.05, z, to)
      if (k % 2) {
        put(skins, tint(rounded(0.26, 0.024, 0.66, 0.01, 1), SKIN.white), -0.03, 0.012, z, to)
        for (let i = 0; i < 4; i++) put(darks, new THREE.BoxGeometry(0.026, 0.006, 0.56), -0.03 + (i - 1.5) * 0.052, 0.026, z, to)
      } else put(skins, tint(new THREE.BoxGeometry(0.1, 0.004, 0.05), k % 4 ? SKIN.amber : SKIN.blue), -0.03, 0.002, z + 0.3, to)
    }
    put(darks, new THREE.BoxGeometry(0.2, 0.016, D - 0.1), -0.39, 0.008, 0, to)
    for (const [i, [x, r]] of ([[-0.45, 0.016], [-0.405, 0.012], [-0.355, 0.019]] as const).entries()) {
      const run = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, j) => new THREE.Vector3(x + (rnd() - 0.5) * 0.02, 0.016 + r + rnd() * 0.014, -D / 2 + 0.06 + (j * (D - 0.12)) / 12)))
      put(i === 1 ? rails : darks, new THREE.TubeGeometry(run, 72, r, 6), 0, 0, 0, to)
    }
  }
  // Seat tracks let into the deck the length of the module, with a low blue handrail on the outer pair; two more handrails overhead.
  for (const x of [-2.6, -1, 1, 2.6]) put(guns, new THREE.BoxGeometry(0.06, 0.008, D - 0.3), x, 0.004, 0)
  const bar = (x: number, y: number, z: number, off: number) => {
    put(rails, new THREE.CylinderGeometry(0.016, 0.016, 0.62, 10).rotateX(FACING), x, y + off, z)
    for (const s of [-1, 1]) put(rails, new THREE.CylinderGeometry(0.011, 0.011, Math.abs(off), 8), x, y + off / 2, z + s * 0.26)
  }
  for (const x of [-2.6, 2.6]) for (const z of [-1.45, 0.2]) bar(x, 0.008, z, 0.03)
  for (const x of [-2, 2]) for (const z of [-1.5, 1.5]) bar(x, CROWN - RIB, z, -0.06)
  const LOW = CROWN - RIB - 0.004 // the beacon hangs where four overhead racks meet
  put(shades, fadeStrip(W, 0.9).rotateX(-FACING), 0, 0.004, z1 - 0.45)
  put(shades, fadeStrip(W, 0.9).rotateX(-FACING).rotateY(Math.PI), 0, 0.004, z0 + 0.45)
  put(shades, fadeStrip(W, 0.8), 0, 0.4, z0 + 0.004)
  // The hatchway to the next module: a thick blue-grey frame through the end wall with a soft seal inside it, and two air ports above.
  const HW = HATCHWAY
  put(hatch, ring(HW.w, HW.w, HW.r, HW.rim, 0.46, 0.03).rotateY(Math.PI), 0, HW.y, z1 + 0.4)
  put(darks, ring(HW.w - 0.09, HW.w - 0.09, HW.r - 0.045, 0.045, 0.12, 0.012).rotateY(Math.PI), 0, HW.y, z1 + 0.16)
  for (const p of roundRect(HW.w + HW.rim, HW.w + HW.rim, HW.r + HW.rim / 2).getSpacedPoints(24).slice(1))
    put(darks, new THREE.CylinderGeometry(0.016, 0.016, 0.014, 6).rotateX(FACING), p.x, HW.y + p.y, z1 - 0.062)
  for (const x of [-0.6, 0.6]) {
    put(metals, new THREE.TorusGeometry(0.13, 0.02, 8, 32), x, 2.7, z1 - 0.02)
    put(darks, new THREE.CylinderGeometry(0.115, 0.115, 0.02, 32).rotateX(FACING), x, 2.7, z1 - 0.015)
  }
  // Beyond it the station goes on: a short stretch of the next module. Its light is painted on (nothing of the cabin's reaches it), and you cannot walk there.
  const next: Pieces = []
  const lit = (w: number, h: number, d: number, colour: number, x: number, y: number, z: number, turn = 0) => put(next, tint(new THREE.BoxGeometry(w, h, d), colour).rotateZ(turn), x, y, z1 + 0.4 + z)
  const N = 1.3 // half its section, about the hatchway's middle
  lit(N * 2, N * 2, 0.04, 0xcfd4dc, 0, HW.y, 6)
  // Each face: a darker sheet that shows as the seams between six rack fronts.
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    lit(dx ? 0.04 : N * 2, dx ? N * 2 : 0.04, 6, 0x8e96a3, dx * N, HW.y + dy * N, 3)
    for (let k = 0; k < 6; k++) lit(dx ? 0.04 : N * 2 - 0.7, dx ? N * 2 - 0.7 : 0.04, 0.96, (dx ? 0xdde1e7 : dy > 0 ? 0xe9edf3 : 0xa4aab4) - (k % 2) * 0x0a0a0a, dx * (N - 0.02), HW.y + dy * (N - 0.02), k + 0.5)
  }
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) lit(0.56, 0.03, 6, 0xbfc5ce, s * (N - 0.19), HW.y + t * (N - 0.19), 3, (-s * t * Math.PI) / 4) // its own stand-offs
    lit(0.18, 0.03, 5.6, 0xffffff, s * (N - 0.21), HW.y + N - 0.21, 3, (-s * Math.PI) / 4)
    for (const z of [1.5, 3.5]) lit(0.03, 0.03, 0.7, 0x3d6fc4, s * (N - 0.06), HW.y + 0.25, z)
    lit(0.02, 0.05, 0.1, s > 0 ? 0xd08a2c : 0x3d6fc4, s * (N - 0.05), HW.y - 0.3, 2.5)
  }
  // Bags strapped along one side.
  for (const [y, h, z] of [[-0.62, 0.44, 2.4], [-0.16, 0.42, 2.45], [-0.6, 0.48, 3.0]] as const) {
    lit(0.26, h, 0.5, 0xe6e2d6, -N + 0.15, HW.y + y, z)
    lit(0.27, h + 0.01, 0.04, 0x6d727c, -N + 0.15, HW.y + y, z)
  }
  put(next, tint(ring(1.1, 1.1, 0.26, 0.16, 0.05, 0), 0x6c7c93), 0, HW.y, z1 + 6.3) // the far hatch, closed
  lit(1.14, 1.14, 0.02, 0x555d6b, 0, HW.y, 5.96)
  // Dimmer than the cabin, a little brighter with distance, as a lit room is through a doorway. Full-bright paint stays:
  // those are its light strips. Unshaded, the whole module read as flat white boxes next to the lit cabin.
  for (const g of next) {
    const at = g.getAttribute('position')
    const c = g.getAttribute('color')
    for (let i = 0; i < c.count; i++) {
      if (c.getX(i) > 0.99 && c.getY(i) > 0.99 && c.getZ(i) > 0.99) continue
      // Its lights are in the ceiling: darker towards the deck, so the faces read as a room and not as one flat tone.
      const k = (0.55 + 0.25 * smooth(at.getZ(i), z1, z1 + 5)) * (0.5 + 0.5 * smooth(at.getY(i), HW.y - N, HW.y + N))
      c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k)
    }
  }
  lamps.push(...next)

  // ---- The window: a thick bolted frame through the hull, a gasket, and an inner pane that mirrors a little of the room.
  put(metals, ring(WINDOW.w - 0.1, WINDOW.h - 0.1, 0.22, 0.24, 0.38, 0.02), WINDOW.x, WINDOW.y, z0 - 0.26)
  put(darks, ring(WINDOW.w - 0.18, WINDOW.h - 0.18, 0.18, 0.05, 0.03, 0), WINDOW.x, WINDOW.y, z0 - 0.24)
  for (const p of roundRect(WINDOW.w + 0.14, WINDOW.h + 0.14, 0.34).getSpacedPoints(56).slice(1))
    put(darks, new THREE.CylinderGeometry(0.02, 0.02, 0.016, 6).rotateX(FACING), WINDOW.x + p.x, WINDOW.y + p.y, z0 + 0.127)
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(WINDOW.w - 0.1, WINDOW.h - 0.1),
    new THREE.MeshBasicMaterial({ map: glassMap(), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false }),
  )
  glass.position.set(WINDOW.x, WINDOW.y, z0 - 0.2)
  glass.renderOrder = 2 // after the air outside
  scene.add(glass)

  // ---- Outside: stars, and the world you orbit, lit by the real Sun.
  // You look down and ahead at it and its limb curves across the upper window. It takes 38° of sky either side of
  // straight down (about 4,000 km up): the maps have 40 km pixels, so from nearer the coasts would blur.
  const WORLD_R = 600
  const HALF = 0.66
  const down = HALF - 0.16
  const far = WORLD_R / Math.sin(HALF)
  /** From the world's centre up to the craft, and along the ground toward the far limb. */
  const zenith = new THREE.Vector3(0, Math.sin(down), Math.cos(down))
  const ahead = new THREE.Vector3(0, Math.cos(down), -Math.sin(down))
  const starGeo = new THREE.BufferGeometry()
  const pts: number[] = []
  const v = new THREE.Vector3()
  for (let i = 0; i < 2600; i++) {
    v.randomDirection().multiplyScalar(2000)
    if (v.z > 100) v.z = -v.z // keep them in front of the window
    pts.push(v.x, v.y, v.z)
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.3, sizeAttenuation: false })))
  // The real planet (claude@ethan, ui/scene3d): NASA surface maps, city lights at night, clouds over Earth.
  // Where the Sun is right now, in the map's own frame. The craft starts 80° east and a little north of the place
  // where it is noon, the Sun low on its left: day on the left of the window, dusk and city lights on the right.
  // It flies toward the Sun.
  const sunMap = new THREE.Vector3(...sunDirection(new Date()))
  const east = new THREE.Vector3(0, 1, 0).cross(sunMap).normalize()
  const drift = east.clone().addScaledVector(new THREE.Vector3().crossVectors(sunMap, east), 0.4).normalize()
  const under = sunMap.clone().multiplyScalar(Math.cos(1.4)).addScaledVector(drift, Math.sin(1.4))
  const toSun = sunMap.clone().addScaledVector(under, -sunMap.dot(under)).normalize()
  const sunSide = new THREE.Vector3(-1, 0, 0)
  const start = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(zenith, sunSide, new THREE.Vector3().crossVectors(zenith, sunSide))
      .multiply(new THREE.Matrix4().makeBasis(under, toSun, new THREE.Vector3().crossVectors(under, toSun)).transpose()),
  )
  const orbit = new THREE.Quaternion()
  const uSun = { value: new THREE.Vector3(0, 1, 0) }
  const uBody = { value: WORLD_INDEX.earth as number }
  const cloudTime = { value: 0 }
  const worldMaps = planetMaps(renderer.capabilities.getMaxAnisotropy())
  const worldMat = new THREE.ShaderMaterial({ ...toScreen(planetShader), uniforms: { uSun, uBody, ...worldMaps.maps.earth } })
  const world = new THREE.Mesh(new THREE.SphereGeometry(WORLD_R, 96, 64), worldMat)
  world.position.set(WINDOW.x, WINDOW.y, z0).addScaledVector(zenith, -far)
  scene.add(world)
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(WORLD_R * 1.004, 96, 64),
    new THREE.ShaderMaterial({ ...toScreen(cloudShader), uniforms: { uSun, uTime: cloudTime, ...worldMaps.maps.earth }, transparent: true, depthWrite: false }),
  )
  world.add(clouds)
  // A thin line of air on the limb, brightest on the sunlit side.
  const AIR_R = WORLD_R * 1.022
  const uAir = { value: new THREE.Color(0.3, 0.55, 1) }
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(AIR_R, 96, 48),
    new THREE.ShaderMaterial({
      ...toScreen(atmosphereShader),
      uniforms: { uSun, uColor: uAir, uThickness: { value: Math.sqrt(1 - (WORLD_R / AIR_R) ** 2) } },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  world.add(atmosphere)
  /** How much the world outside lights the window, by body: bright blue Earth, dark grey Moon, dusty Mars. */
  let shine = 1

  // ---- The console: a desk blade with a sloped control shelf and a raised instrument panel, carried on two
  // turned pedestals so the deck runs on under it. Its side profile (metres in front of DASH.z, height) runs the length of the desk.
  const SHELF = Math.atan2(0.11, 0.35)
  const TILT = Math.atan2(0.14, 0.33)
  const blade = new THREE.Shape()
  blade.moveTo(-0.3, 0.9) // the shelf's front edge; x is metres behind DASH.z
  blade.lineTo(0.05, 1.01)
  blade.lineTo(0.19, 1.34)
  blade.quadraticCurveTo(0.2, 1.365, 0.24, 1.365)
  blade.quadraticCurveTo(0.3, 1.365, 0.3, 1.3)
  blade.lineTo(0.3, 0.82)
  blade.quadraticCurveTo(0.3, 0.76, 0.24, 0.76)
  blade.lineTo(-0.02, 0.76)
  blade.lineTo(-0.27, 0.845)
  blade.quadraticCurveTo(-0.318, 0.862, -0.3, 0.9)
  const HALF_DESK = DASH.w / 2 - 0.04
  // A pedestal turned like the equipment mounts, drawn out to an oval twice as wide as it is deep.
  const leg = new THREE.LatheGeometry([[0, 0], [0.15, 0], [0.15, 0.018], [0.13, 0.034], [0.085, 0.085], [0.06, 0.2], [0.052, 0.5], [0.064, 0.64], [0.1, 0.725], [0.135, 0.775]].map(([r, y]) => new THREE.Vector2(r, y)), 40).scale(2, 1, 1)
  put(guns, new THREE.ExtrudeGeometry(blade, { depth: HALF_DESK * 2 - 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.02, bevelSegments: 2 }).rotateY(FACING), -HALF_DESK + 0.02, 0, DASH.z)
  for (const s of [-1, 1]) {
    // A bright cheek closing each end of the blade.
    put(metals, new THREE.ExtrudeGeometry(blade, { depth: 0.024, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.008, bevelSegments: 2 }).rotateY(FACING), s * (HALF_DESK + 0.02) - 0.012, 0, DASH.z)
    put(guns, leg.clone(), s * 1.45, 0, DASH.z - 0.11)
    put(metals, new THREE.TorusGeometry(0.058, 0.012, 8, 40).rotateX(FACING).scale(2, 1, 1), s * 1.45, 0.58, DASH.z - 0.11)
  }
  // Between the pedestals: a foot rail, an equipment box slung under the blade and its cables down to the deck.
  put(metals, new THREE.CylinderGeometry(0.018, 0.018, 2.9, 12).rotateZ(FACING), 0, 0.17, DASH.z - 0.11)
  put(guns, rounded(1.2, 0.17, 0.22, 0.03), 0, 0.68, DASH.z - 0.17)
  for (const [x, r] of [[-0.36, 0.014], [-0.31, 0.01], [0.4, 0.012]] as const)
    put(darks, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[x, 0.6, DASH.z - 0.17], [x + 0.02, 0.36, DASH.z - 0.2], [x - 0.01, 0.12, DASH.z - 0.34], [x, 0.01, DASH.z - 0.5]].map(v3)), 16, r, 6))
  // A grab bar along the front of the blade.
  put(metals, new THREE.CylinderGeometry(0.014, 0.014, 3.7, 12).rotateZ(FACING), 0, 0.868, DASH.z + 0.365)
  for (let i = 0; i < 5; i++) put(metals, new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8).rotateX(FACING), (i - 2) * 0.9, 0.868, DASH.z + 0.335)
  // A laptop on an arm clamped behind the left end of the blade, over the console where nobody walks.
  const lap = new THREE.Matrix4().makeRotationX(0.16).setPosition(-HALF_DESK + 0.2, 1.43, DASH.z - 0.14)
  put(guns, rounded(0.32, 0.018, 0.22, 0.006, 1), 0, 0, 0, lap)
  put(darks, new THREE.BoxGeometry(0.27, 0.004, 0.1), 0, 0.011, -0.03, lap)
  const lid = lap.clone().multiply(new THREE.Matrix4().makeRotationX(-0.3).setPosition(0, 0.008, -0.11))
  put(guns, rounded(0.32, 0.21, 0.012, 0.005, 1), 0, 0.105, 0, lid)
  put(darks, new THREE.BoxGeometry(0.29, 0.18, 0.002), 0, 0.105, 0.007, lid)
  for (const [i, w] of [0.12, 0.2, 0.08].entries()) put(lamps, tint(new THREE.BoxGeometry(w, 0.008, 0.001), i ? 0x7f8794 : 0x39c79a), -0.125 + w / 2, 0.17 - i * 0.026, 0.009, lid)
  put(metals, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.9, -0.31], [0.01, 1.12, -0.36], [0, 1.32, -0.3], [0, 1.415, -0.16]].map(([x, y, z]) => new THREE.Vector3(-HALF_DESK + 0.2 + x!, y, DASH.z + z!))), 16, 0.012, 8))
  for (const [y, z] of [[1.12, -0.36], [1.32, -0.3]] as const) put(darks, new THREE.SphereGeometry(0.024, 10, 8), -HALF_DESK + 0.2, y, DASH.z + z)
  put(shades, flatOn(DASH.w + 1.3, 2), 0, 0.005, DASH.z + 0.05)
  put(shades, flatOn(DASH.w + 0.3, 1), 0, 0.007, DASH.z - 0.05)
  /** Onto the control shelf, x along the desk and z metres in front of DASH.z; and onto the face of the instrument panel. */
  const onShelf = (x: number, z: number) => new THREE.Matrix4().makeRotationX(SHELF).setPosition(x, 0.912 + (0.3 - z) * (0.11 / 0.35), DASH.z + z)
  const onPanel = new THREE.Matrix4().makeRotationX(-TILT).setPosition(0, 1.18, DASH.z - 0.108)
  // Five gauges, each a display in its own bezel.
  const gaugeScreen = canvasScreen(GAUGE.w * 5, GAUGE.h)
  const gaugeFaces: Pieces = []
  for (let i = 0; i < 5; i++) {
    const x = -1.9 + i * 0.42
    put(gaugeFaces, cell(0.37, 0.24, i, 5), x, 0, 0.004, onPanel)
    put(metals, ring(0.37, 0.24, 0.016, 0.018, 0.014, 0.004), x, 0, 0, onPanel)
  }
  fitted(gaugeFaces, new THREE.MeshBasicMaterial({ map: gaugeScreen.texture, toneMapped: false }))
  put(glows, flatOn(2.4, 0.5), -1.06, 0.004, 0, onShelf(0, 0.1))
  // Keys under the gauges: two plates of switches.
  for (const x of [-1.6, -0.52]) {
    const to = onShelf(x, 0.12)
    put(darks, rounded(0.74, 0.012, 0.2, 0.005), 0, 0.006, 0, to)
    put(metals, ring(0.75, 0.21, 0.02, 0.02, 0.026, 0.004).rotateX(-FACING), 0, 0, 0, to) // the rim of the well the keys sit in
    for (let row = 0; row < 2; row++) for (let col = 0; col < 10; col++) put(guns, rounded(0.05, 0.016, 0.05, 0.006), (col - 4.5) * 0.07, 0.018, (row - 0.5) * 0.08, to)
  }
  // Your spacecraft, a desk model on a turned stand.
  const stand = onShelf(0.5, 0.105) // its base lies on the sloped shelf; level, the shelf swallowed its back half
  put(metals, new THREE.CylinderGeometry(0.12, 0.14, 0.05, 48), 0, 0.025, 0, stand)
  put(darks, new THREE.CylinderGeometry(0.1, 0.1, 0.012, 48), 0, 0.053, 0, stand)
  put(metals, new THREE.CylinderGeometry(0.007, 0.007, 0.26, 10), 0.5, 1.13, DASH.z + 0.12)
  const craftHolder = new THREE.Group()
  craftHolder.position.set(0.5, 1.28, DASH.z + 0.12)
  scene.add(craftHolder)
  // Time controls: a lit push button (pause) and a rotary switch (speed), on one printed plate, each with a readout above it.
  const plateAt = onShelf(1.65, 0.1)
  const plate = new THREE.Mesh(flatOn(0.96, 0.32).translate(0, 0.003, 0).applyMatrix4(plateAt), new THREE.MeshStandardMaterial({ map: controlPlate(), roughness: 0.6, metalness: 0.3 }))
  scene.add(plate)
  const pauseAt = onShelf(1.4, 0.1)
  put(metals, new THREE.CylinderGeometry(0.078, 0.086, 0.022, 48), 0, 0.011, 0, pauseAt)
  put(darks, new THREE.CylinderGeometry(0.066, 0.066, 0.03, 48), 0, 0.02, 0, pauseAt)
  const pauseMat = new THREE.MeshStandardMaterial({ color: 0x20262a, emissive: 0x5ee0a8, emissiveIntensity: 1, roughness: 0.3 })
  const cap = [[0, 0.03], [0.03, 0.029], [0.05, 0.024], [0.058, 0.014], [0.06, 0]].map(([r, y]) => new THREE.Vector2(r, y)).reverse()
  const pauseBtn = new THREE.Mesh(new THREE.LatheGeometry(cap, 48).translate(0, 0.032, 0).applyMatrix4(pauseAt), pauseMat)
  scene.add(pauseBtn)
  const speedAt = onShelf(1.9, 0.1)
  put(metals, new THREE.CylinderGeometry(0.07, 0.076, 0.012, 48), 0, 0.006, 0, speedAt)
  const knobHolder = new THREE.Group()
  knobHolder.applyMatrix4(speedAt)
  const knob = new THREE.Group()
  const skirt = [[0.062, 0.012], [0.058, 0.022], [0.048, 0.034], [0.042, 0.038], [0, 0.038]].map(([r, y]) => new THREE.Vector2(r, y))
  const grip: Pieces = []
  put(grip, new THREE.LatheGeometry(skirt, 48))
  put(grip, rounded(0.03, 0.026, 0.124, 0.012), 0, 0.046, 0)
  fitted(grip, gun, knob)
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xe8ecf2 })
  knob.add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.05).translate(0, 0.06, -0.034), whiteMat))
  knobHolder.add(knob)
  scene.add(knobHolder)
  const statusScreen = canvasScreen(STATUS.w * 2, STATUS.h)
  const statusFaces: Pieces = []
  for (const [i, x] of [1.4, 1.9].entries()) {
    put(statusFaces, cell(0.4, 0.19, i, 2), x, 0, 0.004, onPanel)
    put(metals, ring(0.4, 0.19, 0.016, 0.018, 0.014, 0.004), x, 0, 0, onPanel)
  }
  fitted(statusFaces, new THREE.MeshBasicMaterial({ map: statusScreen.texture, toneMapped: false }))
  put(glows, flatOn(1.1, 0.5), 1.65, 0.006, 0, onShelf(0, 0.1))
  let controlsKey = ''

  // ---- The alarm beacon: a caged red dome on the ceiling, and the red light it throws.
  put(metals, new THREE.CylinderGeometry(0.15, 0.16, 0.035, 48), 0, LOW - 0.018, 0)
  for (const turn of [0, FACING]) put(darks, new THREE.TorusGeometry(0.118, 0.006, 8, 32, Math.PI).rotateX(Math.PI).rotateY(turn), 0, LOW - 0.035, 0)
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x4a0d0a, emissive: 0xff2a1a, emissiveIntensity: 0, roughness: 0.25 })
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, LOW - 0.035, 0), beaconMat)
  scene.add(beacon)
  const alarmLight = new THREE.PointLight(0xff2a1a, 0, 12, 2)
  alarmLight.position.set(0, y1 - 0.6, 0) // clear of the flat ceiling, so it washes the room and does not burn a spot overhead
  scene.add(alarmLight)
  // A red wash on the wall behind the module that raised the alarm, pulsing with the beacon.
  const washMat = new THREE.MeshBasicMaterial({ map: blob, color: 0xff3b2f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), washMat)
  wash.renderOrder = 1
  scene.add(wash)
  let alarm = false

  fitted(metals, metal)
  fitted(guns, gun)
  fitted(darks, dark)
  fitted(rails, new THREE.MeshStandardMaterial({ color: 0x29426f, roughness: 0.45, metalness: 0.5 }))
  fitted(lamps, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))
  fitted(skins, skinMat)
  fitted(hatch, new THREE.MeshStandardMaterial({ color: 0x8799b5, roughness: 0.6, metalness: 0.1 }))
  fitted(shades, shadeMat).renderOrder = 1
  fitted(glows, glowMat).renderOrder = 1
  // Daylight from the window, pooled on the control shelf and on the deck in front of the console. It follows the Sun outside.
  const spillMat = new THREE.MeshBasicMaterial({ map: blob, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const spill: Pieces = []
  put(spill, flatOn(DASH.w + 0.6, 0.8), 0, 0.034, 0, onShelf(0, 0.14))
  put(spill, flatOn(5.4, 2.6), 0, 0.009, DASH.z + 1.45)
  fitted(spill, spillMat).renderOrder = 1

  // ---- Modules (rebuilt when the design changes) and anomaly choices (rebuilt per card).
  const moduleGroup = new THREE.Group()
  const choiceGroup = new THREE.Group()
  scene.add(moduleGroup, choiceGroup)
  let modulesKey = ''
  let choicesKey = ''
  const lights = new Map<string, THREE.MeshStandardMaterial>()
  let storageScreen: ReturnType<typeof canvasScreen> | null = null
  const PLATE = 0.926 // where a part stands: the top of a mount's ring

  const buildModules = (list: Module[]) => {
    for (const c of [...moduleGroup.children]) {
      moduleGroup.remove(c)
      disposeObject(c)
    }
    lights.clear()
    storageScreen = null
    const mounts = { metals: [] as Pieces, guns: [] as Pieces, darks: [] as Pieces, shades: [] as Pieces }
    const column = new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.3, 0.022], [0.26, 0.04], [0.15, 0.1], [0.115, 0.22], [0.105, 0.56], [0.13, 0.74], [0.21, 0.84], [0.31, 0.874]].map(([r, y]) => new THREE.Vector2(r, y)), 40).toNonIndexed()
    const table = new THREE.LatheGeometry([[0, 0.872], [0.33, 0.872], [0.352, 0.879], [0.36, 0.891], [0.352, 0.904], [0.33, 0.91], [0, 0.91]].map(([r, y]) => new THREE.Vector2(r, y)), 48).toNonIndexed()
    const size = new THREE.Box3()
    for (const m of list) {
      const rot = Math.atan2(m.face[0], m.face[1])
      // Local frame: the mount stands at the origin facing +z, the wall 0.5 m behind it.
      const to = new THREE.Matrix4().makeRotationY(rot).setPosition(m.at[0], 0, m.at[2])
      // An equipment mount: a turned column bolted to the deck, a machined table with a ring for the part, a tilted
      // name pod on an arm, and an umbilical plugged into the rack behind.
      put(mounts.guns, column.clone(), 0, 0, 0, to)
      put(mounts.metals, table.clone(), 0, 0, 0, to)
      put(mounts.guns, new THREE.CylinderGeometry(0.21, 0.22, 0.016, 48), 0, PLATE - 0.008, 0, to)
      for (let i = 0; i < 8; i++) {
        put(mounts.darks, new THREE.CylinderGeometry(0.009, 0.009, 0.006, 6), Math.cos(i * 0.785) * 0.3, 0.913, Math.sin(i * 0.785) * 0.3, to)
        put(mounts.darks, new THREE.CylinderGeometry(0.013, 0.013, 0.012, 6), Math.cos(i * 0.785) * 0.275, 0.03, Math.sin(i * 0.785) * 0.275, to)
      }
      const pod = to.clone().multiply(new THREE.Matrix4().makeRotationX(-0.45).setPosition(0, 0.6, 0.2))
      put(mounts.metals, rounded(0.06, 0.05, 0.14, 0.012), 0, 0.6, 0.13, to)
      put(mounts.guns, rounded(0.46, 0.21, 0.04, 0.015), 0, 0, 0, pod)
      put(mounts.darks, rounded(0.3, 0.045, 0.012, 0.005), 0, 0.06, 0.022, pod)
      for (const [x, r] of [[0.03, 0.014], [-0.03, 0.009]] as const)
        put(mounts.darks, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[x, 0.8, -0.14], [x * 1.4, 0.64, -0.27], [x * 1.4, 0.57, -0.36], [x * 1.4, 0.6, -0.41]].map(v3)), 14, r, 6), 0, 0, 0, to)
      put(mounts.metals, new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16).rotateX(FACING), 0, 0.6, -0.395, to)
      put(mounts.shades, flatOn(1.5, 1.4), 0, 0.006, 0, to)
      put(mounts.shades, flatOn(0.62, 0.56), 0, PLATE + 0.002, 0, to)
      put(mounts.shades, new THREE.PlaneGeometry(1.5, 1.7), 0, 0.95, -0.31, to) // on the rack fronts behind it

      const model = m.part ? partModel(m.part) : null
      if (model) {
        model.rotation.y = rot
        // Seated: as big as the top plate allows, its lowest point resting on the ring.
        size.setFromObject(model)
        model.scale.multiplyScalar(Math.min(1.3, 0.72 / Math.max(size.max.x - size.min.x, size.max.z - size.min.z)))
        model.position.set(m.at[0], PLATE - size.setFromObject(model).min.y, m.at[2])
        moduleGroup.add(model)
      } else if (m.key === 'storage') {
        // The data core: a recorder on rubber feet, its flat display in a bezel filling up with stored data.
        put(mounts.guns, rounded(0.52, 0.34, 0.36, 0.02), 0, PLATE + 0.19, 0, to)
        for (const sx of [-1, 1]) for (const z of [-0.13, 0.13]) put(mounts.darks, new THREE.CylinderGeometry(0.025, 0.025, 0.022, 16), sx * 0.2, PLATE + 0.011, z, to)
        put(mounts.metals, ring(0.34, 0.22, 0.014, 0.018, 0.014, 0.004), -0.06, PLATE + 0.19, 0.18, to)
        for (let i = 0; i < 4; i++) put(mounts.darks, new THREE.BoxGeometry(0.05, 0.012, 0.01), 0.19, PLATE + 0.25 - i * 0.04, 0.181, to)
        storageScreen = canvasScreen(GAUGE.w, GAUGE.h)
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22).translate(-0.06, PLATE + 0.19, 0.185).applyMatrix4(to), new THREE.MeshBasicMaterial({ map: storageScreen.texture, toneMapped: false }))
        moduleGroup.add(scr)
      }
      const plateMap = label(m.name, m.part?.name)
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1).translate(0, -0.035, 0.0215).applyMatrix4(pod), new THREE.MeshStandardMaterial({ map: plateMap, emissiveMap: plateMap, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.6 }))
      // Five small LEDs in the housing: green in flight, flashing red when this module raises the alarm.
      const lightMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0e, emissive: 0x5ee0a8, emissiveIntensity: 1 })
      const leds: Pieces = []
      for (let i = 0; i < 5; i++) put(leds, new THREE.BoxGeometry(0.03, 0.012, 0.006), (i - 2) * 0.05, 0.06, 0.03, pod)
      moduleGroup.add(plate, new THREE.Mesh(mergeGeometries(leds), lightMat))
      lights.set(m.key, lightMat)
    }
    fitted(mounts.metals, metal, moduleGroup)
    fitted(mounts.guns, gun, moduleGroup)
    fitted(mounts.darks, dark, moduleGroup)
    fitted(mounts.shades, shadeMat, moduleGroup).renderOrder = 1
  }

  const buildChoices = (decision: Decision | null, list: Module[]) => {
    for (const c of [...choiceGroup.children]) {
      choiceGroup.remove(c)
      disposeObject(c)
    }
    if (!decision) return
    const spots = choiceSpots(decision, list)
    const m = moduleFor(decision.console, list)
    const facing = m?.face ?? ([0, 1] as [number, number])
    const rot = Math.atan2(facing[0], facing[1])
    decision.options.forEach((o, i) => {
      const s = spots[i]!
      const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: optionTexture(String.fromCharCode(65 + i), o.label, o.effect_text), toneMapped: false }))
      btn.position.set(...s.at)
      btn.rotation.y = rot
      choiceGroup.add(btn)
    })
    // The card's title over the choices.
    const mid = choiceTitleAt(spots)
    const title = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.2), new THREE.MeshBasicMaterial({ map: label(decision.title.toUpperCase(), undefined, 768, 140, BAD), toneMapped: false }))
    title.position.set(mid[0], mid[1], mid[2])
    title.rotation.y = rot
    choiceGroup.add(title)
  }

  // ---- Walking.
  scene.updateMatrixWorld(true)
  const fps = createFps(renderer.domElement, camera, { ...fpsOptions, start: START.pos, yaw: START.yaw })
  const crew = mountCrew(scene, { float: true })
  const resize = () => {
    const { clientWidth: cw, clientHeight: ch } = host
    if (!cw || !ch) return
    renderer.setSize(cw, ch, false)
    camera.aspect = cw / ch
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  let worldTurn = 0
  let worldSpin = 0
  /** Screens redraw only when their numbers change, and at most 4 times a second (the sim can step 60 times a second). */
  let screensKey = ''
  let screensAt = 0
  let latest: CabinScreens | null = null
  let craftKey = ''
  let alarmKey: string | null = null
  const loop = roomLoop((now, dt) => {
    fps.update(dt)
    onPose?.(fps.feet())
    crew.update(dt)
    // The sim's day arrives in steps. Glide towards it every frame and keep the craft moving along its orbit between
    // steps, so the ground never jumps: it slides across the window, and the Sun stays where it really is over it.
    worldSpin += (worldTurn - worldSpin) * (1 - Math.exp(-dt * 2.5))
    world.quaternion.multiplyQuaternions(orbit.setFromAxisAngle(ahead, worldSpin + now * 0.000004), start)
    uSun.value.copy(sunMap).applyQuaternion(world.quaternion)
    cloudTime.value = now / 1000
    craftHolder.rotation.y += dt * 0.4
    world.updateMatrixWorld(true)
    craftHolder.updateMatrixWorld(true)
    if (latest && now - screensAt > 250) {
      const sk = `${latest.gauges.map((g) => g.value).join('|')}|${Math.round(latest.storage * 100)}`
      if (sk !== screensKey) {
        screensKey = sk
        screensAt = now
        drawGauges(gaugeScreen, latest.gauges)
        if (storageScreen) drawStorage(storageScreen, latest.storage)
      }
    }
    const pulse = alarm ? (options.reducedMotion ? 0.7 : 0.5 + 0.5 * Math.sin(now / 160)) : 0 // reduced motion: a steady red light
    alarmLight.intensity = 14 * pulse
    beaconMat.emissiveIntensity = 4 * pulse
    // The room dims under an alarm; the window lets in more light the higher the Sun stands over the ground below.
    const room = alarm ? 0.6 : 1
    fill.intensity = FILL * room
    for (const lamp of strips) lamp.intensity = STRIP * room
    windowLight.intensity = shine * (0.4 + 4.2 * smooth(zenith.dot(uSun.value), -0.1, 0.55))
    spillMat.opacity = windowLight.intensity * 0.04
    const flash = alarmKey && lights.get(alarmKey)
    if (flash) flash.emissiveIntensity = 0.3 + 2.5 * pulse
    washMat.opacity = flash ? 0.45 * pulse : 0
    renderer.render(scene, camera)
  })

  return {
    fps,
    setCrew: crew.set,
    setActive(on) {
      fps.setEnabled(on)
      loop.setActive(on)
    },
    show(s) {
      const mk = s.modules.map((m) => `${m.key}:${m.part?.id ?? ''}`).join('|')
      if (mk !== modulesKey) {
        modulesKey = mk
        screensKey = '' // the data core screen is new
        buildModules(s.modules)
        moduleGroup.updateMatrixWorld(true)
      }
      const ck = s.decision ? `${s.decision.decision_id}|${mk}` : ''
      if (ck !== choicesKey) {
        choicesKey = ck
        buildChoices(s.decision, s.modules)
        choiceGroup.updateMatrixWorld(true)
      }
      alarm = !!s.decision
      const hit = s.decision ? moduleFor(s.decision.console, s.modules) : undefined
      alarmKey = hit?.key ?? null
      if (hit) {
        wash.position.set(hit.at[0] - hit.face[0] * 0.33, 1.1, hit.at[2] - hit.face[1] * 0.33) // just clear of the rack fronts
        wash.rotation.y = Math.atan2(hit.face[0], hit.face[1])
        wash.updateMatrixWorld(true)
      }
      for (const [key, mat] of lights) {
        const red = key === alarmKey
        mat.emissive.setHex(red ? 0xff3b2f : 0x5ee0a8)
        if (!red) mat.emissiveIntensity = 1
      }
      const body = s.body in WORLD_INDEX ? (s.body as keyof typeof WORLD_INDEX) : 'earth'
      uBody.value = WORLD_INDEX[body]
      Object.assign(worldMat.uniforms, worldMaps.maps[body])
      // From this close the Moon's elevation map shades its day/night line into hard black-and-white blobs: leave the relief to the photo.
      if (body === 'moon') worldMat.uniforms.uHasHeight = NO_RELIEF
      clouds.visible = body === 'earth'
      atmosphere.visible = body !== 'moon'
      if (body === 'mars') uAir.value.setRGB(0.75, 0.45, 0.3)
      else uAir.value.setRGB(0.3, 0.55, 1)
      windowLight.color.setHex(body === 'earth' ? 0xb4cdf2 : body === 'moon' ? 0xd5d9e2 : 0xe2a67e)
      spillMat.color.copy(windowLight.color)
      shine = body === 'earth' ? 1 : 0.5
      worldTurn = (s.day / 365) * Math.PI * 2 * 6 // a few turns over a year: you can see it move at speed
      // Sim steps clone params; equal craft values must not rebuild GPU geometry every tick.
      const nextCraftKey = JSON.stringify(s.craft)
      if (nextCraftKey !== craftKey) {
        craftKey = nextCraftKey
        for (const c of [...craftHolder.children]) {
          craftHolder.remove(c)
          disposeObject(c)
        }
        if (s.craft) {
          const craft = buildCraft(s.craft)
          const size = new THREE.Box3().setFromObject(craft).getSize(new THREE.Vector3())
          craft.scale.multiplyScalar(0.42 / Math.max(size.x, size.y, size.z, 1e-6)) // buildCraft has already scaled it: scale that, do not replace it
          craftHolder.add(craft)
        }
      }
      latest = s // the frame loop redraws the screens from it
      const controls = `${s.paused}|${s.speed}`
      if (controls !== controlsKey) {
        controlsKey = controls
        drawStatus(statusScreen, s.paused, s.speed)
        // The button glows green while time runs and amber while it is held; the switch points at the speed.
        pauseMat.emissive.setHex(s.paused ? 0xffd479 : 0x5ee0a8)
        knob.rotation.y = -dialAngle(s.speed)
        knob.updateMatrixWorld(true)
      }
    },
    dispose() {
      loop.dispose()
      observer.disconnect()
      crew.dispose()
      fps.dispose()
      disposeObject(scene)
      for (const m of [metal, gun, dark, shadeMat, glowMat]) m.dispose()
      for (const map of [brushed, grain, blob]) map.dispose()
      worldMaps.dispose()
      envMap.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

/** One display's picture, px. */
const GAUGE = { w: 320, h: 208 }
const STATUS = { w: 336, h: 160 }
type Screen = ReturnType<typeof canvasScreen>

/** A dark glass display: a hairline round it, a small grey caption, a big white reading. */
function readout(g: CanvasRenderingContext2D, x: number, w: number, h: number, caption: string, value: string, colour = TEXT) {
  g.fillStyle = GLASS
  g.fillRect(x, 0, w, h)
  g.strokeStyle = HAIR
  g.lineWidth = 2
  g.strokeRect(x + 5, 5, w - 10, h - 10)
  g.textAlign = 'left'
  g.textBaseline = 'middle'
  g.fillStyle = MUTED
  g.font = face(h * 0.125, 500)
  g.fillText(caption.toUpperCase(), x + 22, h * 0.21, w - 44)
  g.fillStyle = colour
  g.font = face(h * 0.25, 500)
  g.fillText(value, x + 22, h * 0.52, w - 44)
}

function drawGauges(screen: Screen, gauges: Gauge[]) {
  const { g } = screen
  const { w, h } = GAUGE
  gauges.forEach((x, i) => {
    readout(g, i * w, w, h, x.label, x.value, x.bad ? BAD : TEXT)
    g.fillStyle = HAIR
    g.fillRect(i * w + 22, h * 0.78, w - 44, 8)
    g.fillStyle = x.bad ? BAD : TEXT
    g.fillRect(i * w + 22, h * 0.78, (w - 44) * x.ratio, 8)
  })
  screen.draw()
}

function drawStorage(screen: Screen, fill: number) {
  const { g } = screen
  const { w, h } = GAUGE
  const full = fill > 0.9
  readout(g, 0, w, h, 'Data stored', `${Math.round(fill * 100)}%`, full ? BAD : TEXT)
  g.fillStyle = HAIR
  g.fillRect(22, h * 0.78, w - 44, 8)
  g.fillStyle = full ? BAD : TEXT
  g.fillRect(22, h * 0.78, (w - 44) * fill, 8)
  screen.draw()
}

function drawStatus(screen: Screen, paused: boolean, speed: number) {
  const { w, h } = STATUS
  readout(screen.g, 0, w, h, 'Time', paused ? 'Paused' : 'Running', paused ? WARN : TEXT)
  readout(screen.g, w, w, h, 'Speed', `${speed}×`)
  screen.draw()
}

/** The printed plate under the time controls: TIME round the button on the left, the switch's four stops on the right. */
function controlPlate() {
  const map = painted(960, 320, (g) => {
    g.fillStyle = '#17191d'
    g.fillRect(0, 0, 960, 320)
    g.strokeStyle = 'rgba(255,255,255,0.28)'
    g.lineWidth = 3
    g.strokeRect(8, 8, 944, 304)
    g.beginPath()
    g.moveTo(480, 30)
    g.lineTo(480, 290)
    g.stroke()
    g.fillStyle = '#d9dde4'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = face(34, 500)
    g.fillText('TIME', 230, 44)
    g.fillText('HOLD', 82, 160)
    g.fillText('RUN', 384, 160)
    // The switch sits at (730, 160) on the plate: a tick and a number at each stop.
    for (const s of SPEEDS) {
      const a = dialAngle(s)
      g.fillText(`${s}×`, 730 + Math.sin(a) * 140, 160 - Math.cos(a) * 128)
      g.beginPath()
      g.moveTo(730 + Math.sin(a) * 86, 160 - Math.cos(a) * 86)
      g.lineTo(730 + Math.sin(a) * 104, 160 - Math.cos(a) * 104)
      g.stroke()
    }
    g.fillText('SPEED', 730, 292)
  })
  return map
}

function optionTexture(letter: string, text: string, effect: string) {
  const s = canvasScreen(512, 512)
  const { g } = s
  g.fillStyle = GLASS
  g.fillRect(0, 0, 512, 512)
  g.strokeStyle = HAIR
  g.lineWidth = 4
  g.strokeRect(4, 4, 504, 504)
  g.fillStyle = BAD
  g.fillRect(4, 4, 504, 10)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = TEXT
  g.font = face(104, 500)
  g.fillText(letter, 256, 96)
  const wrap = (str: string, size: number, y0: number, lines: number, colour: string) => {
    g.fillStyle = colour
    g.font = face(size, size > 40 ? 500 : 400)
    const out: string[] = []
    let line = ''
    for (const w of str.split(/\s+/)) {
      const next = line ? `${line} ${w}` : w
      if (g.measureText(next).width > 460 && line) {
        out.push(line)
        line = w
      } else line = next
    }
    if (line) out.push(line)
    out.slice(0, lines).forEach((l, i) => g.fillText(l, 256, y0 + i * size * 1.2, 480))
  }
  wrap(text, 46, 200, 3, TEXT)
  wrap(effect, 32, 390, 3, MUTED)
  s.draw()
  return s.texture
}
