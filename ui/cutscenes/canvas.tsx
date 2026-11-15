// The 3D pictures inside the story frame. three.js loads only with this module.
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildCraft, disposeObject } from '../scene3d/craft'
import { sceneSpec } from '../scene3d/model'
import { arrival } from './room'
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
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
      // The arrival room and the cabin walk fill the screen. Cap the buffer so a 2× display does not render twice.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w > 1400 ? 1.25 : 1.5))
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

/** Slow at both ends so a shot does not start or stop with a jerk. */
function ease(t: number) {
  const u = Math.min(1, Math.max(0, t))
  return u * u * (3 - 2 * u)
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
      const e = ease(progress)
      planet.rotation.y = progress * 0.6
      craft.position.set(lerp(3.4, 1.65, e), lerp(0.55, 0.2, e), lerp(1.4, 0.35, e))
      craft.lookAt(planet.position)
      camera.position.set(lerp(0.2, 0.8, e), 1.15, distance(aspect, 4.3))
      camera.lookAt(lerp(1.2, 0.4, e), 0.2, 0)
    },
    dispose() {},
  }
}

function anomaly(scene: THREE.Scene, camera: THREE.PerspectiveCamera): Shot {
  // Near-black like the other shots; the pulsing red light alone says "alarm" (no floating lamp).
  scene.background = new THREE.Color(0x000002)
  lights(scene, 0xffe4e8, 0xff4455)
  stars(scene, 160)
  const craft = craftMesh()
  craft.scale.setScalar(0.95)
  craft.rotation.y = 0.7
  scene.add(craft)
  const alarm = new THREE.PointLight(0xff2040, 2, 8)
  alarm.position.set(0.2, 0.55, 0.9)
  scene.add(alarm)
  return {
    update(progress, elapsedMs, aspect) {
      const blink = Math.abs(Math.sin(elapsedMs / 160))
      alarm.intensity = blink * 8
      const e = ease(progress)
      craft.rotation.y = 0.7 + e * 0.25
      camera.position.set(0.35, 0.7, lerp(distance(aspect, 3.2), distance(aspect, 2.3), e))
      camera.lookAt(0, 0, 0)
    },
    dispose() {},
  }
}

/** A small painted map. Shared by the walk-in bay so the shot stays a handful of simple shapes. */
function bayPaint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return texture
}

function paintPanels(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#d7dbe3'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#8b929e'
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
  for (let y = 10; y < 256; y += 64) {
    for (let x = 10; x < 256; x += 64) {
      ctx.beginPath()
      ctx.arc(x, y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function paintMli(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#c8963c'
  ctx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 4) {
    const k = 0.45 + 0.55 * Math.sin(y * 0.19)
    ctx.fillStyle = `rgba(${30 + k * 70},${16 + k * 30},0,${0.12 + 0.28 * (1 - k)})`
    ctx.fillRect(0, y, 256, 3)
  }
}

function paintRadiator(ctx: CanvasRenderingContext2D) {
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
}

function paintAvionics(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#1b212c'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#8d96a3'
  ctx.fillRect(16, 34, 30, 16)
  ctx.fillRect(16, 68, 30, 16)
  ctx.fillStyle = '#3ddc97'
  ctx.beginPath()
  ctx.arc(98, 42, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#5c6570'
  for (const [x, y] of [[8, 8], [114, 8], [8, 114], [114, 114]] as const) {
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintEarth(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#1d5eae'
  ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#6e8d46'
  for (const [x, y, rx, ry] of [[48, 52, 34, 20], [78, 74, 16, 12], [150, 46, 38, 22], [196, 78, 20, 14]] as const) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.ellipse(96, 34, 28, 7, 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(176, 62, 24, 6, -0.3, 0, Math.PI * 2)
  ctx.fill()
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
  // The bay is an uncrewed spacecraft opened up: white panels, gold insulation, boxes, a tank,
  // reaction wheels, a radiator and a harness. Shapes stay boxes and cylinders so the shot stays light.
  const panels = bayPaint(256, 256, paintPanels, 2, 2)
  const bayMat = new THREE.MeshStandardMaterial({ map: panels, color: 0xffffff, roughness: 0.62, metalness: 0.16, side: THREE.BackSide })
  const bay = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.4, 5.2), bayMat)
  bay.position.set(0, 1.7, -7.4)
  scene.add(bay)
  const mliMap = bayPaint(256, 256, paintMli, 3, 1)
  const blanket = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 4.4),
    new THREE.MeshStandardMaterial({ map: mliMap, metalness: 0.84, roughness: 0.36, side: THREE.DoubleSide }),
  )
  blanket.rotation.x = Math.PI / 2
  blanket.position.set(0, 3.28, -7.4)
  scene.add(blanket)
  const boxSide = new THREE.MeshStandardMaterial({ color: 0x232833, metalness: 0.55, roughness: 0.4 })
  const boxFace = new THREE.MeshStandardMaterial({ map: bayPaint(128, 128, paintAvionics), metalness: 0.3, roughness: 0.5 })
  const leftMats = [boxFace, boxSide, boxSide, boxSide, boxSide, boxSide]
  const rightMats = [boxSide, boxFace, boxSide, boxSide, boxSide, boxSide]
  for (const [x, y, z] of [[-3.2, 1.15, -7.1], [-3.2, 1.75, -8.2], [3.2, 1.2, -8.3]] as const) {
    const unit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.7), x < 0 ? leftMats : rightMats)
    unit.position.set(x, y, z)
    scene.add(unit)
  }
  const tank = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xe7e4dc, metalness: 0.25, roughness: 0.32 }),
  )
  tank.position.set(2.15, 0.4, -8.7)
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.39, 0.025, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x9aa3b0, metalness: 0.7, roughness: 0.3 }),
  )
  band.rotation.x = Math.PI / 2
  tank.add(band)
  scene.add(tank)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xc5ccd4, metalness: 0.86, roughness: 0.26 })
  for (const [x, z] of [[2.35, -7.15], [2.7, -7.15], [2.52, -7.5]] as const) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 20), wheelMat)
    wheel.position.set(x, 2.55, z)
    scene.add(wheel)
  }
  const radiator = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.05),
    new THREE.MeshStandardMaterial({ map: bayPaint(256, 256, paintRadiator), metalness: 0.35, roughness: 0.55, side: THREE.DoubleSide }),
  )
  radiator.position.set(3.35, 2.15, -6.5)
  radiator.rotation.y = -Math.PI / 2
  scene.add(radiator)
  const harnessMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.72 })
  for (const x of [-3.2, 3.2]) {
    const run = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 3.2), harnessMat)
    run.position.set(x, 0.18, -7.6)
    scene.add(run)
  }
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.05, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xfff4e0, emissiveIntensity: 0.8 }),
  )
  strip.position.set(0, 3.2, -7.2)
  scene.add(strip)
  const bayLight = new THREE.PointLight(0xfff3dd, 5, 9, 1.5)
  bayLight.position.set(0, 2.9, -7.2)
  scene.add(bayLight)
  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.04, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xc5ccd6, metalness: 0.7, roughness: 0.3 }),
  )
  frame.position.set(0, 1.7, -9.9)
  scene.add(frame)
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 32, 20),
    new THREE.MeshStandardMaterial({ map: bayPaint(256, 128, paintEarth), roughness: 0.65 }),
  )
  earth.position.set(0, 1.72, -9.55)
  scene.add(earth)
  const air = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x8eb8ff, transparent: true, opacity: 0.28, depthWrite: false }),
  )
  air.position.copy(earth.position)
  scene.add(air)
  return {
    update(progress, _elapsed, aspect) {
      const travel = ease(entering ? progress : 1 - progress)
      const z = lerp(distance(aspect, 4.6), -6.2, travel)
      // End a little to the left so the window and the equipment on the right wall are both in frame.
      camera.position.set(lerp(0, -0.7, travel), lerp(1.7, 1.55, travel), z)
      camera.lookAt(lerp(0, 1.1, travel), 1.55, lerp(-4.2, -8.2, travel))
      screens.forEach((screen, i) => {
        const mat = screen.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(progress * 6 + i))
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
      camera.position.set(0, 0.7, lerp(distance(aspect, 4.4), distance(aspect, 3.5), ease(progress)))
      camera.lookAt(0, 0.15, 0)
    },
    dispose() {},
  }
}
