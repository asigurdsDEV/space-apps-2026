// The three.js scene behind <LaunchView>. Every frame is a pure function of screen time, so the
// sequence can be frozen at any second (the preview page, still frames for reduced motion).
// Units are meters. Low shots happen over a ground plane (bent to the Earth's curve once airborne); high shots over the round planet,
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
import { addBlast, blastGlow, FIREBALL, PIECES, SHELL, TRAIL } from './blast'
import { makeBirds } from './birds'
import { altitudeM, downrangeM, pitchRad, vacuum } from './flight'
import { AIR, CLOUD_DECK_M, flameColor, flameReach, flameShine, makeCloudDeck, makeEarthBelow, makeGlow, makeGround, makePlume, makePuffs, makeSky, makeSpaceSky, makeStars, smokiness, type Plume } from './fx'
import { siteUnit } from './layout'
import { buildRocket, type Nozzle } from './rocket'
import { buildCarrier, buildPad } from './site'
import { buildMissile, buildRaptor, makeRibbon } from './raptor'
import { makeStorm } from './storm'
import { EVENT_AT, INTERCEPT, STORM, missionTime, stageAt, stageProgress, type LaunchTimeline, type StageId } from './timeline'
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
/** Ground that slides under the vehicle per second of screen time in the space shots, on top of the real distance flown: a shot is a few seconds long, and at true speed the Earth would look parked. */
const GROUND_MS = 22_000

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u) }
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
/** Distance covered `s` seconds after a spring's push: it eases in, then runs at a steady speed for good. */
const coast = (s: number) => s - (1 - Math.exp(-s * 3)) / 3
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
    // The upper stage only ever burns in vacuum: a small blue-white knot, not the ball of lit air a booster has.
    if (of === 's2') {
      glow.material.color.setRGB(1.3, 1.6, 2.4)
      glow.scale.setScalar(nozzle.radius * 3)
      glow.position.y = nozzle.y - nozzle.radius * 0.4
    }
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
  // An air launch is flown out over the sea, with the coast 40 km to the west.
  low.add(skyDome, makeGround(skyU, siteUnit(H), fireU, air ? 40_000 : 0), makeCloudDeck(skyU, CLOUD_DECK_M))
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
  // Real NASA maps (../maps/README.md) say where land, sea and cloud are; the ground is plain ocean until they have loaded.
  const maps = planetMaps(renderer.capabilities.getMaxAnisotropy())
  const globe = makeEarthBelow({ uSun: spaceU.uSun, uTime: skyU.uTime, ...maps.maps.earth }, EARTH_R)
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

  // Thin vapour (boil-off, frost, the fog at Max-Q, gas at separation) and the dense clouds of smoke and steam.
  const puffs = makePuffs(160)
  const clouds = makePuffs(340, { fire: fireU, unit: siteUnit(H) })
  // A launch failure: the fireball, and the smoke trails of the burning pieces.
  const fireball = makePuffs(FIREBALL + PIECES + 2, undefined, true)
  const debris = makePuffs(SHELL + PIECES * TRAIL)
  scene.add(puffs.mesh, clouds.mesh, fireball.mesh, debris.mesh)
  /** Where the failure shot blows the vehicle up (its middle) and the way it was flying, set each frame of that shot. */
  const blastAt = new THREE.Vector3()
  const blastUp = new THREE.Vector3()
  const BLAST = EVENT_AT.failure

  // The sandbox's fictional interception (raptor.ts): an F-22 climbs alongside, fires a missile, and passes the rocket.
  const jet = timeline.intercepted ? buildRaptor() : null
  const missile = jet ? buildMissile() : null
  const smokeTrail = makeRibbon(180)
  if (jet && missile) scene.add(jet.root, missile, smokeTrail.mesh)
  const failShot = timeline.stages.find((s) => s.id === 'failure')
  /** Screen time of the blast. */
  const blastT = failShot ? failShot.start + BLAST * (failShot.end - failShot.start) : Infinity
  /** The interception's yardstick: the rocket's height, but never so small that the 19 m jet fills the frame. */
  const S = Math.max(H, 45)
  // The jet's path in the rocket's moving frame, flown at a steady speed: from behind the camera, close past it, on
  // toward the rocket to fire, then past the rocket's side and away up and beyond it.
  const JET_PATH = new THREE.CatmullRomCurve3([[1.0, -0.7, 4.6], [0.35, -0.25, 2.2], [-0.1, 0, 1.3], [-0.6, 0.5, 0.45], [-2.5, 2.2, -1.5], [-6, 4.5, -4]].map(([x, y, z]) => new THREE.Vector3(x! * S, y! * S, z! * S)))
  const JET_END = 2.2
  const jetU = (tau: number) => clamp01((tau - INTERCEPT.enter) / (JET_END - INTERCEPT.enter))
  const iv = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion() }
  /** Middle of the rocket at screen time `t`: where it was while it flew, where it blew up after. */
  const along = new THREE.Vector3()
  const rocketMid = (t: number, out: THREE.Vector3) => {
    const m = missionTime(timeline, Math.min(t, blastT))
    const a = tiltAt(m)
    return basePos(m, out).add(along.set(Math.sin(a), Math.cos(a), 0).multiplyScalar(0.5 * H))
  }
  /** The jet's place (in `out`) and attitude (in `q`) at `tau` seconds from the blast. */
  const jetAt = (tau: number, out: THREE.Vector3, q?: THREE.Quaternion) => {
    const u = jetU(tau)
    rocketMid(blastT + tau, out).add(JET_PATH.getPointAt(u, iv.a))
    if (q) {
      // Nose along the climb plus its own way through the rocket's frame; top facing up-range, rolled into the pull-away.
      const a = tiltAt(missionTime(timeline, Math.min(blastT + tau, blastT)))
      const fwd = JET_PATH.getTangentAt(u, iv.a).multiplyScalar(0.8).add(iv.b.set(Math.sin(a), Math.cos(a), 0)).normalize()
      const up = iv.b.set(-Math.cos(a), Math.sin(a), 0).applyAxisAngle(fwd, 0.35 * Math.sin(tau * 0.6) - 1.1 * smooth(INTERCEPT.pass, 0.5, tau))
      q.setFromRotationMatrix(iv.m.lookAt(fwd, iv.c.set(0, 0, 0), up))
    }
    return out
  }
  const bay = new THREE.Vector3()
  /** The camera, in the rocket's moving frame: behind the jet's run in, a little to the side and below. */
  const EYE_REL = new THREE.Vector3(0.55 * S, -0.15 * S, 2.7 * S)
  /** The missile `tau` seconds from the blast, from its drop off the jet to the hit, relative to the rocket's middle. */
  const missileRel = (tau: number, out: THREE.Vector3) => {
    if (!jet) return out.set(0, 0, 0)
    const u = clamp01((tau - INTERCEPT.fire) / -INTERCEPT.fire)
    jetAt(INTERCEPT.fire, out, iv.q).sub(rocketMid(blastT + INTERCEPT.fire, iv.c)).add(bay.copy(jet.bay).applyQuaternion(iv.q))
    // It drops clear, its motor lights, and it runs in faster and faster, curving out toward the camera and back in.
    const run = Math.pow(u, 1.8)
    return out.multiplyScalar(1 - run).add(iv.c.set(0.3 * S, -0.2 * S, 0.12 * S).multiplyScalar(Math.sin(Math.PI * u))).addScaledVector(iv.c.set(0, -1, 0), 0.04 * S * Math.min(u * 12, 1))
  }
  const missileAt = (tau: number, out: THREE.Vector3) => missileRel(tau, out).add(rocketMid(blastT + tau, iv.b))

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  // The threshold sits above sunlit white paint, so only flames, hot throats and the Sun bloom.
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 1.5)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())
  // The sandbox's lightning strike: the launch goes up into a thunderstorm (storm.ts).
  const storm = timeline.struck ? makeStorm() : null
  if (storm) {
    scene.add(storm.group)
    composer.insertPass(storm.grade, 1)
  }
  const nose = new THREE.Vector3()
  const tail = new THREE.Vector3()

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
  const tail = new THREE.Vector3()
  const trailHead = new THREE.Vector3()
  const trailStart = new THREE.Vector3()
  const exhaust = new THREE.Vector3()
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
    /** Seconds since the vehicle blew up, in the failure shot; negative before. */
    let boom = -1
    if (id === 'failure') {
      // It veers off course, engines still burning, and range safety blows it up.
      const veer = timeline.intercepted || timeline.struck ? 0 : smooth(0.02, BLAST, Math.min(p, BLAST))
      tilt += veer * veer * 0.55
      model.root.rotation.x = veer * veer * 0.3
      boom = (p - BLAST) * (stage.end - stage.start)
      const m = missionTime(timeline, stage.start + BLAST * (stage.end - stage.start))
      const lean = tiltAt(m) + (timeline.intercepted || timeline.struck ? 0 : 0.55)
      blastUp.set(Math.sin(lean), Math.cos(lean), 0)
      basePos(m, blastAt).addScaledVector(blastUp, 0.5 * H)
    }
    model.root.rotation.z = -tilt
    axis.set(Math.sin(tilt), Math.cos(tilt), 0)
    model.root.visible = !(id === 'failure' && boom >= 0)

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
    // Pushers swing each half open about its base rim; then it is free, and the stack, still thrusting, leaves it behind:
    // it falls back along the flight path faster and faster, drifting outward with a slow tumble of its own.
    const swing = 0.55 * smooth(0, 0.45, sF)
    const free = Math.max(sF - 0.3, 0)
    model.fairing.forEach((half, i) => {
      const dir = i === 0 ? 1 : -1
      const L = spec.fairing.length
      const R = spec.fairing.radius
      half.visible = !over('fairing')
      half.position.set(
        dir * (R * (1 - Math.cos(swing)) + L * (0.45 * free + 0.25 * free * free)),
        fairingHome + R * Math.sin(swing) - L * (0.35 * free + 3.4 * free * free),
        dir * L * 0.3 * free * free,
      )
      half.rotation.set(dir * (0.35 + 0.2 * i) * free, dir * 0.5 * free * free, -dir * (swing + (0.7 + 0.5 * i) * free))
    })
    if (model.escape) {
      // The abort tower's own motor pulls it straight off the nose.
      const up = Math.max(sF, 0)
      model.escape.visible = !over('fairing')
      model.escape.position.y = escapeHome + spec.fairing.length * (0.3 * up + 1.2 * up * up)
    }
    // Separation starts at the deploy event, not at the start of the shot. The springs give a short push, then both
    // coast at steady speeds: the spacecraft ahead with a slow tumble, the spent stage falling behind, the gap always opening.
    const sD = Math.max(since('deploy'), 0)
    const gone = coast(sD)
    model.upper.position.y = upperHome - gone * model.payloadRadius * 1.3
    model.payload.position.y = payloadHome + gone * model.payloadRadius * 3.4
    model.payload.rotation.set(0.16 * gone, 0.42 * gone, 0.08 * gone)
    model.others.forEach((o, i) => {
      const leave = coast(Math.max(sD - 0.35 - (i % 3) * 0.28, 0))
      outAxis.set(othersHome[i]!.x, 0.35, othersHome[i]!.z)
      if (outAxis.lengthSq() < 1e-4) outAxis.set(i % 2 === 0 ? 1 : -1, 0.2, 0.4)
      outAxis.normalize()
      o.position.copy(othersHome[i]!).addScaledVector(outAxis, leave * spec.fairing.radius * 0.9)
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
    if (id === 'failure' && boom >= 0) p1 = pBoost = 0
    for (const { plume, glow, of } of plumes) {
      const power = of === 's1' ? p1 : of === 's2' ? p2 : pBoost
      const vac = of === 's2' ? 1 : thin
      // Many strap-ons side by side: their flames and glows add up to a white-out, so each gets a share.
      const share = of === 'booster' ? Math.min(1, 2 / model.boosters.length) : 1
      plume.set(power * Math.sqrt(share), vac, t)
      glow.visible = power > 0.01
      // In vacuum there is no air to light up: only a faint halo is left.
      glow.material.opacity = power * share * lerp(1, 0.16, vac)
      model.heat[of].emissiveIntensity = power * 1.6
    }
    const thrust = Math.max(p1, pBoost)
    // How much light the fire gives off down in the air, 0 to 1: a solid motor's flame is blinding, a hydrogen one barely glows.
    const shine = space ? 0 : Math.max(p1 * flameShine(n1.propellant), nb ? pBoost * flameShine(nb.propellant) : 0) * (1 - 0.6 * thin)
    if (space && p2 > 0) {
      // The upper stage's bell runs red-hot in vacuum: its glow fills the bell and spills onto the stage's tail.
      onAxis((model.upper.position.y + n2.y + n2.radius * 0.6) / H, flame.position)
      flame.color.setRGB(1, 0.5, 0.12)
      flame.intensity = p2 * 0.6
      flame.distance = n2.radius * 7
    } else {
      onAxis(-0.08, flame.position)
      flame.color.set(0xff8a3c)
      flame.distance = 0
      // In the air the fire throws warm light on the tower and the rocket's tail.
      flame.intensity = space ? thrust * 0.385 * (1 - 0.6 * thin) : shine * 2
    }
    // What the ground, the water and the clouds see glowing is the lower part of the flame, down to where it hits the pad.
    fireU.value.set(flame.position.x, space || air ? flame.position.y : Math.max(flame.position.y - 0.8 * H, 0.1 * H), flame.position.z, space ? flame.intensity : shine * 1.2)
    if (boom >= 0) {
      // The fireball lights the smoke round it, and the ground, orange.
      const glow = blastGlow(boom)
      flame.position.copy(blastAt)
      flame.color.setRGB(1, 0.5, 0.18)
      flame.distance = 0
      flame.intensity = 9 * glow
      fireU.value.set(blastAt.x, blastAt.y, blastAt.z, 5 * glow)
    }

    // ---- Light.
    const sun = space ? SUN_SPACE : SUN_GROUND
    // A camera stops down for the fire: the sky deepens and the flame keeps its colour.
    renderer.toneMappingExposure = 1 - 0.22 * shine
    bloom.strength = 0.45 - 0.27 * shine
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
        // South of the pad, clear of the clouds the flame trench throws out to the east and west.
        eye.set(0.1 * H + W, standoff * 0.6 + 0.02 * H, 0.5 * H + 3 * W)
        fov = 44
        shake = smooth(0.1, 0.6, p)
        break
      case 'liftoff': {
        // The long lens across the inlet again, zooming out as the rocket climbs: the vehicle fills the top of the
        // frame, a rocket's length of flame hangs under it, and the pad's clouds roll out along the bottom.
        const low = Math.max(model.root.position.y - 1.1 * H, 0) - 0.04 * H
        const top = model.root.position.y + 1.12 * H
        target.set(0, (low + top) / 2, 0)
        eye.set(0.6 * H, standoff + 0.12 * H, 2.95 * H)
        fov = (2 * Math.atan((top - low) / 1.38 / eye.distanceTo(target)) * 180) / Math.PI
        shake = 1 - 0.7 * p
        break
      }
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
        // On a tall screen, swing further east: the narrow view would otherwise cut the assembly building off.
        eye.copy(target).add(tmp.set(Math.min(0.8 + 0.3 * tall, 1.55) * H, lerp(0.9, 1.3, p) * H, 3.0 * H))
        fov = 38
        break
      case 'maxq':
        // From above, looking back toward the land: the coast far below and the horizon show how high it is.
        onAxis(0.45, target)
        eye.copy(target).add(tmp.set(lerp(1.5, 1.0, p) * H, 0.5 * H, 2.3 * H))
        fov = 38
        shake = 0.45
        break
      case 'intercept':
      case 'failure': {
        if (timeline.intercepted) {
          // One continuous camera, riding with the rocket just off the jet's path: it watches the jet come up with the rocket
          // behind it, the jet roars past the lens, it follows the missile in, and pulls back as the rocket blows up.
          const tau = t - blastT
          rocketMid(t, eye).add(EYE_REL)
          rocketMid(t, target).lerp(jetAt(tau, tmp), 0.22 * (1 - smooth(INTERCEPT.fire, INTERCEPT.pass, tau)))
          const back = smooth(0, 2.5, tau)
          eye.lerp(tmp.copy(blastAt).add(iv.c.set(2.6 * H, -2.2 * H, 9.5 * H)), back)
          if (tau > 0) target.copy(blastAt)
          fov = lerp(48, 40, back)
          shake = tau < 0 ? 0.12 + 0.9 * Math.exp(-Math.abs(tau - INTERCEPT.pass) * 2.5) : 0.25 + 2.4 * Math.exp(-tau * 1.6)
          break
        }
        // Follow the rocket until it blows up, then hold on the spot and back away as the cloud grows; the blast shakes the camera.
        if (boom < 0) onAxis(0.4, target)
        else target.copy(blastAt)
        const back = smooth(0, 2.5, boom)
        eye.copy(target).add(tmp.set(lerp(1.5, 2.6, back) * H, lerp(-1.2, -2.2, back) * H, lerp(4.5, 9.5, back) * H))
        fov = 40
        shake = boom < 0 ? 0.25 : 0.25 + 2.4 * Math.exp(-boom * 1.6)
        break
      }
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
        // From ahead of the nose, looking back down the stack: the halves fall away from the camera, toward the limb.
        onAxis(1 - ((0.55 + 0.9 * smooth(0.35, 1, p)) * L) / H, target)
        eye.copy(target).addScaledVector(axis, lerp(1.7, 2.6, p) * L).add(tmp.set(0, 0, lerp(2.7, 2.2, p) * L))
        // Low enough that the limb and black space stay in the top of the frame.
        eye.y = target.y + lerp(0.95, 0.8, p) * L
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
        eye.copy(target).addScaledVector(tmp, gap * lerp(1.9, 1.6, p)).addScaledVector(axis, gap * lerp(-0.5, 0.5, p))
        eye.y += gap * 0.5
        fov = 36
        widen = 1.9
        break
      }
    }
    if (!space && eye.y < 1.5) eye.y = 1.5
    // A tall screen sees far more sky: look down more steeply, so the Earth, not black space, fills it (the burn shot already looks down).
    if (space && tall > 1 && id !== 'burn') eye.y += eye.distanceTo(target) * 0.18 * Math.min(tall - 1, 1.5)
    const dist = eye.distanceTo(target)
    if (shake > 0 && !options.reducedMotion) {
      const k = shake * dist * 0.006
      target.x += (Math.sin(t * 47.3) + Math.sin(t * 31.7 + 1.3)) * k
      target.y += (Math.sin(t * 53.1 + 0.7) + Math.sin(t * 38.9 + 2.1)) * k
    }
    if (space && !options.reducedMotion) {
      // A camera held by hand, not bolted down: it breathes a little.
      const k = dist * 0.0035
      target.x += (Math.sin(t * 1.3) + 0.6 * Math.sin(t * 2.9 + 1.7)) * k
      target.y += (Math.sin(t * 1.7 + 0.4) + 0.6 * Math.sin(t * 3.7 + 2.3)) * k
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
      globe.quaternion.copy(spin.setFromAxisAngle(Z, (downrangeM(met) + GROUND_MS * t) / EARTH_R)).multiply(globeStart)
    } else {
      // How much of the air is below the camera: the sky overhead darkens and the pale band on the horizon narrows.
      skyU.uSpace.value = eye.y > AIR ? 1 - Math.exp((AIR - eye.y) / 9_000) : 0
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
    clouds.begin()
    fireball.begin()
    debris.begin()
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
        // Pad clouds: the flame trench throws steam and smoke out of both ends. It rolls out along the ground,
        // piles up as high as half the rocket by the time the tower is cleared, and hangs there.
        const s = t - ignition
        // The engines stay in view while they light; once the rocket is off the pad the clouds close in under it.
        const clear = 1 - 0.85 * smooth(0.5, 5, met)
        for (let i = 0; i < 220; i++) {
          const age = s - 0.2 - hash(i + 0.4) * 4.2
          if (age <= 0) continue
          const dir = i % 2 === 0 ? 1 : -1
          const out = 1 - Math.exp(-age * 0.8)
          const reach = pad.mount * 0.9 * clear + H * (0.15 * clear + 1.5 * hash(i)) * out
          const size = H * (0.08 + 0.18 * Math.pow(age, 0.55)) * (0.6 + 0.8 * hash(i + 0.75))
          // Some of it piles up in towers: puffs come in groups of eight that share how high they climb.
          // Under the rocket the blast keeps the bank low, so the flame shows down to the pad.
          const lift = H * 0.5 * hash(i + 0.25) ** 2 * (0.4 + 0.9 * hash((i >> 3) + 0.6)) * (1 - Math.exp(-age * 0.45)) * (0.25 + 0.75 * smooth(0, 0.6 * H, reach))
          clouds.add(dir * reach, size * 0.28 + lift, (hash(i + 0.5) - 0.5) * H * (0.2 + 0.9 * (1 - Math.exp(-age * 0.35))), size * (0.6 + 0.4 * smooth(0, 0.4 * H, reach)), Math.min(age * 4, 1) * clamp01((14 - age) / 5), Math.exp(-age * 2.5) * 0.25, hash(i + 0.1))
        }
      }
      if (thrust > 0 || id === 'failure' || met > 0) {
        // Exhaust trail: puffs left at fixed spots along the path, growing as they age.
        const from = air ? 5 : 0.3
        const gap = W * 1.6
        // Solid motors lay a thick white trail, dense enough to look solid. Liquid engines leave thin wisps,
        // hydrogen ones little more than steam.
        const trail = Math.max(smokiness(n1.propellant), nb && sB <= 0 ? smokiness(nb.propellant) : 0)
        const dense = trail > 0.8
        const head = id === 'failure' ? Math.min(met, missionTime(timeline, stage.start + BLAST * (stage.end - stage.start))) : met
        if (head > from) {
          // The smoke starts where the flame ends: on the pad that is under the ground, so the flame stands clear.
          const lead = H * 0.55 * Math.max(0.85 * flameReach(n1.propellant), nb && sB <= 0 ? 0.95 * flameReach(nb.propellant) : 0)
          const s0 = pathS(head) - lead
          const first = Math.floor(s0 / gap)
          const floor = pathS(from)
          // The flame points along the rocket's axis, not along its path: new smoke leaves the end of each burning nozzle's
          // flame on that axis and bends onto the path flown over two rocket lengths. The rocket's attitude holds after a blast.
          tail.set(0, -1, 0).applyQuaternion(model.root.quaternion)
          basePos(head, trailHead)
          basePos(metAtPath(s0, from, head), trailStart)
          const sources = nb && sB <= 0 ? model.boosters.length : 0
          for (let j = 0; j < 70; j++) {
            const s = (first - j) * gap
            if (s < floor) break
            const m = metAtPath(s, from, head)
            const age = met - m + 0.05
            basePos(m, p3)
            const bend = smooth(0, 2 * H, p3.distanceTo(trailStart))
            const b = sources ? model.boosters[Math.abs((first - j) % sources)]!.home : null
            exhaust.set(b ? b.x : 0, b ? b.y + nb!.y : model.stage1.position.y + n1.y, b ? b.z : 0).applyQuaternion(model.root.quaternion)
            exhaust.add(trailHead).addScaledVector(tail, lead + p3.distanceTo(trailStart))
            p3.lerp(exhaust, 1 - bend)
            // The newest puffs of dense smoke are small, not thin: it is opaque from the start.
            const young = Math.min(1, j / 3 + (dense ? 0.4 : 0.2))
            const size = W * (3 + 4.5 * Math.sqrt(age)) * (0.8 + 0.4 * hash(first - j)) * (dense ? young : 1)
            const spread = size * 0.5 * lerp(0.3, 1, bend)
            p3.x += (hash(first - j + 0.3) - 0.5) * spread
            p3.z += (hash(first - j + 0.6) - 0.5) * spread
            ;(dense ? clouds : puffs).add(p3.x, p3.y, p3.z, size, trail * (dense ? 1 : young) * (1 - j / 70) * lerp(1, 0.55, thin), Math.exp(-age * 5) * 0.6, hash(first - j + 0.9))
          }
        }
      }
      if (boom >= 0) addBlast(boom, blastAt, blastUp, H, fireball, debris)
      if (jet && missile) {
        const tau = t - blastT
        jet.root.visible = (id === 'intercept' || id === 'failure') && tau > INTERCEPT.enter - 0.2 && tau < JET_END
        if (jet.root.visible) jetAt(tau, jet.root.position, jet.root.quaternion)
        for (const f of jet.flames) f.scale.z = 0.9 + 0.15 * Math.sin(t * 40 + f.position.x)
        missile.visible = jet.root.visible && tau >= INTERCEPT.fire && tau < 0
        if (missile.visible) {
          missileAt(tau, missile.position)
          missile.lookAt(missileAt(tau + 0.03, p3))
          // The motor's flame, then its white smoke trail, left behind in the air and thickening as it ages.
          if (tau > INTERCEPT.fire + 0.3) {
            iv.a.copy(missile.position).sub(p3).setLength(2).add(missile.position)
            fireball.add(iv.a.x, iv.a.y, iv.a.z, 1.4 + 0.3 * Math.sin(t * 50), 1, 1.4, t * 3)
          }
        }
        smokeTrail.begin()
        if (tau > INTERCEPT.fire + 0.3) {
          for (let j = 0; j < 180; j++) {
            const at = Math.min(tau, 0) - j * 0.03
            if (at < INTERCEPT.fire + 0.3) break
            const age = tau - at
            smokeTrail.add(missileAt(at, p3), 2 + 9 * Math.sqrt(age), 0.95 * Math.exp(-age / 5) * Math.min(1, (j + 1) / 4))
          }
        }
        smokeTrail.commit(camera.position)
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
      // The fairing's pushers vent along the split line.
      burst(sF * 2, 1 - (0.8 * spec.fairing.length) / H, 6, spec.fairing.radius * 0.35)
    }
    if (storm) {
      camera.updateMatrixWorld()
      // The rocket's ends where it is now; where it blew up, after.
      if (boom < 0) onAxis(1, nose), onAxis(0, tail)
      else nose.copy(blastAt).addScaledVector(blastUp, 0.5 * H), tail.copy(blastAt).addScaledVector(blastUp, -0.5 * H)
      const lit = storm.update(t, camera, blastT - STORM.strikeLead, nose, tail)
      // Overcast: no hard sunlight, a grey wash of sky light, and lightning lighting everything up for an instant.
      sunLight.intensity *= 0.3
      hemi.color.set(0x8a93a3)
      hemi.groundColor.set(0x3a3c40)
      hemi.intensity = 0.55 + 2.5 * lit
      scene.environmentIntensity *= 0.5
    }
    sunView.copy(sun).transformDirection(camera.matrixWorldInverse)
    puffs.commit(sunView, 1, space)
    clouds.commit(sunView, 1, space, camera.matrixWorldInverse)
    fireball.commit(sunView, 1, space, camera.matrixWorldInverse)
    debris.commit(sunView, 1, space)

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
