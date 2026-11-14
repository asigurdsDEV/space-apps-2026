// The three.js world behind <SpaceView>. Imperative on purpose: one scene, created once,
// updated with setSpec/setMode/setFlight/setHighlight, torn down with dispose(). The planet has
// radius 1. All the decisions (where things are, what is in contact, how fast) are in fly.ts.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { buildCraft, disposeObject } from './craft'
import {
  anglesAt, contactHalfAngle, craftDirection, displayRate, findHighlighted, formatRate, govern, phasing, quality, rateNow,
  stationDirection, stationInContact, stationsFor, stepDown, sunlight, tickClock, STATIONS,
  type Clock, type Device, type Flight, type FlyStatus, type Governor, type Phasing, type Quality, type Station, type V3,
} from './fly'
import { BODY_RADIUS_M, lapSeconds, orbitRadius, type Body, type SceneSpec } from './model'
import { atmosphereShader, cloudShader, planetShader } from './shaders'

export type ViewMode = 'spacecraft' | 'orbit'
export type QualityChoice = 'auto' | 'high' | 'low'

export interface WorldOptions {
  mode: ViewMode
  /** No auto-rotation and no orbiting: the view stays still unless dragged. */
  reducedMotion: boolean
  /** Drag to rotate, scroll to zoom. Off on touch screens so the page still scrolls. */
  interactive: boolean
  /** Called when the spacecraft enters or leaves the planet's shadow. */
  onShadow?: (inShadow: boolean) => void
  /** Called when shadow, downlink or time-lapse change. */
  onStatus?: (status: FlyStatus) => void
  /** 'auto' picks by device and steps down when frames run slow. 'high' and 'low' pin it (previews, tests). */
  quality?: QualityChoice
}

export interface WorldStats extends Quality {
  calls: number
  triangles: number
  geometries: number
  textures: number
  level: number
}

export interface World {
  setSpec(spec: SceneSpec): void
  setMode(mode: ViewMode): void
  /** The mission as the sim reports it. `paused` stops the motion at once instead of when the clock goes quiet. */
  setFlight(flight: Flight, paused?: boolean): void
  /** A part family ('bus' | 'power' | 'comms' | 'instrument'), a catalog id, or null. */
  setHighlight(key: string | null): void
  /** Draw calls and triangles of the last frame drawn, and what is held in GPU memory. */
  stats(): WorldStats
  dispose(): void
}

// shortcut: the Sun (and Earth, seen from the Moon and Mars) stay put for the whole mission; the sim has no seasons to show.
const SUN = new THREE.Vector3(1, 0.35, 0.55).normalize()
const EARTH_DIR = new THREE.Vector3(-0.42, 0.27, -0.87).normalize()
const Y = new THREE.Vector3(0, 1, 0)
const ATMOSPHERE_R = 1.06
const BODY_INDEX: Record<Body, number> = { earth: 0, moon: 1, mars: 2 }
const ATMOSPHERE: Record<Body, THREE.Color | null> = { earth: new THREE.Color(0.28, 0.55, 1.0), mars: new THREE.Color(0.85, 0.48, 0.3), moon: null }
const SPIN_S: Record<Body, number> = { earth: 80, moon: 400, mars: 90 }
const CRAFT_SIZE: Record<ViewMode, number> = { spacecraft: 0.05, orbit: 0.04 }
const WARNING = new THREE.Color(1.5, 0.32, 0.05)
// A dead spacecraft has stopped pointing: it hangs at an odd angle.
const TUMBLE = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0.4, 1.3))
const NO_FLIGHT: Flight = { phase: 'design', outcome: '', stations: 1, canDownlink: false, batteryShort: false, cruise_s: 0, cruise: 1, day: 0 }

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function glowTexture(stops: [number, string][]): THREE.CanvasTexture {
  return canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    for (const [at, color] of stops) grad.addColorStop(at, color)
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  })
}

function ringTexture(dot: boolean): THREE.CanvasTexture {
  return canvasTexture(128, 128, (g) => {
    g.strokeStyle = g.fillStyle = 'rgba(255,255,255,0.95)'
    g.lineWidth = dot ? 9 : 6
    g.beginPath()
    g.arc(64, 64, dot ? 40 : 56, 0, Math.PI * 2)
    g.stroke()
    if (!dot) return
    g.beginPath()
    g.arc(64, 64, 16, 0, Math.PI * 2)
    g.fill()
  })
}

function makeStars(): THREE.Points {
  const n = 7000
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  let seed = 42
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const tints = [new THREE.Color(1, 1, 1), new THREE.Color(0.75, 0.85, 1), new THREE.Color(1, 0.9, 0.75)]
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    pos.set([Math.cos(a) * r * 900, u * 900, Math.sin(a) * r * 900], i * 3)
    const b = Math.pow(rnd(), 6) * 1.6 + 0.12
    const t = tints[Math.floor(rnd() * tints.length)]!
    col.set([t.r * b, t.g * b, t.b * b], i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false }))
}

/** A station's contact cone, station zenith along +y: apex on the ground, rim on the orbit's shell. */
function coneGeometries(shell: number, half: number): { cone: THREE.BufferGeometry; rim: THREE.BufferGeometry } {
  const n = 64
  const pos = [0, 1, 0]
  const col = [1, 1, 1]
  const index: number[] = []
  const rimPos: number[] = []
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * Math.PI * 2
    const p = [shell * Math.sin(half) * Math.cos(phi), shell * Math.cos(half), shell * Math.sin(half) * Math.sin(phi)]
    pos.push(...p)
    rimPos.push(...p)
    col.push(0.3, 0.3, 0.3)
    index.push(0, 1 + i, 1 + ((i + 1) % n))
  }
  const cone = new THREE.BufferGeometry()
  cone.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  cone.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  cone.setIndex(index)
  const rim = new THREE.BufferGeometry()
  rim.setAttribute('position', new THREE.Float32BufferAttribute(rimPos, 3))
  return { cone, rim }
}

function detectDevice(choice: QualityChoice): Device {
  const dpr = window.devicePixelRatio || 1
  if (choice !== 'auto') return { touch: choice === 'low', small: choice === 'low', slow: choice === 'low', dpr }
  const nav = navigator as Navigator & { deviceMemory?: number }
  return {
    touch: window.matchMedia('(pointer: coarse)').matches,
    small: Math.min(window.screen.width, window.screen.height) < 600,
    slow: (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4,
    dpr,
  }
}

export function createWorld(container: HTMLElement, initial: SceneSpec, options: WorldOptions): World {
  const device = detectDevice(options.quality ?? 'auto')
  let level = 0
  let q = quality(device, level)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.info.autoReset = false // so stats() can add up the bloom passes
  const canvas = renderer.domElement
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  container.appendChild(canvas)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000002)
  let pmrem = new THREE.PMREMGenerator(renderer)
  let environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = environment

  const camera = new THREE.PerspectiveCamera(38, 1, 0.002, 3000)

  // Lights only reach the spacecraft; the planet shades itself from uSun.
  const sunLight = new THREE.DirectionalLight(0xfff2e0, 2.6)
  const earthshine = new THREE.DirectionalLight(0x6d90d0, 0.6)
  const ambient = new THREE.AmbientLight(0x3a4560, 0.12)
  scene.add(sunLight, earthshine, earthshine.target, ambient)

  // Everything but the craft. The close-up of a flying mission turns this whole group instead of
  // moving the camera, so the craft stays level in frame while the planet rolls by underneath.
  const universe = new THREE.Group()
  scene.add(universe)
  universe.add(makeStars())

  const glow = glowTexture([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,244,214,1)'], [0.35, 'rgba(255,200,120,0.35)'], [1, 'rgba(255,170,80,0)']])
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(3, 2.8, 2.5), blending: THREE.AdditiveBlending, depthWrite: false }))
  sun.position.copy(SUN).multiplyScalar(800)
  sun.scale.setScalar(110)
  // Earth in the sky of the Moon and Mars scenes: where the downlink goes.
  const earthDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(0.45, 0.8, 1.9), blending: THREE.AdditiveBlending, depthWrite: false }))
  earthDot.position.copy(EARTH_DIR).multiplyScalar(800)
  universe.add(sun, earthDot)

  // Planet, clouds, atmosphere.
  const uSun = { value: SUN.clone() }
  const uTime = { value: 0 }
  const uBody = { value: 0 }
  const planetMaterial = new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody }, defines: { OCTAVES: q.octaves } })
  const cloudMaterial = new THREE.ShaderMaterial({ ...cloudShader, uniforms: { uSun, uTime }, defines: { OCTAVES: q.octaves }, transparent: true, depthWrite: false })
  const seg = q.segments
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg * 0.75), planetMaterial)
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, seg, seg * 0.75), cloudMaterial)
  const uAtmo = { value: new THREE.Color() }
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(ATMOSPHERE_R, seg * 0.75, seg * 0.5),
    new THREE.ShaderMaterial({
      ...atmosphereShader,
      uniforms: { uSun, uColor: uAtmo, uThickness: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_R * ATMOSPHERE_R)) } },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  // The globe tilts in the builder's close-up so mid-latitudes, not the polar ice, turn under the craft.
  const globe = new THREE.Group()
  globe.add(planet, clouds)
  universe.add(globe, atmosphere)

  // Orbit ring, tilted by the inclination.
  const orbitPivot = new THREE.Group()
  const ringPoints: THREE.Vector3[] = []
  for (let i = 0; i < 256; i++) ringPoints.push(new THREE.Vector3(Math.cos((i / 256) * Math.PI * 2), 0, Math.sin((i / 256) * Math.PI * 2)))
  const ringMaterial = new THREE.LineBasicMaterial({ color: 0x9dbcff, transparent: true, opacity: 0.55, depthWrite: false })
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints), ringMaterial)
  orbitPivot.add(ring)
  universe.add(orbitPivot)

  // Ground stations ride on the planet. Idle and live looks are shared materials; the cone shape is one shared geometry.
  const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false } as const
  const coneIdle = new THREE.MeshBasicMaterial({ ...additive, color: 0x66c8ff, opacity: 0.1, vertexColors: true, side: THREE.DoubleSide })
  const coneLive = new THREE.MeshBasicMaterial({ ...additive, color: 0x7dffc8, opacity: 0.26, vertexColors: true, side: THREE.DoubleSide })
  const rimIdle = new THREE.LineBasicMaterial({ ...additive, color: 0x66c8ff, opacity: 0.3 })
  const rimLive = new THREE.LineBasicMaterial({ ...additive, color: 0x7dffc8, opacity: 0.8 })
  const dotMap = ringTexture(true)
  const dotIdle = new THREE.SpriteMaterial({ map: dotMap, color: 0x8fd6ff, depthTest: false, transparent: true })
  const dotLive = new THREE.SpriteMaterial({ map: dotMap, color: new THREE.Color(0.6, 1.6, 1.1), depthTest: false, transparent: true })
  let shapes = coneGeometries(1.3, 0.3)
  const stationNodes = STATIONS.map((station) => {
    const local = new THREE.Vector3(...stationDirection(station))
    const group = new THREE.Group()
    group.quaternion.setFromUnitVectors(Y, local)
    const cone = new THREE.Mesh(shapes.cone, coneIdle)
    const rim = new THREE.LineLoop(shapes.rim, rimIdle)
    const dot = new THREE.Sprite(dotIdle)
    dot.position.y = 1.02
    dot.renderOrder = 9
    group.add(cone, rim, dot)
    planet.add(group)
    return { group, cone, rim, dot, local }
  })

  // Spacecraft + a ring marker so it can be found in the wide orbit view.
  const holder = new THREE.Group()
  scene.add(holder)
  let craft: THREE.Object3D | null = null
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(false), color: 0xffd47a, depthTest: false, transparent: true, opacity: 0.85 }))
  marker.renderOrder = 10
  scene.add(marker)

  // Downlink beam: narrow at the antenna, wider at the ground, with dashes that run down it.
  const beamMap = canvasTexture(4, 64, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 64)
    grad.addColorStop(0, 'rgba(255,255,255,0.25)')
    grad.addColorStop(0.5, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0.25)')
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 64)
  })
  beamMap.wrapT = THREE.RepeatWrapping
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 0.3, 1, 8, 1, true).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ ...additive, map: beamMap, color: new THREE.Color(0.5, 1.7, 1.15), side: THREE.DoubleSide }),
  )
  beam.visible = false
  scene.add(beam)

  // Post-processing: bloom on the Sun, ocean glint, atmosphere and beam. Only built where it is used.
  let composer: EffectComposer | null = null
  function setComposer(on: boolean) {
    if (on === !!composer) return
    if (composer) {
      for (const pass of composer.passes) pass.dispose()
      composer.dispose()
      composer = null
      return
    }
    // The composer draws into its own target, so that is where the anti-aliasing has to be.
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }))
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.4, 1.05))
    composer.addPass(new OutputPass())
  }

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.enabled = options.interactive
  // OrbitControls always sets touch-action: none; give touch scrolling back when dragging is off.
  if (!options.interactive) canvas.style.touchAction = 'auto'
  const motion = options.reducedMotion ? 0 : 1

  let spec = initial
  let mode = options.mode
  let radius = orbitRadius(spec)
  let flight = NO_FLIGHT
  let paused = false
  let clock: Clock | null = null
  /** The display clock, in sim seconds (see displayRate in fly.ts). */
  let shown = 0
  let phase: Phasing = { a0: 0, spin0: 0 }
  let stations: readonly Station[] = []
  let halfAngle = 0
  // Free-running angles for a state without a clock (the builder).
  let angle = 0.6
  let spin = 0
  let framed = ''
  let dirty = true
  let snap = true
  let statusKey = ''
  let inShadow: boolean | null = null
  let highlight: string | null = null
  const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = []
  const tinted = new Map<THREE.Material, THREE.Material>()

  // Close-up: the craft hangs nearer the planet than the squashed orbit ring, so the horizon is in
  // frame; higher orbits still show a smaller planet.
  const closeRadius = () => 1 + 0.25 * (radius - 1)
  const timed = () => flight.t_s !== undefined

  function clearHighlight() {
    for (const [mesh, material] of swapped) mesh.material = material
    for (const clone of tinted.values()) clone.dispose() // clones share the originals' textures, which stay
    swapped.length = 0
    tinted.clear()
  }

  function applyHighlight() {
    clearHighlight()
    dirty = true
    if (!highlight || !craft) return
    // Parts share materials, so the part being pointed at gets its own copies to tint.
    const copy = (m: THREE.Material) => {
      let clone = tinted.get(m)
      if (!clone) {
        clone = m.clone()
        if (clone instanceof THREE.MeshStandardMaterial) clone.emissiveMap = null
        tinted.set(m, clone)
      }
      return clone
    }
    for (const node of findHighlighted(craft, highlight)) {
      node.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        swapped.push([o, o.material])
        o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material)
      })
    }
    pulse(performance.now())
  }

  function pulse(now: number) {
    const k = motion ? 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(now * 0.006)) : 0.7
    for (const m of tinted.values()) if (m instanceof THREE.MeshStandardMaterial) m.emissive.copy(WARNING).multiplyScalar(k)
  }

  function applyStations() {
    stations = stationsFor(spec.body, flight.stations)
    // The first pass over the first station comes a sixth of a lap after the craft reaches its orbit.
    phase = phasing(stations[0], spec, flight.cruise_s + spec.period_s / 6)
    halfAngle = contactHalfAngle(BODY_RADIUS_M[spec.body], spec.altitude_m)
    const old = shapes
    shapes = coneGeometries(mode === 'spacecraft' ? closeRadius() : radius, halfAngle)
    for (const node of stationNodes) {
      node.cone.geometry = shapes.cone
      node.rim.geometry = shapes.rim
    }
    old.cone.dispose()
    old.rim.dispose()
    dirty = true
  }

  function applySpec(next: SceneSpec) {
    spec = next
    radius = orbitRadius(spec)
    uBody.value = BODY_INDEX[spec.body]
    clouds.visible = spec.body === 'earth'
    const air = ATMOSPHERE[spec.body]
    atmosphere.visible = !!air
    if (air) uAtmo.value.copy(air)
    earthDot.visible = spec.body !== 'earth'
    earthDot.scale.setScalar(spec.body === 'moon' ? 30 : 9)
    orbitPivot.rotation.set(spec.inclination_rad, 0, 0)
    ring.scale.setScalar(radius)
    clearHighlight()
    if (craft) {
      holder.remove(craft)
      disposeObject(craft)
    }
    craft = buildCraft(spec.craft)
    holder.add(craft)
    applyHighlight()
    applyStations()
    applyMode()
  }

  function applyMode() {
    holder.scale.setScalar(CRAFT_SIZE[mode])
    ring.visible = mode === 'orbit'
    snap = true
    dirty = true
    // Put the camera back only when the framing changes, not on every new part.
    const key = `${mode}|${radius}`
    if (key === framed) return
    framed = key
    const target = mode === 'spacecraft' ? new THREE.Vector3(0, closeRadius(), 0) : new THREE.Vector3()
    controls.target.copy(target)
    if (mode === 'spacecraft') {
      camera.position.copy(target).add(new THREE.Vector3(0.11, 0.045, 0.16))
      controls.minDistance = 0.07
      controls.maxDistance = 0.9
      controls.autoRotateSpeed = 0.7
    } else {
      const dist = Math.max(3.6, radius * 2.8)
      // Side-on to the Sun, so the day/night line and city lights show.
      camera.position.set(-0.25, 0.38, 1).normalize().multiplyScalar(dist)
      controls.minDistance = 1.4
      controls.maxDistance = 16
      controls.autoRotateSpeed = 0.35
    }
    controls.update()
  }

  function applyQuality() {
    q = quality(device, level)
    renderer.setPixelRatio(q.pixelRatio)
    setComposer(q.bloom)
    composer?.setPixelRatio(q.pixelRatio)
    for (const m of [planetMaterial, cloudMaterial]) {
      if (m.defines.OCTAVES === q.octaves) continue
      m.defines.OCTAVES = q.octaves
      m.needsUpdate = true
    }
    resize()
  }

  const pos = new THREE.Vector3()
  const up = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const toSun = new THREE.Vector3()
  const side = new THREE.Vector3()
  const sunW = new THREE.Vector3()
  const earthW = new THREE.Vector3()
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const basis = new THREE.Matrix4()
  const attitude = new THREE.Quaternion()
  const tuple = (v: THREE.Vector3): V3 => [v.x, v.y, v.z]

  /** Puts everything where the clocks say it is. */
  function place(dt: number) {
    const flying = timed()
    const chase = flying && mode === 'spacecraft'
    const lost = flight.phase === 'ended' && flight.outcome === 'spacecraft_failure'
    const noCraft = flight.phase === 'ended' && flight.outcome === 'launch_failure'
    const at = flying ? anglesAt(shown, spec, phase) : { a: angle, spin }
    planet.rotation.y = at.spin
    clouds.rotation.y = at.spin * 1.18
    globe.rotation.x = mode === 'spacecraft' && !flying ? 1.1 : 0

    const d = craftDirection(at.a, spec.inclination_rad)
    dir.set(...d)
    if (chase) {
      forward.set(-Math.sin(at.a), Math.cos(at.a) * Math.sin(spec.inclination_rad), -Math.cos(at.a) * Math.cos(spec.inclination_rad))
      universe.quaternion.setFromRotationMatrix(basis.makeBasis(forward, dir, side.crossVectors(forward, dir))).invert()
    } else universe.quaternion.identity()
    universe.updateMatrixWorld(true)
    sunW.copy(SUN).applyQuaternion(universe.quaternion)
    uSun.value.copy(sunW)
    sunLight.position.copy(sunW).multiplyScalar(10)

    // hook: cruise. The sim only counts cruise days, so this is a plain straight-in approach to the
    // orbit; the transfer view replaces it.
    if (mode === 'spacecraft') pos.set(0, closeRadius(), 0)
    else pos.copy(dir).multiplyScalar(radius * (1 + 0.8 * (1 - flight.cruise)))
    holder.position.copy(pos)
    holder.visible = !noCraft
    up.copy(pos).normalize()
    // Wings face the Sun as well as they can while the instruments look straight down.
    toSun.copy(sunW).addScaledVector(up, -sunW.dot(up))
    if (toSun.lengthSq() < 1e-6) toSun.set(0, 0, 1).addScaledVector(up, -up.z)
    toSun.normalize()
    side.crossVectors(up, toSun)
    attitude.setFromRotationMatrix(basis.makeBasis(side, up, toSun))
    if (lost) attitude.multiply(TUMBLE)
    // Eased while flying, so the turn-around at local noon and midnight is a turn and not a flip.
    holder.quaternion.slerp(attitude, snap || !flying ? 1 : 1 - Math.exp(-dt * 3))
    snap = false
    holder.updateMatrixWorld(true)

    // The sim knows only the orbit's eclipse share; this shadow is where the picture's Sun puts it.
    const light = sunlight(tuple(pos), tuple(sunW))
    const shadow = light < 0.5
    sunLight.intensity = 2.6 * light
    earthshine.position.copy(pos).addScaledVector(up, -1)
    earthshine.target.position.copy(pos)
    earthshine.intensity = 0.03 + (spec.body === 'earth' ? 0.57 : 0.22) * THREE.MathUtils.smoothstep(sunW.dot(up), -0.15, 0.25)
    scene.environmentIntensity = 0.02 + 0.28 * light
    ambient.intensity = 0.03 + 0.09 * light

    // Downlink. The sim models contact as a daily average (contact_s_per_day), not as passes: the
    // cones and the beam show where passes would fall for these stations, and the beam is only
    // drawn when the state says there is a radio with data to send (flight.canDownlink).
    let link: string | null = null
    let live = -1
    if (flying && flight.canDownlink) {
      if (stations.length) {
        live = stationInContact(d, stations.map((s) => stationDirection(s, at.spin)), halfAngle)
        if (live >= 0) {
          link = stations[live]!.name
          to.copy(stationNodes[live]!.local).applyMatrix4(planet.matrixWorld)
        }
      } else if (spec.body !== 'earth') {
        earthW.copy(EARTH_DIR).applyQuaternion(universe.quaternion)
        if (sunlight(tuple(pos), tuple(earthW)) > 0.5) {
          link = 'Earth'
          to.copy(earthW).multiplyScalar(800)
        }
      }
    }
    const camDist = camera.position.distanceTo(pos)
    beam.visible = link !== null
    if (link) {
      const anchor = craft?.userData.anchors?.antenna
      if (anchor instanceof THREE.Vector3) from.copy(anchor).applyMatrix4(craft!.matrixWorld)
      else from.copy(pos)
      const length = from.distanceTo(to)
      beam.position.copy(from)
      beam.quaternion.setFromUnitVectors(Y, to.sub(from).normalize())
      const width = 0.004 * camDist
      beam.scale.set(width, length, width)
      beamMap.repeat.y = Math.min(length, 12) / (0.05 * camDist)
    }
    stationNodes.forEach((node, i) => {
      node.group.visible = flying && i < stations.length
      if (!node.group.visible) return
      node.cone.material = i === live ? coneLive : coneIdle
      node.rim.material = i === live ? rimLive : rimIdle
      node.dot.material = i === live ? dotLive : dotIdle
      // The dot ignores depth so the planet's curve does not clip it; hide it by hand on the far side.
      to.copy(node.local).applyMatrix4(planet.matrixWorld)
      node.dot.visible = to.dot(from.copy(camera.position).sub(to)) > 0
      node.dot.scale.setScalar(camera.position.distanceTo(to) * 0.028)
    })

    marker.visible = mode === 'orbit' && !noCraft
    marker.position.copy(pos)
    marker.scale.setScalar(camDist * 0.05)
    marker.material.color.set(highlight || lost ? 0xff5a3c : flight.phase === 'ended' ? 0x9aa6c4 : shadow ? 0x9aa6c4 : 0xffd47a)
    ringMaterial.opacity = flight.phase === 'ended' && flight.outcome !== 'success' ? 0.22 : 0.55

    if (shadow !== inShadow) {
      inShadow = shadow
      options.onShadow?.(shadow)
    }
    return { shadow, link }
  }

  function render() {
    renderer.info.reset()
    if (composer) composer.render()
    else renderer.render(scene, camera)
  }

  let last = performance.now()
  let drew = false
  let governor: Governor = { avg_ms: 16, slow_s: 0 }
  function frame(now: number) {
    const elapsed = now - last
    const dt = Math.min(elapsed / 1000, 0.1)
    last = now
    // Only frames that follow a drawn frame say anything about how long drawing takes.
    if (drew && (options.quality ?? 'auto') === 'auto') {
      const result = govern(governor, elapsed)
      governor = result.g
      if (result.stepDown && stepDown(device, level) !== level) {
        level = stepDown(device, level)
        applyQuality()
      }
    }

    let moving = false
    let sim = 0
    let lapse = false
    if (timed()) {
      sim = paused || flight.phase === 'ended' ? 0 : rateNow(clock, now / 1000)
      const display = displayRate(sim, spec.period_s, mode === 'spacecraft')
      lapse = display.timeLapse
      if (display.rate > 0 && motion) {
        shown += display.rate * dt
        moving = true
      }
    } else if (motion) {
      spin += (dt * Math.PI * 2) / SPIN_S[spec.body]
      if (mode === 'orbit') angle += (dt * Math.PI * 2) / lapSeconds(spec.period_s)
      moving = true
    }
    if (moving) {
      uTime.value += dt
      beamMap.offset.y -= dt * 1.5
    }
    const { shadow, link } = place(dt)
    if (tinted.size && motion) {
      pulse(now)
      moving = true
    }
    const key = `${shadow}|${link}|${lapse ? formatRate(sim) : ''}`
    if (key !== statusKey) {
      statusKey = key
      options.onStatus?.({ inShadow: shadow, link, rate: sim, timeLapse: lapse })
    }
    // A paused mission is a still picture: nothing to redraw until something moves again.
    drew = controls.update(dt) || moving || dirty
    if (!drew) return
    dirty = false
    render()
  }

  function resize() {
    const w = Math.max(container.clientWidth, 1)
    const h = Math.max(container.clientHeight, 1)
    renderer.setSize(w, h, false)
    composer?.setSize(w, h)
    camera.aspect = w / h
    // Keep the craft's wings in frame in tall, narrow views.
    camera.fov = Math.min(70, 38 * Math.max(1, 1.3 / camera.aspect))
    camera.updateProjectionMatrix()
    dirty = true
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  // Only render while on screen.
  let onScreen = false
  const run = () => {
    last = performance.now()
    drew = false
    renderer.setAnimationLoop(onScreen ? frame : null)
  }
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = !!entry?.isIntersecting
    run()
  })
  visibility.observe(container)

  // A lost WebGL context (the phone took the GPU back) stops the loop; three.js re-uploads
  // geometry, textures and shaders when it returns, but the baked reflection map has to be redone.
  const onLost = (event: Event) => {
    event.preventDefault()
    renderer.setAnimationLoop(null)
  }
  const onRestored = () => {
    environment.dispose()
    pmrem.dispose()
    pmrem = new THREE.PMREMGenerator(renderer)
    environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = environment
    dirty = true
    run()
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  controls.autoRotate = !options.reducedMotion
  applyQuality()
  applySpec(initial)
  place(0)
  render()

  return {
    setSpec: applySpec,
    setMode(next) {
      if (next === mode) return
      mode = next
      applyStations()
      applyMode()
    },
    setFlight(next, isPaused = false) {
      const wasFlying = timed()
      const before = flight
      flight = next
      paused = isPaused
      if (next.t_s === undefined) clock = null
      else {
        const reset = !wasFlying || !clock || next.t_s < clock.t_s
        clock = tickClock(clock, next.t_s, performance.now() / 1000)
        if (reset) {
          shown = next.t_s
          snap = true
        }
      }
      // While flying the camera holds still, so a paused mission really is a still picture.
      controls.autoRotate = !options.reducedMotion && next.t_s === undefined
      if (next.stations !== before.stations || next.cruise_s !== before.cruise_s) applyStations()
      dirty = true
    },
    setHighlight(key) {
      if (key === highlight) return
      highlight = key
      applyHighlight()
    },
    stats: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      level,
      ...q,
    }),
    dispose() {
      renderer.setAnimationLoop(null)
      visibility.disconnect()
      resizeObserver.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      controls.dispose()
      clearHighlight()
      disposeObject(scene)
      // Not on any object right now, so the scene walk above missed them.
      for (const spare of [coneIdle, coneLive, rimIdle, rimLive, dotIdle, dotLive]) spare.dispose()
      environment.dispose()
      pmrem.dispose()
      setComposer(false)
      renderer.dispose()
      canvas.remove()
    },
  }
}
