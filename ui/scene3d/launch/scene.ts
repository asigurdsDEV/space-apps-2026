// The three.js scene behind <LaunchView>. Every frame is a pure function of screen time, so the
// sequence can be frozen at any second (the preview page, still frames for reduced motion).
// Units are meters. Low shots happen over a flat ground plane; high shots over the round planet,
// with the rocket at the origin and the planet turning underneath. The cuts hide the switch.
// The climb is an illustration: the sim only decides whether the launch works.
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { buildCraft, disposeObject } from '../craft'
import { planetMaps } from '../maps'
import { steadyResolution } from '../steady'
import type { CraftSpec } from '../model'
import { cloudShader, planetShader } from '../shaders'
import { makeBirds } from './birds'
import { altitudeM, downrangeM, pitchRad, vacuum } from './flight'
import { flameColor, makeCloudDeck, makeGlow, makeGround, makePlume, makePuffs, makeSky, makeSpaceSky, makeStars, smokiness, type Plume } from './fx'
import { siteUnit } from './layout'
import { buildRocket, type Nozzle } from './rocket'
import { buildCarrier, buildPad } from './site'
import { EVENT_AT, missionTime, stageAt, stageProgress, type LaunchTimeline, type StageId } from './timeline'
import type { RocketSpec } from './vehicles'

export interface LaunchSceneOptions {
  rocket: RocketSpec
  craft: CraftSpec
  timeline: LaunchTimeline
  /** No camera shake. */
  reducedMotion: boolean
  /** Screen time to start at. The scene starts frozen; play() runs the clock. */
  startAt?: number
  /** After every drawn frame, with the screen time. */
  onFrame?: (t: number) => void
  /** Once, when the clock reaches the end of the timeline. */
  onEnd?: () => void
}

export interface LaunchScene {
  /** Jump to a screen time and draw it. */
  seek(t: number): void
  play(): void
  pause(): void
  dispose(): void
}

const EARTH_R = 6_371_000
const SPACE = new Set<StageId>(['boosters', 'staging', 'fairing', 'burn', 'deploy'])
const SUN_GROUND = new THREE.Vector3(0.8, 0.32, 0.36).normalize()
const SUN_SPACE = new THREE.Vector3(0.45, 0.6, 0.66).normalize()
const CARRIER_MS = 240

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u) }
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const hash = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export function createLaunchScene(container: HTMLElement, options: LaunchSceneOptions): LaunchScene {
  const { rocket: spec, timeline } = options
  const air = spec.airLaunch
  const coarse = window.matchMedia('(pointer: coarse)').matches

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  // A full-screen bloom pass at 2× fills too many pixels. 1.5 stays sharp; resize tightens it on a large window.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Phones and still frames go without: the shadow pass draws the rocket and the pad a second time.
  const shadows = !coarse && !options.reducedMotion
  renderer.shadowMap.enabled = shadows
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000002)
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 4_000_000)

  // The Sun is the one light that casts shadows; its shadow box follows the rocket.
  const sunLight = new THREE.DirectionalLight(0xffffff, 2)
  sunLight.castShadow = shadows
  sunLight.shadow.mapSize.setScalar(2048)
  sunLight.shadow.bias = -0.0004
  sunLight.shadow.normalBias = 0.06
  sunLight.shadow.camera.near = 100
  sunLight.shadow.camera.far = 2600
  const shadeScale = new THREE.Vector3()
  const shade = (o: THREE.Object3D) => {
    o.updateWorldMatrix(true, true)
    o.traverse((m) => {
      if (!(m instanceof THREE.Mesh)) return
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      const local = m.geometry.boundingSphere?.radius ?? 1
      m.getWorldScale(shadeScale)
      const r = local * Math.max(shadeScale.x, shadeScale.y, shadeScale.z)
      // Bolts and weld ticks still draw. They are smaller than a hand, so they do not recast the shadow.
      m.castShadow = shadows && r > 0.22
      m.receiveShadow = shadows
    })
  }
  const hemi = new THREE.HemisphereLight(0x8fa8de, 0x54483c, 1)
  // The flame lights the pad, the tower and the rocket's own tail.
  const flame = new THREE.PointLight(0xff8a3c, 0, 0, 0)
  scene.add(sunLight, sunLight.target, hemi, flame)

  // ---- The vehicle, with the player's spacecraft under the fairing.
  const model = buildRocket(spec)
  const H = model.height
  const W = model.footprint
  // Not to scale: the spacecraft is drawn to fill the fairing so it can be seen.
  model.payload.scale.setScalar(model.payloadRadius)
  model.payload.add(buildCraft(options.craft))
  shade(model.root)
  scene.add(model.root)
  const payloadHome = model.payload.position.y
  const upperHome = model.upper.position.y
  const fairingHome = model.fairing[0].position.y
  const escapeHome = model.escape?.position.y ?? 0
  const othersHome = model.others.map((o) => o.position.clone())
  const upperLen = spec.s2.length + spec.fairing.length

  const plumes: { plume: Plume; glow: THREE.Sprite; of: 's1' | 's2' | 'booster' }[] = []
  const addPlume = (parent: THREE.Object3D, of: 's1' | 's2' | 'booster', nozzle: Nozzle, length: number, seed: number) => {
    const plume = makePlume(nozzle, length, seed)
    const glow = makeGlow(nozzle.propellant, nozzle.radius)
    plume.mesh.position.y = nozzle.y
    glow.position.y = nozzle.y - nozzle.radius
    parent.add(plume.mesh, glow)
    plumes.push({ plume, glow, of })
    model.heat[of].emissive.setRGB(...flameColor(nozzle.propellant))
  }
  const n1 = model.nozzles.s1
  addPlume(model.stage1, 's1', n1, H * 0.85, 1)
  const n2 = model.nozzles.s2
  addPlume(model.upper, 's2', n2, upperLen * 0.9, 2)
  const nb = model.nozzles.booster
  if (nb) model.boosters.forEach((b, i) => addPlume(b.group, 'booster', nb, H * 0.95, 3 + i))

  // ---- Low shots: dawn sky, the coast, clouds, and the launch complex or the carrier aircraft.
  const skyU = { uSun: { value: SUN_GROUND.clone() }, uSpace: { value: 0 }, uTime: { value: 0 } }
  // Where the engines' fire is and how bright: the ground and the water pick up its glow.
  const fireU = { value: new THREE.Vector4() }
  const low = new THREE.Group()
  const skyDome = makeSky(skyU)
  skyDome.scale.setScalar(1000)
  const pad = air ? null : buildPad(H, W, -n1.y, skyU)
  const birds = pad ? makeBirds(14, H, skyU.uTime) : null
  const carrier = air ? buildCarrier(spec.s1.radius) : null
  const standoff = pad?.standoff ?? 0
  low.add(skyDome, makeGround(skyU, siteUnit(H), fireU), makeCloudDeck(skyU, 3_600))
  if (pad) {
    shade(pad.group)
    low.add(pad.group, pad.backdrop, birds!.mesh)
    if (shadows) {
      // The ground is a shader of its own and takes no light, so the shadows fall on a sheet laid over the apron.
      const sheet = new THREE.Mesh(new THREE.CircleGeometry(H * 9, 48).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.5, depthWrite: false }))
      sheet.position.y = 0.06
      sheet.receiveShadow = true
      low.add(sheet)
    }
  }
  if (carrier) {
    shade(carrier)
    low.add(carrier)
  }
  scene.add(low)

  // ---- High shots: the planet's limb, a thin line of air, stars.
  const spaceU = { uSun: { value: SUN_SPACE.clone() }, uAltitude: { value: 0 } }
  const high = new THREE.Group()
  const spaceSky = makeSpaceSky(spaceU, EARTH_R)
  spaceSky.scale.setScalar(1000)
  const stars = makeStars(900)
  stars.renderOrder = -9
  stars.frustumCulled = false
  const backdrop = { depthTest: false, depthWrite: false }
  // Real NASA maps (../maps/README.md); the planet is procedural until they have loaded.
  const maps = planetMaps(renderer.capabilities.getMaxAnisotropy())
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, 192, 96),
    new THREE.ShaderMaterial({ ...planetShader, uniforms: { uSun: spaceU.uSun, uBody: { value: 0 }, ...maps.maps.earth }, ...backdrop }),
  )
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R + 9_000, 192, 96),
    // Blended but not "transparent": it must draw with the backdrop, before the rocket, not over it.
    new THREE.ShaderMaterial({ ...cloudShader, uniforms: { uSun: spaceU.uSun, uTime: skyU.uTime, ...maps.maps.earth }, blending: THREE.CustomBlending, ...backdrop }),
  )
  planet.renderOrder = -8
  clouds.renderOrder = -7
  planet.frustumCulled = clouds.frustumCulled = false
  const globe = new THREE.Group()
  globe.add(planet, clouds)
  high.add(spaceSky, stars, globe)
  scene.add(high)
  // Which part of the Earth is below: lift-off from Cape Canaveral (28.5 N, 80.6 W), flying north-east up the coast,
  // so the camera on the seaward side looks back at the land. Every vehicle gets this one ground track.
  // On the map a point is (cos lat cos lon, sin lat, -cos lat sin lon); the scene has +y up and +x downrange.
  const lat = 28.5 * (Math.PI / 180)
  const lon = -80.6 * (Math.PI / 180)
  const up = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
  const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon))
  const heading = up.clone().cross(east).add(east).normalize()
  const globeStart = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(heading, up, heading.clone().cross(up))).invert()
  const spin = new THREE.Quaternion()
  const Z = new THREE.Vector3(0, 0, 1)

  // What bare metal mirrors: the dawn sky over dark ground on the way up, a black sky over the bright Earth in space.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const mirrored = (dome: THREE.Mesh, below: number) => {
    const world = new THREE.Scene()
    dome.scale.setScalar(50)
    world.add(dome, new THREE.Mesh(new THREE.CircleGeometry(50, 24).rotateX(-Math.PI / 2).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: below })))
    const map = pmrem.fromScene(world, 0.03, 0.1, 100).texture
    disposeObject(world)
    return map
  }
  const envLow = mirrored(makeSky(skyU), 0x2c2a22)
  spaceU.uAltitude.value = 150_000
  const envHigh = mirrored(makeSpaceSky(spaceU, EARTH_R), 0x3d6aa8)

  const puffs = makePuffs(360)
  scene.add(puffs.mesh)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  // The threshold sits above sunlit white paint, so only flames, hot throats and the Sun bloom.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 1.5))
  composer.addPass(new OutputPass())

  // ---- Timeline bookkeeping: when each event happens on screen, and when its shot ends.
  const eventAt = new Map<StageId, number>()
  const shotEnd = new Map<StageId, number>()
  const shotStart = new Map<StageId, number>()
  for (const s of timeline.stages) {
    const at = (EVENT_AT as Partial<Record<StageId, number>>)[s.id]
    if (at !== undefined) eventAt.set(s.id, s.start + at * (s.end - s.start))
    shotEnd.set(s.id, s.end)
    shotStart.set(s.id, s.start)
  }
  let now = 0
  /** Screen seconds since the event of a stage; negative before it, -Infinity when the timeline has no such stage. */
  const since = (id: StageId) => now - (eventAt.get(id) ?? Infinity)
  const over = (id: StageId) => now >= (shotEnd.get(id) ?? Infinity)

  // ---- Where the rocket is in the low shots.
  const tiltAt = (met: number) => (air && met <= 5 ? Math.PI / 2 : pitchRad(met, air))
  function basePos(met: number, out: THREE.Vector3): THREE.Vector3 {
    if (!air) return out.set(downrangeM(met), standoff + altitudeM(met), 0)
    // Air launch: carried, dropped for five seconds, then lit. `out` is the rocket's middle until the last line.
    const tau = met - 5
    if (met <= 0) out.set(CARRIER_MS * met, 12_000, 0)
    else if (met <= 5) out.set(CARRIER_MS * met, 12_000 - 4.9 * met * met, 0)
    else if (met <= 12) out.set(1_200 + CARRIER_MS * tau + 11 * tau * tau, 11_877.5 - 49 * tau + 7 * tau * tau, 0)
    else out.set(3_419 + 500 * (met - 12), altitudeM(met, true), 0)
    const tilt = tiltAt(met)
    return out.set(out.x - Math.sin(tilt) * H * 0.5, out.y - Math.cos(tilt) * H * 0.5, 0)
  }
  /** Stand-in for distance flown, for laying smoke puffs at fixed spots along the path. */
  const pathS = (met: number) => { basePos(met, tmp); return tmp.x + tmp.y }
  function metAtPath(s: number, lo: number, hi: number): number {
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      if (pathS(mid) < s) lo = mid
      else hi = mid
    }
    return hi
  }

  const tmp = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const eye = new THREE.Vector3()
  const target = new THREE.Vector3()
  const sunView = new THREE.Vector3()
  const p3 = new THREE.Vector3()
  const outAxis = new THREE.Vector3()
  /** World position of the point `f` rocket-heights up the stack. */
  const onAxis = (f: number, out: THREE.Vector3) => out.copy(model.root.position).addScaledVector(axis, f * H)

  function draw(t: number) {
    now = t
    const stage = stageAt(timeline, t)
    const p = stageProgress(stage, t)
    const met = missionTime(timeline, t)
    const id = stage.id
    const space = SPACE.has(id)
    const altitude = altitudeM(met, air)
    const thin = vacuum(altitude)
    skyU.uTime.value = t

    // ---- Vehicle attitude and position.
    let tilt = tiltAt(met)
    low.visible = !space
    high.visible = space
    model.root.rotation.set(0, 0, 0)
    if (space) model.root.position.set(0, 0, 0)
    else basePos(met, model.root.position)
    let lost = 0
    if (id === 'failure') {
      // The sim reports only that the launch failed, not how: engines out, a tumble, then the flight is ended.
      lost = Math.max(0, p - 0.15)
      tilt += lost * lost * 9
      model.root.rotation.x = lost * 1.4
    }
    model.root.rotation.z = -tilt
    axis.set(Math.sin(tilt), Math.cos(tilt), 0)
    model.root.visible = !(id === 'failure' && p > 0.42)

    // ---- Pieces that come off.
    const sB = since('boosters')
    for (const b of model.boosters) {
      b.group.visible = !over('boosters')
      b.group.position.copy(b.home)
      b.group.quaternion.identity()
      if (sB > 0) {
        b.group.position.addScaledVector(b.out, W * (0.5 * sB + 0.5 * sB * sB))
        b.group.position.y -= H * (0.04 * sB + 0.1 * sB * sB)
        b.group.quaternion.setFromAxisAngle(outAxis.set(b.out.z, 0, -b.out.x), Math.min(0.45 * sB, 1.2))
      }
    }
    const sS = since('staging')
    model.stage1.visible = !over('staging')
    model.stage1.position.set(0, sS > 0 ? -H * (0.1 * sS + 0.22 * sS * sS) : 0, 0)
    model.stage1.rotation.z = sS > 0 ? 0.05 * sS : 0
    const sF = since('fairing')
    model.fairing.forEach((half, i) => {
      const dir = i === 0 ? 1 : -1
      half.visible = !over('fairing')
      const open = Math.max(sF, 0)
      half.position.set(dir * spec.fairing.radius * (0.5 * open + 1.6 * open * open), fairingHome - spec.fairing.length * 0.35 * open * open, 0)
      // Each half swings out, then tumbles as it falls behind.
      half.rotation.set(dir * 0.5 * open * open, 0.35 * open * open, -dir * Math.min(open * 0.8, 1.3))
    })
    if (model.escape) {
      // The abort tower's own motor pulls it straight off the nose.
      const up = Math.max(sF, 0)
      model.escape.visible = !over('fairing')
      model.escape.position.y = escapeHome + spec.fairing.length * (0.3 * up + 1.2 * up * up)
    }
    // Separation starts at the deploy event, not at the start of the shot. The upper stage
    // drifts back and the spacecraft coasts forward, so the gap reads against the Earth.
    const sD = Math.max(since('deploy'), 0)
    const kick = 1 - Math.exp(-sD * 1.35)
    model.upper.position.y = upperHome - kick * model.payloadRadius * 1.6
    model.payload.position.y = payloadHome + kick * model.payloadRadius * 7
    model.payload.rotation.y = kick * 0.55
    model.others.forEach((o, i) => {
      const delay = 0.35 + (i % 3) * 0.28
      const leave = 1 - Math.exp(-Math.max(sD - delay, 0) * 1.2)
      outAxis.set(othersHome[i]!.x, 0.35, othersHome[i]!.z)
      if (outAxis.lengthSq() < 1e-4) outAxis.set(i % 2 === 0 ? 1 : -1, 0.2, 0.4)
      outAxis.normalize()
      o.position.copy(othersHome[i]!).addScaledVector(outAxis, leave * spec.fairing.radius * 1.15)
    })

    // ---- Engines.
    let p1 = 0
    let pBoost = 0
    let p2 = 0
    if (air) p1 = smooth(5, 5.6, met)
    else if (id === 'countdown') p1 = 0
    else if (id === 'ignition') p1 = smooth(0.08, 0.5, p)
    else p1 = 1
    // Solid boosters light at T0 and cannot be shut down; liquid side cores start with the centre one.
    // Either way they burn out just before they drop.
    pBoost = (nb?.propellant === 'solid' ? (met >= 0 ? 1 : 0) : p1) * (1 - smooth(-0.5, -0.1, sB))
    p1 *= 1 - smooth(-0.3, -0.1, sS)
    p2 = smooth(0.5, 0.9, sS) * (1 - smooth(-0.05, 0.15, since('burn')))
    if (id === 'failure') p1 *= 1 - smooth(0.1, 0.16, p), pBoost *= 1 - smooth(0.1, 0.16, p)
    for (const { plume, glow, of } of plumes) {
      const power = of === 's1' ? p1 : of === 's2' ? p2 : pBoost
      plume.set(power, of === 's2' ? 1 : thin, t)
      glow.visible = power > 0.01
      // Many strap-ons side by side: their glows add up, so each gets a share.
      glow.material.opacity = power * (of === 's2' ? 0.5 : of === 'booster' ? Math.min(1, 2 / model.boosters.length) : 1)
      model.heat[of].emissiveIntensity = power * 1.6
    }
    const thrust = Math.max(p1, pBoost)
    onAxis(-0.08, flame.position)
    flame.intensity = space ? 0 : thrust * 1.1 * (1 - 0.6 * thin)
    fireU.value.set(flame.position.x, flame.position.y, flame.position.z, flame.intensity)

    // ---- Light.
    const sun = space ? SUN_SPACE : SUN_GROUND
    if (space) {
      sunLight.color.set(0xfff4e6)
      sunLight.intensity = 3
      hemi.color.set(0x0c1424)
      hemi.groundColor.set(0x6d90d0)
      hemi.intensity = 0.4
      scene.environment = envHigh
      scene.environmentIntensity = 0.8
    } else {
      // Dawn: a low warm Sun, blue sky light; whiter and harder as the rocket climbs out of the haze.
      sunLight.color.set(0xffc9a0).lerp(tmpColor.set(0xfff4e6), thin)
      sunLight.intensity = 3.1
      hemi.color.set(0x8fa8de)
      hemi.groundColor.set(0x54483c)
      hemi.intensity = 0.35
      scene.environment = envLow
      scene.environmentIntensity = 0.6
    }

    // ---- Camera.
    const tall = Math.max(1, 1.15 / camera.aspect)
    let fov = 36
    let widen = 1.25
    let shake = 0
    switch (id) {
      case 'countdown':
        // From across the inlet, low over the water: the rocket and its tower against the sky, the sea behind them.
        onAxis(0.43, target)
        eye.set(lerp(0.8, 0.6, p) * H, standoff + 0.12 * H, lerp(3.3, 2.95, p) * H)
        fov = 34
        break
      case 'ignition':
        onAxis(0.12, target)
        eye.set(0.3 * H + 2 * W, standoff * 0.6 + 0.02 * H, 0.42 * H + 3 * W)
        fov = 44
        shake = smooth(0.1, 0.6, p)
        break
      case 'liftoff':
        onAxis(0.4, target)
        eye.set(0.3 * H, standoff + 0.05 * H + 0.3 * altitude, 2.1 * H)
        fov = 40
        shake = 1 - 0.7 * p
        break
      case 'carry':
        onAxis(0.5, target).y += 3
        eye.copy(target).add(tmp.set(46 - 12 * p, -11, 78))
        widen = 1.9
        break
      case 'drop':
        onAxis(0.5, target)
        tmp.set(CARRIER_MS * met, 12_000, 0)
        target.lerp(tmp, 0.4)
        eye.copy(target).add(tmp.set(30, -16 - 20 * p, 82 + 60 * p))
        widen = 1.9
        break
      case 'airstart':
        onAxis(0.5, target)
        eye.copy(target).add(tmp.set(-34 - 10 * p, 5 - 4 * p, 42))
        fov = 40
        widen = 1.9
        shake = 0.4
        break
      case 'pitch':
        // From above and behind, looking up the coast, so the tilt, the smoke trail and the shoreline all show.
        onAxis(0.35, target)
        eye.copy(target).add(tmp.set(1.1 * H, lerp(0.9, 1.3, p) * H, 3.0 * H))
        fov = 38
        break
      case 'maxq':
        onAxis(0.45, target)
        eye.copy(target).add(tmp.set(lerp(1.5, 1.0, p) * H, -0.45 * H, 2.3 * H))
        fov = 38
        shake = 0.45
        break
      case 'failure':
        // Follow the rocket until the flight ends, then hold on the spot.
        if (p < 0.36) onAxis(0.4, target)
        else {
          const m = missionTime(timeline, stage.start + 0.36 * (stage.end - stage.start))
          basePos(m, target).add(tmp.set(Math.sin(tiltAt(m)), Math.cos(tiltAt(m)), 0).multiplyScalar(0.4 * H))
        }
        eye.copy(target).add(tmp.set(1.5 * H, -1.2 * H, lerp(4.5, 6.5, p) * H))
        fov = 40
        break
      case 'boosters':
        onAxis(0.45, target)
        eye.copy(target).add(tmp.set(-0.3 * H, 0.55 * H, lerp(2.5, 2.9, p) * H))
        widen = 1.9
        break
      case 'staging':
        onAxis(0.68, target)
        eye.copy(target).add(tmp.set(-0.35 * H, 0.3 * H, lerp(1.7, 2.0, p) * H))
        widen = 1.9
        break
      case 'fairing': {
        const L = spec.fairing.length
        onAxis(1 - (0.55 * L) / H, target)
        eye.copy(target).add(tmp.set(1.3 * L, 0.7 * L, lerp(2.9, 2.5, p) * L))
        widen = 1.6
        break
      }
      case 'burn':
        // Wide enough to show the upper stage against the Earth as it finishes the push to orbit.
        onAxis(0.78, target)
        eye.copy(target).add(tmp.set(lerp(-2.2, -3.1, p) * upperLen, lerp(1.5, 2.3, p) * upperLen, lerp(3.4, 4.6, p) * upperLen))
        target.addScaledVector(axis, upperLen * 0.4)
        fov = 34
        widen = 1.4
        break
      case 'deploy': {
        const S = model.payloadRadius
        model.root.updateMatrixWorld(true)
        model.payload.getWorldPosition(p3)
        model.upper.getWorldPosition(eye)
        eye.addScaledVector(axis, spec.s2.length)
        const gap = Math.max(eye.distanceTo(p3), S * 3)
        target.copy(eye).lerp(p3, 0.58)
        // Stay above the stack in world space so the Earth limb stays behind the release.
        tmp.set(-axis.z, 0, axis.x)
        if (tmp.lengthSq() < 1e-4) tmp.set(1, 0, 0)
        tmp.normalize()
        eye.copy(target).addScaledVector(tmp, gap * 1.65)
        eye.y += gap * 0.95
        fov = 36
        widen = 1.2
        break
      }
    }
    if (!space && eye.y < 1.5) eye.y = 1.5
    const dist = eye.distanceTo(target)
    if (shake > 0 && !options.reducedMotion) {
      const k = shake * dist * 0.006
      target.x += (Math.sin(t * 47.3) + Math.sin(t * 31.7 + 1.3)) * k
      target.y += (Math.sin(t * 53.1 + 0.7) + Math.sin(t * 38.9 + 2.1)) * k
    }
    camera.position.copy(eye)
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
    camera.fov = Math.min(fov * Math.min(tall, widen), 80)
    camera.near = Math.max(0.05, dist * 0.02)
    camera.updateProjectionMatrix()
    // Slide the picture up a little: the caption covers the bottom of the frame.
    camera.projectionMatrix.elements[9] = -0.16
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
    camera.updateMatrixWorld()

    // ---- Backdrop.
    sunLight.position.copy(target).addScaledVector(sun, 1000)
    sunLight.target.position.copy(target)
    // The shadow box is as tight as the vehicle allows: the whole stack at first, the upper stage once it flies alone.
    const reach = (over('staging') ? upperLen : H) * 0.8
    const box = sunLight.shadow.camera
    if (box.right !== reach) {
      box.left = box.bottom = -reach
      box.right = box.top = reach
      box.updateProjectionMatrix()
    }
    if (space) {
      spaceU.uAltitude.value = altitude + eye.y
      spaceSky.position.copy(eye)
      stars.position.copy(eye)
      globe.position.set(0, -(EARTH_R + altitude), 0)
      globe.quaternion.copy(spin.setFromAxisAngle(Z, downrangeM(met) / EARTH_R)).multiply(globeStart)
    } else {
      skyU.uSpace.value = smooth(4_000, 45_000, eye.y)
      skyDome.position.copy(eye)
      if (carrier) {
        // The aircraft holds its course; once the rocket is away it climbs and banks clear.
        const away = Math.max(met, 0)
        carrier.visible = id === 'carry' || id === 'drop' || id === 'airstart'
        carrier.position.set(CARRIER_MS * met, 12_000 + 1.2 * away, -2 * away * away)
        carrier.rotation.set(-Math.min(away * 0.04, 0.3), 0, 0)
      }
      if (pad && birds) {
        // The birds take off as the engines light, and are long gone by the time the rocket has cleared the tower.
        birds.mesh.visible = id === 'countdown' || id === 'ignition' || id === 'liftoff'
        birds.scatter.value = t - (shotStart.get('ignition') ?? Infinity) - 0.15
        const swing = id === 'countdown' ? smooth(0.2, 0.9, p) : 1
        pad.arms.forEach((arm, i) => (arm.rotation.y = swing * (i === 0 ? 1.1 : -1.1)))
      }
    }

    // ---- Smoke.
    puffs.begin()
    const R = spec.s1.radius
    if (!space) {
      if (pad && met < 0.5) {
        // Boil-off: cold oxygen vapour drifts from the vents of both stages until the tanks are sealed for flight.
        for (let i = 0; i < 16; i++) {
          const age = (t * 0.25 + hash(i + 3)) % 1
          onAxis(i % 2 ? (spec.s1.length * 0.96) / H : (spec.s1.length + spec.interstage.length + spec.s2.length * 0.9) / H, p3)
          puffs.add(p3.x + R + age * W * 3, p3.y - age * age * W * 1.2, p3.z - age * W * (0.4 + hash(i)), W * (0.3 + 1.5 * age), 0.2 * (1 - age) * Math.min(age * 8, 1), 0, hash(i + 0.4))
        }
      }
      if (pad && met > 0 && met < 14) {
        // Frost that built up on the cold tanks shakes loose and showers down as the rocket climbs away.
        for (let i = 0; i < 48; i++) {
          const born = hash(i + 7) * 7
          const age = met - born
          if (age <= 0 || age > 4) continue
          basePos(born, p3)
          const a = hash(i + 0.3) * Math.PI * 2
          const out = R * (1.1 + 0.5 * age)
          const y = p3.y + (0.3 + 0.55 * hash(i + 0.6)) * spec.s1.length - 4.9 * age * age
          if (y > 0.5) puffs.add(p3.x + Math.cos(a) * out, y, p3.z + Math.sin(a) * out, W * (0.08 + 0.14 * hash(i + 0.9)), 0.9 * clamp01(1 - age / 4), 0, hash(i))
        }
      }
      if (id === 'maxq') {
        // Near the speed of sound the air squeezed over the nose turns to fog: a skirt of cloud that flickers on and off.
        const fog = smooth(0.05, 0.25, p) * (1 - smooth(0.4, 0.6, p))
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2
          const r = spec.fairing.radius * 1.5
          onAxis(1 - (spec.fairing.length * (0.8 + 0.3 * hash(i))) / H, p3)
          puffs.add(p3.x + Math.cos(a) * r * axis.y, p3.y - Math.cos(a) * r * axis.x, p3.z + Math.sin(a) * r, spec.fairing.radius * 1.7, 0.13 * fog * (0.5 + 0.5 * hash(i + Math.floor(t * 12))), 0, hash(i + 0.2))
        }
      }
      const ignition = shotStart.get('ignition')
      if (pad && ignition !== undefined) {
        // Pad smoke: the flame trench throws it out both sides, then it billows and drifts.
        const s = t - ignition
        for (let i = 0; i < 90; i++) {
          const age = s - 0.25 - (i / 90) * 5.5
          if (age <= 0) continue
          const dir = i % 2 === 0 ? 1 : -1
          const reach = pad.mount * 0.8 + H * (0.5 + 1.6 * hash(i)) * (1 - Math.exp(-age * 0.7))
          const spread = (hash(i + 0.5) - 0.5) * H * 0.9 * (1 - Math.exp(-age * 0.5))
          const lift = H * (0.03 + 0.1 * hash(i + 0.25) * age * 0.5)
          const size = H * (0.16 + 0.22 * Math.pow(age, 0.6)) * (0.7 + 0.6 * hash(i + 0.75))
          puffs.add(dir * reach, lift + size * 0.25, spread, size, 0.75 * Math.min(age * 3, 1) * clamp01(1 - age / 14), Math.exp(-age * 2.5) * 0.5, hash(i + 0.1))
        }
      }
      if (thrust > 0 || id === 'failure' || met > 0) {
        // Exhaust trail: puffs left at fixed spots along the path, growing as they age.
        const from = air ? 5 : 0.3
        const gap = W * 1.6
        // Solid motors lay a thick white trail; hydrogen engines leave little more than steam.
        const trail = Math.max(smokiness(n1.propellant), nb && sB <= 0 ? smokiness(nb.propellant) : 0)
        const head = id === 'failure' ? Math.min(met, missionTime(timeline, stage.start + 0.16 * (stage.end - stage.start))) : met
        if (head > from) {
          const s0 = pathS(head) - H * 0.55
          const first = Math.floor(s0 / gap)
          const floor = pathS(from)
          for (let j = 0; j < 70; j++) {
            const s = (first - j) * gap
            if (s < floor) break
            const m = metAtPath(s, from, head)
            const age = met - m + 0.05
            basePos(m, p3)
            const size = W * (3 + 4.5 * Math.sqrt(age)) * (0.8 + 0.4 * hash(first - j))
            p3.x += (hash(first - j + 0.3) - 0.5) * size * 0.5
            p3.z += (hash(first - j + 0.6) - 0.5) * size * 0.5
            puffs.add(p3.x, p3.y, p3.z, size, trail * Math.min(1, j / 3 + 0.2) * (1 - j / 70) * lerp(1, 0.55, thin), Math.exp(-age * 5) * 0.6, hash(first - j + 0.9))
          }
        }
      }
      if (id === 'failure' && p > 0.3) {
        const s = (p - 0.3) * (stage.end - stage.start)
        basePos(missionTime(timeline, stage.start + 0.36 * (stage.end - stage.start)), p3)
        for (let i = 0; i < 40; i++) {
          const a = hash(i) * Math.PI * 2
          const b = hash(i + 0.5) * 2 - 1
          const r = H * (0.25 + 1.3 * hash(i + 0.2)) * (1 - Math.exp(-s * 1.2))
          const flat = Math.sqrt(1 - b * b)
          puffs.add(p3.x + Math.cos(a) * flat * r, p3.y + H * 0.4 + b * r - s * H * 0.12, p3.z + Math.sin(a) * flat * r, H * (0.3 + 0.35 * Math.sqrt(s)), 0.8 * Math.min(s * 5, 1), Math.exp(-s * 1.6), hash(i + 0.7))
        }
      }
    } else {
      // Thin gas puffs where a stage or the boosters let go; they spread fast and vanish in the vacuum.
      const burst = (s: number, f: number, n: number, radius: number) => {
        if (s <= 0 || s > 1.1) return
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2
          const r = radius * (1 + 7 * s)
          onAxis(f, p3)
          puffs.add(p3.x + Math.cos(a) * r * axis.y, p3.y - Math.cos(a) * r * axis.x, p3.z + Math.sin(a) * r, radius * (1 + 2.5 * s), 0.22 * (1 - s / 1.1), 0, hash(i + f))
        }
      }
      burst(sS, (spec.s1.length + spec.interstage.length) / H, 12, spec.s1.radius)
      burst(sB, 0.3, 10, W)
    }
    sunView.copy(sun).transformDirection(camera.matrixWorldInverse)
    puffs.commit(sunView, 1, space)

    composer.render()
    options.onFrame?.(t)
  }
  const tmpColor = new THREE.Color()

  // ---- Clock.
  // The real map arrives a moment after the first frame: a frozen scene draws again once it has.
  // Checked in a frame callback: drawing from a timer hangs headless Chrome when it runs on virtual time.
  let waits = 0
  let mapWait = requestAnimationFrame(function check() {
    if (maps.maps.earth.uHasMap.value > 0) draw(time)
    else if (++waits < 600) mapWait = requestAnimationFrame(check)
  })
  let time = clamp01((options.startAt ?? 0) / timeline.duration) * timeline.duration
  let playing = false
  let onScreen = true
  let ended = false
  let last = 0
  // Slower graphics chips get fewer pixels, not fewer frames (steady.ts).
  let steadyCap = Infinity // resize() must not undo a cut
  const steady = steadyResolution((ratio) => {
    steadyCap = ratio
    renderer.setPixelRatio(ratio)
    composer.setPixelRatio(ratio)
  }, renderer.getPixelRatio())
  function frame(stamp: number) {
    steady((stamp - last) / 1000)
    // Capped so a tab switch does not skip a shot; high enough that a slow phone still runs in real time.
    const dt = Math.min((stamp - last) / 1000, 0.25)
    last = stamp
    time = Math.min(time + dt, timeline.duration)
    draw(time)
    if (time >= timeline.duration) {
      playing = false
      renderer.setAnimationLoop(null)
      if (!ended) {
        ended = true
        options.onEnd?.()
      }
    }
  }
  const run = () => {
    last = performance.now()
    renderer.setAnimationLoop(playing && onScreen ? frame : null)
  }

  function resize() {
    const w = Math.max(container.clientWidth, 1)
    const h = Math.max(container.clientHeight, 1)
    const ratio = Math.min(window.devicePixelRatio || 1, coarse || w > 1400 ? 1.25 : 1.5, steadyCap)
    renderer.setPixelRatio(ratio)
    renderer.setSize(w, h, false)
    composer.setPixelRatio(ratio)
    composer.setSize(w, h)
    camera.aspect = w / h
    draw(time)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  // Only render while on screen.
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = !!entry?.isIntersecting
    run()
  })
  visibility.observe(container)
  // Compile every shader and upload every mesh now. Otherwise the first frame that shows the Earth, a dropped stage
  // or the spacecraft stalls for a tenth of a second while the graphics chip catches up (measured: 100 to 130 ms).
  const was = new Map<THREE.Object3D, [boolean, boolean]>()
  scene.traverse((o) => {
    was.set(o, [o.visible, o.frustumCulled])
    o.visible = true
    o.frustumCulled = false
  })
  composer.render()
  for (const [o, [visible, culled]] of was) {
    o.visible = visible
    o.frustumCulled = culled
  }
  resize()

  return {
    seek(t) {
      time = Math.min(Math.max(t, 0), timeline.duration)
      ended = false
      draw(time)
    },
    play() {
      playing = true
      run()
    },
    pause() {
      playing = false
      run()
    },
    dispose() {
      renderer.setAnimationLoop(null)
      visibility.disconnect()
      resizeObserver.disconnect()
      cancelAnimationFrame(mapWait)
      disposeObject(scene)
      maps.dispose()
      envLow.dispose()
      envHigh.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
