// The crew is set down on a real patch of Earth and can walk back to the probe.
// Numbers are fetched when this opens. Nothing here changes the mission.

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { mountCrew, type CrewPose } from '../crew/crew'
import { createFps } from '../fps/controller'
import type { Obstacle } from '../fps/model'
import { FpsPrompt } from '../fps/Prompt'
import '../fps/fps.css'
import './probe.css'
import {
  fetchHeightGrid,
  fetchPlace,
  fetchPower,
  gibsColorUrl,
  groundCover,
  oceanGrid,
  SURFACE,
  sampleHeight,
  WALK_RADIUS_M,
  type GroundCover,
  type HeightGrid,
  type PowerReading,
} from './nasa'

export interface ProbeExplorerProps {
  onClose: () => void
  /** Ground chosen from orbit. Defaults to the Grand Canyon patch. */
  lat?: number
  lon?: number
  /** Spreads the crew so two players do not start inside each other. */
  seat?: number
  /** Other players already floating on this patch. */
  crew?: readonly CrewPose[]
  /** Where this player is floating, so the others can draw them. */
  onMove?: (pose: { x: number; z: number; yaw: number }) => void
}

/** Metres of clear air between your feet and the tallest ground in the patch. */
const FLOAT_CLEAR_M = 8

const METRES_PER_DEG = 111_320

/** The same kind of walls the designer uses: a square you cannot walk through. */
function fence(radius: number): Obstacle[] {
  const t = 1.5
  const far = radius + t
  return [
    { min: [-far, 0, -far], max: [far, 2.4, -radius] },
    { min: [-far, 0, radius], max: [far, 2.4, far] },
    { min: [-far, 0, -radius], max: [-radius, 2.4, radius] },
    { min: [radius, 0, -radius], max: [far, 2.4, radius] },
  ]
}

function metres(box: { south: number; north: number; west: number; east: number }) {
  const mid = ((box.south + box.north) / 2) * Math.PI / 180
  return {
    width: (box.east - box.west) * METRES_PER_DEG * Math.cos(mid),
    depth: (box.north - box.south) * METRES_PER_DEG,
  }
}

/** 0–1 speck so neighbouring points are not one flat wash. */
function speck(ix: number, iy: number) {
  const n = Math.sin(ix * 12.9898 + iy * 78.233) * 43758.5453
  return n - Math.floor(n)
}

/** What the ground under you is, from the measured height and how much the patch rises. */
export function groundKind(grid: HeightGrid, h: number, water: boolean): string {
  if (water) return 'Open water'
  const rise = grid.max_m - grid.min_m
  const t = rise < 1 ? 0.5 : (h - grid.min_m) / rise
  if (h < 8 && rise < 40) return 'Coast'
  if (rise > 350 && t < 0.35) return 'Canyon floor'
  if (rise > 350 && t > 0.72) return 'Canyon rim'
  if (rise > 350) return 'Canyon slope'
  if (h > 2500) return 'High plateau'
  if (t > 0.75 && h > 600) return 'Rocky highland'
  if (rise > 80) return 'Hills'
  if (h < 200) return 'Lowland'
  return 'Rolling ground'
}

/** Dark and light ends of one family. Low ground is the darker shade, high ground the lighter one. */
const FAMILY: Record<GroundCover, { dark: [number, number, number]; light: [number, number, number] }> = {
  water: { dark: [0.05, 0.28, 0.52], light: [0.16, 0.48, 0.72] },
  green: { dark: [0.14, 0.32, 0.12], light: [0.42, 0.58, 0.26] },
  desert: { dark: [0.4, 0.3, 0.14], light: [0.76, 0.64, 0.34] },
  alpine: { dark: [0.34, 0.38, 0.32], light: [0.7, 0.72, 0.66] },
}

/** NASA Blue Marble supplies the photo. Shade stays inside one family so a green place does not turn red. */
function tint(grid: HeightGrid, h: number, ix: number, iy: number, slope: number, family: GroundCover, color: THREE.Color) {
  const rise = grid.max_m - grid.min_m
  const t = rise < 1 ? 0.5 : (h - grid.min_m) / rise
  const n = (speck(ix, iy) - 0.5) * 0.06
  const { dark, light } = FAMILY[family]
  const mix = Math.min(1, Math.max(0, t + n))
  color.setRGB(
    dark[0] + (light[0] - dark[0]) * mix,
    dark[1] + (light[1] - dark[1]) * mix,
    dark[2] + (light[2] - dark[2]) * mix,
  )
  color.multiplyScalar(1 - Math.min(0.22, slope * 0.28))
}

function skyTexture(top: string, horizon: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 256
  const g = canvas.getContext('2d')
  if (!g) return null
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, top)
  grad.addColorStop(0.62, horizon)
  grad.addColorStop(1, horizon)
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function groundMesh(grid: HeightGrid, texture: THREE.Texture | null, family: GroundCover) {
  const { width, depth } = metres(grid)
  const rise = grid.max_m - grid.min_m
  // Gentle ground (deserts, plains) used to be drawn 6× taller and looked mountainous.
  const exaggerate = rise < 1 ? 1 : rise < 50 ? 2 : rise < 140 ? 1.8 : 1.25
  const geo = new THREE.PlaneGeometry(width, depth, grid.cols - 1, grid.rows - 1)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  if (!pos) return { mesh: new THREE.Mesh(), exaggerate }
  const colors = new Float32Array(pos.count * 3)
  const color = new THREE.Color()
  for (let iy = 0; iy < grid.rows; iy++) {
    for (let ix = 0; ix < grid.cols; ix++) {
      const h = grid.heights[iy * grid.cols + ix] ?? grid.mean_m
      const index = iy * grid.cols + ix
      const left = grid.heights[iy * grid.cols + Math.max(0, ix - 1)] ?? h
      const right = grid.heights[iy * grid.cols + Math.min(grid.cols - 1, ix + 1)] ?? h
      const up = grid.heights[Math.max(0, iy - 1) * grid.cols + ix] ?? h
      const down = grid.heights[Math.min(grid.rows - 1, iy + 1) * grid.cols + ix] ?? h
      const slope = Math.min(1, Math.hypot(right - left, down - up) / 48)
      pos.setY(index, (h - grid.min_m) * exaggerate)
      tint(grid, h, ix, iy, slope, family, color)
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }
  }
  pos.needsUpdate = true
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    vertexColors: true,
    roughness: 0.78,
    metalness: 0,
  })
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      'diffuseColor.rgb = mix(diffuseColor.rgb, vColor.rgb, 0.8);',
    )
  }
  const mesh = new THREE.Mesh(geo, material)
  mesh.receiveShadow = true
  return { mesh, exaggerate }
}

export default function ProbeExplorer({ onClose, lat = SURFACE.lat, lon = SURFACE.lon, seat = 0, crew, onMove }: ProbeExplorerProps) {
  const stage = useRef<HTMLDivElement>(null)
  const boots = useRef<HTMLElement>(null)
  const kind = useRef<HTMLElement>(null)
  const waterNow = useRef(false)
  const close = useRef(onClose)
  close.current = onClose
  const crewNow = useRef(crew)
  const moveNow = useRef(onMove)
  crewNow.current = crew
  moveNow.current = onMove
  const named = lat === SURFACE.lat && lon === SURFACE.lon
  const site = {
    lat,
    lon,
    name: named ? SURFACE.name : 'Chosen ground',
    why: named ? SURFACE.why : 'The patch under the spacecraft when you came down.',
    skyTop: SURFACE.skyTop,
    skyHorizon: SURFACE.skyHorizon,
  }
  const [power, setPower] = useState<PowerReading | null>(null)
  const [place, setPlace] = useState<string | null>(null)
  const [grid, setGrid] = useState<HeightGrid | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [water, setWater] = useState(false)
  waterNow.current = water
  const [exaggeration, setExaggeration] = useState(1)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'KeyQ' || event.repeat) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, button, a')) return
      event.preventDefault()
      close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setPower(null)
    setPlace(null)
    setGrid(null)
    setError(null)
    setWater(false)
    void (async () => {
      try {
        void fetchPlace(lat, lon, controller.signal).then((named) => {
          if (!controller.signal.aborted) setPlace(named)
        }).catch(() => {})
        const air = await fetchPower(lat, lon, controller.signal)
        let ground: HeightGrid
        let sea = false
        try {
          ground = await fetchHeightGrid(lat, lon, controller.signal)
        } catch {
          ground = oceanGrid(lat, lon)
          sea = true
        }
        if (controller.signal.aborted) return
        setPower(air)
        setGrid(ground)
        setWater(sea)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'The NASA reading did not load.')
      }
    })()
    return () => controller.abort()
  }, [lat, lon])

  useEffect(() => {
    const box = stage.current
    if (!box || !grid) return
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    renderer.setSize(box.clientWidth, box.clientHeight)
    renderer.shadowMap.enabled = true
    box.querySelector('canvas')?.remove()
    box.prepend(renderer.domElement)

    const scene = new THREE.Scene()
    const sky = skyTexture(site.skyTop, site.skyHorizon)
    scene.background = sky ?? new THREE.Color(site.skyHorizon)
    const haze = new THREE.Color(site.skyHorizon).lerp(new THREE.Color(site.skyTop), 0.28)
    scene.fog = new THREE.Fog(haze, 2400, 7000)
    const camera = new THREE.PerspectiveCamera(58, box.clientWidth / Math.max(1, box.clientHeight), 0.15, 4000)
    scene.add(new THREE.HemisphereLight(site.skyHorizon, '#6a4a32', 1.35))
    const sun = new THREE.DirectionalLight('#fff6df', 1.85)
    sun.position.set(-0.45, 1, 0.25)
    scene.add(sun)

    const texture = new THREE.TextureLoader().load(gibsColorUrl(grid))
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    const family = groundCover(lat, grid, power?.skin_c ?? 10, power?.precip_mm ?? null, waterNow.current)
    const { mesh, exaggerate } = groundMesh(grid, texture, family)
    const peak = (grid.max_m - grid.min_m) * exaggerate
    mesh.position.y = -(peak + FLOAT_CLEAR_M)
    scene.add(mesh)
    setExaggeration(exaggerate)
    const tether = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 240, 0)]),
      new THREE.LineBasicMaterial({ color: 0xffe08a }),
    )
    const ship = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.45, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xf4f1ea, emissive: 0x332408, roughness: 0.4 }),
    )
    ship.position.y = 240
    tether.add(ship)
    scene.add(tether)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(WALK_RADIUS_M - 0.6, WALK_RADIUS_M, 72),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -FLOAT_CLEAR_M + 0.4
    scene.add(ring)
    const size = metres(grid)
    const heightAt = (px: number, pz: number) => {
      const u = px / size.width + 0.5
      const v = 0.5 - pz / size.depth
      return sampleHeight(grid.heights, grid.cols, grid.rows, u, v)
    }
    const fps = createFps(renderer.domElement, camera, {
      start: [Math.min(seat, 3) * 1.6, 0, 4],
      yaw: 0,
      reducedMotion: true,
      onLock: setLocked,
    })
    fps.setPlace([], fence(WALK_RADIUS_M))
    const bodies = mountCrew(scene, { float: true })

    const onResize = () => {
      renderer.setSize(box.clientWidth, box.clientHeight)
      camera.aspect = box.clientWidth / Math.max(1, box.clientHeight)
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    let frame = 0
    let then = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - then) / 1000)
      then = now
      fps.update(dt)
      bodies.set(crewNow.current ?? [])
      bodies.update(dt)
      moveNow.current?.(fps.feet())
      camera.position.y += Math.sin(now * 0.0016) * 0.16
      const feet = fps.feet()
      tether.position.set(feet.x, 0, feet.z)
      const here = heightAt(feet.x, feet.z)
      if (boots.current) boots.current.textContent = `${Math.round(here).toLocaleString()} m`
      if (kind.current) kind.current.textContent = groundKind(grid, here, waterNow.current)
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      bodies.dispose()
      fps.dispose()
      window.removeEventListener('resize', onResize)
      sky?.dispose()
      texture.dispose()
      mesh.geometry.dispose()
      tether.geometry.dispose()
      ring.geometry.dispose()
      const material = mesh.material
      if (material instanceof THREE.Material) material.dispose()
      const ringMaterial = ring.material
      if (ringMaterial instanceof THREE.Material) ringMaterial.dispose()
      const shipMaterial = ship.material
      if (shipMaterial instanceof THREE.Material) shipMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [grid, seat, site.skyHorizon, site.skyTop])

  return (
    <section className="probe-screen" aria-labelledby="probe-title">
      <header className="probe-bar">
        <div>
          <h2 id="probe-title">Surface probe</h2>
          <p>You float above the ground, under the sky. Press Q to return to the ship. This does not change the mission.</p>
        </div>
        <button type="button" className="game-button" onClick={onClose}>Return to the ship</button>
      </header>
      <div className="probe-stage" ref={stage}>
        <p className="probe-story">
          <strong>{site.name}</strong>
          {' '}({site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°)
          <br />
          {site.why}{' '}
          {water ? 'NASA’s land elevation has no tile here, so this is open ocean at sea level.' : 'You stay above the highest ground in the patch. The slopes stay below you.'}{' '}
          The gold ring is as far as you can drift. Press Q to return to the ship.
        </p>
        {!grid && !error && <p className="probe-status" role="status">Loading NASA elevation, temperature, and the satellite picture…</p>}
        {error && <p className="probe-status" role="alert">{error}</p>}
        {grid && power && (
          <div className="probe-readout">
            {place && <p><strong>Location</strong> {place}</p>}
            <p><strong>Elevation</strong> <span ref={boots}>{Math.round(grid.mean_m).toLocaleString()} m</span></p>
            <p><strong>Ground temperature</strong> {power.skin_c.toFixed(1)} °C</p>
            <p><strong>Steepness</strong> {exaggeration.toFixed(1)}×</p>
            <p><strong>Ground</strong> <span ref={kind}>{groundKind(grid, grid.mean_m, water)}</span></p>
          </div>
        )}
        {grid && <FpsPrompt locked={locked} objective="Float · Q returns to the ship" />}
      </div>
    </section>
  )
}
