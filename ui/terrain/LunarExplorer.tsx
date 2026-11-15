// Walk the Apollo 17 patch. Elevations are the cropped SLDEM grid; the camera sits on that surface.
// Q returns to whatever opened this (the Moon orbit view). It does not change the mission.

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createFps } from '../fps/controller'
import { EYE } from '../fps/model'
import { FpsPrompt } from '../fps/Prompt'
import '../fps/fps.css'
import { elevationAt, groundPoint, isPatchMeta, localXZ, patchFence, patchMetres, type PatchMeta } from './grid'
import { terrainGeometry } from './mesh'
import './lunar.css'

const CLIMB = Math.tan((38 * Math.PI) / 180)

async function loadPatch(signal: AbortSignal): Promise<{ meta: PatchMeta; heights: Float32Array }> {
  const root = `${import.meta.env.BASE_URL}terrain/moon/apollo17/`
  const metaResponse = await fetch(`${root}meta.json`, { signal })
  if (!metaResponse.ok) throw new Error('The lunar patch description did not load.')
  const meta: unknown = await metaResponse.json()
  if (!isPatchMeta(meta)) throw new Error('The lunar patch description is not usable.')
  const heightResponse = await fetch(`${root}height.f32`, { signal })
  if (!heightResponse.ok) throw new Error('The SLDEM elevation grid did not load.')
  const bytes = await heightResponse.arrayBuffer()
  if (bytes.byteLength !== meta.cols * meta.rows * 4) throw new Error('The elevation grid is the wrong size.')
  return { meta, heights: new Float32Array(bytes) }
}

export default function LunarExplorer({ onClose }: { onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null)
  const elev = useRef<HTMLElement>(null)
  const where = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const [patch, setPatch] = useState<{ meta: PatchMeta; heights: Float32Array } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, button, a')) return
      if (event.code !== 'KeyQ' && event.key !== 'Escape') return
      event.preventDefault()
      close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setPatch(null)
    setError(null)
    void loadPatch(controller.signal).then(setPatch).catch((err: unknown) => {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'The lunar patch did not load.')
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const box = stage.current
    if (!box || !patch) return
    const { meta, heights } = patch
    const size = patchMetres(meta, meta.radius_m)
    const start = localXZ(meta.lat, meta.lon, meta, size.width, size.depth)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.setSize(box.clientWidth, box.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    box.querySelector('canvas')?.remove()
    box.prepend(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    const camera = new THREE.PerspectiveCamera(68, box.clientWidth / Math.max(1, box.clientHeight), 0.2, 40_000)
    scene.add(new THREE.HemisphereLight(0xc5d0e0, 0x2a241c, 0.55))
    const sun = new THREE.DirectionalLight(0xfff2d8, 3.4)
    sun.position.set(-90, 70, 40)
    scene.add(sun)

    const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}terrain/moon/apollo17/color.jpg`)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    const geometry = terrainGeometry(heights, meta.cols, meta.rows, size.width, size.depth, meta.min_m)
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.94, metalness: 0 })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const groundY = (x: number, z: number) => elevationAt(heights, meta.cols, meta.rows, x, z, size.width, size.depth) - meta.min_m
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf0e2b0, emissive: 0x4a3814, roughness: 0.45 }),
    )
    mast.position.set(start.x, groundY(start.x, start.z) + 1.2, start.z)
    scene.add(mast)

    const fps = createFps(renderer.domElement, camera, { start: [start.x, 0, start.z], yaw: 0, onLock: setLocked })
    fps.teleport([start.x, 0, start.z], 0, -0.28)
    fps.setPlace([], patchFence(size.width, size.depth))
    let last = { x: start.x, z: start.z, h: groundY(start.x, start.z) }

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
      let feet = fps.feet()
      let h = groundY(feet.x, feet.z)
      const dist = Math.hypot(feet.x - last.x, feet.z - last.z)
      if (dist > 0.04 && (h - last.h) / dist > CLIMB) {
        fps.teleport([last.x, 0, last.z], feet.yaw)
        feet = fps.feet()
        h = last.h
      } else if (dist > 0) {
        last = { x: feet.x, z: feet.z, h }
      }
      camera.position.y += h
      const spot = groundPoint(feet.x, feet.z, meta, size.width, size.depth)
      if (elev.current) elev.current.textContent = `${Math.round(h + meta.min_m).toLocaleString()} m`
      if (where.current) where.current.textContent = `${spot.lat.toFixed(3)}°, ${spot.lon.toFixed(3)}°`
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      fps.dispose()
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      texture.dispose()
      const mastMaterial = mast.material
      if (mastMaterial instanceof THREE.Material) mastMaterial.dispose()
      mast.geometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [patch])

  return (
    <section className="lunar-screen" aria-labelledby="lunar-title">
      <header className="lunar-bar">
        <div>
          <h2 id="lunar-title">Taurus-Littrow</h2>
          <p>
            Apollo 17, from SLDEM2015 elevation and an LROC WAC photo. The eye is {EYE.toFixed(1)} m above the ground.
            Q or Esc returns to orbit. This does not change the mission.
          </p>
        </div>
        <button type="button" className="game-button" onClick={onClose}>Back to orbit</button>
      </header>
      <div className="lunar-stage" ref={stage}>
        {!patch && !error && <p className="lunar-status" role="status">Loading the lunar elevation and the WAC photo…</p>}
        {error && <p className="lunar-status" role="alert">{error}</p>}
        {patch && (
          <div className="lunar-readout">
            <p><strong>{patch.meta.name}</strong></p>
            <p><strong>Where</strong> <span ref={where}>{patch.meta.lat.toFixed(3)}°, {patch.meta.lon.toFixed(3)}°</span></p>
            <p><strong>Elevation</strong> <span ref={elev}>{Math.round(patch.meta.mean_m).toLocaleString()} m</span> above the 1737.4 km sphere</p>
            <p>Relief in this patch {Math.round(patch.meta.min_m).toLocaleString()} to {Math.round(patch.meta.max_m).toLocaleString()} m. Slopes steeper than 38° stop you.</p>
          </div>
        )}
        {patch && <p className="lunar-keys">W A S D walk · mouse look · Shift run · Q orbit</p>}
        {patch && <FpsPrompt locked={locked} objective="Walk the valley · Q returns to orbit" />}
      </div>
    </section>
  )
}
