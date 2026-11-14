// Dev-only (used by preview.tsx, not part of the build): rockets side by side at true relative scale in
// plain daylight, for checking shapes and paint against photos of the real vehicles.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { triangles } from './kit'
import { buildRocket } from './rocket'
import type { RocketSpec } from './vehicles'

export interface HangarView {
  /** Camera angle round the rockets in degrees: 0 looks along -z, the launch camera's side. */
  yaw: number
  /** Camera height angle in degrees. */
  pitch: number
  zoom: number
  /** Where to look, as fractions of the line-up's width and height. */
  cx: number
  cy: number
}

function label(text: string, size: number): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillStyle = '#10141c'
  ctx.textAlign = 'center'
  ctx.fillText(text, 256, 42)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }))
  sprite.scale.set(size * 8, size, 1)
  return sprite
}

export function showHangar(host: HTMLElement, specs: RocketSpec[], view: HangarView): void {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.style.cssText = 'display:block;width:100vw;height:100vh'
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xa9bdd6)
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.6
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.4)
  sun.position.set(0.6, 0.5, 0.8)
  scene.add(sun, new THREE.HemisphereLight(0xbfd4ff, 0x6a6258, 0.9))

  let x = 0
  let tallest = 0
  for (const spec of specs) {
    const model = buildRocket(spec)
    x += model.footprint + 3
    model.root.position.x = x
    scene.add(model.root, label(`${spec.id}  ${model.height.toFixed(1)} m  ${Math.round(triangles(model.root) / 100) / 10}k tris`, specs.length > 4 ? 1.7 : 1.2).translateX(x).translateY(-9 - (specs.indexOf(spec) % 2) * 2))
    x += model.footprint + 3
    tallest = Math.max(tallest, model.height)
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x + 200, 200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8b8f96, roughness: 0.95 }))
  floor.position.set(x / 2, -6.5, 0)
  scene.add(floor)

  const camera = new THREE.PerspectiveCamera(18, 1, 1, 5000)
  const draw = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const half = Math.tan((camera.fov * Math.PI) / 360)
    const dist = (Math.max((tallest + 16) / 2 / half, x / 2 / half / camera.aspect) * 1.05) / view.zoom
    const target = new THREE.Vector3(x * view.cx, -8 + (tallest + 16) * view.cy, 0)
    const yaw = (view.yaw * Math.PI) / 180
    const pitch = (view.pitch * Math.PI) / 180
    camera.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(target)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  window.addEventListener('resize', draw)
  draw()
}
