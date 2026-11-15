// The mission-control set of the arrival cutscene: a dim operations room, rows of long curved desks facing a
// video wall. Everything repeated is merged or instanced, so the whole room is about 40 draw calls.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CONSOLES } from '../gonogo/model'
import { controlScreens, SCREEN_IDS, type ScreenId } from './screens'

const { lerp } = THREE.MathUtils

/** Room: x is across, the video wall is at FRONT, you come in at the back. Metres. */
const HALF = 14
const FRONT = -11.2
const BACK = 13.5
const HEIGHT = 7.4
/** Desks are arcs around a point far behind the video wall, so every seat faces the screens. */
const ZC = -46
const ROWS = 5
const rowRadius = (row: number) => 40 + row * 3.1
/** Each row is two banks with an aisle down the middle: where a bank starts and ends, in metres along the arc. */
const BANK = [1.1, 10.7] as const
const DESK_TOP = 0.76
const TEAL = 0x35e6d6

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

function paintTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')
  if (g) draw(g)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.anisotropy = 8
  return texture
}

/** A box bent along a desk arc: radius r0 to r1, height y0 to y1, from a0 to a1 metres along the arc (0 = centre line). */
function arcBox(row: number, r0: number, r1: number, y0: number, y1: number, a0: number, a1: number) {
  const R = rowRadius(row)
  const geo = new THREE.BoxGeometry(1, 1, 1, Math.max(1, Math.round(Math.abs(a1 - a0) / 0.5)), 1, 1)
  const p = geo.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const a = lerp(a0, a1, p.getX(i) + 0.5) / R
    const r = R + lerp(r0, r1, p.getZ(i) + 0.5)
    p.setXYZ(i, r * Math.sin(a), lerp(y0, y1, p.getY(i) + 0.5), ZC + r * Math.cos(a))
  }
  geo.computeVertexNormals()
  return geo
}

/** A spot on a desk arc: `along` metres from the centre line, `out` metres behind the desk line (towards the seats). */
function onArc(row: number, along: number, out: number, y: number, turn = 0, tilt = 0): Place {
  const R = rowRadius(row)
  const a = along / R
  return [(R + out) * Math.sin(a), y, ZC + (R + out) * Math.cos(a), a + turn, tilt]
}

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0, tiltX = 0) {
  return new THREE.BoxGeometry(w, h, d).rotateX(tiltX).translate(x, y, z)
}

/** A floor patch whose carpet tiles line up with every other patch: 2 × 2 tiles of 60 cm per texture repeat. */
function floorRect(x0: number, x1: number, z0: number, z1: number, y: number) {
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2)
  const [p, uv] = [geo.getAttribute('position'), geo.getAttribute('uv')]
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.2, p.getZ(i) / 1.2)
  return geo
}

function carpet(base: string, light: string, dark: string) {
  return paintTexture(256, 256, (g) => {
    g.fillStyle = base
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 5200; i++) {
      g.fillStyle = i % 2 ? light : dark
      g.globalAlpha = 0.1 + Math.random() * 0.22
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
    // Each tile is laid a quarter turn from its neighbour, so the pile catches the light differently.
    g.globalAlpha = 0.07
    g.fillStyle = light
    g.fillRect(0, 0, 128, 128)
    g.fillRect(128, 128, 128, 128)
    g.globalAlpha = 0.5
    g.fillStyle = dark
    for (const at of [0, 127]) {
      g.fillRect(at, 0, 2, 256)
      g.fillRect(0, at, 256, 2)
    }
    g.globalAlpha = 1
  })
}

/** Dark walnut wall panels, 1.3 m wide: grain streaks, a shadow gap between panels. */
function paintWood(g: CanvasRenderingContext2D) {
  g.fillStyle = '#56301d'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 512
    g.fillStyle = Math.random() < 0.5 ? '#6b3d24' : '#1c0f09'
    g.globalAlpha = 0.05 + Math.random() * 0.16
    g.fillRect(x, Math.random() * 512, 1 + Math.random() * 2, 60 + Math.random() * 400)
  }
  g.globalAlpha = 1
  for (const x of [0, 256]) {
    g.fillStyle = '#0d0705'
    g.fillRect(x, 0, 5, 512)
    g.fillStyle = 'rgba(160,100,60,0.25)'
    g.fillRect(x + 5, 0, 2, 512)
  }
}

/** Four tall windows side by side: late light through autumn trees, behind dark mullions. */
function paintWindows(g: CanvasRenderingContext2D) {
  const sky = g.createLinearGradient(0, 0, 0, 512)
  sky.addColorStop(0, '#ffe9b8')
  sky.addColorStop(0.55, '#f2a43a')
  sky.addColorStop(1, '#7a3c10')
  g.fillStyle = sky
  g.fillRect(0, 0, 512, 512)
  const leaves = ['#ffcf5a', '#e07a1c', '#b4530f', '#fff0c4', '#5a2c0c']
  for (let i = 0; i < 520; i++) {
    const [x, y, r] = [Math.random() * 512, Math.random() * 512, 6 + Math.random() * 26]
    const blob = g.createRadialGradient(x, y, 0, x, y, r)
    blob.addColorStop(0, leaves[i % leaves.length]!)
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    g.globalAlpha = 0.25 + Math.random() * 0.4
    g.fillStyle = blob
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  g.globalAlpha = 0.7
  g.strokeStyle = '#2a1408'
  for (let i = 0; i < 14; i++) {
    // trunks and branches
    const x = Math.random() * 512
    g.lineWidth = 2 + Math.random() * 6
    g.beginPath()
    g.moveTo(x, 512)
    g.quadraticCurveTo(x + (Math.random() - 0.5) * 60, 260, x + (Math.random() - 0.5) * 140, Math.random() * 200)
    g.stroke()
  }
  g.globalAlpha = 1
  g.fillStyle = '#0b0705'
  for (let c = 0; c < 4; c++) {
    g.fillRect(c * 128, 0, 6, 512)
    g.fillRect(c * 128 + 122, 0, 6, 512)
  }
  for (const y of [0, 168, 338, 504]) g.fillRect(0, y, 512, 8)
}

/** A box bowed around whoever sits in it, like a padded chair back. */
function bowed(w: number, h: number, d: number, y: number, z: number, lean: number) {
  const geo = new THREE.BoxGeometry(w, h, d, 6, 1, 1)
  const p = geo.getAttribute('position')
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - 1.1 * p.getX(i) * p.getX(i))
  geo.computeVertexNormals()
  return geo.rotateX(lean).translate(0, y, z)
}

function chair() {
  const arm = (x: number) => [box(0.07, 0.04, 0.3, x, 0.7, 0.02), box(0.04, 0.2, 0.04, x, 0.6, 0.12)]
  const body = mergeGeometries([
    box(0.52, 0.11, 0.5, 0, 0.5, 0),
    bowed(0.5, 0.6, 0.1, 0.87, 0.3, 0.16), // high back, leaning
    bowed(0.34, 0.2, 0.09, 1.26, 0.36, 0.16), // headrest
    ...arm(-0.3),
    ...arm(0.3),
  ])
  const base = mergeGeometries([
    new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8).translate(0, 0.26, 0),
    ...[0, 1, 2, 3, 4].map((i) => box(0.045, 0.03, 0.32, 0, 0.065, 0.16).rotateY((i * Math.PI * 2) / 5)),
  ])
  return { body, base }
}

export function arrival(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  scene.background = new THREE.Color(0x040507)
  scene.fog = new THREE.Fog(0x040507, 18, 48)
  scene.environmentIntensity = 0.1 // the bright studio box the other shots light with would wash out a dim room
  scene.add(new THREE.HemisphereLight(0x9db4d0, 0x0b0a09, 0.5))
  const fromWindows = new THREE.DirectionalLight(0xffb878, 0.45)
  fromWindows.position.set(-10, 4, 2)
  const fromCeiling = new THREE.DirectionalLight(0xfff0dc, 0.6)
  fromCeiling.position.set(2, 10, 3)
  const wallGlow = new THREE.PointLight(0x86b4ff, 45, 26, 1.5)
  wallGlow.position.set(0, 4, FRONT + 2.5)
  scene.add(fromWindows, fromCeiling, wallGlow)

  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => scene.add(new THREE.Mesh(geometry, material))
  const matte = (color: number, map?: THREE.Texture) => new THREE.MeshLambertMaterial({ color, map })
  const lit = (color: number, map?: THREE.Texture) => new THREE.MeshBasicMaterial({ color, map, toneMapped: false })

  // ---- Shell: dark carpet under the desks, lighter tiles on the walkways, walnut walls, a black ceiling.
  add(floorRect(-HALF, HALF, FRONT, BACK, 0), matte(0xffffff, carpet('#16262a', '#3f6268', '#05090a')))
  const [deskFront, deskBack] = [ZC + rowRadius(0) - 1.4, 9] // where the dark carpet under the desks starts and ends
  add(
    mergeGeometries([
      floorRect(-HALF, HALF, FRONT, deskFront, 0.004),
      floorRect(-HALF, HALF, deskBack, BACK, 0.004),
      floorRect(-1, 1, deskFront, deskBack, 0.004),
      floorRect(-HALF, -11.3, deskFront, deskBack, 0.004),
      floorRect(11.3, HALF, deskFront, deskBack, 0.004),
    ]),
    matte(0xffffff, carpet('#4a4d50', '#8a8d8f', '#1c1d1f')),
  )
  const depth = BACK - FRONT
  const midZ = (BACK + FRONT) / 2
  add(
    mergeGeometries([
      new THREE.PlaneGeometry(HALF * 2, HEIGHT).translate(0, HEIGHT / 2, FRONT),
      ...[-1, 1].map((s) => new THREE.PlaneGeometry(depth, HEIGHT).rotateY((s * -Math.PI) / 2).translate(s * HALF, HEIGHT / 2, midZ)),
    ]),
    matte(0xffffff, paintTexture(512, 512, paintWood, 10, 1)),
  )
  const dark = matte(0x0b0c0f)
  add(
    mergeGeometries([
      new THREE.PlaneGeometry(HALF * 2, depth).rotateX(Math.PI / 2).translate(0, HEIGHT, midZ),
      ...[-7, -2.6, 1.8, 6.2, 10.6].map((z) => box(HALF * 2, 0.4, 0.5, 0, HEIGHT - 0.2, z)), // ceiling beams
    ]),
    dark,
  )
  const downlights: Place[] = []
  for (let x = -12; x <= 12; x += 4) for (let z = -8.8; z <= 12; z += 4.4) downlights.push([x, HEIGHT - 0.01, z, 0, Math.PI / 2])
  instanced(scene, new THREE.CircleGeometry(0.08, 12), lit(0xfff0d6), downlights)

  // Side walls: tall narrow windows, and a thin light slot on the wall between each pair.
  const windows: THREE.BufferGeometry[] = []
  const slots: Place[] = []
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const z = FRONT + 2.2 + i * 2.9
      const pane = new THREE.PlaneGeometry(1, 5)
      const uv = pane.getAttribute('uv')
      for (let v = 0; v < uv.count; v++) uv.setX(v, (uv.getX(v) + ((i * 3 + (s + 1)) % 4)) / 4)
      windows.push(pane.rotateY((s * -Math.PI) / 2).translate(s * (HALF - 0.02), 3.5, z))
      slots.push([s * (HALF - 0.03), 3.7, z + 1.45])
    }
  }
  add(mergeGeometries(windows), lit(0xd8d8d8, paintTexture(512, 512, paintWindows)))
  instanced(scene, new THREE.BoxGeometry(0.04, 3, 0.035), lit(0xdfe9ff), slots)

  // ---- Displays: one canvas per design. The wall shows each once; the desk monitors share them.
  const textures = new Map<HTMLCanvasElement, THREE.CanvasTexture>()
  const screens = controlScreens((canvas) => {
    const texture = textures.get(canvas)
    if (texture) texture.needsUpdate = true
  })
  const screenMat = (id: ScreenId | 'desk') => {
    const texture = new THREE.CanvasTexture(screens.canvases[id])
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    textures.set(screens.canvases[id], texture)
    return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false })
  }
  const mats = Object.fromEntries(SCREEN_IDS.map((id) => [id, screenMat(id)])) as Record<ScreenId, THREE.MeshBasicMaterial>
  const black = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.45, metalness: 0.4 })

  // Video wall: the ground track 8.4 m wide in the middle, a 2 × 2 block of screens each side.
  const WALL = { y: 4.35, w: 8.4, h: 4.725, z: FRONT + 0.16 }
  const [tw, th, gap] = [4.1, 4.1 * (9 / 16), 0.1]
  const wallPlane = (id: ScreenId, x: number, y: number, w: number, h: number) => add(new THREE.PlaneGeometry(w, h).translate(x, y, WALL.z), mats[id])
  wallPlane('track', 0, WALL.y, WALL.w, WALL.h)
  SCREEN_IDS.slice(1).forEach((id, i) => {
    const side = i < 4 ? -1 : 1
    const [col, row] = [i % 2, Math.floor((i % 4) / 2)]
    const x = side * (WALL.w / 2 + gap + tw / 2 + (side < 0 ? 1 - col : col) * (tw + gap))
    wallPlane(id, x, WALL.y + (row ? -1 : 1) * (th + gap) / 2, tw, th)
  })
  add(box(WALL.w + 4 * (tw + gap) + 0.3, WALL.h + 0.3, 0.12, 0, WALL.y, FRONT + 0.07), black)
  // The satellite on the big map is its own small mesh, so the 1920 px map never has to be repainted.
  const marker = new THREE.Mesh(
    mergeGeometries([new THREE.RingGeometry(0.1, 0.135, 28), new THREE.CircleGeometry(0.045, 16)]),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false }),
  )
  scene.add(marker)

  // ---- Desks: worktop, cabinet, a low partition behind the monitors with a teal light strip on top.
  const tops: THREE.BufferGeometry[] = []
  const bodies: THREE.BufferGeometry[] = []
  const strips: THREE.BufferGeometry[] = []
  const labels: THREE.BufferGeometry[] = []
  const glows: THREE.BufferGeometry[] = []
  const bezels: Place[] = []
  const stands: Place[] = []
  const shown = new Map<ScreenId, Place[]>(SCREEN_IDS.map((id) => [id, []]))
  const chairs: Place[] = []
  const keyboards: Place[] = []
  const phones: Place[] = []
  const binders: Place[] = []
  // Front row first. The flight director's row is the last one, as in a real control room.
  const rowNames = [...CONSOLES.map((c) => c.label).reverse(), 'FLIGHT']
  for (let row = 0; row < ROWS; row++) {
    for (const s of [-1, 1]) {
      const [a0, a1] = [s * BANK[0], s * BANK[1]]
      tops.push(arcBox(row, -0.45, 0.47, DESK_TOP - 0.04, DESK_TOP, a0, a1))
      bodies.push(arcBox(row, -0.45, 0.16, 0.06, DESK_TOP - 0.04, a0, a1), arcBox(row, -0.56, -0.47, 0, 1.02, a0, a1))
      strips.push(arcBox(row, -0.565, -0.465, 1.02, 1.04, a0, a1), arcBox(row, 0.16, 0.175, 0.06, 0.09, a0, a1))
      for (const end of [a0, a1]) {
        const out = Math.sign(end - (a0 + a1) / 2)
        bodies.push(arcBox(row, -0.56, 0.47, 0, DESK_TOP + 0.02, end, end + out * 0.06))
        strips.push(arcBox(row, -0.565, 0.475, DESK_TOP + 0.02, DESK_TOP + 0.035, end, end + out * 0.065))
        const [x, , z, a] = onArc(row, end + out * 0.064, -0.02, 0)
        const plate = new THREE.PlaneGeometry(0.86, 0.17)
        const uv = plate.getAttribute('uv')
        for (let v = 0; v < uv.count; v++) uv.setY(v, 1 - (row + 1 - uv.getY(v)) / ROWS)
        labels.push(plate.rotateY(a! + (out * Math.PI) / 2).translate(x, 0.47, z))
      }
      const mid = (a0 + a1) / 2
      for (let i = 0; i < 10; i++) {
        const along = mid + (i - 4.5) * 0.9
        const turn = (rnd() - 0.5) * 0.05
        bezels.push(onArc(row, along, -0.22, DESK_TOP + 0.34, turn, -0.07))
        stands.push(onArc(row, along, -0.22, DESK_TOP, turn))
        shown.get(SCREEN_IDS[(i * 4 + row * 3 + (s > 0 ? 5 : 0)) % SCREEN_IDS.length]!)!.push(onArc(row, along, -0.203, DESK_TOP + 0.34, turn, -0.07))
      }
      glows.push(arcBox(row, -0.2, 0.47, DESK_TOP + 0.002, DESK_TOP + 0.003, a0 + s * 0.3, a1 - s * 0.3))
      for (let seat = 0; seat < 4; seat++) {
        const along = mid + (seat - 1.5) * 2.3 + (rnd() - 0.5) * 0.2
        const away = rnd() < 0.3 // a few chairs are pushed back and turned, as if someone just stood up
        chairs.push(onArc(row, along, away ? 1.25 + rnd() * 0.3 : 0.92 + rnd() * 0.12, 0, away ? (rnd() - 0.5) * 1.8 : (rnd() - 0.5) * 0.3))
        keyboards.push(onArc(row, along, 0.14, DESK_TOP + 0.011, (rnd() - 0.5) * 0.12))
        if (seat % 2 === (row + (s > 0 ? 1 : 0)) % 2) phones.push(onArc(row, along - 0.72, 0.1, DESK_TOP, (rnd() - 0.5) * 0.5))
      }
      for (let i = 0; i < 4; i++) binders.push(onArc(row, a1 - s * (0.18 + i * 0.075), -0.05, DESK_TOP + 0.15, 0, (rnd() - 0.5) * 0.08))
    }
  }
  add(mergeGeometries(tops), new THREE.MeshStandardMaterial({ color: 0x8f887c, roughness: 0.55 }))
  // The monitors' light on the worktop, painted on: real lights for a hundred screens would cost far too much.
  const spill = paintTexture(4, 64, (g) => {
    const fade = g.createLinearGradient(0, 0, 0, 64)
    fade.addColorStop(0, '#000')
    fade.addColorStop(1, '#263c4a')
    g.fillStyle = fade
    g.fillRect(0, 0, 4, 64)
  })
  add(mergeGeometries(glows), new THREE.MeshBasicMaterial({ map: spill, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  add(mergeGeometries(bodies), new THREE.MeshStandardMaterial({ color: 0x1d4347, roughness: 0.6, metalness: 0.1 }))
  add(mergeGeometries(strips), lit(TEAL))
  const names = paintTexture(512, ROWS * 96, (g) => {
    g.fillStyle = '#072326'
    g.fillRect(0, 0, 512, ROWS * 96)
    g.fillStyle = '#6ff4e8'
    g.font = '500 58px "Inter Tight", system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.letterSpacing = '8px'
    rowNames.forEach((name, i) => g.fillText(name, 256, i * 96 + 50))
  })
  add(mergeGeometries(labels), lit(0xffffff, names))

  instanced(scene, box(0.86, 0.5, 0.03), black, bezels)
  instanced(scene, mergeGeometries([box(0.06, 0.2, 0.03, 0, 0.1, -0.03), box(0.3, 0.014, 0.2, 0, 0.007, -0.02)]), black, stands)
  const face = new THREE.PlaneGeometry(0.83, 0.467)
  // Desk copies of the ground track use a small canvas of their own, so the satellite can move on them too.
  for (const [id, places] of shown) instanced(scene, face, id === 'track' ? screenMat('desk') : mats[id], places)
  const fabric = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.8 })
  const { body, base } = chair()
  instanced(scene, body, fabric, chairs)
  instanced(scene, base, new THREE.MeshStandardMaterial({ color: 0x8d9299, roughness: 0.35, metalness: 0.8 }), chairs)
  const keys = paintTexture(128, 48, (g) => {
    g.fillStyle = '#0b0c0e'
    g.fillRect(0, 0, 128, 48)
    g.fillStyle = '#30343b'
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(5 + c * 8, 5 + r * 8, 6, 6)
  })
  const mouse = box(0.06, 0.03, 0.1, 0.34, 0.004, 0.01)
  mouse.getAttribute('uv').array.fill(0) // the mouse takes the texture's plain dark corner, not the keys
  instanced(scene, mergeGeometries([box(0.44, 0.022, 0.15), mouse]), new THREE.MeshStandardMaterial({ map: keys, roughness: 0.6 }), keyboards)
  instanced(scene, mergeGeometries([box(0.19, 0.05, 0.21, 0, 0.035, 0, -0.18), box(0.055, 0.04, 0.2, -0.06, 0.085, 0, -0.18)]), black, phones)
  const binderMesh = instanced(scene, box(0.065, 0.3, 0.24), matte(0xffffff), binders)
  const spines = [0x7d1f1f, 0x1c2d4d, 0x7d1f1f, 0x8b8b84, 0x26282c]
  binders.forEach((_, i) => binderMesh.setColorAt(i, new THREE.Color(spines[Math.floor(rnd() * spines.length)])))

  return {
    update(progress: number, elapsedMs: number, aspect: number) {
      // You come in on the gallery at the back, behind the flight director's row, and step up to the rail.
      const e = progress * progress * (3 - 2 * progress)
      const step = Math.sin(elapsedMs / 380) * (1 - e)
      const tall = aspect < 0.9
      camera.fov = tall ? 66 : 48
      camera.updateProjectionMatrix()
      camera.position.set(lerp(10.6, 8.6, e) + 0.02 * step, lerp(4.2, 3.5, e) + 0.012 * Math.abs(step), lerp(12.8, 10.2, e))
      camera.lookAt(tall ? lerp(1.5, 0.5, e) : lerp(-2, -3.2, e), lerp(0.2, -0.6, e) - (tall ? 1.2 : 0), -6)
      const t = elapsedMs / 1000
      screens.update(t)
      const spot = screens.marker(t)
      marker.position.set((spot.u - 0.5) * WALL.w, WALL.y + (0.5 - spot.v) * WALL.h, WALL.z + 0.01)
    },
    dispose() {},
  }
}
