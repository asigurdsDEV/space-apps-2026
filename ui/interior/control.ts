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
import { choiceSpots, choiceTitleAt, DASH, dialAngle, moduleFor, ROOM, SPEEDS, START, WINDOW, type Gauge, type Module } from './layout'
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

/**
 * A station module's wall: two equipment racks side by side, 2 m wide and 3.2 m tall at 320 px a metre.
 * Lockers, a round port cover, a display with switches, stowage pads. No lettering.
 */
function rackMap() {
  const PX = 320
  const map = painted(640, 1024, (g) => {
    const rnd = seeded(11)
    const Y = (metres: number) => (3.2 - metres) * PX
    g.fillStyle = '#d6d9de'
    g.fillRect(0, 0, 640, 1024)
    /** A panel front with a fastener in each corner: x, y (its bottom edge) and size in metres. */
    const panel = (x: number, y: number, w: number, h: number) => {
      const shade = 222 + Math.round(rnd() * 10)
      g.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 5})`
      g.fillRect(x * PX + 3, Y(y + h) + 3, w * PX - 6, h * PX - 6)
      g.strokeStyle = '#99a0aa'
      g.lineWidth = 2
      g.strokeRect(x * PX + 3, Y(y + h) + 3, w * PX - 6, h * PX - 6)
      g.fillStyle = '#6f7682'
      for (const [fx, fy] of [[0.035, 0.035], [w - 0.035, 0.035], [0.035, h - 0.035], [w - 0.035, h - 0.035]] as const) {
        g.beginPath()
        g.arc((x + fx) * PX, Y(y + fy), 2.6, 0, Math.PI * 2)
        g.fill()
      }
    }
    /** A round cover with a ring of bolts. */
    const disc = (x: number, y: number, r: number, bolts: number) => {
      g.fillStyle = '#eceef1'
      g.strokeStyle = '#8b929c'
      g.lineWidth = 3
      g.beginPath()
      g.arc(x * PX, Y(y), r * PX, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      g.lineWidth = 2
      g.beginPath()
      g.arc(x * PX, Y(y), r * PX * 0.56, 0, Math.PI * 2)
      g.stroke()
      g.fillStyle = '#39404b'
      g.beginPath()
      g.arc(x * PX, Y(y), r * PX * 0.17, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#6f7682'
      for (let i = 0; i < bolts; i++) {
        const a = (i / bolts) * Math.PI * 2
        g.beginPath()
        g.arc(x * PX + Math.cos(a) * r * PX * 0.84, Y(y) + Math.sin(a) * r * PX * 0.84, 2.4, 0, Math.PI * 2)
        g.fill()
      }
    }
    /** A dark pull handle, or a coloured tag. */
    const bar = (x: number, y: number, w: number, colour = '#39404b', thick = 8) => {
      g.fillStyle = colour
      g.fillRect(x * PX, Y(y) - thick / 2, w * PX, thick)
    }
    for (const x of [0, 1]) {
      panel(x + 0.02, 0.02, 0.96, 0.42)
      bar(x + 0.35, 0.3, 0.3)
      panel(x + 0.02, 0.46, 0.47, 0.58)
      panel(x + 0.51, 0.46, 0.47, 0.58)
      bar(x + 0.15, 0.92, 0.2)
      bar(x + 0.65, 0.92, 0.2)
      bar(x + 0.08, 0.6, 0.11, '#3d6fc4', 11)
      bar(x + 0.57, 0.6, 0.11, '#3d6fc4', 11)
      panel(x + 0.02, 1.06, 0.96, 0.72)
      if (x === 0) {
        disc(x + 0.5, 1.42, 0.27, 12)
        for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) panel(x + 0.02 + col * 0.32, 1.8 + row * 0.33, 0.32, 0.33)
        bar(x + 0.1, 1.9, 0.09, '#3d6fc4', 10)
        bar(x + 0.74, 2.24, 0.09, '#d08a2c', 10)
        panel(x + 0.02, 2.48, 0.96, 0.7)
        disc(x + 0.27, 2.83, 0.2, 8)
        disc(x + 0.73, 2.83, 0.2, 8)
      } else {
        g.fillStyle = '#1b222e'
        g.fillRect((x + 0.1) * PX, Y(1.68), 0.34 * PX, 0.22 * PX)
        g.fillStyle = '#39c79a'
        g.fillRect((x + 0.13) * PX, Y(1.64), 0.1 * PX, 5)
        g.fillRect((x + 0.13) * PX, Y(1.6), 0.18 * PX, 5)
        g.fillStyle = '#4a515c'
        for (let i = 0; i < 6; i++) g.fillRect((x + 0.53 + i * 0.065) * PX, Y(1.66), 0.035 * PX, 0.075 * PX)
        g.strokeStyle = '#6f7682'
        g.lineWidth = 3
        for (let i = 0; i < 3; i++) {
          g.beginPath()
          g.arc((x + 0.59 + i * 0.12) * PX, Y(1.42), 0.03 * PX, 0, Math.PI * 2)
          g.stroke()
        }
        g.strokeStyle = '#8b929c'
        g.lineWidth = 3
        for (let i = 0; i < 7; i++) {
          g.beginPath()
          g.moveTo((x + 0.1) * PX, Y(1.14 + i * 0.03))
          g.lineTo((x + 0.44) * PX, Y(1.14 + i * 0.03))
          g.stroke()
        }
        panel(x + 0.02, 1.8, 0.96, 0.33)
        bar(x + 0.38, 1.97, 0.24)
        panel(x + 0.02, 2.13, 0.96, 0.33)
        bar(x + 0.38, 2.3, 0.24)
        // Soft stowage pads strapped to the top of the rack.
        for (let i = 0; i < 2; i++) {
          g.fillStyle = '#e7e2d6'
          g.strokeStyle = '#bdb7a8'
          g.lineWidth = 2
          g.beginPath()
          if (g.roundRect) g.roundRect((x + 0.04 + i * 0.47) * PX, Y(3.16), 0.45 * PX, 0.66 * PX, 16)
          else g.rect((x + 0.04 + i * 0.47) * PX, Y(3.16), 0.45 * PX, 0.66 * PX)
          g.fill()
          g.stroke()
          bar(x + 0.04 + i * 0.47, 2.83, 0.45, '#8f8a7c', 5)
        }
      }
    }
    // Shade baked in where the racks meet the deck.
    const foot = g.createLinearGradient(0, Y(0), 0, Y(0.9))
    foot.addColorStop(0, 'rgba(8,10,16,0.6)')
    foot.addColorStop(1, 'rgba(8,10,16,0)')
    g.fillStyle = foot
    g.fillRect(0, Y(0.9), 640, 0.9 * PX)
  })
  map.wrapS = THREE.RepeatWrapping
  return map
}

/** One square metre of hull lining (ceiling, and the wall round the window): a panel with a soft pad on it. */
function hullMap() {
  const map = painted(256, 256, (g) => {
    g.fillStyle = '#e2e4e8'
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = '#a4aab3'
    g.lineWidth = 3
    g.strokeRect(1.5, 1.5, 253, 253)
    g.fillStyle = '#ecebe6'
    g.strokeStyle = '#c4c1b8'
    g.lineWidth = 2
    g.beginPath()
    if (g.roundRect) g.roundRect(34, 34, 188, 188, 24)
    else g.rect(34, 34, 188, 188)
    g.fill()
    g.stroke()
    g.fillStyle = '#7a818c'
    for (const [x, y] of [[14, 14], [242, 14], [14, 242], [242, 242]] as const) {
      g.beginPath()
      g.arc(x, y, 3.2, 0, Math.PI * 2)
      g.fill()
    }
  })
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  return map
}

/** One square metre of deck: a grey panel with seams, a recessed pull ring and a few scuffs. */
function floorMap() {
  const map = painted(256, 256, (g) => {
    const rnd = seeded(5)
    g.fillStyle = '#c3c7cd'
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = 'rgba(70, 76, 88, 0.16)'
    g.lineWidth = 2
    for (let i = 0; i < 14; i++) {
      const x = rnd() * 256, y = rnd() * 256
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 24)
      g.stroke()
    }
    g.strokeStyle = '#868d98'
    g.lineWidth = 4
    g.strokeRect(2, 2, 252, 252)
    g.strokeStyle = '#7a818c'
    g.lineWidth = 3
    g.beginPath()
    g.arc(214, 42, 11, 0, Math.PI * 2)
    g.stroke()
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

/** One service panel: a seam, corner fasteners, vent slots, a latch, scuffs, and shade baked into its edges. Light grey, so each material tints it. */
function panelMap() {
  return painted(512, 512, (g) => {
    const rnd = seeded(23)
    g.fillStyle = '#c6c9cf'
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 220; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.045)'
      g.fillRect(rnd() * 512, rnd() * 512, 20 + rnd() * 90, 2 + rnd() * 5)
    }
    for (const [x0, y0, x1, y1] of [[0, 0, 70, 0], [512, 0, 442, 0], [0, 0, 0, 70], [0, 512, 0, 442]] as const) {
      const fade = g.createLinearGradient(x0, y0, x1, y1)
      fade.addColorStop(0, 'rgba(0,0,0,0.42)')
      fade.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = fade
      g.fillRect(0, 0, 512, 512)
    }
    g.lineWidth = 3
    g.strokeStyle = 'rgba(20,22,28,0.75)'
    g.strokeRect(22, 22, 468, 468)
    g.strokeStyle = 'rgba(255,255,255,0.3)'
    g.strokeRect(25, 25, 462, 462)
    for (const [x, y] of [[44, 44], [468, 44], [44, 468], [468, 468]] as const) {
      g.fillStyle = '#4d525b'
      g.beginPath()
      g.arc(x, y, 7, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.5)'
      g.beginPath()
      g.arc(x - 1.5, y - 1.5, 2.6, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = 'rgba(18,20,26,0.8)'
    for (let row = 0; row < 6; row++) for (let col = 0; col < 2; col++) {
      g.beginPath()
      if (g.roundRect) g.roundRect(84 + col * 180, 330 + row * 20, 160, 8, 4)
      else g.rect(84 + col * 180, 330 + row * 20, 160, 8)
      g.fill()
    }
    g.fillStyle = 'rgba(18,20,26,0.55)'
    g.fillRect(330, 92, 96, 34)
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(338, 106, 80, 6)
    g.strokeStyle = 'rgba(255,255,255,0.22)'
    g.lineWidth = 1.5
    for (let i = 0; i < 16; i++) {
      const x = rnd() * 512, y = rnd() * 512
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (rnd() - 0.5) * 90, y + (rnd() - 0.5) * 26)
      g.stroke()
    }
  })
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
const rounded = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, r)
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
  const STRIP = 2.1
  const FILL = 0.22
  const fill = new THREE.HemisphereLight(0xc4cee0, 0x23252b, FILL)
  scene.add(fill)
  const strips = [-1.4, 1.5].flatMap((z) => [x0 + 1, x1 - 1].map((x) => {
    const lamp = new THREE.PointLight(0xfff2e2, STRIP, 9, 1.8)
    lamp.position.set(x, y1 - 0.5, z)
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
  const panel = panelMap()
  const brushed = brushedMap()
  const blob = blobMap()
  // The same grain, four times finer, for dark machined parts.
  const grain = brushed.clone()
  grain.repeat.set(4, 4)
  const paint = keep(new THREE.MeshStandardMaterial({ map: panel, color: 0x767d89, roughness: 0.5, metalness: 0.35 }))
  const metal = keep(new THREE.MeshStandardMaterial({ map: brushed, color: 0xb4bac4, roughness: 0.36, metalness: 0.85 }))
  const gun = keep(new THREE.MeshStandardMaterial({ map: grain, color: 0x4d535d, roughness: 0.5, metalness: 0.55 }))
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5, metalness: 0.35 }))
  const shadeMat = keep(new THREE.MeshBasicMaterial({ map: blob, color: 0x000000, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false }))
  const glowMat = keep(new THREE.MeshBasicMaterial({ map: blob, color: 0x8fa9cc, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  const rackMat = new THREE.MeshStandardMaterial({ map: rackMap(), color: 0xa4a9b2, roughness: 0.66, metalness: 0.06 })
  const wallMat = new THREE.MeshStandardMaterial({ map: hullMap(), color: 0xaab0ba, roughness: 0.74, metalness: 0.04 })
  const fitted = (list: Pieces, mat: THREE.Material, into: THREE.Object3D = scene) => {
    const mesh = new THREE.Mesh(mergeGeometries(list), mat)
    into.add(mesh)
    return mesh
  }

  // ---- The module: equipment racks down both sides and across the back, like a space-station lab.
  const t = 0.1
  const SQUARE: [number, number] = [1, 1]
  const RACKS: [number, number] = [2, y1]
  const racks: Pieces = []
  const hull: Pieces = []
  const wl = WINDOW.x - WINDOW.w / 2
  const wr = WINDOW.x + WINDOW.w / 2
  const wb = WINDOW.y - WINDOW.h / 2
  const wt = WINDOW.y + WINDOW.h / 2
  fitted([tiledBox(W, t, D, ...SQUARE).translate(0, -t / 2, 0)], new THREE.MeshStandardMaterial({ map: floorMap(), color: 0x7e848e, roughness: 0.6, metalness: 0.15 }))
  put(hull, tiledBox(W, t, D, ...SQUARE), 0, y1 + t / 2, 0)
  put(racks, tiledBox(t, y1, D, ...RACKS), x0 - t / 2, y1 / 2, 0)
  put(racks, tiledBox(t, y1, D, ...RACKS), x1 + t / 2, y1 / 2, 0)
  put(racks, tiledBox(W, y1, t, ...RACKS), 0, y1 / 2, z1 + t / 2)
  put(hull, tiledBox(wl - x0, y1, t, ...SQUARE), (x0 + wl) / 2, y1 / 2, z0 - t / 2)
  put(hull, tiledBox(x1 - wr, y1, t, ...SQUARE), (wr + x1) / 2, y1 / 2, z0 - t / 2)
  put(hull, tiledBox(WINDOW.w, wb, t, ...SQUARE), WINDOW.x, wb / 2, z0 - t / 2)
  put(hull, tiledBox(WINDOW.w, y1 - wt, t, ...SQUARE), WINDOW.x, (wt + y1) / 2, z0 - t / 2)
  fitted(racks, rackMat)
  fitted(hull, wallMat)

  // Fittings, merged so each material is one draw call.
  const metals: Pieces = []
  const guns: Pieces = []
  const paints: Pieces = []
  const darks: Pieces = []
  const rails: Pieces = []
  const lamps: Pieces = []
  const hatch: Pieces = []
  const shades: Pieces = []
  const glows: Pieces = []
  const FACING = Math.PI / 2
  const flatOn = (w: number, d: number) => new THREE.PlaneGeometry(w, d).rotateX(-FACING)
  // A post between every two racks, and a blue handrail on every other post.
  for (let k = 1; k < D; k++) {
    for (const [x, out] of [[x0, 1], [x1, -1]] as const) {
      put(metals, new THREE.BoxGeometry(0.06, y1, 0.07), x + out * 0.03, y1 / 2, z0 + k)
      if (k % 2 === 0) continue
      put(rails, new THREE.CylinderGeometry(0.017, 0.017, 0.72, 12), x + out * 0.13, 1.72, z0 + k)
      for (const y of [1.42, 2.02]) put(rails, new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8).rotateZ(FACING), x + out * 0.085, y, z0 + k)
    }
  }
  for (let k = 1; k < W; k++) put(metals, new THREE.BoxGeometry(0.07, y1, 0.06), x0 + k, y1 / 2, z1 - 0.03)
  for (const [x, out] of [[x0, 1], [x1, -1]] as const) {
    // A long rail at hand height, and a blue edge to the deck under it.
    put(rails, new THREE.CylinderGeometry(0.02, 0.02, D - 0.6, 12).rotateX(FACING), x + out * 0.1, 1.05, 0)
    put(rails, new THREE.BoxGeometry(0.5, 0.014, D), x + out * 0.25, 0.007, 0)
    // The light strip where the wall meets the ceiling: a housing, its glowing diffuser cut into luminaires, a cable tray beside it.
    put(guns, rounded(0.34, 0.08, D - 0.3, 0.02), x + out * 0.42, y1 - 0.04, 0)
    put(lamps, new THREE.BoxGeometry(0.22, 0.02, D - 0.44), x + out * 0.42, y1 - 0.085, 0)
    for (let k = 0; k <= 6; k++) put(darks, new THREE.BoxGeometry(0.3, 0.035, 0.035), x + out * 0.42, y1 - 0.085, -(D - 0.44) / 2 + (k * (D - 0.44)) / 6)
    put(darks, new THREE.BoxGeometry(0.05, 0.05, D - 0.8), x + out * 0.12, y1 - 0.08, 0)
    // Shade where the deck meets the wall.
    put(shades, fadeStrip(D, 0.9).rotateX(-FACING).rotateY(-out * FACING), x + out * 0.45, 0.004, 0)
  }
  put(shades, fadeStrip(W, 0.9).rotateX(-FACING), 0, 0.004, z1 - 0.45)
  put(shades, fadeStrip(W, 0.9).rotateX(-FACING).rotateY(Math.PI), 0, 0.004, z0 + 0.45)
  put(shades, fadeStrip(W, 0.8), 0, 0.4, z0 + 0.004)
  // The hatch in the end wall: a rim, a stepped door, a centre window, a handle, latches, and two ports above it.
  const hz = z1 - 0.02
  put(metals, new THREE.TorusGeometry(0.93, 0.07, 12, 56), 0, 1.5, hz)
  put(darks, new THREE.TorusGeometry(0.875, 0.012, 6, 56), 0, 1.5, hz - 0.045)
  put(darks, new THREE.TorusGeometry(0.64, 0.01, 6, 48), 0, 1.5, hz - 0.125)
  put(hatch, new THREE.CylinderGeometry(0.87, 0.87, 0.06, 56).rotateX(FACING), 0, 1.5, hz - 0.01)
  put(hatch, new THREE.CylinderGeometry(0.6, 0.66, 0.1, 48).rotateX(FACING), 0, 1.5, hz - 0.07)
  put(darks, new THREE.TorusGeometry(0.19, 0.03, 10, 32), 0, 1.5, hz - 0.12)
  put(darks, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32).rotateX(FACING), 0, 1.5, hz - 0.115)
  put(darks, rounded(0.06, 0.38, 0.05, 0.02), 0.42, 1.5, hz - 0.17)
  for (const y of [1.36, 1.64]) put(darks, new THREE.BoxGeometry(0.05, 0.05, 0.06), 0.42, y, hz - 0.14)
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2
    put(metals, rounded(0.12, 0.12, 0.07, 0.015), Math.cos(a) * 0.76, 1.5 + Math.sin(a) * 0.76, hz - 0.05)
  }
  for (const x of [-0.82, 0.82]) {
    put(darks, new THREE.TorusGeometry(0.18, 0.04, 10, 32), x, 2.66, hz - 0.02)
    put(darks, new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32).rotateX(FACING), x, 2.66, hz - 0.015)
  }

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

  // ---- The console: a shaped desk with a sloped control shelf and a raised instrument panel.
  // Its side profile, front to back (metres in front of DASH.z, height), run the length of the desk.
  const SHELF = Math.atan2(0.11, 0.35)
  const TILT = Math.atan2(0.14, 0.33)
  const profile = new THREE.Shape([[0.26, 0], [0.3, 0.84], [0.3, 0.9], [-0.05, 1.01], [-0.19, 1.34], [-0.3, 1.34], [-0.3, 0]].map(([z, y]) => new THREE.Vector2(-z!, y)))
  put(guns, new THREE.ExtrudeGeometry(profile, { depth: DASH.w - 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.02, bevelSegments: 2 }).rotateY(FACING), -DASH.w / 2 + 0.02, 0, DASH.z)
  for (let i = 0; i < 5; i++) put(paints, rounded(0.8, 0.66, 0.03, 0.012), -1.72 + i * 0.86, 0.45, DASH.z + 0.287)
  put(darks, new THREE.BoxGeometry(DASH.w - 0.1, 0.07, 0.02), 0, 0.035, DASH.z + 0.262)
  put(shades, flatOn(DASH.w + 1.3, 2), 0, 0.005, DASH.z + 0.05)
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
    for (let row = 0; row < 2; row++) for (let col = 0; col < 10; col++) put(guns, rounded(0.05, 0.016, 0.05, 0.006), (col - 4.5) * 0.07, 0.018, (row - 0.5) * 0.08, to)
  }
  // Your spacecraft, a desk model on a turned stand.
  const stand = new THREE.Matrix4().setPosition(0.5, 0, DASH.z + 0.12)
  put(metals, new THREE.CylinderGeometry(0.15, 0.17, 0.09, 48), 0, 0.955, 0, stand)
  put(darks, new THREE.CylinderGeometry(0.12, 0.12, 0.012, 48), 0, 1.003, 0, stand)
  put(metals, new THREE.CylinderGeometry(0.007, 0.007, 0.26, 10), 0, 1.13, 0, stand)
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
  put(metals, new THREE.CylinderGeometry(0.15, 0.16, 0.035, 48), 0, y1 - 0.018, 0)
  for (const turn of [0, FACING]) put(darks, new THREE.TorusGeometry(0.118, 0.006, 8, 32, Math.PI).rotateX(Math.PI).rotateY(turn), 0, y1 - 0.035, 0)
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x4a0d0a, emissive: 0xff2a1a, emissiveIntensity: 0, roughness: 0.25 })
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, y1 - 0.035, 0), beaconMat)
  scene.add(beacon)
  const alarmLight = new THREE.PointLight(0xff2a1a, 0, 12, 2)
  alarmLight.position.set(0, y1 - 0.3, 0)
  scene.add(alarmLight)
  // A red wash on the wall behind the module that raised the alarm, pulsing with the beacon.
  const washMat = new THREE.MeshBasicMaterial({ map: blob, color: 0xff3b2f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), washMat)
  wash.renderOrder = 1
  scene.add(wash)
  let alarm = false

  fitted(metals, metal)
  fitted(guns, gun)
  fitted(paints, paint)
  fitted(darks, dark)
  fitted(rails, new THREE.MeshStandardMaterial({ color: 0x29426f, roughness: 0.45, metalness: 0.5 }))
  fitted(lamps, new THREE.MeshBasicMaterial({ color: 0xeef3ff, toneMapped: false }))
  fitted(hatch, new THREE.MeshStandardMaterial({ map: brushed, color: 0xa9aeb7, roughness: 0.42, metalness: 0.3 }))
  fitted(shades, shadeMat).renderOrder = 1
  fitted(glows, glowMat).renderOrder = 1

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
    const mounts = { metals: [] as Pieces, guns: [] as Pieces, paints: [] as Pieces, darks: [] as Pieces, shades: [] as Pieces }
    const size = new THREE.Box3()
    for (const m of list) {
      const rot = Math.atan2(m.face[0], m.face[1])
      // Local frame: the mount stands at the origin facing +z, the wall 0.5 m behind it.
      const to = new THREE.Matrix4().makeRotationY(rot).setPosition(m.at[0], 0, m.at[2])
      // An equipment mount bolted to deck and wall: plinth, cabinet, machined top plate with a turned ring for the part.
      put(mounts.darks, new THREE.BoxGeometry(0.6, 0.08, 0.54), 0, 0.04, -0.02, to)
      put(mounts.paints, rounded(0.66, 0.8, 0.6, 0.02), 0, 0.48, -0.02, to)
      put(mounts.metals, rounded(0.74, 0.03, 0.66, 0.012), 0, 0.895, -0.01, to)
      put(mounts.guns, new THREE.CylinderGeometry(0.21, 0.22, 0.016, 48), 0, PLATE - 0.008, 0, to)
      for (let i = 0; i < 8; i++) put(mounts.darks, new THREE.CylinderGeometry(0.009, 0.009, 0.006, 6), Math.cos(i * 0.785) * 0.32, 0.913, Math.sin(i * 0.785) * 0.28, to)
      for (const sx of [-1, 1]) {
        for (const z of [0.2, -0.24]) {
          put(mounts.metals, new THREE.BoxGeometry(0.08, 0.012, 0.1), sx * 0.35, 0.006, z, to)
          put(mounts.darks, new THREE.CylinderGeometry(0.014, 0.014, 0.01, 6), sx * 0.365, 0.017, z, to)
        }
        put(mounts.metals, new THREE.BoxGeometry(0.04, 0.04, 0.2), sx * 0.22, 0.72, -0.41, to)
        // The grab rail's two standoffs.
        put(mounts.metals, new THREE.CylinderGeometry(0.009, 0.009, 0.06, 8).rotateX(FACING), sx * 0.21, 0.82, 0.305, to)
      }
      put(mounts.metals, new THREE.BoxGeometry(0.56, 0.12, 0.012), 0, 0.72, -0.494, to)
      put(mounts.metals, new THREE.CylinderGeometry(0.013, 0.013, 0.5, 12).rotateZ(FACING), 0, 0.82, 0.335, to)
      // Cables from the cabinet up the wall to the tray at the ceiling, clamped on the way.
      for (const [x, r] of [[0.27, 0.012], [0.305, 0.008]] as const) {
        const run = new THREE.CatmullRomCurve3([[x, 0.8, -0.3], [x, 0.92, -0.4], [x, 1.2, -0.47], [x, 2, -0.475], [x, y1 - 0.1, -0.475]].map((p) => new THREE.Vector3(...p)))
        put(mounts.darks, new THREE.TubeGeometry(run, 24, r, 6), 0, 0, 0, to)
      }
      for (const y of [1.4, 2.2, 2.9]) put(mounts.metals, new THREE.BoxGeometry(0.1, 0.03, 0.03), 0.287, y, -0.48, to)
      // Indicator housing on the cabinet's brow.
      put(mounts.darks, rounded(0.3, 0.05, 0.02, 0.008), 0, 0.72, 0.283, to)
      put(mounts.shades, flatOn(1.7, 1.6), 0, 0.006, -0.05, to)
      put(mounts.shades, new THREE.PlaneGeometry(1.5, 1.9), 0, 0.6, -0.493, to)
      put(mounts.shades, flatOn(0.62, 0.56), 0, PLATE + 0.002, 0, to)

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
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1).translate(0, 0.6, 0.283).applyMatrix4(to), new THREE.MeshStandardMaterial({ map: plateMap, emissiveMap: plateMap, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.6 }))
      // Five small LEDs in the housing: green in flight, flashing red when this module raises the alarm.
      const lightMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0e, emissive: 0x5ee0a8, emissiveIntensity: 1 })
      const leds: Pieces = []
      for (let i = 0; i < 5; i++) put(leds, new THREE.BoxGeometry(0.03, 0.012, 0.006), (i - 2) * 0.05, 0.72, 0.294, to)
      moduleGroup.add(plate, new THREE.Mesh(mergeGeometries(leds), lightMat))
      lights.set(m.key, lightMat)
    }
    fitted(mounts.metals, metal, moduleGroup)
    fitted(mounts.guns, gun, moduleGroup)
    fitted(mounts.paints, paint, moduleGroup)
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
    const pulse = alarm ? 0.5 + 0.5 * Math.sin(now / 160) : 0
    alarmLight.intensity = 14 * pulse
    beaconMat.emissiveIntensity = 4 * pulse
    // The room dims under an alarm; the window lets in more light the higher the Sun stands over the ground below.
    const room = alarm ? 0.6 : 1
    fill.intensity = FILL * room
    for (const lamp of strips) lamp.intensity = STRIP * room
    windowLight.intensity = shine * (0.4 + 4.2 * smooth(zenith.dot(uSun.value), -0.1, 0.55))
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
        wash.position.set(hit.at[0] - hit.face[0] * 0.49, 1.1, hit.at[2] - hit.face[1] * 0.49)
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
      clouds.visible = body === 'earth'
      atmosphere.visible = body !== 'moon'
      if (body === 'mars') uAir.value.setRGB(0.75, 0.45, 0.3)
      else uAir.value.setRGB(0.3, 0.55, 1)
      windowLight.color.setHex(body === 'earth' ? 0xb4cdf2 : body === 'moon' ? 0xd5d9e2 : 0xe2a67e)
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
          craft.scale.setScalar(0.42 / Math.max(size.x, size.y, size.z, 1e-6))
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
      for (const m of [paint, metal, gun, dark, shadeMat, glowMat]) m.dispose()
      for (const map of [panel, brushed, grain, blob]) map.dispose()
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
