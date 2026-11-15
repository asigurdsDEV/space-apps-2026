// Mission control you play in, in three.js (decision 007). Primitives and canvas textures only:
// no model files, works offline. layout.ts says where things stand; this draws them and redraws the
// screens (call wall, gauges, console desks, part plates) when the game state changes.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { roomLoop } from '../fps/room-loop'
import { createFps, type Fps, type FpsOptions } from '../fps/controller'
import type { Bar } from '../builder/model'
import { formatValue } from '../builder/model'
import type { ConsoleCall } from '../gonogo'
import { buildCraft, disposeObject } from '../scene3d/craft'
import { busSize, type CraftSpec } from '../scene3d/model'
import { buildBus, buildPart, busKey, modelKey, SLOT, type Mount } from '../scene3d/parts'
import type { Entity } from '../../shared'
import { CALL_WALL, DESK_XS, DESK_Z, GAUGES, LAUNCH, ROOM, START, STAND, shortLabel, type Debrief, type Rack } from './layout'
import { gridTexture } from './world'
import { addMissionControlDecor, ceilingMaterial, wallMaterial } from './decor'

export interface RoomScreens {
  title: string
  /** Big numbers on the call wall: [label, value]. */
  numbers: [string, string][]
  bars: Bar[]
  calls: ConsoleCall[]
  racks: Rack[]
  craft: CraftSpec | null
  debrief?: Pick<Debrief, 'grade' | 'score' | 'outcome'> & { fix?: string }
}

export interface ControlRoom {
  fps: Fps
  setActive(on: boolean): void
  show(screens: RoomScreens): void
  dispose(): void
}

const BG = '#0b1020'
const TEXT = '#edf1fa'
const MUTED = '#9fb0d4'
const GOOD = '#63dbad'
const WARN = '#ffd166'
const BAD = '#ff6b5a'
const GOLD = '#ffda8a'

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

/** Words that fit `max` px wide, on at most `lines` lines. */
function wrap(g: CanvasRenderingContext2D, text: string, max: number, lines: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (g.measureText(next).width > max && line) {
      out.push(line)
      line = word
      if (out.length === lines) break
    } else line = next
  }
  if (out.length < lines && line) out.push(line)
  return out
}

/** The box a part model fits on its shelf, metres: wide and shallow, so long solar wings still read. */
const SHELF_W = 0.62
const SHELF_H = 0.36
/** A shelf-sized bus every part is built against (claude@ethan's models scale with the bus). */
const SHELF_BUS = { key: 'smallsat' as const, id: 'shelf', size: [0.6, 0.6, 0.6] as [number, number, number] }

/**
 * The real 3D model of a catalog part (ui/scene3d/parts), sized to sit on a shelf; null for parts
 * with no small model (orbits, rockets) or if building one fails, so the rack keeps a plain plate.
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
    // Centre it and fit it in the shelf box, inside a holder so the rack can place it.
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

const callColour = (c: ConsoleCall) => (c.call === 'go' ? GOOD : c.call === 'no-go' ? BAD : WARN)
const callWord = (c: ConsoleCall) => (c.call === 'go' ? 'GO' : c.call === 'no-go' ? 'NO-GO' : 'GO?')

export function createControlRoom(host: HTMLElement, options: Omit<FpsOptions, 'start' | 'yaw'>): ControlRoom {
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
  scene.environmentIntensity = 0.35
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xa9bdff, 0x2a3044, 2.4))

  // ---- The room.
  const [x0, , z0] = ROOM.min
  const [x1, y1, z1] = ROOM.max
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const floorTex = gridTexture()
  floorTex.repeat.set(w / 2, d / 2)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.set(cx, 0, cz)
  const wallMat = wallMaterial() // acoustic panels (decor.ts)
  const plane = (pw: number, ph: number, pos: [number, number, number], rotY: number, mat: THREE.Material = wallMat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat)
    m.position.set(...pos)
    m.rotation.y = rotY
    scene.add(m)
    return m
  }
  scene.add(floor)
  plane(w, y1, [cx, y1 / 2, z0], 0)
  plane(w, y1, [cx, y1 / 2, z1], Math.PI)
  plane(d, y1, [x0, y1 / 2, cz], Math.PI / 2)
  plane(d, y1, [x1, y1 / 2, cz], -Math.PI / 2)
  const ceiling = plane(w, d, [cx, y1, cz], 0, ceilingMaterial())
  ceiling.rotation.x = Math.PI / 2
  // Flight Control Room + clean-room dressing: static, not interactable or collidable (decor.ts).
  addMissionControlDecor(scene)
  const strip = new THREE.MeshBasicMaterial({ color: 0xcfe0ff })
  for (let z = z0 + 2; z < z1; z += 4) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(w - 4, 0.05, 0.2), strip)
    lamp.position.set(cx, y1 - 0.05, z)
    scene.add(lamp)
  }
  for (const [x, z] of [[-5, -6], [5, -6], [-5, 2], [5, 2], [0, -10]] as const) {
    const light = new THREE.PointLight(0xdbe6ff, 22, 14, 2)
    light.position.set(x, 4.2, z)
    scene.add(light)
  }

  // ---- Call wall, gauges.
  const wallScreen = canvasScreen(1280, 640)
  plane(CALL_WALL.w, CALL_WALL.h, [CALL_WALL.x, CALL_WALL.y, z0 + 0.02], 0, new THREE.MeshBasicMaterial({ map: wallScreen.texture, toneMapped: false }))
  const gaugeScreen = canvasScreen(1040, 580)
  plane(GAUGES.w, GAUGES.h, [GAUGES.x, GAUGES.y, z0 + 0.02], 0, new THREE.MeshBasicMaterial({ map: gaugeScreen.texture, toneMapped: false }))

  // ---- Stand with the spacecraft.
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4152, metalness: 0.6, roughness: 0.4 })
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.6, 40), metal)
  stand.position.set(STAND[0], 0.3, STAND[2])
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.8, 48), new THREE.MeshBasicMaterial({ color: 0xffb020 }))
  ring.rotation.x = -Math.PI / 2
  ring.position.set(STAND[0], 0.01, STAND[2])
  const craftHolder = new THREE.Group()
  craftHolder.position.set(STAND[0], 1.35, STAND[2])
  scene.add(stand, ring, craftHolder)
  let craftKey = ''

  // ---- Console desks (one per GO / NO-GO console).
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a3142, roughness: 0.6 })
  const deskStandIns: THREE.Mesh[] = []
  const desks = DESK_XS.map((x) => {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.8), deskMat)
    desk.position.set(x, 0.4, DESK_Z)
    deskStandIns.push(desk)
    const screen = canvasScreen(512, 400)
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.98), new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }))
    // Above the desk like a wall monitor, so a desk model's own screen never covers it.
    panel.position.set(x, 1.72, DESK_Z - 0.45)
    panel.rotation.x = -0.1
    scene.add(desk, panel)
    return screen
  })

  // ---- Launch button on its pedestal.
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.95, 24), metal)
  pedestal.position.set(LAUNCH[0], 0.475, LAUNCH[2])
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0xff3b2f, emissive: 0xff3b2f, emissiveIntensity: 0.6 })
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 24), buttonMat)
  button.position.set(LAUNCH[0], 1.0, LAUNCH[2])
  scene.add(pedestal, button)

  // cursor@kaipo's console desk (public/visual-assets/world/, in the offline cache) replaces the stand-in
  // desks once it loads (the launch button stays the glowing red one: easier to spot); if they don't, the stand-ins stay. Models face −Z: turn them to the room.
  let disposed = false
  const loader = new GLTFLoader()
  const prop = (file: string, place: (model: THREE.Object3D) => void) =>
    loader.load(`${import.meta.env.BASE_URL}visual-assets/world/${file}`, (gltf) => {
      if (disposed) return disposeObject(gltf.scene)
      place(gltf.scene)
      scene.updateMatrixWorld(true)
      dirty = true
    }, undefined, () => {})
  prop('console-desk.glb', (model) => {
    DESK_XS.forEach((x, i) => {
      const desk = i === 0 ? model : model.clone()
      desk.position.set(x, 0, DESK_Z + 0.1)
      desk.rotation.y = Math.PI
      scene.add(desk)
      deskStandIns[i]!.visible = false
    })
  })

  // ---- Racks: built when the parts list changes; plates redrawn when what's fitted changes.
  const rackGroup = new THREE.Group()
  scene.add(rackGroup)
  let rackKey = ''
  const plates = new Map<string, { frame: THREE.Mesh; part: THREE.Mesh }>()
  /** Part models, hidden when you're far from them (most of the room's draw calls); their name strips stay. */
  const models: THREE.Object3D[] = []
  const NEAR = 7
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x63dbad, toneMapped: false })
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x232b3d, roughness: 0.7 })

  const buildRacks = (racks: Rack[]) => {
    for (const child of [...rackGroup.children]) {
      rackGroup.remove(child)
      disposeObject(child)
    }
    plates.clear()
    models.length = 0
    for (const rack of racks) {
      const rot = Math.atan2(rack.face[0], rack.face[1])
      const cab = new THREE.Mesh(new THREE.BoxGeometry(rack.length + 0.2, 2.1, 0.5), cabinetMat)
      cab.position.set(rack.sign[0] - rack.face[0] * 0.3, 1.05, rack.sign[2] - rack.face[1] * 0.3)
      cab.rotation.y = rot
      const sign = canvasScreen(512, 96)
      sign.g.fillStyle = BG
      sign.g.fillRect(0, 0, 512, 96)
      sign.g.fillStyle = GOLD
      sign.g.font = font(56, 700)
      sign.g.textAlign = 'center'
      sign.g.textBaseline = 'middle'
      sign.g.fillText(rack.name.toUpperCase(), 256, 50, 490)
      sign.draw()
      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1.4, Math.min(2.4, rack.length)), 0.42), new THREE.MeshBasicMaterial({ map: sign.texture, toneMapped: false }))
      signMesh.position.set(...rack.sign)
      signMesh.position.y = 2.4
      signMesh.rotation.y = rot
      rackGroup.add(cab, signMesh)
      for (const item of rack.items) {
        const model = partModel(item.part)
        const tex = canvasScreen(384, 240)
        const { g } = tex
        g.fillStyle = '#121a2e'
        g.fillRect(0, 0, 384, 240)
        g.fillStyle = TEXT
        g.font = font(40, 700)
        g.textAlign = 'center'
        wrap(g, shortLabel(item.part), 360, 2).forEach((line, i) => g.fillText(line, 192, 70 + i * 46, 370))
        const cost = item.part.props.cost_usd
        g.fillStyle = MUTED
        g.font = font(34, 500)
        if (typeof cost === 'number') g.fillText(formatValue(cost, 'USD'), 192, 200)
        tex.draw()
        const part = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.41), new THREE.MeshBasicMaterial({ map: tex.texture, toneMapped: false }))
        part.position.set(...item.at)
        part.rotation.y = rot
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.49), frameMat)
        frame.position.set(item.at[0] - item.face[0] * 0.005, item.at[1], item.at[2] - item.face[1] * 0.005)
        frame.rotation.y = rot
        frame.visible = item.picked
        if (model) {
          // The part itself on a little shelf; its name and price on a strip along the shelf's front edge.
          const strip = canvasScreen(512, 112)
          strip.g.fillStyle = '#121a2e'
          strip.g.fillRect(0, 0, 512, 112)
          strip.g.textAlign = 'center'
          strip.g.textBaseline = 'middle'
          strip.g.fillStyle = TEXT
          strip.g.font = font(44, 700)
          strip.g.fillText(shortLabel(item.part), 256, 40, 490)
          strip.g.fillStyle = MUTED
          strip.g.font = font(32, 500)
          if (typeof cost === 'number') strip.g.fillText(formatValue(cost, 'USD'), 256, 88, 490)
          strip.draw()
          tex.texture.dispose()
          ;(part.material as THREE.MeshBasicMaterial).map = strip.texture
          const edge = (dy: number, out: number, m: THREE.Mesh, h: number) => {
            m.geometry.dispose()
            m.geometry = new THREE.PlaneGeometry(m === frame ? 0.74 : 0.68, h)
            m.position.set(item.at[0] + item.face[0] * out, item.at[1] + dy, item.at[2] + item.face[1] * out)
          }
          edge(-0.2, 0.43, part, 0.15)
          edge(-0.2, 0.425, frame, 0.21)
          model.position.set(item.at[0] + item.face[0] * 0.24, item.at[1] + 0.08, item.at[2] + item.face[1] * 0.24)
          model.rotation.y = rot + 0.35
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.44), cabinetMat)
          shelf.position.set(item.at[0] + item.face[0] * 0.2, item.at[1] - 0.1, item.at[2] + item.face[1] * 0.2)
          shelf.rotation.y = rot
          rackGroup.add(model, shelf)
          models.push(model)
        }
        rackGroup.add(frame, part)
        plates.set(`${rack.key}:${item.part.id}`, { frame, part })
      }
    }
  }

  const drawWall = (s: RoomScreens) => {
    const { g } = wallScreen
    g.fillStyle = '#0a1430'
    g.fillRect(0, 0, 1280, 640)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    if (s.debrief) {
      const r = s.debrief
      g.fillStyle = GOLD
      g.font = font(64, 700)
      g.fillText('DEBRIEF', 640, 80)
      g.fillStyle = r.grade === 'F' ? BAD : r.grade === 'A' || r.grade === 'B' ? GOOD : WARN
      g.font = font(260, 800)
      g.fillText(r.grade, 640, 290)
      g.fillStyle = TEXT
      g.font = font(54, 600)
      g.fillText(`${r.outcome} · ${Math.round(r.score)} points`, 640, 470, 1200)
      if (r.fix) {
        g.fillStyle = MUTED
        g.font = font(42, 500)
        g.fillText(`Try at the stand: ${r.fix}`, 640, 560, 1200)
      }
    } else {
      g.fillStyle = GOLD
      g.font = font(40, 700)
      g.fillText('MISSION CALL', 640, 64)
      g.fillStyle = TEXT
      g.font = font(70, 700)
      wrap(g, s.title, 1180, 2).forEach((line, i) => g.fillText(line, 640, 160 + i * 80, 1200))
      s.numbers.forEach(([label, value], i) => {
        const x = 640 + (i - (s.numbers.length - 1) / 2) * 400
        g.fillStyle = TEXT
        g.font = font(96, 800)
        g.fillText(value, x, 420, 380)
        g.fillStyle = MUTED
        g.font = font(40, 500)
        g.fillText(label, x, 510, 380)
      })
    }
    wallScreen.draw()
  }

  const drawGauges = (bars: Bar[]) => {
    const { g } = gaugeScreen
    g.fillStyle = BG
    g.fillRect(0, 0, 1040, 580)
    g.textBaseline = 'middle'
    const rows = bars.slice(0, 7)
    const h = 560 / Math.max(rows.length, 1)
    rows.forEach((b, i) => {
      const y = 10 + h * i + h / 2
      g.textAlign = 'left'
      g.fillStyle = TEXT
      g.font = font(34, 600)
      g.fillText(b.label, 24, y - 16, 360)
      g.fillStyle = MUTED
      g.font = font(28, 500)
      g.fillText(`${formatValue(b.used, b.unit)} / ${formatValue(b.limit, b.unit)}`, 24, y + 20, 360)
      const bx = 400
      const bw = 610
      g.fillStyle = '#1f2840'
      g.fillRect(bx, y - 16, bw, 32)
      g.fillStyle = b.bad ? BAD : GOOD
      g.fillRect(bx, y - 16, bw * Math.max(0, Math.min(1, b.ratio)), 32)
      if (b.bad) {
        g.textAlign = 'right'
        g.fillStyle = BAD
        g.font = font(30, 800)
        g.fillText(b.goal ? 'SHORT' : 'OVER', bx + bw - 8, y + 1)
      }
    })
    gaugeScreen.draw()
  }

  const drawDesks = (calls: ConsoleCall[]) =>
    calls.slice(0, 4).forEach((c, i) => {
      const screen = desks[i]!
      const { g } = screen
      g.fillStyle = '#0d1424'
      g.fillRect(0, 0, 512, 400)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillStyle = MUTED
      g.font = font(38, 700)
      g.fillText(c.label.toUpperCase(), 256, 50, 480)
      g.fillStyle = callColour(c)
      g.font = font(96, 800)
      g.fillText(callWord(c), 256, 150, 480)
      g.fillStyle = TEXT
      g.font = font(30, 500)
      const why = c.reasons[0]?.message ?? 'All checks good.'
      wrap(g, why, 470, 4).forEach((line, j) => g.fillText(line, 256, 245 + j * 38, 490))
      screen.draw()
    })

  // ---- Walking.
  scene.updateMatrixWorld(true)
  const fps = createFps(renderer.domElement, camera, { ...options, start: START.pos, yaw: START.yaw })
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
    if (moved || dirty) for (const m of models) m.visible = m.position.distanceTo(camera.position) < NEAR
    if (moved || dirty) renderer.render(scene, camera)
    dirty = false
  })

  return {
    fps,
    setActive(on) {
      fps.setEnabled(on)
      dirty = true
      loop.setActive(on)
    },
    show(s) {
      const key = s.racks.map((r) => `${r.key}:${r.items.map((i) => i.part.id).join(',')}`).join('|')
      if (key !== rackKey) {
        rackKey = key
        buildRacks(s.racks)
      }
      for (const r of s.racks) for (const item of r.items) {
        const plate = plates.get(`${r.key}:${item.part.id}`)
        if (plate) plate.frame.visible = item.picked
      }
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
          craft.scale.setScalar(Math.min(1.1 / Math.max(...s.craft.bus, 1e-6), 3 / Math.max(size.x, size.y, size.z, 1e-6)))
          craft.rotation.y = 0.6
          craftHolder.add(craft)
        }
      }
      buttonMat.emissiveIntensity = s.debrief ? 0.15 : 0.6
      drawWall(s)
      drawGauges(s.bars)
      drawDesks(s.calls)
      scene.updateMatrixWorld(true) // racks or the craft may have been rebuilt
      dirty = true
    },
    dispose() {
      disposed = true
      loop.dispose()
      observer.disconnect()
      fps.dispose()
      disposeObject(scene)
      envMap.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
