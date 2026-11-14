// The mission-control hall in three.js (decision 005, V6). Built from primitives and canvas
// textures in code: no model files, no network, so it works offline on GitHub Pages. Renders on
// demand (only while walking or looking), which keeps phones cool.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildCraft, disposeObject } from '../scene3d/craft'
import type { CraftSpec } from '../scene3d/model'
import { STATIONS, station, walkMs, walkPose, type StationId } from './model'

export interface HangarOptions {
  station: StationId
  reducedMotion: boolean
  /** The camera reached a station. */
  onArrive?: (id: StationId) => void
  /** A station was clicked or tapped in the 3D view. */
  onPick?: (id: StationId) => void
}

export interface HangarWorld {
  goTo(id: StationId): void
  setCraft(spec: CraftSpec | null): void
  setTitle(text: string): void
  /** Turn the head: radians left/right and up/down, added to the current look (clamped). */
  look(yaw: number, pitch: number): void
  dispose(): void
}

/** A canvas texture with centred lines of text. The first line is big. */
function textTexture(lines: string[], w: number, h: number, bg: string, fg: string, accent = fg): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  lines.forEach((line, i) => {
    g.fillStyle = i === 0 ? accent : fg
    // A one-line sign fills its height; a screen has a big title and smaller lines under it.
    const size = lines.length === 1 ? 0.5 : i === 0 ? 0.16 : 0.08
    g.font = `${i === 0 ? 700 : 500} ${Math.round(h * size)}px system-ui, sans-serif`
    g.fillText(line, w / 2, h * (lines.length === 1 ? 0.5 : 0.3 + i * 0.2), w * 0.9)
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function gridTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#151a26'
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = '#26304a'
  g.lineWidth = 3
  g.strokeRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(30, 7)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** The view through the launch pad window: dawn sky, the pad and a rocket on it. */
function padTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 640
  const g = c.getContext('2d')!
  const sky = g.createLinearGradient(0, 0, 0, 640)
  sky.addColorStop(0, '#0d1b3d')
  sky.addColorStop(0.65, '#e9875a')
  sky.addColorStop(0.66, '#3a3328')
  sky.addColorStop(1, '#1d1a16')
  g.fillStyle = sky
  g.fillRect(0, 0, 1024, 640)
  g.fillStyle = '#5a5f6b' // tower
  g.fillRect(560, 150, 26, 270)
  g.fillStyle = '#e9ecf2' // rocket body
  g.fillRect(490, 170, 44, 250)
  g.beginPath()
  g.moveTo(490, 170)
  g.lineTo(512, 110)
  g.lineTo(534, 170)
  g.fill()
  g.fillStyle = '#2a2f3a'
  g.fillRect(470, 400, 84, 20)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** The operations screen: a planet with your orbit around it. */
function opsTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 410
  const g = c.getContext('2d')!
  g.fillStyle = '#050a18'
  g.fillRect(0, 0, 1024, 410)
  g.fillStyle = '#2f6fd6'
  g.beginPath()
  g.arc(512, 215, 110, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#ffda8a'
  g.lineWidth = 4
  g.beginPath()
  g.ellipse(512, 215, 260, 120, -0.2, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#b1caff'
  g.font = '700 40px system-ui, sans-serif'
  g.fillText('OPERATIONS', 40, 60)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createHangar(host: HTMLElement, options: HangarOptions): HangarWorld {
  const renderer = new THREE.WebGLRenderer({ antialias: true }) // throws without WebGL; the component shows a fallback
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070a12)
  scene.fog = new THREE.Fog(0x070a12, 14, 40)
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 120)
  // Something for the metal to reflect: without it the spacecraft's foil and aluminium look black.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.35
  pmrem.dispose()

  // ---- The hall.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.85 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.set(22.5, 0, 0)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2133, roughness: 0.9 })
  const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 5), wallMat)
  back.position.set(22.5, 2.5, -3.4)
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), wallMat)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.set(22.5, 5, 0)
  scene.add(floor, back, ceiling)
  const strip = new THREE.MeshBasicMaterial({ color: 0xcfe0ff })
  for (let x = -4; x <= 50; x += 6) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.25), strip)
    lamp.position.set(x, 4.95, 0.5)
    scene.add(lamp)
  }
  scene.add(new THREE.HemisphereLight(0x9bb4ff, 0x30364a, 2.2))

  /** Click/tap targets: each mesh knows its station. */
  const hotspots: THREE.Object3D[] = []
  const add = (id: StationId, obj: THREE.Object3D, hot = true) => {
    obj.userData.station = id
    scene.add(obj)
    if (hot) hotspots.push(obj)
  }
  const screen = (id: StationId, tex: THREE.Texture, w: number, h: number, x: number, y: number, z = -3.3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }))
    m.position.set(x, y, z)
    add(id, m)
    return m
  }

  for (const s of STATIONS) {
    // A sign over every station, and a pool of light on the floor.
    const sign = screen(s.id, textTexture([s.name.toUpperCase()], 1024, 128, '#0b1020', '#edf1fa', '#b1caff'), 4, 0.5, s.look[0], 4.4, -3.3)
    sign.userData.sign = true
    const light = new THREE.PointLight(0xdbe6ff, 30, 14, 2)
    light.position.set(s.look[0], 4, 0)
    scene.add(light)
  }

  // Mission call wall.
  let titleTex = textTexture(['MISSION CALL', 'Waiting for the next mission…'], 1024, 512, '#0a1430', '#edf1fa', '#ffda8a')
  const wall = screen('wall', titleTex, 6, 3, station('wall').look[0], 2.4)

  // Assembly bay: a stand with the spacecraft on it.
  const bayX = station('bay').look[0]
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.5, 40), new THREE.MeshStandardMaterial({ color: 0x3a4152, metalness: 0.6, roughness: 0.4 }))
  stand.position.set(bayX, 0.25, -0.6)
  add('bay', stand)
  const stripe = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.8, 48), new THREE.MeshBasicMaterial({ color: 0xffb020 }))
  stripe.rotation.x = -Math.PI / 2
  stripe.position.set(bayX, 0.01, -0.6)
  scene.add(stripe)
  const craftHolder = new THREE.Group()
  craftHolder.position.set(bayX, 1.45, -0.6)
  add('bay', craftHolder)

  // Flight consoles: four desks, one per console of the GO / NO-GO poll.
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a3142, roughness: 0.6 })
  ;['PLAN', 'SPACECRAFT', 'SCIENCE', 'COMMS'].forEach((label, i) => {
    const x = station('consoles').look[0] - 2.4 + i * 1.6
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.8), deskMat)
    desk.position.set(x, 0.4, -1.4)
    add('consoles', desk)
    const tex = textTexture([label, 'GO / NO-GO'], 512, 320, '#0d2a22', '#b5c2df', '#63dbad')
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }))
    panel.position.set(x, 1.2, -1.6)
    panel.rotation.x = -0.35
    add('consoles', panel)
  })

  // Launch pad window, the operations screen and the debrief.
  screen('pad', padTexture(), 8, 5, station('pad').look[0], 2.6)
  screen('ops', opsTexture(), 8, 3.2, station('ops').look[0], 2.3)
  screen('debrief', textTexture(['DEBRIEF', 'What happened · what would have fixed it'], 1024, 512, '#141b33', '#b5c2df', '#edf1fa'), 5, 2.5, station('debrief').look[0], 2.4)
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.08, 40), deskMat)
  table.position.set(station('debrief').look[0], 0.75, -0.6)
  add('debrief', table)

  // ---- Camera, walking and looking.
  let at: StationId = options.station
  let walk: { from: StationId; to: StationId; start: number; ms: number } | null = null
  let yaw = 0
  let pitch = 0
  const target = new THREE.Vector3()
  const place = (eye: number[], look: number[]) => {
    camera.position.set(eye[0]!, eye[1]!, eye[2]!)
    target.set(look[0]!, look[1]!, look[2]!)
    // Head turn: swing the look point around the eye.
    const dx = target.x - camera.position.x
    const dz = target.z - camera.position.z
    const dist = Math.hypot(dx, dz)
    const angle = Math.atan2(dx, dz) + yaw
    target.set(camera.position.x + Math.sin(angle) * dist, target.y + Math.tan(pitch) * dist, camera.position.z + Math.cos(angle) * dist)
    camera.lookAt(target)
  }
  const still = station(at)
  place(still.eye, still.look)

  let frame = 0
  const draw = () => {
    frame = 0
    if (walk) {
      const t = options.reducedMotion ? 1 : (performance.now() - walk.start) / walk.ms
      const pose = walkPose(walk.from, walk.to, t, options.reducedMotion)
      place(pose.eye, pose.look)
      if (t >= 1) {
        at = walk.to
        walk = null
        options.onArrive?.(at)
      } else frame = requestAnimationFrame(draw)
    }
    renderer.render(scene, camera)
  }
  const invalidate = () => {
    if (!frame) frame = requestAnimationFrame(draw)
  }

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Narrow (phone) screens see less sideways, so widen the view a little.
    camera.fov = w / h < 1 ? 78 : 62
    camera.updateProjectionMatrix()
    invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  // Tap / click a station to go there.
  const ray = new THREE.Raycaster()
  const onClick = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    const hit = ray.intersectObjects(hotspots, true)[0]
    let obj: THREE.Object3D | null = hit?.object ?? null
    while (obj && !obj.userData.station) obj = obj.parent
    if (obj) options.onPick?.(obj.userData.station as StationId)
  }
  renderer.domElement.addEventListener('click', onClick)

  return {
    goTo(id) {
      if (id === (walk?.to ?? at)) return
      const from = walk ? walk.to : at // a new target mid-walk restarts from the last goal; good enough at walking speed
      yaw = pitch = 0
      walk = { from, to: id, start: performance.now(), ms: walkMs(from, id) }
      invalidate()
    },
    setCraft(spec) {
      for (const child of [...craftHolder.children]) {
        craftHolder.remove(child)
        disposeObject(child)
      }
      if (spec) {
        const craft = buildCraft(spec)
        const size = new THREE.Box3().setFromObject(craft).getSize(new THREE.Vector3())
        // The body about 0.9 m across so it reads at a glance; wide wings capped at 4.2 m so they stay in view.
        craft.scale.setScalar(Math.min(0.9 / Math.max(...spec.bus, 1e-6), 4.2 / Math.max(size.x, size.y, size.z, 1e-6)))
        craft.rotation.y = 0.6
        craftHolder.add(craft)
      }
      invalidate()
    },
    setTitle(text) {
      const old = titleTex
      titleTex = textTexture(['MISSION CALL', text], 1024, 512, '#0a1430', '#edf1fa', '#ffda8a')
      ;(wall.material as THREE.MeshBasicMaterial).map = titleTex
      old.dispose()
      invalidate()
    },
    look(dYaw, dPitch) {
      yaw = Math.max(-1.2, Math.min(1.2, yaw + dYaw))
      pitch = Math.max(-0.5, Math.min(0.5, pitch + dPitch))
      if (!walk) {
        const s = station(at)
        place(s.eye, s.look)
      }
      invalidate()
    },
    dispose() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('click', onClick)
      disposeObject(scene) // geometries, materials and their canvas textures
      envMap.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
