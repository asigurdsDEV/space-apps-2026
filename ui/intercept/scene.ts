// The sandbox interception film. Camera, jet, missile and blast are all driven by screen time,
// so Skip, Replay and reduced-motion stills land on the same frame. The missile follows a path
// fixed when the shot was written. It does not steer.
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { CraftSpec } from '../scene3d/model'
import { buildCraft } from '../scene3d/craft'
import { addBlast, piecePos } from '../scene3d/launch/blast'
import { makePuffs } from '../scene3d/launch/fx'
import { buildRocket } from '../scene3d/launch/rocket'
import type { RocketSpec } from '../scene3d/launch/vehicles'
import { buildFighter, buildMissile } from './jet'
import { INTERCEPT_DURATION, missileAlong, shotAt, shotProgress, timeScale, type ShotId } from './timeline'

export interface InterceptSceneOptions {
  rocket: RocketSpec
  craft: CraftSpec
  reducedMotion: boolean
  onFrame?: (t: number, shot: ShotId) => void
  onEnd?: () => void
}

export interface InterceptScene {
  seek(t: number): void
  play(): void
  pause(): void
  dispose(): void
}

const SUN = new THREE.Vector3(0.35, 0.72, 0.25).normalize()
const UP = new THREE.Vector3(0, 1, 0)
const NIGHT = new THREE.Color(0x101820)
const camScratch = new THREE.Vector3()

function disposeTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(material)) material.forEach((item) => item.dispose())
    else material?.dispose()
  })
}

export function createInterceptScene(container: HTMLElement, options: InterceptSceneOptions): InterceptScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.92
  renderer.shadowMap.enabled = !options.reducedMotion
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x16324f)
  scene.fog = new THREE.FogExp2(0x1c4060, 0.00035)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.2, 8000)

  const sun = new THREE.DirectionalLight(0xfff4e4, 3.1)
  sun.position.copy(SUN).multiplyScalar(80)
  sun.castShadow = renderer.shadowMap.enabled
  scene.add(sun)
  scene.add(new THREE.HemisphereLight(0xc5d7e6, 0x6a5a48, 0.85))
  const rim = new THREE.DirectionalLight(0x9ec7ff, 0.8)
  rim.position.set(-30, 10, -20)
  scene.add(rim)

  const flight = new THREE.Group()
  scene.add(flight)
  const rocket = buildRocket(options.rocket)
  flight.add(rocket.root)
  const craft = buildCraft(options.craft)
  craft.scale.setScalar(Math.min(1, (rocket.payloadRadius * 1.6) / 2))
  rocket.payload.add(craft)

  const fighter = buildFighter()
  fighter.root.position.set(rocket.footprint + 16, rocket.height * 0.62, -8)
  flight.add(fighter.root)
  const missile = buildMissile()
  missile.visible = false
  scene.add(missile)

  const exhaust = new THREE.PointLight(0xff8a3a, 8, 18)
  fighter.nozzle.add(exhaust)
  const blastLight = new THREE.PointLight(0xffc080, 0, 400)
  scene.add(blastLight)

  const shards: THREE.Mesh[] = []
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xc5ccd4, metalness: 0.6, roughness: 0.42 })
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4 + (i % 3), 0.8, 2.2 + (i % 4)), shardMat)
    mesh.castShadow = true
    mesh.visible = false
    scene.add(mesh)
    shards.push(mesh)
  }

  const fire = makePuffs(160, undefined, true)
  const smoke = makePuffs(220)
  scene.add(fire.mesh, smoke.mesh)
  const shock = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 1.15, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe2c4, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }),
  )
  shock.rotation.x = Math.PI / 2
  scene.add(shock)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.45, 0.92)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const clock = { t: 0, playing: false, raf: 0, last: 0, ended: false }
  const look = new THREE.Vector3()
  const from = new THREE.Vector3()
  const hard = new THREE.Vector3()
  const nose = new THREE.Vector3()
  const blastAt = new THREE.Vector3()
  const sunView = new THREE.Vector3()

  const resize = () => {
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    bloom.setSize(w, h)
    camera.aspect = w / Math.max(1, h)
    camera.updateProjectionMatrix()
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(container)

  const frame = (t: number) => {
    const shot = shotAt(t)
    const u = shotProgress(t)
    const climb = Math.min(t, 8) * 28
    flight.position.y = climb
    flight.updateMatrixWorld(true)
    // The jet slides up from behind the stack, then holds station for the reveal.
    const join = Math.min(1, t / 3.2)
    fighter.root.position.x = rocket.footprint + 28 - join * 12
    fighter.root.position.z = -26 + join * 18
    fighter.root.position.y = rocket.height * 0.62
    fighter.root.rotation.y = shot.id === 'release' || shot.id === 'intercept' ? -0.18 - u * 0.25 : -0.08
    fighter.root.rotation.z = Math.sin(t * 1.4) * 0.02
    const blink = Math.sin(t * 7) > 0 ? 2.4 : 0.3
    ;(fighter.lights.left.material as THREE.MeshStandardMaterial).emissiveIntensity = blink
    ;(fighter.lights.right.material as THREE.MeshStandardMaterial).emissiveIntensity = blink
    ;(fighter.lights.tail.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + blink
    exhaust.intensity = 6 + Math.sin(t * 30) * 2

    fighter.hardpoint.getWorldPosition(hard)
    flight.localToWorld(nose.set(0, rocket.height * 0.72, 0))
    const along = missileAlong(t)
    const arc = Math.sin(along * Math.PI) * 6
    missile.visible = along > 0.001 && along < 0.998
    missile.position.copy(hard).lerp(nose, along)
    missile.position.y += arc
    missile.lookAt(nose)
    missile.rotateY(Math.PI)
    const plume = missile.getObjectByName('plume') as THREE.Mesh | undefined
    if (plume) plume.scale.setScalar(along > 0.02 ? 0.4 + along * 2.4 : 0.05)

    const broken = shot.id === 'explosion'
    rocket.root.visible = !broken
    fighter.root.visible = shot.id !== 'explosion' || u < 0.45
    const since = broken ? u * (shot.end - shot.start) : -1
    shards.forEach((mesh, i) => {
      mesh.visible = broken
      if (!broken) return
      piecePos(i, since, nose, UP, rocket.height, mesh.position)
      mesh.rotation.set(since * (0.4 + i * 0.1), since * 0.7, since * 0.2)
    })

    fire.begin()
    smoke.begin()
    if (broken) {
      addBlast(since, nose, UP, Math.max(18, rocket.height * 0.35), fire, smoke)
      blastLight.position.copy(nose)
      blastLight.intensity = 80 * Math.exp(-since * 0.7)
      shock.position.copy(nose)
      shock.scale.setScalar(1 + since * rocket.height * 0.35)
      ;(shock.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - since / 3))
      renderer.toneMappingExposure = 0.92 + 0.7 * Math.exp(-since * 1.2)
      bloom.strength = 0.28 + 0.45 * Math.exp(-since)
    } else {
      blastLight.intensity = 0
      ;(shock.material as THREE.MeshBasicMaterial).opacity = 0
      renderer.toneMappingExposure = 0.92
      bloom.strength = 0.22
    }
    sunView.copy(SUN).transformDirection(camera.matrixWorldInverse)
    fire.commit(sunView, 1, false, camera.matrixWorldInverse)
    smoke.commit(sunView, 1, false, camera.matrixWorldInverse)

    // Camera. Release stays close on the rail; the blast pulls wide.
    const span = Math.max(rocket.height, 24)
    if (shot.id === 'climb') {
      from.set(span * 0.55, climb + span * 0.42, -span * 0.95)
      look.set(span * 0.2, climb + span * 0.5, 2)
    } else if (shot.id === 'reveal') {
      const a = u * Math.PI * 0.85
      from.copy(fighter.root.getWorldPosition(blastAt)).add(camScratch.set(Math.sin(a) * 28, 8 + u * 6, Math.cos(a) * 28))
      look.copy(blastAt)
    } else if (shot.id === 'release') {
      from.copy(hard).add(camScratch.set(18, 7, 20))
      look.copy(missile.position)
    } else if (shot.id === 'intercept') {
      const follow = u < 0.55
      from.copy(follow ? missile.position : nose).add(camScratch.set(18, 10, follow ? -20 : 26))
      look.copy(follow ? nose : missile.position)
    } else {
      const pull = 1 + u * 2.2
      from.set(span * 0.7 * pull, climb + span * 0.35, -span * pull)
      look.copy(nose)
    }
    camera.position.copy(from)
    camera.lookAt(look)
    const sky = broken ? 0.25 + u * 0.4 : Math.min(1, t / 6)
    ;(scene.background as THREE.Color).set(0x16324f).lerp(NIGHT, sky)
    composer.render()
    options.onFrame?.(t, shot.id)
  }

  const tick = (now: number) => {
    clock.raf = requestAnimationFrame(tick)
    const dt = Math.min(0.05, (now - clock.last) / 1000 || 0)
    clock.last = now
    if (!clock.playing) return
    clock.t += dt * timeScale(shotAt(clock.t).id)
    frame(clock.t)
    if (clock.t >= INTERCEPT_DURATION && !clock.ended) {
      clock.ended = true
      clock.playing = false
      options.onEnd?.()
    }
  }

  frame(0)
  return {
    seek(t: number) {
      clock.t = Math.max(0, Math.min(INTERCEPT_DURATION, t))
      clock.ended = false
      frame(clock.t)
    },
    play() {
      clock.playing = true
      clock.ended = false
      clock.last = performance.now()
      if (!clock.raf) clock.raf = requestAnimationFrame(tick)
    },
    pause() {
      clock.playing = false
    },
    dispose() {
      cancelAnimationFrame(clock.raf)
      observer.disconnect()
      disposeTree(flight)
      disposeTree(missile)
      shards.forEach((mesh) => { mesh.geometry.dispose() })
      shardMat.dispose()
      fire.mesh.geometry.dispose()
      smoke.mesh.geometry.dispose()
      ;(fire.mesh.material as THREE.Material).dispose()
      ;(smoke.mesh.material as THREE.Material).dispose()
      shock.geometry.dispose()
      ;(shock.material as THREE.Material).dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
