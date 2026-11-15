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

/**
 * Mission control, modeled on NASA's Flight Control Room in Houston (MCC-H, FCR-1): tiered rows of
 * consoles facing a wall of big displays. First person: you walk in at the back and take the flight
 * director's seat in the last row, as the CAPCOM line welcomes you.
 */
function arrival(scene: THREE.Scene, camera: THREE.PerspectiveCamera): Shot {
  scene.background = new THREE.Color(0x05080f)
  scene.fog = new THREE.Fog(0x05080f, 12, 28)
  scene.add(new THREE.HemisphereLight(0x9fb6e0, 0x0a0d14, 0.35))

  // Displays: one canvas per picture, shared by the front wall and the console monitors.
  const textures = new Map<(ctx: Ctx, t?: number) => void, { paint: (t: number) => void; texture: THREE.CanvasTexture }>()
  for (const draw of SCREENS) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 288
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    const ctx = canvas.getContext('2d')
    const paint = (t: number) => {
      if (!ctx) return
      draw(ctx, t)
      texture.needsUpdate = true
    }
    paint(0)
    textures.set(draw, { paint, texture })
  }
  const screenMat = (draw: (ctx: Ctx, t?: number) => void) => new THREE.MeshBasicMaterial({ map: textures.get(draw)!.texture, toneMapped: false, fog: false })
  const black = new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.5, metalness: 0.3 })

  // Room shell: carpet, acoustic side walls, dark ceiling with light panels.
  const carpet = patternTexture(256, (ctx) => {
    ctx.fillStyle = '#1a2030'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '90,110,150' : '5,8,14'},${0.18 + Math.random() * 0.2})`
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
  }, 10)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 15), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.z = 0.75
  scene.add(floor)
  const slats = patternTexture(128, (ctx) => {
    ctx.fillStyle = '#1b2232'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#121826'
    for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, 5, 128)
  }, 1)
  slats.repeat.set(30, 1)
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(15, 5), new THREE.MeshStandardMaterial({ map: slats, roughness: 0.95 }))
    wall.rotation.y = -side * Math.PI / 2
    wall.position.set(side * 9, 2.5, 0.75)
    scene.add(wall)
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(18, 5), new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.95 }))
  back.rotation.y = Math.PI
  back.position.set(0, 2.5, 8.2)
  scene.add(back)
  const front = new THREE.Mesh(new THREE.PlaneGeometry(18, 5), new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.9 }))
  front.position.set(0, 2.5, -6.7)
  scene.add(front)
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(18, 15), new THREE.MeshStandardMaterial({ color: 0x0c1019, roughness: 1 }))
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.set(0, 5, 0.75)
  scene.add(ceiling)
  const panels: Place[] = []
  for (let x = -6; x <= 6; x += 3) for (let z = -3; z <= 7; z += 2.5) panels.push([x, 4.99, z, 0, Math.PI / 2])
  instanced(scene, new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ color: 0x5d6a85 }), panels)
  for (const x of [-4, 4]) {
    const down = new THREE.SpotLight(0xdfe6ff, 30, 12, 0.9, 0.7)
    down.position.set(x, 4.9, 2)
    down.target.position.set(x, 0, 1)
    scene.add(down, down.target)
  }

  // Front display wall: the big ground track in the middle, two screens stacked on each side.
  const wallScreens: [(ctx: Ctx, t?: number) => void, number, number, number, number][] = [
    [groundTrack, 0, 2.95, 6.2, 3.49],
    [clock, -5.5, 3.75, 3.2, 1.8],
    [telemetry, -5.5, 1.8, 3.2, 1.8],
    [earthFeed, 5.5, 3.75, 3.2, 1.8],
    [status, 5.5, 1.8, 3.2, 1.8],
  ]
  for (const [draw, x, y, w, h] of wallScreens) {
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08), black)
    bezel.position.set(x, y, -6.62)
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat(draw))
    screen.position.set(x, y, -6.57)
    scene.add(bezel, screen)
  }
  const glow = new THREE.PointLight(0x6f9cff, 14, 10, 1.6)
  glow.position.set(0, 3, -5.4)
  scene.add(glow)

  // Four tiered rows of consoles, each on a riser 30 cm above the one in front, like the real room.
  const desk = new THREE.MeshStandardMaterial({ color: 0x262b35, roughness: 0.55, metalness: 0.15 })
  const top = new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 0.45 })
  const riser = new THREE.MeshStandardMaterial({ color: 0x161c2a, roughness: 0.9 })
  const seat = new THREE.MeshStandardMaterial({ color: 0x0e1016, roughness: 0.7 })
  const strip = new THREE.MeshBasicMaterial({ color: 0x3f6fe0 })
  const bezels: Place[] = []
  const chairs: Place[] = []
  const backs: Place[] = []
  const keyboards: Place[] = []
  const monitors = new Map<(ctx: Ctx, t?: number) => void, Place[]>()
  const rows = 4
  const LAST = rows - 1
  for (let r = 0; r < rows; r++) {
    const h = r * 0.3
    const z = -3 + r * 2.2
    if (r > 0) {
      const end = r === LAST ? 8.2 : z + 1.6
      const deck = new THREE.Mesh(new THREE.BoxGeometry(14, h, end - (z - 0.6)), riser)
      deck.position.set(0, h / 2, (end + z - 0.6) / 2)
      const edge = new THREE.Mesh(new THREE.BoxGeometry(14, 0.025, 0.025), strip)
      edge.position.set(0, h - 0.02, z - 0.6)
      scene.add(deck, edge)
    }
    const counter = new THREE.Mesh(new THREE.BoxGeometry(12, 0.72, 0.7), desk)
    counter.position.set(0, h + 0.36, z)
    const surface = new THREE.Mesh(new THREE.BoxGeometry(12.1, 0.04, 0.85), top)
    surface.position.set(0, h + 0.74, z + 0.05)
    scene.add(counter, surface)
    for (let c = 0; c < 6; c++) {
      const x = -4.75 + c * 1.9
      ;[-0.55, 0, 0.55].forEach((dx, m) => {
        const turn = -dx * 0.5 // outer monitors angle in toward the seat
        const draw = r === LAST && c >= 2 && c <= 3 ? [telemetry, goNoGo, status][m] : SCREENS[(r * 7 + c * 3 + m) % SCREENS.length]
        const list = monitors.get(draw) ?? []
        list.push([x + dx, h + 1.03, z - 0.13, turn])
        monitors.set(draw, list)
        bezels.push([x + dx, h + 1.03, z - 0.155, turn])
      })
      keyboards.push([x, h + 0.77, z + 0.2])
      if (r === LAST && (c === 2 || c === 3)) continue // your seat: the camera sits here
      chairs.push([x, h + 0.48, z + 0.85])
      backs.push([x, h + 0.86, z + 1.12, 0, 0.12])
    }
  }
  instanced(scene, new THREE.BoxGeometry(0.53, 0.34, 0.035), black, bezels)
  for (const [draw, places] of monitors) instanced(scene, new THREE.PlaneGeometry(0.49, 0.3), screenMat(draw), places)
  instanced(scene, new THREE.BoxGeometry(0.46, 0.02, 0.15), black, keyboards)
  instanced(scene, new THREE.BoxGeometry(0.52, 0.09, 0.5), seat, chairs)
  instanced(scene, new THREE.BoxGeometry(0.5, 0.6, 0.07), seat, backs)

  // Mission plaques along the side walls (the real room hangs one per flown mission).
  const plaques: Place[] = []
  for (const side of [-1, 1]) for (let z = -4.5; z <= 6.5; z += 1.6) plaques.push([side * 8.96, 3.9, z, side * Math.PI / 2, Math.PI / 2])
  const plaqueMesh = instanced(scene, new THREE.CylinderGeometry(0.3, 0.3, 0.04, 28), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.5 }), plaques)
  const plaqueColors = [0xc9a24a, 0x3a64c8, 0xb8403a, 0xd0d4dc]
  plaques.forEach((_, i) => plaqueMesh.setColorAt(i, new THREE.Color(plaqueColors[i % plaqueColors.length])))

  let painted = -1
  const deckTop = LAST * 0.3
  return {
    update(progress, elapsedMs, aspect) {
      // Walk in from the back door and sit down: eye height drops from standing (1.65 m) to seated (1.2 m).
      const e = progress * progress * (3 - 2 * progress)
      const sway = 0.015 * Math.sin(elapsedMs / 380) * (1 - e)
      camera.fov = aspect < 0.9 ? 66 : 50
      camera.updateProjectionMatrix()
      camera.position.set(lerp(0.9, 0, e) + sway, deckTop + lerp(1.65, 1.28, e), lerp(7.6, 5.55, e))
      camera.lookAt(0, lerp(2.6, 2.45, e), -6.5)
      // Redraw the moving pictures about 12 times a second; uploading canvases every frame is wasted work on phones.
      const t = elapsedMs / 1000
      if (t - painted < 0.08) return
      painted = t
      for (const [draw, { paint }] of textures) if (draw !== status && draw !== goNoGo) paint(t)
    },
    dispose() {},
  }
}

/** [x, y, z, turn about y, tilt about x] */
type Place = [number, number, number, number?, number?]

function instanced(scene: THREE.Scene, geometry: THREE.BufferGeometry, material: THREE.Material, places: Place[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, places.length)
  const o = new THREE.Object3D()
  places.forEach(([x, y, z, turn = 0, tilt = 0], i) => {
    o.position.set(x, y, z)
    o.rotation.set(tilt, turn, 0, 'YXZ')
    o.updateMatrix()
    mesh.setMatrixAt(i, o.matrix)
  })
  scene.add(mesh)
  return mesh
}

function patternTexture(size: number, draw: (ctx: Ctx) => void, repeat: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  return texture
}

// ---- Mission-control screens for the arrival wall: drawn in 2D, no image files.
type Ctx = CanvasRenderingContext2D
const INK = '#cfe3ff'
const DIM = '#5f7aa3'
const GO = '#49e0a8'
const MONO = 'ui-monospace, Menlo, Consolas, monospace'

/** Dark panel with a title bar, like a real console display. */
function frame(ctx: Ctx, title: string, accent: string) {
  ctx.fillStyle = '#050c18'
  ctx.fillRect(0, 0, 512, 288)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 512, 34)
  ctx.fillStyle = '#04101e'
  ctx.font = `700 20px ${MONO}`
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 14, 18)
  ctx.strokeStyle = accent
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, 509, 285)
}

function groundTrack(ctx: Ctx, t = 0) {
  frame(ctx, 'GROUND TRACK', '#1a6bff')
  const [x0, y0, w, h] = [16, 46, 480, 228]
  ctx.strokeStyle = '#13284a'
  ctx.lineWidth = 1
  for (let i = 0; i <= 12; i++) line(ctx, x0 + (w * i) / 12, y0, x0 + (w * i) / 12, y0 + h)
  for (let i = 0; i <= 6; i++) line(ctx, x0, y0 + (h * i) / 6, x0 + w, y0 + (h * i) / 6)
  // Rough continents, so the map reads as Earth at a glance.
  ctx.fillStyle = '#1d4a3c'
  for (const [cx, cy, rx, ry] of [[110, 110, 55, 38], [150, 200, 28, 45], [262, 105, 30, 22], [270, 175, 30, 48], [360, 110, 75, 35], [420, 220, 28, 16]])
    ellipse(ctx, x0 + (cx / 512) * w * 1.05, y0 + ((cy - 40) / 248) * h, rx, ry)
  // An inclined orbit traced on a flat map is a sine wave; Earth turns under it, so each pass shifts west.
  const track = (s: number) => [x0 + (((s * w) % w) + w) % w, y0 + h / 2 - Math.sin(s * Math.PI * 2) * h * 0.38] as const
  ctx.fillStyle = '#ffd36b'
  for (let s = 0; s < 1; s += 0.004) {
    const [x, y] = track(s)
    ctx.fillRect(x, y, 2, 2)
  }
  const [sx, sy] = track(0.18 + t * 0.05)
  ctx.fillStyle = '#ffffff'
  ellipse(ctx, sx, sy, 7, 7)
  ctx.strokeStyle = '#ffd36b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(sx, sy, 22, 0, Math.PI * 2)
  ctx.stroke()
}

function telemetry(ctx: Ctx, t = 0) {
  frame(ctx, 'TELEMETRY', '#3ec6c6')
  const rows: [string, string, number, (x: number) => number][] = [
    ['POWER', '28.4 W', 0, (x) => 0.55 + 0.25 * Math.sin(x * 0.9)],
    ['TEMP', '21.6 C', 1, (x) => 0.5 + 0.12 * Math.sin(x * 0.35) + 0.05 * Math.sin(x * 2.1)],
    ['SIGNAL', '-92 dBm', 2, (x) => 0.45 + 0.3 * Math.abs(Math.sin(x * 0.5)) - 0.08 * Math.sin(x * 3.3)],
  ]
  for (const [name, value, r, f] of rows) {
    const top = 48 + r * 78
    ctx.fillStyle = DIM
    ctx.font = `600 16px ${MONO}`
    ctx.fillText(name, 16, top + 10)
    ctx.fillStyle = INK
    ctx.fillText(value, 16, top + 34)
    ctx.strokeStyle = '#13284a'
    ctx.lineWidth = 1
    ctx.strokeRect(150, top, 346, 62)
    ctx.strokeStyle = GO
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let x = 0; x <= 346; x += 4) {
      const y = top + 58 - f(x / 20 + t * 3) * 54
      if (x === 0) ctx.moveTo(150 + x, y)
      else ctx.lineTo(150 + x, y)
    }
    ctx.stroke()
  }
}

function clock(ctx: Ctx, t = 0) {
  frame(ctx, 'MISSION CLOCK', '#2450c8')
  const s = Math.floor(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  ctx.textAlign = 'center'
  ctx.fillStyle = DIM
  ctx.font = `600 20px ${MONO}`
  ctx.fillText('MISSION ELAPSED TIME', 256, 82)
  ctx.fillStyle = INK
  ctx.font = `700 64px ${MONO}`
  ctx.fillText(`T+ 00:${pad(Math.floor(s / 60))}:${pad(s % 60)}`, 256, 146)
  ctx.fillStyle = DIM
  ctx.font = `600 20px ${MONO}`
  ctx.fillText('SHIFT 1  ·  FLIGHT DIRECTOR ON CONSOLE', 256, 218)
  ctx.fillStyle = t % 1 < 0.5 ? GO : '#1c5c48'
  ctx.fillText('● LIVE', 256, 252)
  ctx.textAlign = 'left'
}

function status(ctx: Ctx) {
  frame(ctx, 'SPACECRAFT', '#7fd0ff')
  ;['POWER', 'ATTITUDE', 'COMMS', 'THERMAL', 'PAYLOAD'].forEach((name, i) => {
    const y = 66 + i * 44
    ctx.fillStyle = GO
    ellipse(ctx, 30, y, 8, 8)
    ctx.fillStyle = INK
    ctx.font = `600 22px ${MONO}`
    ctx.fillText(name, 52, y)
    ctx.fillStyle = GO
    ctx.textAlign = 'right'
    ctx.fillText('NOMINAL', 494, y)
    ctx.textAlign = 'left'
  })
}

function earthFeed(ctx: Ctx, t = 0) {
  frame(ctx, 'CAM 1  ·  EARTH', '#163a8a')
  const g = ctx.createRadialGradient(220, 130, 10, 256, 168, 120)
  g.addColorStop(0, '#5aa0ff')
  g.addColorStop(0.75, '#1a4fa8')
  g.addColorStop(1, '#0a1f4a')
  ctx.fillStyle = g
  ellipse(ctx, 256, 166, 112, 112)
  ctx.save()
  ctx.beginPath()
  ctx.arc(256, 166, 112, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#2f7a4e'
  const drift = (t * 6) % 224
  for (const [x, y, rx, ry] of [[200, 130, 40, 26], [270, 200, 30, 40], [330, 120, 34, 22]]) ellipse(ctx, x + drift - 112, y, rx, ry)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (const [x, y, rx, ry] of [[230, 100, 50, 8], [300, 160, 60, 7], [210, 220, 45, 6]]) ellipse(ctx, x + drift * 1.3 - 140, y, rx, ry)
  ctx.restore()
  // Thin blue air on the limb.
  ctx.strokeStyle = 'rgba(120,190,255,0.7)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(256, 166, 114, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = t % 1 < 0.5 ? '#ff4a5a' : '#5a1820'
  ctx.font = `700 18px ${MONO}`
  ctx.fillText('● REC', 420, 264)
}

function goNoGo(ctx: Ctx) {
  frame(ctx, 'GO / NO-GO', '#49e0a8')
  ;['FLIGHT', 'BUDGET', 'SCIENCE', 'SPACECRAFT', 'COMMS'].forEach((name, i) => {
    const y = 66 + i * 44
    ctx.fillStyle = INK
    ctx.font = `600 22px ${MONO}`
    ctx.fillText(name, 22, y)
    ctx.fillStyle = '#123a2e'
    ctx.fillRect(388, y - 16, 104, 32)
    ctx.fillStyle = GO
    ctx.textAlign = 'center'
    ctx.fillText('GO', 440, y + 1)
    ctx.textAlign = 'left'
  })
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Wall order, left to right, top row first. All but the status and GO / NO-GO boards animate. */
const SCREENS: ((ctx: Ctx, t?: number) => void)[] = [groundTrack, clock, telemetry, earthFeed, status, goNoGo]

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
