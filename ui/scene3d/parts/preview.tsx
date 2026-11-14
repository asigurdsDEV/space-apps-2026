// Dev-only parts gallery: `npm run dev`, then open /ui/scene3d/parts/preview.html. Not part of the build.
//   ?all=1 [&kind=bus|power_system|comms_system|instrument] [&cols=6]   contact sheet of every catalog part
//   ?part=<id> [&on=<bus id>]                                           one part alone, or mounted on a bus
//   ?bus=..&solar=..&battery=..&comms=..&instruments=a,b,c              a whole craft
//   &scene=1 [&mode=spacecraft|orbit] [&orbit=<id>]                     the same craft in the real <SpaceView>
//   &angle=<deg> &el=<deg> &spin=0 &zoom=<x>                            camera, for repeatable screenshots
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { getDatasets } from '../../../data'
import type { Entity, Params } from '../../../shared'
import { catalogEntities } from '../../../sim/parts'
import { buildCraft } from '../craft'
import { sceneSpec } from '../model'
import { SpaceView } from '../SpaceView'
import type { ViewMode } from '../world'
import { buildBus, buildPart, craftLayout, meshes, modelKey, triangles } from './index'

const q = new URLSearchParams(location.search)
const entities = catalogEntities(getDatasets())
const PART_KINDS = ['bus', 'power_system', 'comms_system', 'instrument']
const parts = entities.filter((e) => PART_KINDS.includes(e.kind))
const buses = entities.filter((e) => e.kind === 'bus')
const CLASSES = ['cubesat', 'smallsat', 'medium', 'flagship']

interface Cell { title: string; note: string; object: THREE.Object3D; el?: HTMLElement; below?: boolean }

function paramsFor(e: Entity): Params {
  if (e.kind === 'bus') return { bus: e.id }
  // The smallest bus that accepts the part.
  const host = q.get('on') ?? buses.find((b) => CLASSES.indexOf(String(b.props.class)) >= CLASSES.indexOf(String(e.props.min_bus_class ?? 'cubesat')))?.id ?? ''
  if (e.kind === 'comms_system') return { bus: host, comms: e.id }
  if (e.kind === 'instrument') return { bus: host, instruments: e.id }
  return { bus: host, [e.props.type === 'battery' ? 'battery' : 'solar']: e.id }
}

function partCell(e: Entity): Cell {
  const params = paramsFor(e)
  const spec = sceneSpec({ entities, params }).craft
  const layout = craftLayout(spec)
  const mount = layout.mounts[0]
  const alone = e.kind === 'bus' ? buildBus(layout.bus) : q.has('on') || !mount ? buildCraft(spec) : buildPart(mount, layout.bus)
  return { title: e.name, note: `${e.id} · ${modelKey(e)} · ${Math.round(triangles(alone))} tris`, object: alone, below: mount?.slot === 'nadir' && !q.has('on') }
}

const cells: Cell[] = []
let craftParams: Params | null = null
if (q.has('all')) cells.push(...parts.filter((e) => !q.get('kind') || e.kind === q.get('kind')).map(partCell))
else if (q.has('part')) {
  const e = parts.find((p) => p.id === q.get('part'))
  // An id the catalog does not have still draws: a generic part of the kind given by &kind=.
  cells.push(partCell(e ?? { id: q.get('part')!, kind: q.get('kind') ?? 'instrument', name: `Unknown: ${q.get('part')}`, props: { mass_kg: 5 } }))
} else {
  craftParams = Object.fromEntries(['orbit', 'bus', 'solar', 'battery', 'comms', 'instruments'].filter((k) => q.has(k)).map((k) => [k, q.get(k)!]))
  const spec = sceneSpec({ entities, params: craftParams })
  const object = buildCraft(spec.craft)
  cells.push({ title: [spec.names.bus ?? 'No bus', spec.names.power, spec.names.battery, spec.names.comms, ...spec.names.instruments].filter(Boolean).join(' + '), note: `${Math.round(triangles(object))} triangles in ${meshes(object)} meshes`, object })
}

const grid = document.getElementById('grid')!
if (q.has('scene') && craftParams) {
  document.getElementById('gl')!.remove()
  createRoot(document.getElementById('root')!).render(
    <SpaceView state={{ entities, params: craftParams }} mode={(q.get('mode') as ViewMode) ?? 'spacecraft'} className="big" />,
  )
  document.head.appendChild(document.createElement('style')).textContent = '.big { height: 100vh; border-radius: 0; }'
} else gallery()

function gallery() {
  const cols = Number(q.get('cols')) || (cells.length > 1 ? Math.min(cells.length, Math.max(2, Math.floor(innerWidth / 210))) : 1)
  const rows = Math.ceil(cells.length / cols)
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
  for (const c of cells) {
    c.el = grid.appendChild(document.createElement('div'))
    c.el.className = 'cell'
    c.el.style.height = cells.length > 1 ? `${Math.max(150, Math.floor((innerHeight - 16) / rows) - 6)}px` : 'calc(100vh - 16px)'
    c.el.appendChild(document.createElement('b')).textContent = c.title
    c.el.appendChild(document.createElement('span')).textContent = c.note
  }
  document.getElementById('help')!.innerHTML = cells.length > 1
    ? parts.map((p) => `<a href="?part=${p.id}">${p.id}</a>`).join(' · ')
    : '<a href="?all=1">all parts</a>'

  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl') as HTMLCanvasElement, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.45
  // Same light as the game: the Sun on the +z side, a little blue light from the planet below.
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.6)
  const earthshine = new THREE.DirectionalLight(0x6d90d0, 0.6)
  earthshine.position.set(0, -1, 0)
  scene.add(sun, earthshine, new THREE.AmbientLight(0x3a4560, 0.12))
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)

  const spinners = cells.map((c) => {
    // Centre and scale every part to the same size on screen.
    const sphere = new THREE.Box3().setFromObject(c.object).getBoundingSphere(new THREE.Sphere())
    const holder = new THREE.Group()
    c.object.position.sub(sphere.center)
    holder.add(c.object)
    holder.scale.setScalar(1 / Math.max(sphere.radius, 1e-6))
    const spinner = new THREE.Group()
    spinner.add(holder)
    spinner.visible = false
    scene.add(spinner)
    return spinner
  })

  const angle0 = THREE.MathUtils.degToRad(Number(q.get('angle') ?? 35))
  const spin = q.get('spin') === '0' ? 0 : 0.35
  const zoom = Number(q.get('zoom')) || 1
  renderer.setScissorTest(true)
  renderer.setAnimationLoop((ms) => {
    renderer.setSize(innerWidth, innerHeight, false)
    cells.forEach((c, i) => {
      const r = c.el!.getBoundingClientRect()
      if (r.bottom < 0 || r.top > innerHeight) return
      const el = THREE.MathUtils.degToRad(Number(q.get('el') ?? (c.below ? -24 : 20)))
      const a = angle0 + (ms / 1000) * spin
      camera.aspect = r.width / r.height
      const dist = 1.08 / Math.sin(Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * Math.min(1, camera.aspect))) / zoom
      camera.position.set(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)).multiplyScalar(dist)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
      // The Sun keeps its place relative to the part (on +z); only the camera goes around.
      sun.position.set(0.55, 0.5, 1)
      renderer.setViewport(r.left, innerHeight - r.bottom, r.width, r.height)
      renderer.setScissor(r.left, innerHeight - r.bottom, r.width, r.height)
      spinners[i]!.visible = true
      renderer.render(scene, camera)
      spinners[i]!.visible = false
    })
  })
}
