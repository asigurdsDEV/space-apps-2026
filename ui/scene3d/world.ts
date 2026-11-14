// The three.js world behind <SpaceView>. Imperative on purpose: one scene, created once,
// updated with setSpec/setMode, torn down with dispose(). The planet has radius 1.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { buildCraft, disposeObject } from './craft'
import { cruiseLayout, transferArc, transferPoint } from './cruise'
import { lapSeconds, orbitRadius, type Body, type SceneSpec } from './model'
import { atmosphereShader, cloudShader, planetShader } from './shaders'
import { COMPANIONS, companionPosition, type Companion } from './sky'

/** "cruise" shows Earth → the Moon or Mars on the transfer arc; with an Earth orbit it shows "orbit". */
export type ViewMode = 'spacecraft' | 'orbit' | 'cruise'

export interface WorldOptions {
  mode: ViewMode
  /** No auto-rotation and no orbiting: the view stays still unless dragged. */
  reducedMotion: boolean
  /** Drag to rotate, scroll to zoom. Off on touch screens so the page still scrolls. */
  interactive: boolean
  /** Called when the spacecraft enters or leaves the planet's shadow (orbit mode). */
  onShadow?: (inShadow: boolean) => void
}

export interface World {
  setSpec(spec: SceneSpec): void
  setMode(mode: ViewMode): void
  /** Cruise mode: 0–1 along the transfer. null: the craft loops along it on its own. */
  setProgress(progress: number | null): void
  dispose(): void
}

const SUN = new THREE.Vector3(1, 0.35, 0.55).normalize()
const ATMOSPHERE_R = 1.06
const BODY_INDEX: Record<Body, number> = { earth: 0, moon: 1, mars: 2 }
const ATMOSPHERE: Record<Body, THREE.Color | null> = { earth: new THREE.Color(0.28, 0.55, 1.0), mars: new THREE.Color(0.85, 0.48, 0.3), moon: null }
const SPIN_S: Record<Body, number> = { earth: 80, moon: 400, mars: 90 }
const CRAFT_SIZE: Record<ViewMode, number> = { spacecraft: 0.05, orbit: 0.04, cruise: 0.08 }
const CRUISE_LOOP_S = 18

function spriteTexture(draw: (g: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
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

export function createWorld(container: HTMLElement, initial: SceneSpec, options: WorldOptions): World {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000002)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = environment
  scene.environmentIntensity = 0.3

  const camera = new THREE.PerspectiveCamera(38, 1, 0.002, 3000)

  // Lights only reach the spacecraft; the planet shades itself from uSun.
  const sunLight = new THREE.DirectionalLight(0xfff2e0, 2.6)
  sunLight.position.copy(SUN).multiplyScalar(10)
  const earthshine = new THREE.DirectionalLight(0x6d90d0, 0.6)
  scene.add(sunLight, earthshine, earthshine.target, new THREE.AmbientLight(0x3a4560, 0.12))

  scene.add(makeStars())
  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: spriteTexture((g, s) => {
        const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
        grad.addColorStop(0, 'rgba(255,255,255,1)')
        grad.addColorStop(0.12, 'rgba(255,244,214,1)')
        grad.addColorStop(0.35, 'rgba(255,200,120,0.35)')
        grad.addColorStop(1, 'rgba(255,170,80,0)')
        g.fillStyle = grad
        g.fillRect(0, 0, s, s)
      }),
      color: new THREE.Color(3, 2.8, 2.5),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  sun.position.copy(SUN).multiplyScalar(800)
  sun.scale.setScalar(110)
  scene.add(sun)

  // Planet, clouds, atmosphere.
  const uSun = { value: SUN.clone() }
  const uTime = { value: 0 }
  const uBody = { value: 0 }
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody } }))
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 128, 96),
    new THREE.ShaderMaterial({ ...cloudShader, uniforms: { uSun, uTime }, transparent: true, depthWrite: false }),
  )
  const uAtmo = { value: new THREE.Color() }
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(ATMOSPHERE_R, 96, 64),
    new THREE.ShaderMaterial({
      ...atmosphereShader,
      uniforms: { uSun, uColor: uAtmo, uThickness: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_R * ATMOSPHERE_R)) } },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  // The globe tilts in close-up mode so mid-latitudes, not the polar ice, turn under the craft.
  const globe = new THREE.Group()
  globe.add(planet, clouds)
  scene.add(globe, atmosphere)

  // Cruise mode: Earth behind us and the transfer arc to the destination (the globe above).
  const home = new THREE.Mesh(planet.geometry, new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody: { value: 0 } } }))
  const arc = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({ color: 0xbcd2ff, dashSize: 0.22, gapSize: 0.12, transparent: true, opacity: 0.95, depthWrite: false }),
  )
  scene.add(home, arc)

  // The rest of the sky, to scale (sky.ts): the Moon from Earth orbit, Earth from lunar orbit, Phobos and Deimos at Mars.
  // It hangs off the globe so it tilts with the planet in the close-up.
  const sky = new THREE.Group()
  globe.add(sky)
  // Phobos and Deimos are dark, lumpy rocks. Phobos carries Stickney, a crater almost half its own width.
  const rockGeometry = new THREE.SphereGeometry(1, 32, 20)
  const rockAt = rockGeometry.getAttribute('position')
  const stickney = new THREE.Vector3(0.5, 0.25, 0.83).normalize()
  for (let i = 0, v = new THREE.Vector3(); i < rockAt.count; i++) {
    v.fromBufferAttribute(rockAt, i)
    const lumps = 0.09 * Math.sin(3.1 * v.x + 1.3) * Math.sin(2.7 * v.y + 0.4) + 0.05 * Math.sin(7 * v.x + 5 * v.y + 3 * v.z)
    v.multiplyScalar(1 + lumps - 0.2 * THREE.MathUtils.smoothstep(v.dot(stickney), 0.78, 0.97))
    rockAt.setXYZ(i, v.x, v.y, v.z)
  }
  rockGeometry.computeVertexNormals()
  const rockMaterial = new THREE.ShaderMaterial({
    uniforms: { uSun },
    vertexShader: 'varying vec3 vN; void main() { vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // Both moons reflect about 7% of the sunlight that reaches them: among the darkest bodies in the solar system.
    fragmentShader: 'uniform vec3 uSun; varying vec3 vN; void main() { gl_FragColor = vec4(vec3(0.34, 0.31, 0.29) * max(dot(normalize(vN), uSun), 0.0), 1.0); }',
  })
  const companions = (Object.entries(COMPANIONS) as [Body, Companion[]][]).flatMap(([around, list]) =>
    list.map((c) => {
      const material = c.look === 'rock' ? rockMaterial : new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody: { value: BODY_INDEX[c.look] } } })
      const mesh = new THREE.Mesh(c.look === 'rock' ? rockGeometry : planet.geometry, material)
      mesh.scale.set(...c.size)
      sky.add(mesh)
      return { around, c, mesh }
    }),
  )
  const sunXYZ = SUN.toArray()
  function placeSky() {
    for (const { c, mesh } of companions) {
      if (!mesh.visible) continue
      mesh.position.set(...companionPosition(c, planet.rotation.y, sunXYZ))
      if (c.turnsPerSpin) mesh.rotation.y = planet.rotation.y * c.turnsPerSpin
      else mesh.lookAt(sky.getWorldPosition(pos)) // one face always towards the planet
    }
  }

  // Orbit ring, tilted by the inclination.
  const orbitPivot = new THREE.Group()
  const ringPoints: THREE.Vector3[] = []
  for (let i = 0; i < 256; i++) ringPoints.push(new THREE.Vector3(Math.cos((i / 256) * Math.PI * 2), 0, Math.sin((i / 256) * Math.PI * 2)))
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(ringPoints),
    new THREE.LineBasicMaterial({ color: 0x9dbcff, transparent: true, opacity: 0.55, depthWrite: false }),
  )
  orbitPivot.add(ring)
  scene.add(orbitPivot)

  // Spacecraft + a ring marker so it can be found in the wide orbit view.
  const holder = new THREE.Group()
  scene.add(holder)
  let craft: THREE.Object3D | null = null
  const marker = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: spriteTexture((g, s) => {
        g.strokeStyle = 'rgba(255,255,255,0.95)'
        g.lineWidth = 6
        g.beginPath()
        g.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2)
        g.stroke()
      }),
      color: 0xffd47a,
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    }),
  )
  marker.renderOrder = 10
  scene.add(marker)

  // Post-processing: bloom on the Sun, ocean glint and atmosphere.
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.4, 1.05)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.enabled = options.interactive
  // OrbitControls always sets touch-action: none; give touch scrolling back when dragging is off.
  if (!options.interactive) renderer.domElement.style.touchAction = 'auto'
  controls.autoRotate = !options.reducedMotion
  const motion = options.reducedMotion ? 0 : 1

  let spec = initial
  let mode = options.mode
  let radius = orbitRadius(spec)
  let angle = 0.6
  let inShadow: boolean | null = null
  let progress: number | null = null
  let looped = 0.5
  // What is drawn: cruise needs somewhere to go, so an Earth orbit falls back to the orbit view.
  let shown: ViewMode = mode

  // Close-up: the craft hangs nearer the planet than the squashed orbit ring, so the horizon is in
  // frame; higher orbits still show a smaller planet.
  const closeRadius = () => 1 + 0.25 * (radius - 1)

  function craftPosition(out: THREE.Vector3): THREE.Vector3 {
    if (shown === 'spacecraft') return out.set(0, closeRadius(), 0)
    if (shown === 'cruise' && spec.body !== 'earth') return out.set(...transferPoint(spec.body, progress ?? looped))
    return out.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyEuler(orbitPivot.rotation)
  }

  function applySpec(next: SceneSpec) {
    spec = next
    radius = orbitRadius(spec)
    uBody.value = BODY_INDEX[spec.body]
    clouds.visible = spec.body === 'earth'
    for (const { around, mesh } of companions) mesh.visible = around === spec.body
    const air = ATMOSPHERE[spec.body]
    atmosphere.visible = !!air
    if (air) uAtmo.value.copy(air)
    orbitPivot.rotation.set(spec.inclination_rad, 0, 0)
    ring.scale.setScalar(radius)
    if (craft) {
      holder.remove(craft)
      disposeObject(craft)
    }
    craft = buildCraft(spec.craft)
    holder.add(craft)
    applyMode()
  }

  function applyMode() {
    shown = mode === 'cruise' && spec.body === 'earth' ? 'orbit' : mode
    holder.scale.setScalar(CRAFT_SIZE[shown])
    globe.rotation.x = shown === 'spacecraft' ? 1.1 : 0
    ring.visible = shown === 'orbit'
    marker.visible = shown !== 'spacecraft'
    home.visible = arc.visible = shown === 'cruise'
    sky.visible = shown !== 'cruise' // cruise is a diagram, not to scale
    const target = shown === 'spacecraft' ? new THREE.Vector3(0, closeRadius(), 0) : new THREE.Vector3()
    if (shown === 'cruise' && spec.body !== 'earth') {
      const { earthRadius, distance } = cruiseLayout(spec.body)
      home.position.set(-distance, 0, 0)
      home.scale.setScalar(earthRadius)
      arc.geometry.dispose()
      arc.geometry = new THREE.BufferGeometry().setFromPoints(transferArc(spec.body).map(([x, y, z]) => new THREE.Vector3(x, y, z)))
      arc.computeLineDistances()
      // Centre on the whole scene, from Earth's far edge to the destination's.
      target.set((1 - distance - earthRadius) / 2, 0, 0)
    }
    controls.target.copy(target)
    if (shown === 'cruise') {
      const { earthRadius, distance } = cruiseLayout(spec.body as Exclude<Body, 'earth'>)
      const halfWidth = (distance + earthRadius + 1) / 2
      camera.position.copy(target).add(new THREE.Vector3(-0.1, 0.8, 1).setLength(3.3 * halfWidth))
      controls.minDistance = 2
      controls.maxDistance = 80
      controls.autoRotateSpeed = 0.15
    } else if (shown === 'spacecraft') {
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

  const pos = new THREE.Vector3()
  const up = new THREE.Vector3()
  const toSun = new THREE.Vector3()
  const side = new THREE.Vector3()
  const basis = new THREE.Matrix4()

  function placeCraft() {
    craftPosition(pos)
    holder.position.copy(pos)
    up.copy(pos).normalize()
    // Wings face the Sun as well as they can while the instruments look straight down.
    toSun.copy(SUN).addScaledVector(up, -SUN.dot(up))
    if (toSun.lengthSq() < 1e-6) toSun.set(0, 0, 1).addScaledVector(up, -up.z)
    toSun.normalize()
    side.crossVectors(up, toSun)
    holder.quaternion.setFromRotationMatrix(basis.makeBasis(side, up, toSun))
    earthshine.position.copy(pos).addScaledVector(up, -1)
    earthshine.target.position.copy(pos)

    const along = pos.dot(SUN)
    // The shadow test assumes the planet at the origin with the craft near it; in cruise it is in sunlight.
    const shadow = shown !== 'cruise' && along < 0 && pos.clone().addScaledVector(SUN, -along).length() < 1
    sunLight.intensity = shadow ? 0 : 2.6
    earthshine.intensity = shadow ? 0.04 : spec.body === 'earth' ? 0.6 : 0.25
    marker.position.copy(pos)
    marker.scale.setScalar(camera.position.distanceTo(pos) * 0.05)
    marker.material.color.set(shadow ? 0x9aa6c4 : 0xffd47a)
    if (shadow !== inShadow) {
      inShadow = shadow
      options.onShadow?.(shadow)
    }
  }

  let last = performance.now()
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    uTime.value += dt
    planet.rotation.y += ((dt * Math.PI * 2) / SPIN_S[spec.body]) * motion
    clouds.rotation.y += ((dt * Math.PI * 2) / (SPIN_S[spec.body] * 0.85)) * motion
    if (shown === 'cruise') {
      home.rotation.y += ((dt * Math.PI * 2) / SPIN_S.earth) * motion
      looped = (looped + (dt / CRUISE_LOOP_S) * motion) % 1
    }
    if (shown === 'orbit') angle += ((dt * Math.PI * 2) / lapSeconds(spec.period_s)) * motion
    placeCraft()
    placeSky()
    controls.update(dt)
    composer.render(dt)
  }

  function resize() {
    const w = Math.max(container.clientWidth, 1)
    const h = Math.max(container.clientHeight, 1)
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h
    // Keep the craft's wings in frame in tall, narrow views.
    camera.fov = Math.min(70, 38 * Math.max(1, 1.3 / camera.aspect))
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  // Only render while on screen.
  const visibility = new IntersectionObserver(([entry]) => {
    last = performance.now()
    renderer.setAnimationLoop(entry?.isIntersecting ? frame : null)
  })
  visibility.observe(container)

  applySpec(initial)
  placeCraft()
  placeSky()
  composer.render()

  return {
    setSpec: applySpec,
    setMode(next) {
      if (next === mode) return
      mode = next
      applyMode()
    },
    setProgress(next) {
      progress = next === null ? null : Math.min(1, Math.max(0, next))
    },
    dispose() {
      renderer.setAnimationLoop(null)
      visibility.disconnect()
      resizeObserver.disconnect()
      controls.dispose()
      disposeObject(scene)
      environment.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
