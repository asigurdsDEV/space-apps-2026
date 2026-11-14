// The 3D pictures inside the story frame. three.js loads only with this module.
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildCraft, disposeObject } from '../scene3d/craft'
import { sceneSpec } from '../scene3d/model'
import { CUTSCENE_SCENE_MS, shotProgress, type CutsceneCanvasProps, type CutsceneSceneId } from './timing'

export type { CutsceneCanvasProps }

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function CutsceneCanvas({ kind, body = 'moon', durationMs }: CutsceneCanvasProps) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)
  const duration = durationMs ?? CUTSCENE_SCENE_MS[kind]

  useEffect(() => {
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      setFailed(true)
      return
    }
    if (!renderer.getContext()) {
      renderer.dispose()
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = environment
    scene.environmentIntensity = 0.55
    pmrem.dispose()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100)
    const reduced = reducedMotion()
    const shot = makeShot(kind, body, scene, camera)
    let frame = 0
    let stopped = false
    const started = performance.now()

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (w < 2 || h < 2) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const tick = (now: number) => {
      if (stopped) return
      const progress = shotProgress(now - started, duration, reduced)
      shot.update(progress, now - started, camera.aspect)
      renderer.render(scene, camera)
      if (!reduced && progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      shot.dispose()
      disposeObject(scene)
      environment.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [host, kind, body, duration])

  return (
    <div className="cs" ref={setHost} aria-hidden="true">
      {failed && <p className="cs-fallback">This cutscene needs WebGL, which is turned off in this browser.</p>}
    </div>
  )
}

interface Shot {
  update(progress: number, elapsedMs: number, aspect: number): void
  dispose(): void
}

/** Portrait phones see less width, so the same shot sits further back. */
function distance(aspect: number, desktop: number) {
  return aspect < 0.9 ? desktop * 1.45 : desktop
}

function makeShot(kind: CutsceneSceneId, body: 'moon' | 'mars', scene: THREE.Scene, camera: THREE.PerspectiveCamera): Shot {
  if (kind === 'arrival') return arrival(scene, camera)
  if (kind === 'orbit') return orbit(scene, camera, body)
  if (kind === 'anomaly') return anomaly(scene, camera)
  if (kind === 'enter-craft') return transit(scene, camera, true)
  if (kind === 'return-control') return transit(scene, camera, false)
  return ending(scene, camera, kind === 'ending-success')
}

function lights(scene: THREE.Scene, sun = 0xfff2e0, fill = 0x6d90d0) {
  scene.add(new THREE.AmbientLight(0x3a4560, 0.35))
  const key = new THREE.DirectionalLight(sun, 2.4)
  key.position.set(4, 6, 5)
  scene.add(key)
  const bounce = new THREE.DirectionalLight(fill, 0.5)
  bounce.position.set(-4, 1, -2)
  scene.add(bounce)
}

function stars(scene: THREE.Scene, count = 280) {
  const positions = new Float32Array(count * 3)
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < count; i++) {
    const r = 8 + rnd() * 16
    const theta = rnd() * Math.PI * 2
    const phi = Math.acos(2 * rnd() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdfe7ff, size: 0.035, sizeAttenuation: true })))
}

function craftMesh() {
  const craft = buildCraft(sceneSpec({ entities: [], params: {} }).craft)
  craft.scale.setScalar(0.45)
  return craft
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function arrival(scene: THREE.Scene, camera: THREE.PerspectiveCamera): Shot {
  scene.background = new THREE.Color(0x070b14)
  lights(scene, 0xd7e4ff, 0x8aa4d4)
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.9 })))
  const wall = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.2), new THREE.MeshStandardMaterial({ color: 0x101622, roughness: 0.8 }))
  wall.position.set(0, 2.4, -4.2)
  scene.add(wall)
  const screens: THREE.Mesh[] = []
  const colors = [0x1a6bff, 0x3ec6c6, 0x2450c8, 0x7fd0ff, 0x163a8a, 0x49e0a8]
  colors.forEach((color, i) => {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.95),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.4 }),
    )
    const col = i % 3
    const row = Math.floor(i / 3)
    screen.position.set(-2.1 + col * 2.1, 3.15 - row * 1.25, -4.05)
    scene.add(screen)
    screens.push(screen)
  })
  for (const x of [-2.2, 0, 2.2]) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.72, 0.7), new THREE.MeshStandardMaterial({ color: 0x1c2436, metalness: 0.2, roughness: 0.6 }))
    desk.position.set(x, 0.36, 1.15)
    scene.add(desk)
  }
  return {
    update(progress, _elapsed, aspect) {
      camera.position.set(0, lerp(1.7, 1.55, progress), lerp(distance(aspect, 5.4), distance(aspect, 2.7), progress))
      camera.lookAt(0, 1.7, -4)
      screens.forEach((screen, i) => {
        const mat = screen.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(progress * 8 + i))
      })
    },
    dispose() {},
  }
}

function orbit(scene: THREE.Scene, camera: THREE.PerspectiveCamera, body: 'moon' | 'mars'): Shot {
  scene.background = new THREE.Color(0x000002)
  lights(scene)
  stars(scene)
  const color = body === 'mars' ? 0xb5522a : 0xc8c4bc
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }))
  planet.position.set(-0.7, -0.15, -0.4)
  scene.add(planet)
  if (body === 'mars') {
    const air = new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xc46a45, transparent: true, opacity: 0.18, depthWrite: false }),
    )
    air.position.copy(planet.position)
    scene.add(air)
  }
  const craft = craftMesh()
  scene.add(craft)
  return {
    update(progress, _elapsed, aspect) {
      planet.rotation.y = progress * 0.6
      craft.position.set(lerp(3.4, 1.65, progress), lerp(0.55, 0.2, progress), lerp(1.4, 0.35, progress))
      craft.lookAt(planet.position)
      camera.position.set(lerp(0.2, 0.8, progress), 1.15, distance(aspect, 4.3))
      camera.lookAt(lerp(1.2, 0.4, progress), 0.2, 0)
    },
    dispose() {},
  }
}

function anomaly(scene: THREE.Scene, camera: THREE.PerspectiveCamera): Shot {
  scene.background = new THREE.Color(0x14060c)
  lights(scene, 0xffe4e8, 0xff4455)
  stars(scene, 160)
  const craft = craftMesh()
  craft.scale.setScalar(0.95)
  craft.rotation.y = 0.7
  scene.add(craft)
  const alarm = new THREE.PointLight(0xff2040, 2, 8)
  alarm.position.set(0.2, 0.55, 0.9)
  scene.add(alarm)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff2040 }))
  beacon.position.set(0, 0.28, 0.15)
  scene.add(beacon)
  return {
    update(progress, elapsedMs, aspect) {
      const blink = Math.abs(Math.sin(elapsedMs / 160))
      alarm.intensity = blink * 8
      beacon.scale.setScalar(1 + blink * 0.45)
      craft.rotation.y = 0.7 + progress * 0.25
      camera.position.set(0.35, 0.7, lerp(distance(aspect, 3.2), distance(aspect, 2.3), progress))
      camera.lookAt(0, 0, 0)
    },
    dispose() {},
  }
}

/** Hall in front of the wall, walk-in spacecraft behind the doorway. */
function transit(scene: THREE.Scene, camera: THREE.PerspectiveCamera, entering: boolean): Shot {
  scene.background = new THREE.Color(0x070b14)
  lights(scene, 0xd7e4ff, 0x8aa4d4)
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 18), new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.9 })))
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x101622, roughness: 0.8 })
  for (const x of [-5.6, 5.6]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4.8, 6, 0.2), wallMat)
    wall.position.set(x, 2.4, -4.2)
    scene.add(wall)
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 0.2), wallMat)
  lintel.position.set(0, 4.3, -4.2)
  scene.add(lintel)
  const screens: THREE.Mesh[] = []
  ;[0x1a6bff, 0x3ec6c6, 0x7fd0ff].forEach((color, i) => {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.7),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.4 }),
    )
    screen.position.set(-5.5 + i * 1.35, 3.3, -4.05)
    scene.add(screen)
    screens.push(screen)
  })
  for (const x of [-2.4, 2.4]) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.72, 0.7), new THREE.MeshStandardMaterial({ color: 0x1c2436, metalness: 0.2, roughness: 0.6 }))
    desk.position.set(x, 0.36, 0.4)
    scene.add(desk)
  }
  const bay = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.4, 5.2), new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.75, side: THREE.BackSide }))
  bay.position.set(0, 1.7, -7.4)
  scene.add(bay)
  const modules: THREE.Mesh[] = []
  const moduleColors = [0xf0c14a, 0x3ecf8e, 0x4aa3ff, 0xe8eef8]
  moduleColors.forEach((color, i) => {
    const side = i < 2 ? -1 : 1
    const module = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.7, 0.9),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, metalness: 0.35, roughness: 0.45 }),
    )
    module.position.set(side * 2.4, 1.55, -6.6 - (i % 2) * 1.3)
    scene.add(module)
    modules.push(module)
  })
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 32),
    new THREE.MeshStandardMaterial({ color: 0x163a6b, emissive: 0x2f6fd0, emissiveIntensity: 0.7, roughness: 0.2 }),
  )
  glass.position.set(0, 1.7, -9.95)
  scene.add(glass)
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshStandardMaterial({ color: 0x3b78d0, roughness: 0.55 }))
  earth.position.set(0.12, 1.78, -9.7)
  scene.add(earth)
  return {
    update(progress, _elapsed, aspect) {
      const travel = entering ? progress : 1 - progress
      const z = lerp(distance(aspect, 4.6), -6.2, travel)
      camera.position.set(0, lerp(1.7, 1.6, travel), z)
      camera.lookAt(0, 1.65, lerp(-4.2, -9.6, travel))
      screens.forEach((screen, i) => {
        const mat = screen.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(progress * 6 + i))
      })
      modules.forEach((module, i) => {
        const mat = module.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.15 + travel * (0.2 + 0.15 * (i % 2))
      })
      earth.rotation.y = progress * 0.8
    },
    dispose() {},
  }
}

function ending(scene: THREE.Scene, camera: THREE.PerspectiveCamera, success: boolean): Shot {
  scene.background = new THREE.Color(success ? 0x03110c : 0x10060a)
  lights(scene, success ? 0xfff2e0 : 0xc8b8b0, success ? 0x6d90d0 : 0x402028)
  stars(scene, 200)
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 40, 28),
    new THREE.MeshStandardMaterial({ color: success ? 0x2f6fd0 : 0x1d3f6e, roughness: 0.7 }),
  )
  scene.add(earth)
  const craft = craftMesh()
  scene.add(craft)
  const links: THREE.Mesh[] = []
  for (let i = 0; i < 8; i++) {
    const link = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 10),
      new THREE.MeshBasicMaterial({ color: success ? 0x7dffa8 : 0xff5a6a, transparent: true, opacity: 0, depthWrite: false }),
    )
    scene.add(link)
    links.push(link)
  }
  const glow = new THREE.PointLight(success ? 0x39e58a : 0xff3355, 0, 5)
  glow.position.copy(earth.position)
  scene.add(glow)
  return {
    update(progress, _elapsed, aspect) {
      const spread = aspect < 0.9 ? 0.55 : 1
      earth.position.set(-1.7 * spread, -0.1, 0)
      craft.position.set(1.7 * spread, 0.15, 0.2)
      earth.rotation.y = progress * 0.5
      const reached = progress / 0.7
      const fade = success ? 1 : 1 - Math.max(0, (progress - 0.62) / 0.38)
      links.forEach((link, i) => {
        const t = i / (links.length - 1)
        link.position.set(lerp(1.35, -1.15, t) * spread, Math.sin(t * Math.PI) * 0.55, 0.1)
        const on = t <= reached ? fade : 0
        ;(link.material as THREE.MeshBasicMaterial).opacity = on
      })
      glow.position.copy(earth.position)
      glow.intensity = success ? progress * 3 : fade * 1.2
      camera.position.set(0, 0.7, lerp(distance(aspect, 4.4), distance(aspect, 3.5), progress))
      camera.lookAt(0, 0.15, 0)
    },
    dispose() {},
  }
}
