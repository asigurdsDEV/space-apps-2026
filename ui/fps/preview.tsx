// Preview: npm run dev, then /ui/fps/preview.html. A room with three things to use and a pillar to walk around.
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import '../theme/theme.css'
import { createFps, FpsPrompt, type Interactable, type Obstacle } from './index'

function Room() {
  const host = useRef<HTMLDivElement>(null)
  const [aimed, setAimed] = useState<Interactable>()
  const [locked, setLocked] = useState(false)
  const [used, setUsed] = useState<string[]>([])

  useEffect(() => {
    const el = host.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1020)
    scene.add(new THREE.HemisphereLight(0xbfd0ff, 0x30364a, 2.5))
    const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 100)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x1a2133 }))
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)
    scene.add(new THREE.GridHelper(12, 12, 0x3d4a6b, 0x2a3350))

    const obstacles: Obstacle[] = [
      { min: [-6, 0, -6.2], max: [6, 3, -6] },
      { min: [-6, 0, 6], max: [6, 3, 6.2] },
      { min: [-6.2, 0, -6], max: [-6, 3, 6] },
      { min: [6, 0, -6], max: [6.2, 3, 6] },
      { min: [-0.5, 0, -0.5], max: [0.5, 3, 0.5] },
    ]
    for (const o of obstacles) {
      const size = o.max.map((v, i) => v - o.min[i]!) as [number, number, number]
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color: 0x2a3142 }))
      m.position.set(...(o.min.map((v, i) => v + size[i]! / 2) as [number, number, number]))
      scene.add(m)
    }
    const things = [
      { id: 'red', color: 0xff6b5a, at: [-3, 1.2, -4] as [number, number, number], label: 'Press red button' },
      { id: 'green', color: 0x63dbad, at: [0, 1.2, -4] as [number, number, number], label: 'Press green button' },
      { id: 'locked', color: 0x777777, at: [3, 1.2, -4] as [number, number, number], label: 'Locked thing', disabled: 'Comms lead only' },
    ]
    const items: Interactable[] = things.map((t) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: t.color, emissive: t.color, emissiveIntensity: 0.3 }))
      m.position.set(...t.at)
      scene.add(m)
      return { id: t.id, at: t.at, label: t.label, disabled: t.disabled, use: () => setUsed((u) => [...u, t.id]) }
    })

    const fps = createFps(renderer.domElement, camera, { start: [0, 0, 3], onAim: setAimed, onLock: setLocked })
    fps.setPlace(items, obstacles)
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight, false)
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
    }
    resize()
    addEventListener('resize', resize)
    let last = performance.now()
    let frame = requestAnimationFrame(function loop(now) {
      fps.update((now - last) / 1000)
      last = now
      renderer.render(scene, camera)
      frame = requestAnimationFrame(loop)
    })
    Object.assign(window, { fps }) // for poking at it in the console
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('resize', resize)
      fps.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="game-theme" data-theme="dark" style={{ position: 'fixed', inset: 0 }}>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      <style>{'canvas { display: block; width: 100%; height: 100%; }'}</style>
      <FpsPrompt aimed={aimed} locked={locked} />
      <p id="used" style={{ position: 'absolute', top: 8, left: 12, margin: 0, color: '#edf1fa', fontFamily: 'system-ui' }}>
        Used: {used.join(', ') || 'nothing yet'}
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Room />)
