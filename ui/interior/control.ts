// The walk-in spacecraft in three.js (decision 007). Primitives, canvas textures and the real part
// models (ui/scene3d/parts via ui/hangar's partModel); cursor@kaipo's alarm beacon and time lever
// when they load. layout.ts says where things stand; this draws them and animates the alarm.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { roomLoop } from '../fps/room-loop'
import { createFps, type Fps, type FpsOptions } from '../fps/controller'
import { canvasScreen, font, partModel } from '../hangar/control'
import { buildCraft, disposeObject } from '../scene3d/craft'
import { planetMaps } from '../scene3d/maps'
import { atmosphereShader, cloudShader, planetShader, toScreen } from '../scene3d/shaders'
import type { CraftSpec } from '../scene3d/model'
import type { Decision } from '../../shared'
import { choiceSpots, DASH, moduleFor, ROOM, START, WINDOW, type Gauge, type Module } from './layout'
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

function panelMap() {
  const map = painted(256, 256, (ctx) => {
    ctx.fillStyle = '#d5d8e0'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#8a919c'
    ctx.lineWidth = 3
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 256)
      ctx.moveTo(0, i)
      ctx.lineTo(256, i)
      ctx.stroke()
    }
    ctx.fillStyle = '#66707c'
    for (let y = 10; y < 256; y += 64) for (let x = 10; x < 256; x += 64) {
      ctx.beginPath()
      ctx.arc(x, y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(3, 2)
  return map
}

function mliMap() {
  const map = painted(256, 256, (ctx) => {
    ctx.fillStyle = '#c8963c'
    ctx.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y += 4) {
      const k = 0.45 + 0.55 * Math.sin(y * 0.19)
      ctx.fillStyle = `rgba(${30 + k * 70},${16 + k * 30},0,${0.12 + 0.28 * (1 - k)})`
      ctx.fillRect(0, y, 256, 3)
    }
  })
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(4, 2)
  return map
}

function radiatorMap() {
  return painted(256, 256, (ctx) => {
    ctx.fillStyle = '#12161e'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#41506a'
    ctx.lineWidth = 2
    for (let y = 8; y < 256; y += 14) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(256, y)
      ctx.stroke()
    }
  })
}

function avionicsMap() {
  return painted(128, 128, (ctx) => {
    ctx.fillStyle = '#1b212c'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#8d96a3'
    ctx.fillRect(16, 34, 30, 16)
    ctx.fillRect(16, 68, 30, 16)
    ctx.fillStyle = '#3ddc97'
    ctx.beginPath()
    ctx.arc(98, 42, 6, 0, Math.PI * 2)
    ctx.fill()
  })
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
  const cabinLight = new THREE.HemisphereLight(0xc9d6ff, 0x2a3044, 1.9)
  scene.add(cabinLight)
  const lamp = new THREE.PointLight(0xdbe6ff, 10, 9, 2)
  lamp.position.set(0, 3, 0.5)
  scene.add(lamp)

  // ---- Walls, with an opening for the window in the front wall.
  const [x0, , z0] = ROOM.min
  const [x1, y1, z1] = ROOM.max
  const wallMat = new THREE.MeshStandardMaterial({ map: panelMap(), color: 0xffffff, roughness: 0.58, metalness: 0.2 })
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = wallMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    scene.add(m)
    return m
  }
  const t = 0.1
  const W = x1 - x0
  const D = z1 - z0
  box(W, t, D, 0, -t / 2, 0, new THREE.MeshStandardMaterial({ color: 0x3a4152, roughness: 0.8 }))
  const gold = new THREE.MeshStandardMaterial({ map: mliMap(), metalness: 0.86, roughness: 0.34 })
  box(W, t, D, 0, y1 + t / 2, 0, gold)
  box(t, y1, D, x0 - t / 2, y1 / 2, 0)
  box(t, y1, D, x1 + t / 2, y1 / 2, 0)
  box(W, y1, t, 0, y1 / 2, z1 + t / 2)
  const wl = WINDOW.x - WINDOW.w / 2
  const wr = WINDOW.x + WINDOW.w / 2
  const wb = WINDOW.y - WINDOW.h / 2
  const wt = WINDOW.y + WINDOW.h / 2
  box(wl - x0, y1, t, (x0 + wl) / 2, y1 / 2, z0 - t / 2)
  box(x1 - wr, y1, t, (wr + x1) / 2, y1 / 2, z0 - t / 2)
  box(WINDOW.w, wb, t, WINDOW.x, wb / 2, z0 - t / 2)
  box(WINDOW.w, y1 - wt, t, WINDOW.x, (wt + y1) / 2, z0 - t / 2)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a3142, metalness: 0.5, roughness: 0.4 })
  for (const [w, h, x, y] of [[WINDOW.w + 0.2, 0.1, WINDOW.x, wt], [WINDOW.w + 0.2, 0.1, WINDOW.x, wb], [0.1, WINDOW.h, wl, WINDOW.y], [0.1, WINDOW.h, wr, WINDOW.y]] as const)
    box(w, h, 0.16, x, y, z0)
  // Handrails along the walls: it's a spacecraft.
  for (const x of [x0 + 0.08, x1 - 0.08]) box(0.05, 0.05, D - 0.6, x, 1.05, 0, frameMat)
  // Upper walls and ceiling: what you see when a satellite bus is opened. Kept above eye height
  // so the walk path and the module pedestals stay clear.
  const rad = new THREE.MeshStandardMaterial({ map: radiatorMap(), metalness: 0.4, roughness: 0.5 })
  box(0.04, 0.9, 1.4, x0 + 0.05, 2.45, 0.15, rad)
  box(0.04, 0.9, 1.4, x1 - 0.05, 2.45, 0.15, rad)
  const harness = new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.7 })
  box(0.05, 0.05, D - 0.8, x0 + 0.1, y1 - 0.08, 0, harness)
  box(0.05, 0.05, D - 0.8, x1 - 0.1, y1 - 0.08, 0, harness)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xc9d0d8, metalness: 0.88, roughness: 0.24 })
  for (const [x, z] of [[-0.18, 0.16], [0.18, 0.16], [0, -0.16]] as const) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 20), wheelMat)
    wheel.position.set(-1.6 + x, y1 - 0.1, 0.2 + z)
    scene.add(wheel)
  }
  const face = new THREE.MeshStandardMaterial({ map: avionicsMap(), metalness: 0.35, roughness: 0.48 })
  const shell = new THREE.MeshStandardMaterial({ color: 0x232833, metalness: 0.55, roughness: 0.4 })
  for (const x of [-1.5, 0, 1.5]) {
    const unit = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.12), [shell, shell, shell, shell, shell, face])
    unit.position.set(x, 2.5, z1 - 0.08)
    scene.add(unit)
  }

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
  const worldMaps = planetMaps(renderer.capabilities.getMaxAnisotropy())
  const worldMat = new THREE.ShaderMaterial({ ...toScreen(planetShader), uniforms: { uSun, uBody, ...worldMaps.maps.earth } })
  const world = new THREE.Mesh(new THREE.SphereGeometry(40, 96, 64), worldMat)
  world.position.set(10, -38, -70)
  scene.add(world)
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(40.4, 96, 64),
    new THREE.ShaderMaterial({ ...toScreen(cloudShader), uniforms: { uSun, uTime: { value: 0 } }, transparent: true, depthWrite: false }),
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
    const mid = spots.reduce((a, s) => [a[0] + s.at[0] / spots.length, a[1], a[2] + s.at[2] / spots.length], [0, 1.62, 0])
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
  const crew = mountCrew(scene)
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
    world.rotation.y = worldTurn
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
