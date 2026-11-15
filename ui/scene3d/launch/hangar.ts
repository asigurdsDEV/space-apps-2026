// Dev-only (used by preview.tsx, not part of the build): rockets side by side at true relative scale in
// plain daylight, for checking shapes and paint against photos of the real vehicles.
import * as THREE from 'three'
import { buildCraft } from '../craft'
import type { CraftSpec } from '../model'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { skinBytes, triangles } from './kit'
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

/** With `craft`, the fairings are off and that spacecraft sits on the stack: what the fairing-separation shot uncovers. `upperOnly` drops the first stage and boosters too, baring the upper-stage engine. */
export function showHangar(host: HTMLElement, specs: RocketSpec[], view: HangarView, craft?: CraftSpec, upperOnly = false): void {
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
  // With one rocket opened up, the camera looks at its payload: zoom 1 frames the whole payload space.
  let focus: { at: THREE.Vector3; size: number } | null = null
  for (const spec of specs) {
    const before = skinBytes()
    const model = buildRocket(spec)
    // Skins shared with a rocket built earlier in the line-up are not counted again.
    const stats = `${spec.id}  ${model.height.toFixed(1)} m  ${Math.round(triangles(model.root) / 100) / 10}k tris  ${((skinBytes() - before) / 1e6).toFixed(1)} MB skins`
    console.info(stats)
    if (upperOnly) {
      model.stage1.visible = false
      for (const b of model.boosters) b.group.visible = false
    }
    if (craft) {
      model.fairing.forEach((half, i) => {
        half.position.x = (i ? -2.4 : 2.4) * spec.fairing.radius
        half.rotation.z = i ? 0.5 : -0.5
      })
      if (model.escape) model.escape.visible = false
      model.payload.scale.setScalar(model.payloadRadius)
      model.payload.add(buildCraft(craft))
    }
    x += model.footprint + 3
    model.root.position.x = x
    scene.add(model.root, label(stats, specs.length > 4 ? 1.7 : 1.2).translateX(x).translateY(-9 - (specs.indexOf(spec) % 2) * 2))
    x += model.footprint + 3
    tallest = Math.max(tallest, model.height)
    if (craft && specs.length === 1) focus = { at: model.payload.getWorldPosition(new THREE.Vector3()), size: spec.fairing.length }
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
    const dist = (focus ? focus.size / half : Math.max((tallest + 16) / 2 / half, x / 2 / half / camera.aspect) * 1.05) / view.zoom
    const target = focus ? focus.at.clone().add(new THREE.Vector3((view.cx - 0.5) * focus.size, (view.cy - 0.5) * focus.size, 0)) : new THREE.Vector3(x * view.cx, -8 + (tallest + 16) * view.cy, 0)
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
