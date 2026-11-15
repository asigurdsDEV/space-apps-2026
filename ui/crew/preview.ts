// Dev-only preview: `npm run dev`, then open /ui/crew/preview.html. Not part of the build.
// The astronaut from the front, the side and the back; ?spin=1 turns them, ?close=1 frames the helmet and chest.
// ?move=walk or ?move=float animates them on the spot: 6 s moving, then 4 s still, and round again.
// &speed=<m/s> and &side=<m/s> hold a speed instead; &t=<seconds> freezes that moment, for screenshots.
// &turn=<radians> turns all three; &far=<metres> stands the camera that far away with the game's wide lens.
// &sun=1 lights them as on the ground after a landing (ui/probe): hard sunlight and no tone mapping.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { WALK_MS } from '../fps/model'
import { createAstronaut, poseAstronaut } from './astronaut'
import { advance, newMotion, pose, type MoveMode } from './motion'

const query = new URLSearchParams(location.search)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const sunlit = query.get('sun') === '1'
if (!sunlit) renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)
Object.assign(window, { __renderer: renderer }) // QA: __renderer.info.render.calls
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x3a3a3a)
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
// About as bright as the game's rooms, so white here is the white seen there.
scene.environmentIntensity = 0.16
const key = new THREE.DirectionalLight(0xffffff, sunlit ? 1.85 : 0.7)
key.position.set(-2, 4, -5)
scene.add(key, new THREE.HemisphereLight(sunlit ? 0xb9d2f0 : 0xc4cee0, sunlit ? 0x6a4a32 : 0x23252b, sunlit ? 1.35 : 0.3))
const move = query.get('move')
const mode: MoveMode | null = move === 'float' || move === 'walk' ? move : null
// The camera stands in front (-Z) of the crew, so the first one shows its front.
const crew = [0, Math.PI / 2, Math.PI].map((yaw, i) => {
  const body = createAstronaut(['Front', 'Side', 'Back'][i]!, i)
  body.position.x = (1 - i) * (mode ? 1.7 : 1.25) // room to swing their arms
  body.rotation.y = yaw + Number(query.get('turn') ?? 0)
  scene.add(body)
  return body
})
const close = query.get('close') === '1'
const camera = new THREE.PerspectiveCamera(close ? 22 : 32, 1, 0.1, 50)
camera.position.set(close ? 1.25 : 0, close ? 1.5 : 1.0, close ? -3.2 : mode ? -5.6 : -4.6)
camera.lookAt(close ? 1.25 : 0, close ? 1.45 : 1.0, 0)
const far = Number(query.get('far') ?? 0)
if (far) {
  camera.fov = 70
  camera.position.set(0, 1.6, -far)
  camera.lookAt(0, 1.2, 0)
}
const resize = () => {
  renderer.setSize(innerWidth, innerHeight, false)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()
const held = query.get('speed') ?? (query.has('side') ? '0' : null)
const freeze = query.get('t')
const motions = crew.map(() => newMotion())
let clock = 0
const tick = (dt: number) => {
  if (!mode) return
  const forward = held !== null ? Number(held) : clock % 10 < 6 ? WALK_MS : 0
  clock += dt
  crew.forEach((body, i) => {
    advance(motions[i]!, mode, dt, forward, Number(query.get('side') ?? 0), 0)
    poseAstronaut(body, pose(mode, motions[i]!))
  })
}
if (mode) scene.add(new THREE.GridHelper(8, 16, 0x6a6a6a, 0x4c4c4c)) // the floor, to judge the feet against
if (freeze !== null) for (let i = 0; i < Number(freeze) * 60; i++) tick(1 / 60)
let last = 0
renderer.setAnimationLoop((t) => {
  if (freeze === null) tick(Math.min((t - last) / 1000, 0.1))
  last = t
  if (query.get('spin') === '1') crew.forEach((body, i) => (body.rotation.y = t / 1500 + (i * Math.PI) / 2))
  renderer.render(scene, camera)
})
