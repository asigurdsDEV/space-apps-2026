// The three.js scene behind <FlightView>: the planet (radius 1 at the origin, as in ../world.ts), the
// player's craft flown by ./model, the training targets and a chase camera. Imperative like ../world.ts:
// created once, read through `input()` every frame, torn down with dispose().
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import type { HudFocus } from '../../flight-hud/model'
import type { PilotIntent } from '../../pilot-input/model'
import { buildCraft, disposeObject } from '../craft'
import { makeStars } from '../launch/fx'
import { planetMaps } from '../maps'
import { steadyResolution } from '../steady'
import { BODY_RADIUS_M, type Body, type CraftSpec } from '../model'
import { atmosphereShader, cloudShader, planetShader } from '../shaders'
import { chase, groundLatLon, nextFocus, SPOTS, startPose, stepPose, type FlightTarget, type Vec3 } from './model'

export interface FlightSceneOptions {
  body: Body
  craft: CraftSpec
  targets: readonly FlightTarget[]
  /** No cloud drift, no spinning targets and no camera lag: only the player's own flying moves the view. */
  reducedMotion: boolean
  /** Read every frame: the latest intent, whether a scan is held (E or the HUD button) and the finished target ids. */
  input: () => { intent: PilotIntent; scanning: boolean; done: readonly string[] }
  /** The target in the crosshair. Called when it changes, and about ten times a second while its distance or hold time changes. */
  onFocus: (focus: HudFocus | null) => void
  /** Ground under the craft, in degrees. Called every frame while flying. */
  onGround?: (lat: number, lon: number) => void
  /** The browser took the WebGL context away. */
  onLost: () => void
}

export interface FlightScene {
  dispose(): void
}

// Same look as ../world.ts, which keeps these to itself.
const SUN = new THREE.Vector3(1, 0.35, 0.55).normalize()
const ATMOSPHERE_R = 1.06
const BODY_INDEX: Record<Body, number> = { earth: 0, moon: 1, mars: 2 }
const ATMOSPHERE: Record<Body, THREE.Color | null> = { earth: new THREE.Color(0.28, 0.55, 1.0), mars: new THREE.Color(0.4, 0.23, 0.14), moon: null }
const CRAFT_SIZE = 0.035
const Y = new THREE.Vector3(0, 1, 0)
/** How far (px) a name tag's middle stays from the view's top and bottom. The HUD's controls run along the bottom. */
const TAG_INSET = { top: 24, bottom: 100 }
const vec = (v: Vec3, out: THREE.Vector3) => out.set(v[0], v[1], v[2])

export function createFlightScene(container: HTMLElement, options: FlightSceneOptions): FlightScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
  renderer.domElement.addEventListener('webglcontextlost', options.onLost)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000002)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = environment
  scene.environmentIntensity = 0.5
  const camera = new THREE.PerspectiveCamera(50, 1, 0.002, 3000)

  // Lights only reach the craft and the targets; the planet shades itself from uSun.
  const sunLight = new THREE.DirectionalLight(0xfff2e0, 2.6)
  sunLight.position.copy(SUN).multiplyScalar(10)
  // Brighter fill than ../world.ts: the camera looks at the craft's shaded side, and it has to stay readable on the night side too.
  scene.add(sunLight, new THREE.AmbientLight(0x8fa4d0, 0.9))

  const stars = makeStars(900)
  stars.renderOrder = -9
  stars.frustumCulled = false
  scene.add(stars)

  const uSun = { value: SUN.clone() }
  const uTime = { value: 0 }
  // Real NASA maps (../maps), procedural until they load.
  const maps = planetMaps(renderer.capabilities.getMaxAnisotropy())
  scene.add(
    new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun, uBody: { value: BODY_INDEX[options.body] }, ...maps.maps[options.body] } })),
  )
  if (options.body === 'earth') {
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.012, 128, 96), new THREE.ShaderMaterial({ ...cloudShader, uniforms: { uSun, uTime, ...maps.maps.earth }, transparent: true, depthWrite: false })))
  }
  const air = ATMOSPHERE[options.body]
  if (air !== null) {
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(ATMOSPHERE_R, 96, 64),
        new THREE.ShaderMaterial({
          ...atmosphereShader,
          uniforms: { uSun, uColor: { value: air }, uThickness: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_R * ATMOSPHERE_R)) } },
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        }),
      ),
    )
  }

  const holder = new THREE.Group()
  holder.scale.setScalar(CRAFT_SIZE)
  holder.add(buildCraft(options.craft))
  scene.add(holder)

  // Each target: a plain beacon at its spot, swapped for the V3 model once that has loaded, and a name tag
  // that stays on screen (pinned to the edge when the target is out of view) so the player can always find it.
  let disposed = false
  const markers = options.targets.flatMap((target) => {
    const spot = SPOTS[target.id]
    if (!spot) return []
    const at = vec(spot.at, new THREE.Vector3())
    const group = new THREE.Group()
    group.position.copy(at)
    group.quaternion.setFromUnitVectors(Y, at.clone().normalize())
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(spot.size / 2), new THREE.MeshStandardMaterial({ color: 0xffd47a, emissive: 0xffa53a, emissiveIntensity: 0.6 }))
    group.add(beacon)
    scene.add(group)
    const tag = document.createElement('span')
    tag.className = 's3d-flight-tag'
    tag.textContent = target.label
    container.appendChild(tag)
    // `half`: half the tag's width plus a gap, so a pinned tag stays whole on a narrow screen.
    return [{ id: target.id, label: target.label, at, size: spot.size, group, beacon, tag, half: tag.offsetWidth / 2 + 8, done: false }]
  })
  // A model that fails to load (offline, a 404) just leaves its beacon in place.
  void import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    const loader = new GLTFLoader()
    for (const marker of markers) {
      // shortcut: the V3 pack names each file after its target id (public/visual-assets/flight/manifest.json); read the manifest if that stops being true.
      loader.load(`${import.meta.env.BASE_URL}visual-assets/flight/${marker.id}.glb`, (gltf) => {
        if (disposed) return disposeObject(gltf.scene)
        const radius = new THREE.Box3().setFromObject(gltf.scene).getBoundingSphere(new THREE.Sphere()).radius
        gltf.scene.scale.setScalar(marker.size / 2 / Math.max(radius, 1e-6))
        marker.group.remove(marker.beacon)
        disposeObject(marker.beacon)
        marker.group.add(gltf.scene)
      }, undefined, () => {})
    }
  }, () => {})

  // Post-processing as in ../world.ts: the shaders write linear colour and OutputPass does tone mapping and sRGB.
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  // Less bloom than there: the white storm marker fills much of a phone's view and its glow washed out the craft in front of it.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.15, 0.4, 1.05))
  composer.addPass(new OutputPass())

  const unit_m = BODY_RADIUS_M[options.body]
  let pose = startPose()
  let focus: HudFocus | null = null
  let sent: HudFocus | null | undefined
  let sentAt = 0
  let width = 1
  let height = 1

  const eye = new THREE.Vector3()
  const aim = new THREE.Vector3()
  const up = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const basis = new THREE.Matrix4()

  /** Puts the craft, the camera and the name tags where the pose says. `ease` 1 jumps the camera straight there. */
  function place(ease: number, done: readonly string[]) {
    vec(pose.pos, holder.position)
    vec(pose.heading, forward)
    up.copy(holder.position).normalize()
    // The craft's wings (±x) stick out sideways and its sun side (+z) faces the camera behind it.
    right.crossVectors(forward, up)
    holder.quaternion.setFromRotationMatrix(basis.makeBasis(right, up, forward.negate()))

    // A phone held upright is too narrow for the craft to sit beside the crosshair.
    const view = chase(pose, Math.min(1, camera.aspect / 1.6))
    eye.lerp(vec(view.eye, tmp), ease)
    aim.lerp(vec(view.aim, tmp), ease).normalize()
    camera.up.lerp(vec(view.up, tmp), ease).normalize()
    camera.position.copy(eye)
    camera.lookAt(tmp.copy(eye).add(aim))
    camera.updateMatrixWorld()

    for (const marker of markers) {
      // Pixels from the middle of the view, x right and y down.
      tmp.copy(marker.at).applyMatrix4(camera.matrixWorldInverse)
      const behind = tmp.z > 0
      let x = (tmp.x / camera.aspect) * width
      let y = -tmp.y * height
      if (!behind) {
        tmp.applyMatrix4(camera.projectionMatrix)
        x = (tmp.x * width) / 2
        y = (-tmp.y * height) / 2
      }
      // Out of view: pinned to the edge on the side the target is on, clear of the HUD's bottom strip.
      const limitX = width / 2 - marker.half
      const limitY = height / 2 - (y > 0 ? TAG_INSET.bottom : TAG_INSET.top)
      const off = behind || Math.abs(x) > limitX || Math.abs(y) > limitY
      if (off) {
        const k = Math.min(limitX / Math.max(Math.abs(x), 1e-6), limitY / Math.max(Math.abs(y), 1e-6))
        x *= k
        y *= k
      }
      // In view, the tag sits just above the target instead of on it.
      marker.tag.style.transform = `translate(${width / 2 + x}px, ${height / 2 + y}px) translate(-50%, ${off ? -50 : -190}%)`
      marker.tag.classList.toggle('is-off', off)
      const finished = done.includes(marker.id)
      if (finished !== marker.done) {
        marker.done = finished
        marker.tag.classList.toggle('is-done', finished)
        marker.tag.textContent = finished ? `✓ ${marker.label}` : marker.label
        marker.half = marker.tag.offsetWidth / 2 + 8
      }
    }
  }

  /** The hold on this target has run its full `hold_s`. */
  const full = (f: HudFocus | null | undefined) => !!f && f.held_s >= (options.targets.find((t) => t.id === f.id)?.hold_s ?? Infinity)

  /** Tells the HUD about the focus: at once when the target, range or scan state changes, else at most ten times a second. */
  function report(now: number) {
    const was = sent
    const changed =
      was === undefined || focus?.id !== was?.id || focus?.inRange !== was?.inRange || (focus?.held_s ?? 0) > 0 !== (was?.held_s ?? 0) > 0 || full(focus) !== full(was)
    const moved = focus !== null && (focus.distance_m !== was?.distance_m || focus.held_s !== was?.held_s)
    if (!changed && !(moved && now - sentAt >= 100)) return
    sent = focus
    sentAt = now
    container.dataset.aim = focus ? (focus.inRange ? 'range' : 'far') : 'none'
    options.onFocus(focus)
  }

  // Frames come from requestAnimationFrame, so a hidden tab pauses the flight by itself; dt is capped for the frame after it comes back.
  let last = performance.now()
  // Slower graphics chips get fewer pixels, not fewer frames (steady.ts).
  const steady = steadyResolution((ratio) => {
    renderer.setPixelRatio(ratio)
    composer.setPixelRatio(ratio)
  }, renderer.getPixelRatio())
  function frame(now: number) {
    steady((now - last) / 1000)
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    const { intent, scanning, done } = options.input()
    pose = stepPose(pose, intent, dt)
    const ground = groundLatLon(pose.pos)
    options.onGround?.(ground.lat, ground.lon)
    focus = nextFocus(focus, pose, options.targets, done, intent.interact || scanning, dt, unit_m)
    report(now)
    if (!options.reducedMotion) {
      uTime.value += dt
      for (const marker of markers) marker.group.rotateY(dt * 0.5)
    }
    place(options.reducedMotion ? 1 : 1 - Math.exp(-dt * 10), done)
    composer.render(dt)
  }

  function resize() {
    width = Math.max(container.clientWidth, 1)
    height = Math.max(container.clientHeight, 1)
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
    camera.aspect = width / height
    // Keep the craft's wings in frame in tall, narrow views.
    camera.fov = Math.min(75, 50 * Math.max(1, 1.2 / camera.aspect))
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

  place(1, options.input().done)
  composer.render()

  return {
    dispose() {
      disposed = true
      renderer.setAnimationLoop(null)
      visibility.disconnect()
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', options.onLost)
      for (const marker of markers) marker.tag.remove()
      delete container.dataset.aim
      disposeObject(scene)
      environment.dispose()
      maps.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
