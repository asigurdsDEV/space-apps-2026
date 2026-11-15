// Dev-only preview: `npm run dev`, then open /ui/crew/preview.html. Not part of the build.
// The astronaut from the front, the side and the back; ?spin=1 turns them, ?close=1 frames the helmet and chest.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createAstronaut } from './astronaut'

const query = new URLSearchParams(location.search)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x3a3a3a)
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.55
const key = new THREE.DirectionalLight(0xffffff, 2.2)
key.position.set(-2, 4, -5)
scene.add(key)
// The camera stands in front (-Z) of the crew, so the first one shows its front.
const crew = [0, Math.PI / 2, Math.PI].map((yaw, i) => {
  const body = createAstronaut(['Front', 'Side', 'Back'][i]!)
  body.position.x = (1 - i) * 1.25
  body.rotation.y = yaw
  scene.add(body)
  return body
})
const close = query.get('close') === '1'
const camera = new THREE.PerspectiveCamera(close ? 22 : 32, 1, 0.1, 50)
camera.position.set(close ? 1.25 : 0, close ? 1.5 : 1.0, close ? -3.2 : -4.6)
camera.lookAt(close ? 1.25 : 0, close ? 1.45 : 1.0, 0)
const resize = () => {
  renderer.setSize(innerWidth, innerHeight, false)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()
renderer.setAnimationLoop((t) => {
  if (query.get('spin') === '1') crew.forEach((body, i) => (body.rotation.y = t / 1500 + (i * Math.PI) / 2))
  renderer.render(scene, camera)
})
