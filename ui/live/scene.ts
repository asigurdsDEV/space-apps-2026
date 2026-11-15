// The three.js globe behind <LiveEarth>. Imperative like ui/scene3d/world.ts: created once, fed as the feeds arrive, torn down with dispose().
// Six draw calls: globe, air, satellites, debris, storms, the picked orbit. Names are HTML laid over the canvas.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { planetMaps } from '../scene3d/maps'
import { atmosphereShader, toScreen } from '../scene3d/shaders'
import { steadyResolution } from '../scene3d/steady'
import { earthOrientation, sunDirection } from '../scene3d/sun'
import { liveEarthShader } from './earthShader'
import type { Orbits } from './propagate'
import type { Storm } from './storms'

export type Layer = 'satellites' | 'debris' | 'storms'

export interface LiveScene {
  /** Lays the day's real picture over the bundled map and fades it in. False when the picture could not be decoded. */
  setImagery(blob: Blob): Promise<boolean>
  setSatellites(orbits: Orbits): void
  setDebris(orbits: Orbits): void
  setStorms(storms: readonly Storm[]): void
  /** Names one satellite, draws its orbit and turns the view to it. */
  pick(index: number, name: string): void
  /** Turns the view to a place on the ground (degrees). */
  lookAt(lat: number, lon: number): void
  show(layer: Layer, on: boolean): void
  dispose(): void
}

export interface LiveSceneOptions {
  /** No drifting view and no glides: the camera only moves when dragged or when something is picked. */
  reducedMotion: boolean
  /** The part of the container the panels leave free: the globe is centred and sized for it. */
  free: HTMLElement
  /** A satellite's dot was clicked or tapped. */
  onPick(index: number): void
}

const ATMOSPHERE_R = 1.06
const FOV = 38
const RING_POINTS = 181
const RAD = Math.PI / 180

/** A round dot; with `edge`, a dark rim so it shows over white cloud; with `ring`, a storm's ring round a small dot. */
function glyph(edge: boolean, ring = false): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  const disc = (radius: number, colour: string) => {
    g.fillStyle = colour
    g.beginPath()
    g.arc(size / 2, size / 2, radius, 0, Math.PI * 2)
    g.fill()
  }
  if (ring) {
    for (const [width, colour] of [[11, 'rgb(0 0 2 / 0.6)'], [5, '#fff']] as const) {
      g.strokeStyle = colour
      g.lineWidth = width
      g.beginPath()
      g.arc(size / 2, size / 2, 24, 0, Math.PI * 2)
      g.stroke()
    }
  }
  if (edge) disc(ring ? 11 : 30, 'rgb(0 0 2 / 0.6)')
  disc(ring ? 7 : edge ? 20 : 26, '#fff')
  return new THREE.CanvasTexture(canvas)
}

interface Tag { el: HTMLElement; at: THREE.Vector3; x: number; y: number; shown: boolean }

/** Throws when the browser cannot give a WebGL context. */
export function createLiveScene(container: HTMLElement, options: LiveSceneOptions): LiveScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  const maxRatio = Math.min(window.devicePixelRatio, 2)
  renderer.setPixelRatio(maxRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.setClearColor(0x000002)
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;cursor:grab'
  container.appendChild(renderer.domElement)
  const tagLayer = document.createElement('div')
  tagLayer.className = 'le-tags'
  tagLayer.setAttribute('aria-hidden', 'true') // the panel's list says the same in words
  container.appendChild(tagLayer)

  const scene = new THREE.Scene()
  const now = new Date()
  // The Sun stays put in the scene, as high over the equator as it really is today, so the globe turns under it with north up.
  const sunHeight = sunDirection(now)[1]
  const SUN = new THREE.Vector3(0.9, 0, 0.44).normalize().multiplyScalar(Math.sqrt(1 - sunHeight * sunHeight)).setY(sunHeight)
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200)
  // Everything on or around the Earth hangs off this group, in the map's own frame (README.md): it turns under the fixed Sun on the real clock.
  const earth = new THREE.Group()
  scene.add(earth)

  const anisotropy = renderer.capabilities.getMaxAnisotropy()
  const bundled = planetMaps(anisotropy)
  const uSun = { value: SUN }
  const uLive = { value: null as THREE.Texture | null }
  const uLiveMix = { value: 0 }
  let liveShown = false
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 96),
    new THREE.ShaderMaterial({ ...liveEarthShader, uniforms: { uSun, uBody: { value: 0 }, ...bundled.maps.earth, uLive, uLiveMix } }),
  )
  earth.add(planet)
  const air = new THREE.Mesh(
    new THREE.SphereGeometry(ATMOSPHERE_R, 96, 64),
    new THREE.ShaderMaterial({
      ...toScreen(atmosphereShader),
      uniforms: { uSun, uColor: { value: new THREE.Color(0.28, 0.55, 1.0) }, uThickness: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_R * ATMOSPHERE_R)) } },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  air.renderOrder = -1 // under the dots
  scene.add(air)

  const dot = glyph(false)
  const satelliteGlyph = glyph(true)
  const stormGlyph = glyph(true, true)
  const owned: { dispose(): void }[] = [planet.geometry, planet.material, air.geometry, air.material, dot, satelliteGlyph, stormGlyph]
  /** One draw call of screen-sized dots in the Earth's frame. */
  function cloud(positions: Float32Array, material: THREE.PointsMaterialParameters): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false, ...material }))
    points.frustumCulled = false // the dots move; their first bounding sphere would go stale
    earth.add(points)
    owned.push(geometry, points.material as THREE.Material)
    return points
  }
  const shown: Record<Layer, boolean> = { satellites: true, debris: true, storms: true }
  let satellites: { orbits: Orbits; at: Float32Array; points: THREE.Points } | null = null
  let debris: { orbits: Orbits; at: Float32Array; points: THREE.Points } | null = null
  let stormPoints: THREE.Points | null = null
  let picked = -1

  const ringAt = new Float32Array(RING_POINTS * 3)
  const ringGeometry = new THREE.BufferGeometry()
  ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringAt, 3))
  const ring = new THREE.Line(ringGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }))
  ring.frustumCulled = false
  ring.visible = false
  earth.add(ring)
  owned.push(ringGeometry, ring.material)

  // Names: the picked satellite's and each storm's, moved to where their dots are drawn.
  const tag = (className: string, text: string): Tag => {
    const el = document.createElement('span')
    el.className = className
    el.textContent = text
    el.style.visibility = 'hidden'
    tagLayer.appendChild(el)
    return { el, at: new THREE.Vector3(), x: NaN, y: NaN, shown: false }
  }
  const pickedTag = tag('le-tag le-tag--picked', '')
  let stormTags: Tag[] = []

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 1.5
  controls.maxDistance = 40
  controls.autoRotate = !options.reducedMotion
  controls.autoRotateSpeed = 0.1 // one slow lap in ten minutes

  // The view glides to what was picked; a drag takes over at once.
  const goal = new THREE.Vector3()
  let goalDistance = 0
  let gliding = false
  let home = 3.6
  const v = new THREE.Vector3()
  function lookFrom(local: THREE.Vector3, distance: number): void {
    // Lean toward the Sun so something over the night side is still seen against the lit edge.
    goal.copy(local).normalize().applyQuaternion(earth.quaternion).addScaledVector(SUN, 0.35).normalize()
    goalDistance = distance
    gliding = !options.reducedMotion
    if (!gliding) camera.position.copy(goal).multiplyScalar(distance)
  }
  function glide(dt_s: number): void {
    if (!gliding) return
    const k = 1 - Math.exp(-dt_s * 3.5)
    const distance = camera.position.length()
    v.copy(camera.position).divideScalar(distance)
    if (v.dot(goal) < -0.98) v.y += 0.2 // the goal is straight through the Earth: start round one side
    v.lerp(goal, k).normalize()
    const next = distance + (goalDistance - distance) * k
    camera.position.copy(v).multiplyScalar(next)
    if (v.dot(goal) > 0.99999 && Math.abs(next - goalDistance) < 0.01 * goalDistance) gliding = false
  }
  controls.addEventListener('start', () => {
    gliding = false
    controls.autoRotate = false
  })

  let width = 1
  let height = 1
  function resize(): void {
    const full = container.getBoundingClientRect()
    const area = options.free.getBoundingClientRect()
    width = Math.max(1, full.width)
    height = Math.max(1, full.height)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Centre the globe in the free area, and stand far enough back that it fills 84 % of that area's short side.
    camera.setViewOffset(width, height, full.left + width / 2 - (area.left + area.width / 2), full.top + height / 2 - (area.top + area.height / 2), width, height)
    camera.updateProjectionMatrix()
    const slope = (0.42 * Math.max(120, Math.min(area.width, area.height)) * Math.tan((FOV / 2) * RAD)) / (height / 2)
    const next = Math.sqrt(1 + slope * slope) / slope
    camera.position.multiplyScalar(next / home)
    goalDistance *= next / home
    home = next
  }
  camera.position.set(0.45, 0.3, 1).normalize().multiplyScalar(home) // the day side, with the edge of night in view
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()
  const steady = steadyResolution((ratio) => renderer.setPixelRatio(ratio), maxRatio)

  function turnEarth(): void {
    earth.quaternion.fromArray(earthOrientation(sunDirection(now), [SUN.x, SUN.y, SUN.z]))
  }
  function moveCloud(target: { orbits: Orbits; at: Float32Array; points: THREE.Points }): void {
    target.orbits.positions(now, target.at)
    target.points.geometry.attributes.position.needsUpdate = true
  }
  function drawRing(): void {
    ring.visible = shown.satellites && !!satellites && picked >= 0 && satellites.orbits.ring(picked, now, ringAt)
    ringGeometry.attributes.position.needsUpdate = true
  }
  turnEarth()

  /** True when the globe is between the camera and a point (scene frame). */
  function behindEarth(point: THREE.Vector3): boolean {
    const c = camera.position
    const dx = point.x - c.x
    const dy = point.y - c.y
    const dz = point.z - c.z
    const t = Math.min(1, Math.max(0, -(c.x * dx + c.y * dy + c.z * dz) / (dx * dx + dy * dy + dz * dz)))
    const x = c.x + t * dx
    const y = c.y + t * dy
    const z = c.z + t * dz
    return x * x + y * y + z * z < 0.98
  }
  /** Where a point of the Earth's frame is drawn, in CSS pixels in v.x, v.y. False when it is hidden or off screen. */
  function project(local: THREE.Vector3): boolean {
    v.copy(local).applyQuaternion(earth.quaternion)
    if (behindEarth(v)) return false
    v.project(camera)
    if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return false
    v.x = (v.x * 0.5 + 0.5) * width
    v.y = (0.5 - v.y * 0.5) * height
    return true
  }
  function place(t: Tag, on: boolean): void {
    const visible = on && project(t.at)
    if (visible !== t.shown) {
      t.shown = visible
      t.el.style.visibility = visible ? 'visible' : 'hidden'
    }
    if (!visible) return
    const x = Math.round(v.x * 2) / 2
    const y = Math.round(v.y * 2) / 2
    if (x === t.x && y === t.y) return
    t.x = x
    t.y = y
    t.el.style.transform = `translate(${x}px, ${y}px)`
  }

  // A click or tap that is not a drag picks the nearest satellite dot.
  const local = new THREE.Vector3()
  let downX = 0
  let downY = 0
  const onDown = (e: PointerEvent) => {
    downX = e.clientX
    downY = e.clientY
  }
  const onUp = (e: PointerEvent) => {
    if (!satellites || !shown.satellites || Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
    const box = renderer.domElement.getBoundingClientRect()
    let best = -1
    let bestDistance = 24
    for (let i = 0; i < satellites.orbits.elements.length; i++) {
      if (!project(local.fromArray(satellites.at, i * 3))) continue
      const distance = Math.hypot(v.x - (e.clientX - box.left), v.y - (e.clientY - box.top))
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    }
    if (best >= 0) options.onPick(best)
  }
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointerup', onUp)

  let raf = 0
  let last = performance.now()
  let seconds = 0
  let sinceSecond = 0
  function frame(ms: number): void {
    raf = requestAnimationFrame(frame)
    const dt_s = Math.min(0.1, (ms - last) / 1000)
    last = ms
    now.setTime(Date.now())
    sinceSecond += dt_s
    if (sinceSecond >= 1) {
      sinceSecond = 0
      turnEarth()
      // 2,700 pieces cost 1.5 ms and move under half a pixel a second (README.md).
      if (debris && shown.debris) moveCloud(debris)
      if (++seconds % 10 === 0) drawRing()
    }
    if (satellites && shown.satellites) {
      moveCloud(satellites)
      if (picked >= 0) pickedTag.at.fromArray(satellites.at, picked * 3)
    }
    if (liveShown && uLiveMix.value < 1) uLiveMix.value = options.reducedMotion ? 1 : Math.min(1, uLiveMix.value + dt_s / 1.2)
    glide(dt_s)
    controls.update(dt_s)
    renderer.render(scene, camera)
    place(pickedTag, shown.satellites && picked >= 0)
    for (const t of stormTags) place(t, shown.storms)
    steady(dt_s)
  }
  raf = requestAnimationFrame(frame)

  return {
    setImagery(blob) {
      const url = URL.createObjectURL(blob)
      return new Promise((resolve) => {
        const texture = new THREE.TextureLoader().load(
          url,
          () => {
            URL.revokeObjectURL(url)
            uLive.value = texture
            liveShown = true
            resolve(true)
          },
          undefined,
          () => {
            URL.revokeObjectURL(url)
            resolve(false)
          },
        )
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = THREE.RepeatWrapping // as the bundled map: the shader's seam-free u runs past 1
        texture.anisotropy = anisotropy
        owned.push(texture)
      })
    },
    setSatellites(orbits) {
      const at = new Float32Array(orbits.elements.length * 3)
      satellites = { orbits, at, points: cloud(at, { size: 10, map: satelliteGlyph, color: 0xffffff }) }
      satellites.points.visible = shown.satellites
      moveCloud(satellites)
    },
    setDebris(orbits) {
      const at = new Float32Array(orbits.elements.length * 3)
      debris = { orbits, at, points: cloud(at, { size: 3, map: dot, color: 0xaebbd2, opacity: 0.85 }) }
      debris.points.visible = shown.debris
      moveCloud(debris)
    },
    setStorms(storms) {
      const at = new Float32Array(storms.length * 3)
      stormTags = storms.map((storm, i) => {
        const t = tag('le-tag', storm.name)
        const c = Math.cos(storm.lat * RAD)
        t.at.set(c * Math.cos(storm.lon * RAD), Math.sin(storm.lat * RAD), -c * Math.sin(storm.lon * RAD)).multiplyScalar(1.01)
        t.at.toArray(at, i * 3)
        return t
      })
      stormPoints = cloud(at, { size: 18, map: stormGlyph, color: 0xf0d9a0 })
      stormPoints.visible = shown.storms
    },
    pick(index, name) {
      if (!satellites) return
      picked = index
      pickedTag.el.textContent = name
      moveCloud(satellites)
      drawRing()
      local.fromArray(satellites.at, index * 3)
      // A high satellite (GOES is 6.6 Earth radii out) needs the view pulled back to be in it.
      if (local.lengthSq() > 0) lookFrom(local, home * Math.max(1, local.length() / 1.7))
    },
    lookAt(lat, lon) {
      const c = Math.cos(lat * RAD)
      lookFrom(local.set(c * Math.cos(lon * RAD), Math.sin(lat * RAD), -c * Math.sin(lon * RAD)), home)
    },
    show(layer, on) {
      shown[layer] = on
      if (satellites) satellites.points.visible = shown.satellites
      if (debris) debris.points.visible = shown.debris
      if (stormPoints) stormPoints.visible = shown.storms
      if (on && layer === 'debris' && debris) moveCloud(debris)
      drawRing()
    },
    dispose() {
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      for (const item of owned) item.dispose()
      bundled.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      tagLayer.remove()
    },
  }
}
