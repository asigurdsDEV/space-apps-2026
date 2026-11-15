// The walk-in spacecraft in three.js (decision 007). Primitives, canvas textures and the real part
// models (ui/scene3d/parts via ui/hangar's partModel); cursor@kaipo's alarm beacon and time lever
// when they load. layout.ts says where things stand; this draws them and animates the alarm.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { roomLoop } from '../fps/room-loop'
import { createFps, type Fps, type FpsOptions } from '../fps/controller'
import { canvasScreen, font, partModel } from '../hangar/control'
import { buildCraft, disposeObject } from '../scene3d/craft'
import { planetMaps } from '../scene3d/maps'
import { atmosphereShader, cloudShader, planetShader, toScreen } from '../scene3d/shaders'
import type { CraftSpec } from '../scene3d/model'
import type { Decision } from '../../shared'
import { choiceSpots, choiceTitleAt, DASH, HATCH, moduleFor, ROOM, START, WINDOW, type Gauge, type Module } from './layout'
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

const TEXT = '#edf1fa'
const MUTED = '#9fb0d4'
const GOOD = '#63dbad'
const BAD = '#ff6b5a'
const GOLD = '#ffda8a'
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

function label(text: string, sub?: string, w = 512, h = 128) {
  const s = canvasScreen(w, h)
  s.g.fillStyle = '#121a2e'
  s.g.fillRect(0, 0, w, h)
  s.g.textAlign = 'center'
  s.g.textBaseline = 'middle'
  s.g.fillStyle = TEXT
  s.g.font = font(h * 0.36, 700)
  s.g.fillText(text, w / 2, sub ? h * 0.36 : h / 2, w - 20)
  if (sub) {
    s.g.fillStyle = MUTED
    s.g.font = font(h * 0.24, 500)
    s.g.fillText(sub, w / 2, h * 0.76, w - 20)
  }
  s.draw()
  return s.texture
}

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
  scene.background = new THREE.Color(0x01030a)
  // Only the world outside and the little craft move: the rest of the cabin's positions are computed once.
  scene.matrixWorldAutoUpdate = false
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.3
  pmrem.dispose()
  const cabinLight = new THREE.HemisphereLight(0xf2f5ff, 0x767e90, 1.9)
  scene.add(cabinLight)
  const lamp = new THREE.PointLight(0xeef3ff, 4, 9, 2) // soft: the walls are white now, a strong lamp burns them out
  lamp.position.set(0, 3, 0.5)
  scene.add(lamp)

  // ---- The module: white equipment racks down both sides and across the back, like a space-station lab
  // (Ethan's reference pictures). The window, the dashboard and where everything stands are unchanged.
  const [x0, , z0] = ROOM.min
  const [x1, y1, z1] = ROOM.max
  const rackMat = new THREE.MeshStandardMaterial({ map: rackMap(), color: 0xdcdfe5, roughness: 0.62, metalness: 0.08 })
  const wallMat = new THREE.MeshStandardMaterial({ map: hullMap(), color: 0xdcdfe5, roughness: 0.7, metalness: 0.05 })
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = wallMat, tile?: [number, number]) => {
    const m = new THREE.Mesh(tile ? tiledBox(w, h, d, ...tile) : new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    scene.add(m)
    return m
  }
  const t = 0.1
  const W = x1 - x0
  const D = z1 - z0
  const SQUARE: [number, number] = [1, 1]
  const RACKS: [number, number] = [2, y1]
  box(W, t, D, 0, -t / 2, 0, new THREE.MeshStandardMaterial({ map: floorMap(), color: 0xd2d6dd, roughness: 0.82 }), SQUARE)
  box(0.9, 0.04, 0.9, HATCH[0], 0.02, HATCH[2], new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0x6a4e10, emissiveIntensity: 0.35, roughness: 0.45 }))
  box(W, t, D, 0, y1 + t / 2, 0, wallMat, SQUARE)
  box(t, y1, D, x0 - t / 2, y1 / 2, 0, rackMat, RACKS)
  box(t, y1, D, x1 + t / 2, y1 / 2, 0, rackMat, RACKS)
  box(W, y1, t, 0, y1 / 2, z1 + t / 2, rackMat, RACKS)
  const wl = WINDOW.x - WINDOW.w / 2
  const wr = WINDOW.x + WINDOW.w / 2
  const wb = WINDOW.y - WINDOW.h / 2
  const wt = WINDOW.y + WINDOW.h / 2
  box(wl - x0, y1, t, (x0 + wl) / 2, y1 / 2, z0 - t / 2, wallMat, SQUARE)
  box(x1 - wr, y1, t, (wr + x1) / 2, y1 / 2, z0 - t / 2, wallMat, SQUARE)
  box(WINDOW.w, wb, t, WINDOW.x, wb / 2, z0 - t / 2, wallMat, SQUARE)
  box(WINDOW.w, y1 - wt, t, WINDOW.x, (wt + y1) / 2, z0 - t / 2, wallMat, SQUARE)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a3142, metalness: 0.5, roughness: 0.4 })
  for (const [w, h, x, y] of [[WINDOW.w + 0.2, 0.1, WINDOW.x, wt], [WINDOW.w + 0.2, 0.1, WINDOW.x, wb], [0.1, WINDOW.h, wl, WINDOW.y], [0.1, WINDOW.h, wr, WINDOW.y]] as const)
    box(w, h, 0.16, x, y, z0, frameMat)

  // Fittings, merged so each material is one draw call: rack posts, blue handrails, light strips, the hatch.
  const posts: THREE.BufferGeometry[] = []
  const rails: THREE.BufferGeometry[] = []
  const lamps: THREE.BufferGeometry[] = []
  const hatch: THREE.BufferGeometry[] = []
  const dark: THREE.BufferGeometry[] = []
  const put = (list: THREE.BufferGeometry[], geo: THREE.BufferGeometry, x: number, y: number, z: number, turnX = 0) => list.push(geo.rotateX(turnX).translate(x, y, z))
  // A post between every two racks, and a blue handrail on every other post.
  for (let k = 1; k < D; k++) {
    for (const [x, out] of [[x0, 1], [x1, -1]] as const) {
      put(posts, new THREE.BoxGeometry(0.06, y1, 0.07), x + out * 0.03, y1 / 2, z0 + k)
      if (k % 2 === 0) continue
      put(rails, new THREE.CylinderGeometry(0.017, 0.017, 0.72, 10), x + out * 0.13, 1.72, z0 + k)
      for (const y of [1.42, 2.02]) put(rails, new THREE.BoxGeometry(0.1, 0.03, 0.03), x + out * 0.085, y, z0 + k)
    }
  }
  for (let k = 1; k < W; k++) put(posts, new THREE.BoxGeometry(0.07, y1, 0.06), x0 + k, y1 / 2, z1 - 0.03)
  // Long rails at hand height along both sides, and a blue edge to the deck under them.
  for (const [x, out] of [[x0, 1], [x1, -1]] as const) {
    put(rails, new THREE.BoxGeometry(0.04, 0.04, D - 0.6), x + out * 0.1, 1.05, 0)
    put(rails, new THREE.BoxGeometry(0.5, 0.014, D), x + out * 0.25, 0.007, 0)
    // Light strips where the walls meet the ceiling, and the cable run beside them.
    put(lamps, new THREE.BoxGeometry(0.2, 0.05, D - 0.5), x + out * 0.42, y1 - 0.03, 0)
    put(dark, new THREE.BoxGeometry(0.05, 0.05, D - 0.8), x + out * 0.12, y1 - 0.08, 0)
  }
  // The hatch in the end wall: a rim, a stepped door, a centre window, a handle, latches, and two ports above it.
  const hz = z1 - 0.02
  const FACING = Math.PI / 2
  put(posts, new THREE.TorusGeometry(0.93, 0.07, 12, 56), 0, 1.5, hz)
  put(dark, new THREE.TorusGeometry(0.875, 0.012, 6, 56), 0, 1.5, hz - 0.045)
  put(dark, new THREE.TorusGeometry(0.64, 0.01, 6, 48), 0, 1.5, hz - 0.125)
  put(hatch, new THREE.CylinderGeometry(0.87, 0.87, 0.06, 56), 0, 1.5, hz - 0.01, FACING)
  put(hatch, new THREE.CylinderGeometry(0.6, 0.66, 0.1, 48), 0, 1.5, hz - 0.07, FACING)
  put(dark, new THREE.TorusGeometry(0.19, 0.03, 10, 32), 0, 1.5, hz - 0.12)
  put(dark, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32), 0, 1.5, hz - 0.115, FACING)
  put(dark, new THREE.BoxGeometry(0.06, 0.38, 0.05), 0.42, 1.5, hz - 0.17)
  for (const y of [1.36, 1.64]) put(dark, new THREE.BoxGeometry(0.05, 0.05, 0.06), 0.42, y, hz - 0.14)
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2
    put(posts, new THREE.BoxGeometry(0.12, 0.12, 0.07), Math.cos(a) * 0.76, 1.5 + Math.sin(a) * 0.76, hz - 0.05)
  }
  for (const x of [-0.82, 0.82]) {
    put(dark, new THREE.TorusGeometry(0.18, 0.04, 10, 32), x, 2.66, hz - 0.02)
    put(dark, new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32), x, 2.66, hz - 0.015, FACING)
  }
  const fitted = (list: THREE.BufferGeometry[], mat: THREE.Material) => scene.add(new THREE.Mesh(mergeGeometries(list), mat))
  fitted(posts, new THREE.MeshStandardMaterial({ color: 0xaeb5bf, roughness: 0.45, metalness: 0.45 }))
  fitted(rails, new THREE.MeshStandardMaterial({ color: 0x2f62b8, roughness: 0.55, metalness: 0.15 }))
  fitted(lamps, new THREE.MeshBasicMaterial({ color: 0xf4f8ff, toneMapped: false }))
  fitted(hatch, new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.42, metalness: 0.15 }))
  fitted(dark, new THREE.MeshStandardMaterial({ color: 0x1c212b, roughness: 0.35, metalness: 0.6 }))

  // ---- Outside: stars, the Sun's light, the world you orbit.
  const starGeo = new THREE.BufferGeometry()
  const pts: number[] = []
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(300)
    if (v.z > 40) v.z = -v.z // keep them in front of the window
    pts.push(v.x, v.y, v.z)
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: false })))
  const sun = new THREE.DirectionalLight(0xfff4e0, 3)
  sun.position.set(-40, 20, -30)
  scene.add(sun)
  // The real planet (claude@ethan, ui/scene3d): NASA surface maps, city lights at night, clouds over Earth.
  const uSun = { value: sun.position.clone().normalize() }
  const uBody = { value: WORLD_INDEX.earth as number }
  const cloudTime = { value: 0 }
  const worldMaps = planetMaps(renderer.capabilities.getMaxAnisotropy())
  const worldMat = new THREE.ShaderMaterial({ ...toScreen(planetShader), uniforms: { uSun, uBody, ...worldMaps.maps.earth } })
  const world = new THREE.Mesh(new THREE.SphereGeometry(40, 96, 64), worldMat)
  world.position.set(10, -38, -70)
  scene.add(world)
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(40.4, 96, 64),
    new THREE.ShaderMaterial({ ...toScreen(cloudShader), uniforms: { uSun, uTime: cloudTime, ...worldMaps.maps.earth }, transparent: true, depthWrite: false }),
  )
  world.add(clouds)
  // A soft glow of air around the limb, brightest on the sunlit side.
  const uAir = { value: new THREE.Color(0.3, 0.55, 1) }
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(41.2, 64, 48),
    new THREE.ShaderMaterial({
      ...toScreen(atmosphereShader),
      uniforms: { uSun, uColor: uAir, uThickness: { value: Math.sqrt(1 - (40 / 41.2) ** 2) } },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  world.add(atmosphere)

  // ---- Dashboard: gauges, your spacecraft, the time controls.
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x2a3142, roughness: 0.55 })
  box(DASH.w, DASH.top, DASH.depth, 0, DASH.top / 2, DASH.z, dashMat)
  const gaugeScreen = canvasScreen(1024, 512)
  const gaugePanel = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: gaugeScreen.texture, toneMapped: false }))
  gaugePanel.position.set(-1.1, DASH.top + 0.42, DASH.z - 0.05)
  gaugePanel.rotation.x = -0.35
  scene.add(gaugePanel)
  const craftHolder = new THREE.Group()
  craftHolder.position.set(0.5, DASH.top + 0.25, DASH.z)
  scene.add(craftHolder)
  const controlMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 })
  const pauseBtn = box(0.22, 0.08, 0.22, 1.4, DASH.top + 0.04, DASH.z + 0.05, controlMat(0x63dbad))
  const speedBtn = box(0.22, 0.08, 0.22, 1.9, DASH.top + 0.04, DASH.z + 0.05, controlMat(0xffd166))
  const pauseLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), new THREE.MeshBasicMaterial({ toneMapped: false }))
  pauseLabel.position.set(1.4, DASH.top + 0.02, DASH.z + 0.3)
  pauseLabel.rotation.x = -Math.PI / 2.6
  const speedLabel = pauseLabel.clone()
  speedLabel.material = new THREE.MeshBasicMaterial({ toneMapped: false })
  speedLabel.position.x = 1.9
  scene.add(pauseLabel, speedLabel)
  let controlsKey = ''

  // ---- Modules (rebuilt when the design changes) and anomaly choices (rebuilt per card).
  const moduleGroup = new THREE.Group()
  const choiceGroup = new THREE.Group()
  scene.add(moduleGroup, choiceGroup)
  let modulesKey = ''
  let choicesKey = ''
  const lights = new Map<string, THREE.MeshStandardMaterial>()
  let storageScreen: ReturnType<typeof canvasScreen> | null = null
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x3a4152, metalness: 0.6, roughness: 0.4 })

  const buildModules = (list: Module[]) => {
    for (const c of [...moduleGroup.children]) {
      moduleGroup.remove(c)
      disposeObject(c)
    }
    lights.clear()
    storageScreen = null
    for (const m of list) {
      const rot = Math.atan2(m.face[0], m.face[1])
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1, 24), pedestalMat)
      ped.position.set(m.at[0], 0.5, m.at[2])
      moduleGroup.add(ped)
      const model = m.part ? partModel(m.part) : null
      if (model) {
        model.scale.multiplyScalar(1.3)
        model.position.set(m.at[0], 1.32, m.at[2])
        model.rotation.y = rot + 0.4
        moduleGroup.add(model)
      } else if (m.key === 'storage') {
        // The data core: a box whose screen fills up with stored data.
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), new THREE.MeshStandardMaterial({ color: 0x232b3d, metalness: 0.4 }))
        core.position.set(m.at[0], 1.3, m.at[2])
        moduleGroup.add(core)
        storageScreen = canvasScreen(256, 256)
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.5), new THREE.MeshBasicMaterial({ map: storageScreen.texture, toneMapped: false }))
        scr.position.set(m.at[0] + m.face[0] * 0.26, 1.3, m.at[2] + m.face[1] * 0.26)
        scr.rotation.y = rot
        moduleGroup.add(scr)
      }
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.16), new THREE.MeshBasicMaterial({ map: label(m.name, m.part?.name), toneMapped: false }))
      plate.position.set(m.at[0] + m.face[0] * 0.39, 0.82, m.at[2] + m.face[1] * 0.39)
      plate.rotation.y = rot
      const lightMat = new THREE.MeshStandardMaterial({ color: 0x63dbad, emissive: 0x63dbad, emissiveIntensity: 1 })
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), lightMat)
      light.position.set(m.at[0] + m.face[0] * 0.33, 1.02, m.at[2] + m.face[1] * 0.33)
      moduleGroup.add(plate, light)
      lights.set(m.key, lightMat)
    }
  }

  const buildChoices = (decision: Decision | null, list: Module[]) => {
    for (const c of [...choiceGroup.children]) {
      choiceGroup.remove(c)
      disposeObject(c)
    }
    if (!decision) return
    const spots = choiceSpots(decision, list)
    const m = moduleFor(decision.console, list)
    const face = m?.face ?? ([0, 1] as [number, number])
    const rot = Math.atan2(face[0], face[1])
    decision.options.forEach((o, i) => {
      const s = spots[i]!
      const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: optionTexture(String.fromCharCode(65 + i), o.label, o.effect_text), toneMapped: false }))
      btn.position.set(...s.at)
      btn.rotation.y = rot
      choiceGroup.add(btn)
    })
    // The card's title over the choices.
    const mid = choiceTitleAt(spots)
    const title = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.2), new THREE.MeshBasicMaterial({ map: label(decision.title.toUpperCase(), undefined, 768, 140), toneMapped: false }))
    title.position.set(mid[0], mid[1], mid[2])
    title.rotation.y = rot
    choiceGroup.add(title)
  }

  // ---- Alarm: a red beacon (cursor@kaipo's model when it loads) and a red light that pulses.
  const alarmLight = new THREE.PointLight(0xff2a1a, 0, 12, 2)
  alarmLight.position.set(0, 2.9, 0)
  scene.add(alarmLight)
  let alarm = false
  let disposed = false
  new GLTFLoader().load(`${import.meta.env.BASE_URL}visual-assets/world/alarm-beacon.glb`, (gltf) => {
    if (disposed) return disposeObject(gltf.scene)
    gltf.scene.rotation.x = Math.PI // hangs from the ceiling
    gltf.scene.position.set(0, y1, 0)
    scene.add(gltf.scene)
    gltf.scene.updateMatrixWorld(true)
  }, undefined, () => {})

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
    // The sim's day arrives in steps. Glide towards it every frame and keep a slow turn going between steps,
    // so the planet never jumps; the clouds drift on their own.
    worldSpin += (worldTurn - worldSpin) * (1 - Math.exp(-dt * 2.5))
    world.rotation.y = worldSpin + now * 0.000004
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
    alarmLight.intensity = 25 * pulse
    cabinLight.intensity = alarm ? 1.2 : 1.9
    const flash = alarmKey && lights.get(alarmKey)
    if (flash) flash.emissiveIntensity = 0.3 + 1.5 * pulse
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
      for (const [key, mat] of lights) {
        const red = key === alarmKey
        mat.color.setHex(red ? 0xff3b2f : 0x63dbad)
        mat.emissive.setHex(red ? 0xff3b2f : 0x63dbad)
        if (!red) mat.emissiveIntensity = 1
      }
      const body = s.body in WORLD_INDEX ? (s.body as keyof typeof WORLD_INDEX) : 'earth'
      uBody.value = WORLD_INDEX[body]
      Object.assign(worldMat.uniforms, worldMaps.maps[body])
      clouds.visible = body === 'earth'
      atmosphere.visible = body !== 'moon'
      if (body === 'mars') uAir.value.setRGB(0.75, 0.45, 0.3)
      else uAir.value.setRGB(0.3, 0.55, 1)
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
          craft.scale.setScalar(0.5 / Math.max(size.x, size.y, size.z, 1e-6))
          craftHolder.add(craft)
        }
      }
      latest = s // the frame loop redraws the screens from it
      const controls = `${s.paused}|${s.speed}`
      if (controls !== controlsKey) {
        controlsKey = controls
        const pm = pauseLabel.material as THREE.MeshBasicMaterial
        pm.map?.dispose()
        pm.map = label(s.paused ? 'PAUSED' : 'TIME ON', undefined, 384, 100)
        pm.needsUpdate = true
        const sm = speedLabel.material as THREE.MeshBasicMaterial
        sm.map?.dispose()
        sm.map = label(`${s.speed}×`, undefined, 384, 100)
        sm.needsUpdate = true
        ;(pauseBtn.material as THREE.MeshStandardMaterial).emissiveIntensity = s.paused ? 0.15 : 0.6
        ;(speedBtn.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + 0.1 * Math.log2(s.speed + 1)
      }
    },
    dispose() {
      disposed = true
      loop.dispose()
      observer.disconnect()
      crew.dispose()
      fps.dispose()
      disposeObject(scene)
      worldMaps.dispose()
      envMap.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

function drawGauges(screen: ReturnType<typeof canvasScreen>, gauges: Gauge[]) {
  const { g } = screen
  g.fillStyle = '#0b1020'
  g.fillRect(0, 0, 1024, 512)
  g.textBaseline = 'middle'
  const h = 492 / gauges.length
  gauges.forEach((x, i) => {
    const y = 10 + h * i + h / 2
    g.textAlign = 'left'
    g.fillStyle = MUTED
    g.font = font(34, 600)
    g.fillText(x.label, 24, y, 300)
    g.fillStyle = '#1f2840'
    g.fillRect(330, y - 14, 380, 28)
    g.fillStyle = x.bad ? BAD : GOOD
    g.fillRect(330, y - 14, 380 * x.ratio, 28)
    g.textAlign = 'right'
    g.fillStyle = x.bad ? BAD : TEXT
    g.font = font(36, 700)
    g.fillText(x.value, 1004, y, 280)
  })
  screen.draw()
}

function drawStorage(screen: ReturnType<typeof canvasScreen>, fill: number) {
  const { g } = screen
  g.fillStyle = '#0b1020'
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = fill > 0.9 ? BAD : GOOD
  g.fillRect(28, 228 - 200 * fill, 200, 200 * fill)
  g.strokeStyle = MUTED
  g.lineWidth = 4
  g.strokeRect(28, 28, 200, 200)
  g.fillStyle = TEXT
  g.font = font(44, 800)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(`${Math.round(fill * 100)}%`, 128, 128)
  screen.draw()
}

function optionTexture(letter: string, text: string, effect: string) {
  const s = canvasScreen(512, 512)
  const { g } = s
  g.fillStyle = '#2a0f0d'
  g.fillRect(0, 0, 512, 512)
  g.strokeStyle = BAD
  g.lineWidth = 10
  g.strokeRect(5, 5, 502, 502)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = GOLD
  g.font = font(110, 800)
  g.fillText(letter, 256, 90)
  const wrap = (str: string, size: number, y0: number, lines: number, colour: string) => {
    g.fillStyle = colour
    g.font = font(size, size > 40 ? 700 : 500)
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
