// Mission control you play in, in three.js (decision 007). Primitives and canvas textures only:
// no model files, works offline. layout.ts says where things stand; decor.ts builds the hall and its desks;
// this hangs the screens (video wall, side walls, desk monitors: screens.ts paints them) and the holograms
// (stations, their menus, the floating craft), and redraws each when the game state behind it changes.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { roomLoop } from '../fps/room-loop'
import { createFps, type Fps, type FpsOptions } from '../fps/controller'
import type { Bar } from '../builder/model'
import type { ConsoleCall } from '../gonogo'
import { buildCraft, disposeObject } from '../scene3d/craft'
import { busSize, type Body, type CraftSpec, type SceneSpec } from '../scene3d/model'
import { buildBus, buildPart, busKey, modelKey, SLOT, type Mount } from '../scene3d/parts'
import { fuse } from '../scene3d/parts/kit'
import { buildRocket } from '../scene3d/launch/rocket'
import { rocketSpec } from '../scene3d/launch/vehicles'
import type { Entity, Metrics } from '../../shared'
import { CALL_WALL, CRAFT_Y, GAUGES, HOLO_Y, LAUNCH, PEDESTAL, ROOM, SIDE_WALL, START, STAND, TRACK_WALL, shortLabel, type Debrief, type Menu, type MenuCard, type Station } from './layout'
import { addMissionControlDecor } from './decor'
import { CALL_GRID, GOOD, MAP_URL, TILE_GRID, drawCalls, drawDesign, drawMargins, drawMission, drawPlan, drawTiles, drawTrack, face, wrap, type TrackScreen } from './screens'
import { mountCrew, type CrewPose } from '../crew/crew'

export interface RoomScreens {
  title: string
  /** Big numbers on the call wall: [label, value]. */
  numbers: [string, string][]
  bars: Bar[]
  calls: ConsoleCall[]
  stations: Station[]
  /** The open station's menu of hologram cards, if one is open. */
  menu?: Menu
  craft: CraftSpec | null
  /** The sim's numbers for this design, and the chosen orbit: the wall screens and desk monitors are drawn from them. */
  metrics: Metrics
  orbit: Pick<SceneSpec, 'body' | 'altitude_m' | 'inclination_rad' | 'period_s'>
  /** What the mission asks for, in a sentence or two, and the day it launches (ISO). */
  objective?: string
  launchUtc?: string
  debrief?: Pick<Debrief, 'grade' | 'score' | 'outcome'> & { fix?: string }
}

export interface ControlRoom {
  fps: Fps
  setActive(on: boolean): void
  show(screens: RoomScreens): void
  /** Other players in this room. Pass an empty list when they leave. */
  setCrew(members: readonly CrewPose[]): void
  dispose(): void
}

/** A canvas you draw on once per change; the texture follows. */
export function canvasScreen(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { g, texture, draw: () => (texture.needsUpdate = true) }
}

export const font = (px: number, weight = 600) => `${weight} ${Math.round(px)}px system-ui, sans-serif`

/** The box a part model fits on its shelf, metres: wide and shallow, so long solar wings still read. */
const SHELF_W = 0.62
const SHELF_H = 0.36
/** A shelf-sized bus every part is built against (claude@ethan's models scale with the bus). */
const SHELF_BUS = { key: 'smallsat' as const, id: 'shelf', size: [0.6, 0.6, 0.6] as [number, number, number] }

/**
 * The real 3D model of a catalog part (ui/scene3d/parts), sized to sit on a shelf; null for parts
 * with no small model (orbits, rockets) or if building one fails.
 */
export function partModel(part: Entity): THREE.Object3D | null {
  if (!['bus', 'power_system', 'comms_system', 'instrument'].includes(part.kind)) return null
  try {
    let model: THREE.Group
    if (part.kind === 'bus') model = buildBus({ key: busKey(part), id: part.id, size: busSize(part).size, entity: part })
    else {
      const key = modelKey(part) as Mount['key']
      const kind = part.kind === 'power_system' ? 'power' : part.kind === 'comms_system' ? 'comms' : 'instrument'
      model = buildPart({ part: kind, id: part.id, key, slot: SLOT[key], entity: part }, SHELF_BUS)
      model.position.set(0, 0, 0)
      model.rotation.set(0, 0, 0)
    }
    // Centre it and fit it in the shelf box, inside a holder so the caller can place it.
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    model.position.sub(centre)
    const holder = new THREE.Group()
    holder.add(model)
    holder.scale.setScalar(Math.min(SHELF_W / Math.max(size.x, size.z, 1e-6), SHELF_H / Math.max(size.y, 1e-6)))
    return holder
  } catch {
    return null
  }
}

/** Hologram text: the start menu's face, as on the wall screens (screens.ts). */
const holoFont = (px: number, weight = 500) => face(px, weight)

const HOLO_VERTEX = `
  varying vec3 vN; varying vec3 vW; varying vec2 vUv;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = mat3(modelMatrix) * normal; vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`

/** A part as light: see-through, brightest where the surface turns away from you, thin scanlines drifting up. */
function holoMaterial(time: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: time, uColor: { value: new THREE.Color(0xc4ecff) } },
    vertexShader: HOLO_VERTEX,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; varying vec3 vN; varying vec3 vW;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW)));
        float scan = 0.7 + 0.3 * sin(vW.y * 420.0 - uTime * 3.0);
        float sweep = smoothstep(0.985, 1.0, sin(vW.y * 2.4 - uTime * 0.9));
        gl_FragColor = vec4(uColor * ((0.13 + 0.87 * rim * rim) * scan + sweep * 0.22), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
}

/** The light an emitter throws up: a soft cone that fades with height, with `rings` slow bands rising through it. */
function beamMaterial(time: { value: number }, rings: number, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: time, uColor: { value: new THREE.Color(0x9fdcff) }, uRings: { value: rings }, uStrength: { value: strength } },
    vertexShader: HOLO_VERTEX,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform float uRings; uniform float uStrength;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main() {
        // Facing you it glows, edge-on it vanishes: a volume of light, not a glass tube.
        float face = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
        float fade = pow(1.0 - vUv.y, 1.7);
        float ring = uRings > 0.0 ? 1.0 - smoothstep(0.0, 0.03, fract(vUv.y * uRings - uTime * 0.05)) : 0.0;
        gl_FragColor = vec4(uColor * (fade * 0.5 + ring * (1.0 - vUv.y) * 0.8) * face * uStrength, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
}

/** A soft round pool of light for the floor under an emitter. */
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/** Everything in `obj` as one geometry (positions and normals only): one draw call per hologram. */
function holoGeometry(obj: THREE.Object3D): THREE.BufferGeometry | null {
  obj.updateMatrixWorld(true)
  const geos: THREE.BufferGeometry[] = []
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const g: THREE.BufferGeometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    g.clearGroups()
    if (!g.attributes.normal) g.computeVertexNormals()
    geos.push(g.applyMatrix4(o.matrixWorld))
  })
  return geos.length ? fuse(geos) : null
}

/** `obj` centred in a holder and scaled to fit a box `w` wide and `h` high. */
function fitted(obj: THREE.Object3D, w: number, h: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  obj.position.sub(box.getCenter(new THREE.Vector3()))
  const holder = new THREE.Group()
  holder.add(obj)
  holder.scale.setScalar(Math.min(w / Math.max(size.x, size.z, 1e-6), h / Math.max(size.y, 1e-6)))
  return holder
}

/** An orbit as a hologram: the globe, and a ring tilted by the orbit's inclination, higher for higher orbits. */
function orbitModel(part: Entity): THREE.Object3D {
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial()
  const R = 0.19
  group.add(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24), mat))
  for (const turn of [0, Math.PI / 2]) {
    const meridian = new THREE.Mesh(new THREE.TorusGeometry(R * 1.004, 0.0025, 6, 64), mat)
    meridian.rotation.y = turn
    group.add(meridian)
  }
  const km = typeof part.props.altitude_m === 'number' ? part.props.altitude_m / 1000 : 400
  const r = R * (1.15 + 0.32 * Math.log10(Math.max(km, 100) / 100))
  const path = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.005, 8, 96), mat)
  ring.rotation.x = Math.PI / 2
  const craft = new THREE.Mesh(new THREE.OctahedronGeometry(0.028), mat)
  craft.position.set(r, 0, 0)
  path.add(ring, craft)
  path.rotation.z = typeof part.props.inclination_rad === 'number' ? part.props.inclination_rad : 0.5
  group.add(path)
  return group
}

/** What a station shows for a part: its real model (ui/scene3d/parts, the launch fleet), or null if building it fails. */
function hologramModel(part: Entity): THREE.Object3D | null {
  try {
    if (part.kind === 'orbit') return orbitModel(part)
    if (part.kind === 'launch_vehicle') return fitted(buildRocket(rocketSpec(part)).root, 0.5, 0.66)
    const model = partModel(part)
    model?.scale.multiplyScalar(1.35)
    return model
  } catch {
    return null
  }
}

export function createControlRoom(host: HTMLElement, options: Omit<FpsOptions, 'start' | 'yaw'> & { onPose?: (pose: { x: number; z: number; yaw: number }) => void }): ControlRoom {
  const { onPose, ...fpsOptions } = options
  const renderer = new THREE.WebGLRenderer({ antialias: true }) // throws without WebGL; the component shows a fallback
  // 1.25× not the screen's 2×: ~60% fewer pixels to fill, and a big room hardly looks softer.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)
  if (import.meta.env.DEV) Object.assign(window, { __renderer: renderer }) // QA: __renderer.info.render.calls

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070a12)
  // Nothing in the room moves by itself: positions are computed once (and again when something is rebuilt), not every frame.
  scene.matrixWorldAutoUpdate = false
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 80)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  // A dark hall: the glow comes from the holograms, the screens and thin edge lights.
  scene.environmentIntensity = 0.16
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0x9fb4e8, 0x10131c, 0.5))

  // ---- The room: carpet, wood walls, ceiling, screen frames and the operator desks (decor.ts). The desk monitors share two canvases.
  const [, , z0] = ROOM.min
  const [x1] = ROOM.max
  const tileScreen = canvasScreen(TILE_GRID.cols * TILE_GRID.w, TILE_GRID.rows * TILE_GRID.h)
  const callScreen = canvasScreen(CALL_GRID.cols * CALL_GRID.w, CALL_GRID.rows * CALL_GRID.h)
  addMissionControlDecor(scene, { tiles: tileScreen.texture, calls: callScreen.texture })
  // Few lights, no shadows: one each side over the stations and the side desks, one over the front desk, two on the craft (below).
  for (const [x, z, power] of [[-6, -1, 7], [6, -1, 7], [0, -9.5, 12]] as const) {
    const light = new THREE.PointLight(0xa9c6ff, power, 13, 2)
    light.position.set(x, 3.6, z)
    scene.add(light)
  }

  // ---- The video wall (mission call, ground track, margins) and one screen on each side wall (design, flight plan).
  const hang = (cw: number, ch: number, rect: { w: number; h: number }, pos: [number, number, number], rotY: number) => {
    const screen = canvasScreen(cw, ch)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rect.w, rect.h), new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }))
    mesh.position.set(...pos)
    mesh.rotation.y = rotY
    scene.add(mesh)
    return screen
  }
  const missionScreen = hang(1536, 768, CALL_WALL, [CALL_WALL.x, CALL_WALL.y, z0 + 0.085], 0)
  const trackScreen = hang(1536, 768, TRACK_WALL, [TRACK_WALL.x, TRACK_WALL.y, z0 + 0.085], 0)
  const marginScreen = hang(1536, 768, GAUGES, [GAUGES.x, GAUGES.y, z0 + 0.085], 0)
  const designScreen = hang(1280, 640, SIDE_WALL, [-x1 + 0.085, SIDE_WALL.y, SIDE_WALL.z], Math.PI / 2)
  const planScreen = hang(1280, 640, SIDE_WALL, [x1 - 0.085, SIDE_WALL.y, SIDE_WALL.z], -Math.PI / 2)
  /** A screen is painted again only when what it shows (`key`) has changed. */
  const painted = new Map<object, string>()
  const paint = (screen: ReturnType<typeof canvasScreen>, key: string, draw: (g: CanvasRenderingContext2D) => void) => {
    if (painted.get(screen) === key) return
    painted.set(screen, key)
    draw(screen.g)
    screen.draw()
  }

  // ---- Holograms: one clock for every shader, one material per look.
  const still = !!fpsOptions.reducedMotion
  const time = { value: 0 }
  const holoMat = holoMaterial(time)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xc8f1ff, toneMapped: false })
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x7fd4ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const metal = new THREE.MeshStandardMaterial({ color: 0x232833, metalness: 0.85, roughness: 0.32 })
  const flat = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => geo.rotateX(-Math.PI / 2).translate(x, y, z)
  const hoop = (r: number, tube: number, x: number, y: number, z: number) => flat(new THREE.TorusGeometry(r, tube, 8, 72), x, y, z)

  // ---- The spacecraft, dead centre: it floats in the beam of a round emitter set in the floor.
  const [sx, , sz] = STAND
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.38, 0.06, 72).translate(sx, 0.03, sz), metal)
  const emitterLines = new THREE.Mesh(fuse([hoop(1.24, 0.014, sx, 0.066, sz), hoop(0.86, 0.007, sx, 0.064, sz), hoop(0.48, 0.007, sx, 0.064, sz)]), lineMat)
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.2, 3.9, 72, 1, true).translate(sx, 2.01, sz), beamMaterial(time, 3, 0.85))
  const emitterPool = new THREE.Mesh(flat(new THREE.CircleGeometry(3.4, 48), sx, 0.012, sz), poolMat)
  const craftHolder = new THREE.Group()
  craftHolder.position.set(sx, CRAFT_Y, sz)
  scene.add(emitter, emitterLines, beam, emitterPool, craftHolder)
  // The craft is the real model, lit from above and by the emitter's glow from below.
  for (const [y, colour, power] of [[3.9, 0xe4f0ff, 34], [0.7, 0x8fdcff, 14]] as const) {
    const light = new THREE.PointLight(colour, power, 9, 2)
    light.position.set(sx, y, sz)
    scene.add(light)
  }
  let craftKey = ''

  // ---- Launch button on its pedestal.
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.95, 24), metal)
  pedestal.position.set(LAUNCH[0], 0.475, LAUNCH[2])
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0xff3b2f, emissive: 0xff3b2f, emissiveIntensity: 0.6 })
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 24), buttonMat)
  button.position.set(LAUNCH[0], 1.0, LAUNCH[2])
  scene.add(pedestal, button)

  let disposed = false

  // ---- Hologram stations: pedestals built when the station list changes, a hologram when what is fitted changes.
  const stationGroup = new THREE.Group()
  scene.add(stationGroup)
  const coneMat = beamMaterial(time, 0, 0.6)
  const labelGeo = new THREE.PlaneGeometry(1.1, 0.34375)
  const LABEL_Y = HOLO_Y + 0.44
  /** Names are readable up close and fade out across the hall, so far ones do not pile up behind near ones. */
  const LABEL_NEAR = 6
  const LABEL_FAR = 8.5
  interface StationView { station: Station; holo: THREE.Mesh | null; holoKey: string; label: THREE.Mesh; screen: ReturnType<typeof canvasScreen>; text: string }
  let views: StationView[] = []
  let stationKey = ''
  /** Bumped when the hologram font arrives, so every text is drawn again in it. */
  let fontTick = 0

  const textMaterial = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })

  const buildStations = (list: Station[]) => {
    for (const child of [...stationGroup.children]) {
      stationGroup.remove(child)
      disposeObject(child)
    }
    if (!list.length) return (views = [])
    const { r, h } = PEDESTAL
    // A waisted column with a wide foot and a flanged top, turned on a lathe.
    const profile = [[r, 0], [r, 0.04], [r * 0.8, 0.09], [r * 0.6, 0.22], [r * 0.56, h - 0.16], [r * 0.82, h - 0.06], [r * 0.94, h - 0.04], [r * 0.94, h], [0, h]].map(([x, y]) => new THREE.Vector2(x, y))
    const at = (make: (x: number, z: number) => THREE.BufferGeometry) => fuse(list.map((s) => make(s.at[0], s.at[2])))
    stationGroup.add(
      new THREE.Mesh(at((x, z) => new THREE.LatheGeometry(profile, 40).translate(x, 0, z)), metal),
      new THREE.Mesh(at((x, z) => fuse([hoop(r * 0.78, 0.011, x, h + 0.004, z), hoop(r * 0.4, 0.005, x, h + 0.003, z), hoop(r * 1.02, 0.007, x, 0.03, z)])), lineMat),
      new THREE.Mesh(at((x, z) => new THREE.CylinderGeometry(0.46, r * 0.7, 1.35, 40, 1, true).translate(x, h + 0.675, z)), coneMat),
      new THREE.Mesh(at((x, z) => flat(new THREE.CircleGeometry(1.5, 32), x, 0.012, z)), poolMat),
    )
    views = list.map((station) => {
      const screen = canvasScreen(512, 160)
      const label = new THREE.Mesh(labelGeo, textMaterial(screen.texture))
      label.position.set(station.at[0], LABEL_Y, station.at[2])
      stationGroup.add(label)
      return { station, holo: null, holoKey: '\0', label, screen, text: '' }
    })
  }

  /** The slot's name over the fitted part's name, as light: no plate behind it, a dark halo keeps it readable on any background. */
  const drawLabel = (v: StationView) => {
    const { station } = v
    const fittedParts = station.picked.map((id) => station.parts.find((p) => p.id === id)!)
    const name = !fittedParts.length ? 'None fitted' : shortLabel(fittedParts[0]!) + (fittedParts.length > 1 ? `  +${fittedParts.length - 1}` : '')
    const text = `${station.name}|${name}|${fontTick}`
    if (text === v.text) return
    v.text = text
    const { g } = v.screen
    g.clearRect(0, 0, 512, 160)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.lineJoin = 'round'
    const line = (words: string, y: number, px: number, colour: string, spacing: string) => {
      g.font = holoFont(px)
      g.letterSpacing = spacing
      g.shadowColor = 'rgba(0,0,0,0.9)'
      g.shadowBlur = 10
      g.strokeStyle = 'rgba(2,6,12,0.7)'
      g.lineWidth = 6
      g.strokeText(words, 256, y, 496)
      g.shadowColor = 'rgba(140,215,255,0.55)'
      g.fillStyle = colour
      g.fillText(words, 256, y, 496)
    }
    line(station.name.toUpperCase(), 38, 30, 'rgba(226,240,250,0.86)', '9px')
    g.shadowBlur = 0
    g.fillStyle = 'rgba(255,255,255,0.5)'
    g.fillRect(176, 65, 160, 2)
    line(name, 112, 54, '#ffffff', '0px')
    v.screen.draw()
  }

  const showHologram = (v: StationView) => {
    const key = v.station.picked.join(',')
    if (key === v.holoKey) return
    v.holoKey = key
    if (v.holo) {
      stationGroup.remove(v.holo)
      v.holo.geometry.dispose()
      v.holo = null
    }
    // Several fitted parts (instruments) stand in a small ring, each a little smaller.
    const group = new THREE.Group()
    const parts = v.station.picked.map((id) => v.station.parts.find((p) => p.id === id)!)
    parts.forEach((part, i) => {
      const model = hologramModel(part)
      if (!model) return
      if (parts.length > 1) {
        const a = (i / parts.length) * Math.PI * 2
        model.scale.multiplyScalar(0.62)
        model.position.set(Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25)
      }
      group.add(model)
    })
    const geo = holoGeometry(group)
    if (!geo) return
    v.holo = new THREE.Mesh(geo, holoMat)
    v.holo.position.set(...v.station.at)
    v.holo.rotation.y = 0.5 + views.indexOf(v) * 0.9
    stationGroup.add(v.holo)
  }

  // ---- The open station's menu: glass cards that fly out of its emitter onto an arc around the player.
  const cardGeo = new THREE.PlaneGeometry(0.6, 0.4)
  interface Card { id: string; mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; screen: ReturnType<typeof canvasScreen>; drawn: string; to: THREE.Vector3; data?: MenuCard }
  const cards: Card[] = []
  let cardCount = 0
  let menuView: StationView | undefined
  /** 0 closed … 1 open, and where it is heading. */
  let menuK = 0
  let menuGoal = 0
  /** The card you are looking at lights up and comes forward a little, so you see what E will pick. */
  let aimedId: string | undefined

  const drawCard = (card: Card) => {
    const c = card.data!
    const aimed = card.id === aimedId
    const sig = `${c.part.id}|${c.picked}|${c.stats.join()}|${c.cost}|${fontTick}|${aimed}`
    if (sig === card.drawn) return
    card.drawn = sig
    const { g } = card.screen
    g.clearRect(0, 0, 384, 256)
    g.beginPath()
    g.roundRect(2, 2, 380, 252, 14)
    // Nearly opaque: a wall screen behind a card must not read through its text.
    g.fillStyle = aimed ? 'rgba(30,42,58,0.94)' : 'rgba(7,11,18,0.92)'
    g.fill()
    g.save()
    g.clip()
    const sheen = g.createLinearGradient(0, 0, 0, 90)
    sheen.addColorStop(0, 'rgba(170,225,255,0.2)')
    sheen.addColorStop(1, 'rgba(170,225,255,0)')
    g.fillStyle = sheen
    g.fillRect(0, 0, 384, 90)
    g.fillStyle = 'rgba(255,255,255,0.03)'
    for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 384, 1)
    g.restore()
    g.lineWidth = c.picked ? 4 : aimed ? 2.5 : 1.5
    g.strokeStyle = c.picked || aimed ? '#ffffff' : 'rgba(255,255,255,0.34)'
    g.stroke()
    g.textBaseline = 'middle'
    g.textAlign = 'left'
    g.letterSpacing = '0px'
    g.fillStyle = '#ffffff'
    g.font = holoFont(34)
    const name = wrap(g, shortLabel(c.part), 340, 2)
    name.forEach((words, i) => g.fillText(words, 22, 42 + i * 38, 340))
    c.stats.forEach(([label, value], i) => {
      const y = 128 + i * 32
      g.textAlign = 'left'
      g.fillStyle = 'rgba(232,238,246,0.7)'
      g.font = holoFont(21, 400)
      g.fillText(label, 22, y, 190)
      g.textAlign = 'right'
      g.fillStyle = '#ffffff'
      g.font = holoFont(23)
      g.fillText(value, 362, y, 150)
    })
    g.fillStyle = 'rgba(255,255,255,0.2)'
    g.fillRect(22, 197, 340, 1.5)
    g.textAlign = 'left'
    g.fillStyle = '#ffffff'
    g.font = holoFont(27)
    if (c.cost) g.fillText(c.cost, 22, 226, 180)
    if (c.picked) {
      g.textAlign = 'right'
      g.fillStyle = GOOD
      g.font = holoFont(20, 600)
      g.letterSpacing = '4px'
      g.fillText('FITTED', 362, 227)
    }
    card.screen.draw()
  }

  const ease = (k: number) => 1 - (1 - k) ** 3
  /** Cards between the emitter (closed) and their place on the arc (open), each a moment after the last; the station's name lifts clear above them. */
  const placeCards = () => {
    const from = menuView?.station.at
    cards.forEach((card, i) => {
      const k = from && i < cardCount ? ease(Math.max(0, Math.min(1, menuK * 1.5 - (i / cardCount) * 0.5))) : 0
      card.mesh.visible = k > 0.01
      if (!card.mesh.visible || !from) return
      card.mesh.position.set(from[0], from[1], from[2]).lerp(card.to, k)
      card.mesh.scale.setScalar((0.2 + 0.8 * k) * (card.id === aimedId ? 1.08 : 1))
      card.mesh.material.opacity = k
      card.mesh.updateMatrixWorld()
    })
    if (menuView) {
      menuView.label.position.y = LABEL_Y + 0.93 * ease(menuK)
      menuView.label.updateMatrixWorld()
    }
  }

  const showMenu = (menu: Menu | undefined) => {
    const view = menu && views.find((v) => v.station.key === menu.key)
    if (!menu || !view) {
      menuGoal = 0
    } else {
      if (view !== menuView) {
        // Another station: the old one's name drops back and this menu opens from closed.
        if (menuView) menuView.label.position.y = LABEL_Y
        menuView = view
        menuK = 0
      }
      menuGoal = 1
      cardCount = menu.cards.length
      menu.cards.forEach((c, i) => {
        if (!cards[i]) {
          const screen = canvasScreen(384, 256)
          const mesh = new THREE.Mesh(cardGeo, textMaterial(screen.texture))
          scene.add(mesh)
          cards[i] = { id: '', mesh, screen, drawn: '', to: new THREE.Vector3() }
        }
        const card = cards[i]!
        card.id = c.id
        card.data = c
        card.to.set(...c.at)
        card.mesh.rotation.y = c.yaw
        drawCard(card)
      })
    }
    if (still) menuK = menuGoal
    placeCards()
  }

  /** Station names turn to face you wherever you stand. */
  const faceLabels = () => {
    for (const v of views) {
      const dx = camera.position.x - v.label.position.x
      const dz = camera.position.z - v.label.position.z
      const opacity = v === menuView && menuGoal ? 1 : Math.max(0, Math.min(1, (LABEL_FAR - Math.hypot(dx, dz)) / (LABEL_FAR - LABEL_NEAR)))
      ;(v.label.material as THREE.MeshBasicMaterial).opacity = opacity
      v.label.visible = opacity > 0.01
      v.label.rotation.y = Math.atan2(dx, dz)
      v.label.updateMatrixWorld()
    }
  }

  /** Each frame: holograms turn, the craft turns and bobs, the menu opens or closes. Nothing here moves under reduced motion. */
  const animate = (dt: number) => {
    time.value += dt
    const t = time.value
    views.forEach((v, i) => {
      if (!v.holo) return
      v.holo.rotation.y = 0.5 + i * 0.9 + t * 0.35
      v.holo.updateMatrixWorld()
    })
    craftHolder.rotation.y = t * 0.1 // starts broadside to the door: the first thing you see is the whole craft
    craftHolder.position.y = CRAFT_Y + Math.sin(t * 0.8) * 0.035
    craftHolder.updateMatrixWorld(true)
    if (menuK !== menuGoal) {
      menuK = menuGoal > menuK ? Math.min(menuGoal, menuK + dt / 0.45) : Math.max(menuGoal, menuK - dt / 0.22)
      placeCards()
    }
  }

  let lastShown: RoomScreens | undefined
  // Hologram text is drawn in the start menu's font once it is there (it is not when offline: the system sans stays).
  document.fonts && Promise.all([400, 500].map((weight) => document.fonts.load(holoFont(32, weight)))).then((faces) => {
    if (disposed || !faces.some((f) => f.length)) return
    fontTick++
    if (lastShown) api.show(lastShown)
  }, () => {})

  // ---- The ground-track screen's map: the real surface of the body the chosen orbit circles (ui/scene3d/maps), loaded when that body is first needed.
  let mapBody: Body | undefined
  let mapImage: HTMLImageElement | undefined
  /** Bumped when a map arrives, so the screens that show it are painted again. */
  let mapTick = 0
  const useMap = (body: Body) => {
    if (body === mapBody) return
    mapBody = body
    mapImage = undefined
    const image = new Image()
    image.onload = () => {
      if (disposed || mapBody !== body) return
      mapImage = image
      mapTick++
      if (lastShown) api.show(lastShown)
    }
    image.src = MAP_URL[body]
  }

  /** Every screen in the room, each painted again only if its own numbers changed. */
  const paintScreens = (s: RoomScreens) => {
    const fittedIn = (key: string) => {
      const station = s.stations.find((st) => st.key === key)
      return station?.parts.find((p) => p.id === station.picked[0])
    }
    const orbit = fittedIn('orbit')
    const rocket = fittedIn('launch_vehicle')
    const number = (v: unknown) => (typeof v === 'number' ? v : undefined)
    const track: TrackScreen = { ...s.orbit, name: orbit && shortLabel(orbit), eclipse: number(orbit?.props.eclipse_fraction), contact_s: number(orbit?.props.contact_s_per_day) }
    useMap(s.orbit.body)
    const launch = s.launchUtc?.slice(0, 10)
    const calls = s.calls.map((c) => [c.call, c.reasons.map((r) => r.code)])
    const fit = s.stations.map((st) => [st.key, st.picked])
    const metrics = JSON.stringify(s.metrics)
    paint(missionScreen, JSON.stringify([fontTick, s.title, s.objective, s.numbers, calls, launch, s.debrief]), (g) => drawMission(g, { title: s.title, objective: s.objective, numbers: s.numbers, calls: s.calls, launch, debrief: s.debrief }))
    paint(trackScreen, JSON.stringify([fontTick, mapTick, track]), (g) => drawTrack(g, track, mapImage))
    paint(marginScreen, JSON.stringify([fontTick, s.bars]), (g) => drawMargins(g, s.bars))
    paint(designScreen, JSON.stringify([fontTick, fit, s.metrics.cost_usd, s.metrics.budget_usd]), (g) => drawDesign(g, s.stations, s.metrics))
    paint(planScreen, JSON.stringify([fontTick, s.launchUtc, rocket?.id]) + metrics, (g) => drawPlan(g, s.metrics, s.launchUtc, rocket && shortLabel(rocket)))
    paint(tileScreen, JSON.stringify([fontTick, mapTick, fit, s.bars, s.numbers, track]) + metrics, (g) => drawTiles(g, { stations: s.stations, bars: s.bars, metrics: s.metrics, numbers: s.numbers, track }, mapImage))
    paint(callScreen, JSON.stringify([fontTick, calls]), (g) => drawCalls(g, s.calls))
  }

  // ---- Walking.
  scene.updateMatrixWorld(true)
  const fps = createFps(renderer.domElement, camera, { ...fpsOptions, start: START.pos, yaw: START.yaw })
  const crew = mountCrew(scene)
  let dirty = true
  const resize = () => {
    const { clientWidth: cw, clientHeight: ch } = host
    if (!cw || !ch) return
    renderer.setSize(cw, ch, false)
    camera.aspect = cw / ch
    camera.fov = cw / ch < 1 ? 80 : 70
    camera.updateProjectionMatrix()
    dirty = true
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  const loop = roomLoop((_now, dt) => {
    const moved = fps.update(dt)
    onPose?.(fps.feet())
    const crewMoved = crew.update(dt)
    if (!still) animate(dt)
    if (fps.aimed?.id !== aimedId) {
      aimedId = fps.aimed?.id
      for (let i = 0; i < cardCount; i++) drawCard(cards[i]!)
      placeCards()
      dirty = true
    }
    if (moved || dirty) faceLabels()
    // The holograms never stop turning, so every frame is drawn; under reduced motion only when something changed.
    if (!still || moved || dirty || crewMoved) renderer.render(scene, camera)
    dirty = false
  })

  const api: ControlRoom = {
    fps,
    setActive(on) {
      fps.setEnabled(on)
      dirty = true
      loop.setActive(on)
    },
    setCrew: crew.set,
    show(s) {
      lastShown = s
      const key = s.stations.map((st) => `${st.key}@${st.at.join()}`).join('|')
      if (key !== stationKey) {
        stationKey = key
        menuView = undefined
        buildStations(s.stations)
      }
      views.forEach((v, i) => {
        v.station = s.stations[i]!
        drawLabel(v)
        showHologram(v)
      })
      showMenu(s.menu)
      const ck = JSON.stringify(s.craft)
      if (ck !== craftKey) {
        craftKey = ck
        for (const child of [...craftHolder.children]) {
          craftHolder.remove(child)
          disposeObject(child)
        }
        if (s.craft) {
          const craft = buildCraft(s.craft)
          const size = new THREE.Box3().setFromObject(craft).getSize(new THREE.Vector3())
          // A projection, not a parked spacecraft: every craft, CubeSat or flagship, fills the beam.
          craft.scale.multiplyScalar(2.4 / Math.max(size.x, size.y, size.z, 1e-6))
          // Leaning, so its wings and faces catch the light as it turns instead of going edge-on; a craft that
          // is taller than wide (a CubeSat stack) lies almost flat, or it would be a thin sliver from across the hall.
          craft.rotation.set(0.38, 0, size.y > Math.max(size.x, size.z) ? 1.2 : 0.3)
          craftHolder.add(craft)
        }
      }
      buttonMat.emissiveIntensity = s.debrief ? 0.15 : 0.6
      paintScreens(s)
      scene.updateMatrixWorld(true) // stations or the craft may have been rebuilt
      dirty = true
    },
    dispose() {
      disposed = true
      loop.dispose()
      observer.disconnect()
      crew.dispose()
      fps.dispose()
      disposeObject(scene)
      envMap.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
  return api
}
