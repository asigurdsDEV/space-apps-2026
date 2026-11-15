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
import { planetMaps } from './maps'
import { steadyResolution } from './steady'
import { atmosphereShader, auroraShader, cloudShader, planetShader, starShader } from './shaders'
import { brightStars, COMPANIONS, companionPosition, milkyWay, skyDirection, skyTurn, type Companion } from './sky'
import { earthOrientation, sunDirection, uprightSun } from './sun'

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
  /** Drawn as a page background: the craft laps 3 times slower and has no locator ring. */
  backdrop?: boolean
  /** Called when the spacecraft is clicked or tapped (orbit mode). The pointer turns into a hand over it. */
  onCraftClick?: () => void
  /** The moment the Earth's day and night are drawn for. Left out: now. */
  date?: number | Date
}

export interface World {
  setSpec(spec: SceneSpec): void
  setMode(mode: ViewMode): void
  /** Cruise mode: 0–1 along the transfer. null: the craft loops along it on its own. */
  setProgress(progress: number | null): void
  /** The aurora: 0 none, up to 1 for the strongest geomagnetic storm (model.ts `stormGlow`). Earth only. */
  setStorm(glow: number): void
  dispose(): void
}

// The studio Sun: the Moon, Mars and the close-up are lit from here. An upright Earth moves it to its real height (applyMode).
const SUN = new THREE.Vector3(1, 0.35, 0.55).normalize()
const Y = new THREE.Vector3(0, 1, 0)
const ATMOSPHERE_R = 1.06
const BODY_INDEX: Record<Body, number> = { earth: 0, moon: 1, mars: 2 }
const ATMOSPHERE: Record<Body, THREE.Color | null> = { earth: new THREE.Color(0.28, 0.55, 1.0), mars: new THREE.Color(0.4, 0.23, 0.14), moon: null }
// Seconds per turn. The Earth keeps the real clock (one turn against the Sun a day), so its lit side stays true; the others are time-lapses.
const SPIN_S: Record<Body, number> = { earth: 86_400, moon: 400, mars: 90 }
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

// Star colours by spectral class, hot to cool.
const STAR_TINT: Record<string, [number, number, number]> = { O: [0.62, 0.72, 1], B: [0.7, 0.8, 1], A: [0.87, 0.91, 1], F: [1, 0.97, 0.9], G: [1, 0.91, 0.76], K: [1, 0.8, 0.56], M: [1, 0.66, 0.44] }
const FAINT_KINDS = 'BBAAAFFGGKKKM' // about how the faint naked-eye stars divide

/** The real sky, in sky.ts's frame: the bright stars where they are, fainter ones filled in, and the Milky Way's band. Two draws. */
function makeSky(uPixels: { value: number }): THREE.Group {
  const real = brightStars()
  const n = real.length + 2200
  const pos = new Float32Array(n * 3)
  const tint = new Float32Array(n * 3)
  const size = new Float32Array(n)
  let seed = 42
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const put = (i: number, dir: [number, number, number], mag: number, kind: string) => {
    pos.set([dir[0] * 900, dir[1] * 900, dir[2] * 900], i * 3)
    // Five magnitudes are a hundred times the light. A screen cannot span that, so brightness is squeezed and the brightest stars also grow.
    const light = 0.17 * 10 ** (-0.17 * (mag - 6))
    tint.set(STAR_TINT[kind]!.map((c) => c * light), i * 3)
    size[i] = 1.7 + 0.7 * Math.max(0, 4 - mag)
  }
  real.forEach((star, i) => put(i, skyDirection(star.ra_h, star.dec_deg), star.mag, star.kind))
  for (let i = real.length; i < n; ) {
    const u = rnd() * 2 - 1
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    const dir: [number, number, number] = [Math.cos(a) * r, u, Math.sin(a) * r]
    if (rnd() > 0.35 + 0.65 * milkyWay(dir)) continue // faint stars crowd toward the Milky Way
    // Fainter than the real table (3.6 to 6.2), and each magnitude down has about three times as many stars.
    put(i++, dir, 3.6 + 2 * Math.log10(1 + rnd() * 19), FAINT_KINDS[Math.floor(rnd() * FAINT_KINDS.length)]!)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1))
  const stars = new THREE.Points(geo, new THREE.ShaderMaterial({ ...starShader, uniforms: { uPixels }, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))

  // The Milky Way as a small map of the whole sky (sky.ts), wrapped on a sphere behind the stars.
  const w = 512
  const h = 256
  const glow = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = 255 * milkyWay(skyDirection(((x + 0.5) / w - 0.5) * 24, ((y + 0.5) / h - 0.5) * 180))
      glow.set([v, v, v, 255], (y * w + x) * 4)
    }
  }
  const map = new THREE.DataTexture(glow, w, h)
  map.wrapS = THREE.RepeatWrapping
  map.magFilter = map.minFilter = THREE.LinearFilter
  map.needsUpdate = true
  const band = new THREE.Mesh(
    new THREE.SphereGeometry(950, 48, 24),
    new THREE.MeshBasicMaterial({ map, color: new THREE.Color(0.021, 0.024, 0.03), side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
  )
  band.renderOrder = stars.renderOrder = -1 // behind everything else that is see-through
  const sky = new THREE.Group()
  sky.add(band, stars)
  return sky
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
  const earthshine = new THREE.DirectionalLight(0x6d90d0, 0.6)
  scene.add(sunLight, earthshine, earthshine.target, new THREE.AmbientLight(0x3a4560, 0.12))

  const uPixels = { value: renderer.getPixelRatio() }
  const stars = makeSky(uPixels)
  scene.add(stars)
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
  sun.scale.setScalar(110)
  scene.add(sun)

  // Real day and night (sun.ts): every Earth here is turned so the place where it is noon at `date` faces the Sun, then spins on
  // from there about its own axis. The shaders light in world space, so ground, city lights, clouds and air all agree.
  const sunXYZ = SUN.toArray()
  const asked = new Date(options.date ?? Date.now())
  // An unreadable date would make the Sun NaN, and a NaN Sun sprite blacks out the whole frame through the bloom: show now instead.
  const when = Number.isNaN(+asked) ? new Date() : asked
  const sunInMap = sunDirection(when)
  // An Earth that is not the main body (behind the craft in cruise, in the Moon's sky) is lit by the studio Sun, so its pole leans.
  const earthStudio = new THREE.Quaternion().fromArray(earthOrientation(sunInMap, sunXYZ))
  const sunForUpright = new THREE.Vector3(...uprightSun(sunInMap, sunXYZ))
  // The stars are fixed to the same moment: turned about the pole until the Sun's real place among them is over the map's Sun.
  const starsInMap = new THREE.Quaternion().setFromAxisAngle(Y, skyTurn(when, sunInMap))
  const earthInSky = new THREE.Quaternion() // the same, seen from inside the tipped globe group

  // Planet, clouds, atmosphere.
  const uSun = { value: SUN.clone() }
  const sunNow = uSun.value // this scene's Sun: the shaders, the light, the sprite and the shadow test all read it
  const uTime = { value: 0 }
  const uBody = { value: 0 }
  // Real NASA maps (maps/README.md), one shared set of uniforms per body; procedural until they load.
  const bodyMaps = planetMaps(renderer.capabilities.getMaxAnisotropy())
  const uSunset = { value: 0 } // 1 on the Earth: the orange day/night line and the sunset arc at the limb
  const planetMaterial = new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody, uSunset, ...bodyMaps.maps.earth } })
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), planetMaterial)
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 128, 96),
    new THREE.ShaderMaterial({ ...cloudShader, uniforms: { uSun, uTime, ...bodyMaps.maps.earth }, transparent: true, depthWrite: false }),
  )
  const uAtmo = { value: new THREE.Color() }
  const uThickness = { value: Math.sqrt(1 - 1 / (ATMOSPHERE_R * ATMOSPHERE_R)) }
  const airMaterial = (uColor: { value: THREE.Color }, sunset: { value: number }) =>
    new THREE.ShaderMaterial({ ...atmosphereShader, uniforms: { uSun, uColor, uThickness, uSunset: sunset }, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(ATMOSPHERE_R, 96, 64), airMaterial(uAtmo, uSunset))
  // The aurora of a geomagnetic storm (setStorm): one more draw, and only while a storm is on. It turns with the ground.
  const uStorm = { value: 0 }
  const uRipple = { value: 0 }
  const aurora = new THREE.Mesh(
    new THREE.SphereGeometry(1.055, 96, 64),
    // Both faces in one pass: the far side shows past the limb, and adding light needs no back-to-front order.
    new THREE.ShaderMaterial({ ...auroraShader, uniforms: { uSun, uStorm, uRipple }, side: THREE.DoubleSide, forceSinglePass: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
  )
  aurora.visible = false
  planet.add(aurora)
  const globe = new THREE.Group()
  globe.add(planet, clouds)
  scene.add(globe, atmosphere)

  // Cruise mode: Earth behind us and the transfer arc to the destination (the globe above).
  const home = new THREE.Mesh(planet.geometry, new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody: { value: 0 }, uSunset: { value: 1 }, ...bodyMaps.maps.earth } }))
  const homeAxis = new THREE.Group() // holds the real tilt; `home` spins inside it
  homeAxis.quaternion.copy(earthStudio)
  homeAxis.add(home)
  // The same clouds and air as the main Earth: its geometry, cloud material and shader, so two more draws and nothing new to load.
  home.add(new THREE.Mesh(clouds.geometry, clouds.material), new THREE.Mesh(atmosphere.geometry, airMaterial({ value: ATMOSPHERE.earth! }, { value: 1 })))
  const arc = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({ color: 0xbcd2ff, dashSize: 0.22, gapSize: 0.12, transparent: true, opacity: 0.95, depthWrite: false }),
  )
  scene.add(homeAxis, arc)

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
      const material = c.look === 'rock' ? rockMaterial : new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody: { value: BODY_INDEX[c.look] }, ...bodyMaps.maps[c.look] } })
      const mesh = new THREE.Mesh(c.look === 'rock' ? rockGeometry : planet.geometry, material)
      mesh.scale.set(...c.size)
      sky.add(mesh)
      return { around, c, mesh }
    }),
  )
  function placeSky() {
    // The sky hangs off the globe, and in the Earth's own frame the Sun stands at sunInMap.
    const sun = spec.body === 'earth' ? sunInMap : sunXYZ
    for (const { c, mesh } of companions) {
      if (!mesh.visible) continue
      mesh.position.set(...companionPosition(c, planet.rotation.y, sun))
      // Only the Earth (from lunar orbit) turns on its own axis.
      if (c.turnsPerSpin) mesh.quaternion.setFromAxisAngle(Y, planet.rotation.y * c.turnsPerSpin).premultiply(earthInSky)
      else {
        mesh.lookAt(0, 0, 0) // one face always towards the planet, which sits at the origin (and `pos` stays the craft's, for the click test)
        if (c.look !== 'rock') mesh.rotateY(-Math.PI / 2) // lookAt aims +z; a mapped body's near side (longitude 0) is +x
      }
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
  // A backdrop never drags or zooms, so the page under the cursor still scrolls.
  controls.enabled = options.interactive && !options.backdrop
  // OrbitControls always sets touch-action: none; give touch scrolling back when dragging is off.
  if (!controls.enabled) renderer.domElement.style.touchAction = 'auto'
  controls.autoRotate = !options.reducedMotion
  const motion = options.reducedMotion ? 0 : 1

  let spec = initial
  let mode = options.mode
  /** The camera is placed once per view. Later spec updates (a new sim day copies params) must not snap it back. */
  let framed = false
  let radius = orbitRadius(spec)
  let angle = 0.6
  let inShadow: boolean | null = null
  let progress: number | null = null
  let looped = 0.5
  let storm = 0
  // What is drawn: cruise needs somewhere to go, so an Earth orbit falls back to the orbit view.
  let shown: ViewMode = mode

  // Close-up: the craft hangs nearer the planet than the squashed orbit ring, so the horizon is in
  // frame; higher orbits still show a smaller planet.
  const closeRadius = () => 1 + 0.25 * (radius - 1)

  function craftPosition(out: THREE.Vector3): THREE.Vector3 {
    if (shown === 'spacecraft') return out.set(0, closeRadius(), 0)
    if (shown === 'cruise' && spec.body !== 'earth') return out.set(...transferPoint(spec.body, progress ?? looped))
    return out.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyQuaternion(orbitPivot.quaternion)
  }

  function applySpec(next: SceneSpec) {
    spec = next
    radius = orbitRadius(spec)
    uBody.value = BODY_INDEX[spec.body]
    uSunset.value = spec.body === 'earth' ? 1 : 0
    Object.assign(planetMaterial.uniforms, bodyMaps.maps[spec.body])
    clouds.visible = spec.body === 'earth'
    for (const { around, mesh } of companions) mesh.visible = around === spec.body
    const air = ATMOSPHERE[spec.body]
    atmosphere.visible = !!air
    if (air) uAtmo.value.copy(air)
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
    const next = mode === 'cruise' && spec.body === 'earth' ? 'orbit' : mode
    const reframe = !framed || next !== shown
    shown = next
    holder.scale.setScalar(CRAFT_SIZE[shown])
    // The close-up tips the pole toward the camera so mid-latitudes, not the polar ice, turn under the craft.
    const tip = shown === 'spacecraft' ? 1.1 : 0
    // Upright pole needs the Sun at its real height; not in the close-up, whose craft sits on top of the scene, in night when that Sun is low.
    sunNow.copy(spec.body === 'earth' && shown === 'orbit' ? sunForUpright : SUN)
    sunLight.position.copy(sunNow).multiplyScalar(10)
    sun.position.copy(sunNow).multiplyScalar(800)
    if (spec.body === 'earth') globe.quaternion.fromArray(earthOrientation(sunInMap, sunNow.toArray(), [0, Math.cos(tip), Math.sin(tip)]))
    else globe.rotation.set(tip, 0, 0)
    earthInSky.copy(globe.quaternion).invert().multiply(earthStudio)
    // The celestial pole lies along the Earth's: the one on screen, or from the Moon and Mars the one the Earth in their sky has.
    stars.quaternion.copy(spec.body === 'earth' ? globe.quaternion : earthStudio).multiply(starsInMap)
    // Inclination is measured from the equator, so the orbit leans with the globe.
    orbitPivot.rotation.set(spec.inclination_rad, 0, 0)
    orbitPivot.quaternion.premultiply(globe.quaternion)
    ring.visible = shown === 'orbit'
    marker.visible = shown !== 'spacecraft' && !options.backdrop
    home.visible = arc.visible = shown === 'cruise'
    sky.visible = shown !== 'cruise' // cruise is a diagram, not to scale
    const target = shown === 'spacecraft' ? new THREE.Vector3(0, closeRadius(), 0) : new THREE.Vector3()
    if (shown === 'cruise' && spec.body !== 'earth') {
      const { earthRadius, distance } = cruiseLayout(spec.body)
      homeAxis.position.set(-distance, 0, 0)
      homeAxis.scale.setScalar(earthRadius)
      arc.geometry.dispose()
      arc.geometry = new THREE.BufferGeometry().setFromPoints(transferArc(spec.body).map(([x, y, z]) => new THREE.Vector3(x, y, z)))
      arc.computeLineDistances()
      // Centre on the whole scene, from Earth's far edge to the destination's.
      target.set((1 - distance - earthRadius) / 2, 0, 0)
    }
    controls.target.copy(target)
    if (shown === 'cruise') {
      controls.minDistance = 2
      controls.maxDistance = 80
      controls.autoRotateSpeed = 0.15
      if (reframe) {
        const { earthRadius, distance } = cruiseLayout(spec.body as Exclude<Body, 'earth'>)
        const halfWidth = (distance + earthRadius + 1) / 2
        camera.position.copy(target).add(new THREE.Vector3(-0.1, 0.8, 1).setLength(3.3 * halfWidth))
      }
    } else if (shown === 'spacecraft') {
      controls.minDistance = 0.07
      controls.maxDistance = 0.9
      controls.autoRotateSpeed = 0.7
      if (reframe) camera.position.copy(target).add(new THREE.Vector3(0.11, 0.045, 0.16))
    } else {
      controls.minDistance = 1.4
      controls.maxDistance = 16
      controls.autoRotateSpeed = 0.35
      if (reframe) {
        const dist = Math.max(3.6, radius * 2.8)
        // Side-on to the Sun, so the day/night line and city lights show.
        camera.position.set(-0.25, 0.38, 1).normalize().multiplyScalar(dist)
      }
    }
    framed = true
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
    toSun.copy(sunNow).addScaledVector(up, -sunNow.dot(up))
    if (toSun.lengthSq() < 1e-6) toSun.set(0, 0, 1).addScaledVector(up, -up.z)
    toSun.normalize()
    side.crossVectors(up, toSun)
    holder.quaternion.setFromRotationMatrix(basis.makeBasis(side, up, toSun))
    earthshine.position.copy(pos).addScaledVector(up, -1)
    earthshine.target.position.copy(pos)

    const along = pos.dot(sunNow)
    // The shadow test assumes the planet at the origin with the craft near it; in cruise it is in sunlight.
    const shadow = shown !== 'cruise' && along < 0 && side.copy(pos).addScaledVector(sunNow, -along).length() < 1 // `side` is free again here: no new vector each frame
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

  // The craft is a few pixels wide, so anything within HIT_PX of it on screen counts, unless the planet hides it.
  const HIT_PX = 36
  const onScreen = new THREE.Vector3()
  function overCraft(event: MouseEvent): boolean {
    if (shown !== 'orbit') return false
    const toCraft = pos.clone().sub(camera.position)
    const t = -camera.position.dot(toCraft) / toCraft.lengthSq() // closest approach of the sight line to the planet's centre
    if (t > 0 && t < 1 && camera.position.clone().addScaledVector(toCraft, t).length() < 1) return false
    onScreen.copy(pos).project(camera)
    const box = renderer.domElement.getBoundingClientRect()
    const x = box.left + ((onScreen.x + 1) / 2) * box.width
    const y = box.top + ((1 - onScreen.y) / 2) * box.height
    return Math.hypot(event.clientX - x, event.clientY - y) < HIT_PX
  }
  const craftClick = options.onCraftClick
  const hover = (event: PointerEvent) => { renderer.domElement.style.cursor = overCraft(event) ? 'pointer' : '' }
  const click = (event: MouseEvent) => { if (overCraft(event)) craftClick?.() }
  if (craftClick) {
    renderer.domElement.addEventListener('pointermove', hover)
    renderer.domElement.addEventListener('click', click)
  }

  // Slower graphics chips get fewer pixels, not fewer frames (steady.ts).
  const steady = steadyResolution((ratio) => {
    renderer.setPixelRatio(ratio)
    composer.setPixelRatio(ratio)
    uPixels.value = ratio
  }, renderer.getPixelRatio())
  let last = performance.now()
  function frame(now: number) {
    steady((now - last) / 1000)
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    uTime.value += dt
    // The aurora fades in and out over a few seconds and ripples slowly; with reduced motion it holds still.
    uStorm.value += (storm - uStorm.value) * Math.min(1, dt / 1.5)
    aurora.visible = spec.body === 'earth' && uStorm.value > 0.004
    uRipple.value += dt * motion
    planet.rotation.y += ((dt * Math.PI * 2) / SPIN_S[spec.body]) * motion
    clouds.rotation.y += ((dt * Math.PI * 2) / (SPIN_S[spec.body] * 0.85)) * motion
    if (shown === 'cruise') {
      home.rotation.y += ((dt * Math.PI * 2) / SPIN_S.earth) * motion
      looped = (looped + (dt / CRUISE_LOOP_S) * motion) % 1
    }
    if (shown === 'orbit') angle += ((dt * Math.PI * 2) / lapSeconds(spec.period_s)) * motion * (options.backdrop ? 1 / 3 : 1)
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
    setStorm(glow) {
      storm = Math.min(1, Math.max(0, glow))
    },
    dispose() {
      renderer.domElement.removeEventListener('pointermove', hover)
      renderer.domElement.removeEventListener('click', click)
      renderer.setAnimationLoop(null)
      visibility.disconnect()
      resizeObserver.disconnect()
      controls.dispose()
      disposeObject(scene)
      environment.dispose()
      bodyMaps.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
