// What a rocket starts from: a launch complex on the coast, or a carrier aircraft. Meters, +y up.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { makeHazed, type SkyUniforms } from './fx'
import { ASSEMBLY, shoreWobble, siteLayout, waterDepth } from './layout'

const std = (color: number, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
const UP = new THREE.Vector3(0, 1, 0)
const hash = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export interface Pad {
  group: THREE.Group
  /** Height of the rocket's base above the ground. */
  standoff: number
  /** Half-width of the launch mount: the flame trench throws smoke out past this along ±x. */
  mount: number
  /** Swing arms from the tower to the rocket; rotate about y to retract. */
  arms: THREE.Object3D[]
  /** Scrub along the shore and the far assembly complex: too small or too far to cast shadows. */
  backdrop: THREE.Group
}

/** A steel lattice tower as one instanced mesh: corner posts, a ring of beams per level and one diagonal per face. */
function lattice(width: number, height: number, mat: THREE.Material): THREE.InstancedMesh {
  const levels = Math.max(3, Math.round(height / width))
  const step = height / levels
  const beam = width * 0.07
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 4 + levels * 8)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  let n = 0
  const strut = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, thick = beam) => {
    from.set(ax, ay, az)
    to.set(bx, by, bz)
    const len = from.distanceTo(to)
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
    m.compose(from.add(to).multiplyScalar(0.5), q, new THREE.Vector3(thick, len, thick))
    mesh.setMatrixAt(n++, m)
  }
  const h = width / 2
  const corners: [number, number][] = [[-h, -h], [h, -h], [h, h], [-h, h]]
  for (const [x, z] of corners) strut(x, 0, z, x, height, z, beam * 1.6)
  for (let l = 0; l < levels; l++) {
    for (let c = 0; c < 4; c++) {
      const [x0, z0] = corners[c]!
      const [x1, z1] = corners[(c + 1) % 4]!
      strut(x0, (l + 1) * step, z0, x1, (l + 1) * step, z1)
      if ((l + c) % 2 === 0) strut(x0, l * step, z0, x1, (l + 1) * step, z1)
      else strut(x1, l * step, z1, x0, (l + 1) * step, z0)
    }
  }
  mesh.count = n
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

/** A round bar from a to b, `radius` thick at a and `tip` thick at b. */
function bar(ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number, tip = radius): THREE.BufferGeometry {
  const a = new THREE.Vector3(ax, ay, az)
  const b = new THREE.Vector3(bx, by, bz)
  const turn = new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize())
  return new THREE.CylinderGeometry(tip, radius, a.distanceTo(b), 8).applyMatrix4(new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), turn, new THREE.Vector3(1, 1, 1)))
}

/** A box whose wall panels repeat along its length (the cladding texture is one bay wide). */
function shed(w: number, h: number, d: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d)
  const uv = geo.getAttribute('uv')
  const bays = Math.max(1, Math.round(w / h))
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * bays)
  return geo
}

/** Ribbed metal cladding: vertical seams, a line under the eaves and a darker base course. */
function claddingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#d6d8d8'
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#b4b8bb'
  for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 1, 64)
  g.fillRect(0, 3, 64, 1)
  g.fillStyle = '#9a9c9c'
  g.fillRect(0, 56, 64, 8)
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.anisotropy = 4
  return map
}

/**
 * The US flag for a vertical hang: union at the viewer's top left, stripes running down. It is the flown flag
 * transposed, so the proportions are the specification's with hoist and fly swapped: 1 wide by 1.9 long, union
 * 7 stripes wide and 0.76 long, 50 stars in nine staggered columns, each 0.0616 across.
 */
function flagTexture(): THREE.CanvasTexture {
  const w = 260
  const c = document.createElement('canvas')
  c.width = w
  c.height = w * 1.9
  const g = c.getContext('2d')!
  for (let i = 0; i < 13; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#b22234'
    g.fillRect((i * w) / 13, 0, w / 13, c.height)
  }
  const uw = (w * 7) / 13
  const uh = w * 0.76
  g.fillStyle = '#3c3b6e'
  g.fillRect(0, 0, uw, uh)
  g.fillStyle = '#ffffff'
  for (let i = 0; i < 11; i++) {
    for (let j = 0; j < 9; j++) {
      if ((i + j) % 2) continue
      const cx = (uw * (j + 1)) / 10
      const cy = (uh * (i + 1)) / 12
      g.beginPath()
      // A star's top point faces the flag's own top edge, which hangs on the left.
      for (let k = 0; k < 10; k++) {
        const rad = w * 0.0308 * (k % 2 ? 0.382 : 1)
        g.lineTo(cx - Math.cos((k * Math.PI) / 5) * rad, cy + Math.sin((k * Math.PI) / 5) * rad)
      }
      g.fill()
    }
  }
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  return map
}

/** A banner `w` wide and `h` long hanging from its top edge (y = 0), facing +z. A light breeze ripples it: still at the top, freest at the bottom. */
function makeFlag(w: number, h: number, time: { value: number }): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({ map: flagTexture(), roughness: 0.9, side: THREE.DoubleSide })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.uniforms.uFlag = { value: new THREE.Vector2(w, h) }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', /* glsl */ `#include <common>
uniform float uTime;
uniform vec2 uFlag;
float cloth(vec2 at) {
  float free = max(1.0 - at.y, 0.0); // the normal samples just past the top edge; pow() of a negative is NaN on real GPUs, which bloom spreads over the whole frame
  float billow = free * free * (0.3 + 0.12 * sin(uTime * 0.8));
  float ripple = 0.5 * sin(at.y * 9.0 + uTime * 2.6 + at.x * 3.0) + 0.22 * sin(at.y * 17.0 + uTime * 4.1 - at.x * 4.0);
  return (billow + ripple * pow(free, 1.3) * 0.2) * uFlag.x;
}`)
      // The folds must catch the light, so the normal follows the cloth.
      .replace('#include <beginnormal_vertex>', /* glsl */ `
float cloth0 = cloth(uv);
vec3 objectNormal = normalize(vec3(-(cloth(uv + vec2(0.02, 0.0)) - cloth0) / (0.02 * uFlag.x), -(cloth(uv + vec2(0.0, 0.02)) - cloth0) / (0.02 * uFlag.y), 1.0));`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.xy, cloth0);')
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h, 10, 20).translate(0, -h / 2, 0), mat)
}

/** The far assembly complex, to real size: a huge boxy assembly building with its tall doors, a launch control building and low sheds. Its doors face +z. */
function assemblyComplex(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const box = (w: number, h: number, d: number, x: number, z: number, rgb: [number, number, number], y = h / 2) => {
    const geo = new THREE.BoxGeometry(w, h, d).translate(x, y, z)
    const color = new Float32Array(geo.getAttribute('position').count * 3)
    for (let i = 0; i < color.length; i += 3) color.set(rgb, i)
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3))
    parts.push(geo)
  }
  const wall: [number, number, number] = [0.8, 0.8, 0.78]
  const dark: [number, number, number] = [0.3, 0.31, 0.34]
  box(160, 160, 130, 0, 0, wall)
  box(110, 64, 130, 135, 0, [0.74, 0.74, 0.72])
  for (const x of [-40, 40]) box(24, 138, 2, x, 65.5, dark)
  box(60, 8, 40, 20, -20, [0.6, 0.6, 0.6], 164)
  box(115, 22, 45, -190, 40, [0.82, 0.82, 0.8])
  box(105, 6, 1, -190, 63, dark, 14)
  for (let i = 0; i < 6; i++) box(40 + 70 * hash(i), 9 + 12 * hash(i + 0.3), 30 + 30 * hash(i + 0.6), -420 + 150 * i + 60 * hash(i + 0.8), 150 + 220 * hash(i + 0.5), [0.7 + 0.12 * hash(i + 0.2), 0.7 + 0.1 * hash(i + 0.2), 0.68])
  return mergeGeometries(parts)
}

/**
 * A launch complex for a rocket `height` tall and `footprint` wide at the base, on its sand spit (layout.ts): a launch
 * mount over a flame trench cut through a concrete mound, a service tower on the -x side (the rocket pitches over
 * toward +x, away from it) with the flag hanging from it, lightning masts joined by wires, a water tower, propellant
 * spheres and low support buildings. Everything that does not move is merged into one mesh per material.
 */
export function buildPad(height: number, footprint: number, bellDrop: number, sky: SkyUniforms): Pad {
  const group = new THREE.Group()
  const steel = std(0x8a9099, 0.6, 0.5)
  const concrete = std(0x8d8c88, 0.9)
  const dark = std(0x2b2d31, 0.8, 0.2)
  const white = std(0xe4e6ea, 0.5)
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) => {
    if (parent) {
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      parent.add(mesh)
    } else {
      if (!batches.has(mat)) batches.set(mat, [])
      batches.get(mat)!.push(geo.clone().translate(x, y, z))
    }
  }
  const site = siteLayout(height, footprint)
  const { mount, unit } = site
  const deck = Math.max(height * 0.05, 1.5)
  const standoff = deck + bellDrop * 1.1

  // Launch mount: a deck on four legs with the flame hole in the middle; hold-down posts carry the rocket.
  const side = new THREE.BoxGeometry(mount * 2, deck * 0.35, mount * 0.6)
  add(side, concrete, 0, deck * 0.825, mount * 0.7)
  add(side, concrete, 0, deck * 0.825, -mount * 0.7)
  const end = new THREE.BoxGeometry(mount * 0.35, deck * 0.35, mount * 0.8)
  add(end, concrete, mount * 0.825, deck * 0.825, 0)
  add(end, concrete, -mount * 0.825, deck * 0.825, 0)
  const leg = new THREE.BoxGeometry(mount * 0.3, deck * 0.65, mount * 0.3)
  for (const x of [-1, 1]) for (const z of [-1, 1]) add(leg, concrete, x * mount * 0.85, deck * 0.325, z * mount * 0.85)
  const post = new THREE.BoxGeometry(footprint * 0.16, standoff - deck, footprint * 0.16)
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2
    add(post, dark, Math.cos(a) * footprint * 0.95, deck + (standoff - deck) / 2, Math.sin(a) * footprint * 0.95)
  }
  // The pad mound: two concrete banks with sloping sides, and between them the flame trench with a scorched floor
  // and a wedge that turns the exhaust out both ends.
  add(new THREE.BoxGeometry(mount * 5, 0.2, mount * 1.3), dark, 0, 0.1, 0)
  const bank = new THREE.BoxGeometry(1, 1, 1)
  const at = bank.getAttribute('position')
  for (let i = 0; i < at.count; i++) {
    const top = at.getY(i) > 0
    at.setXYZ(i, at.getX(i) * mount * (top ? 4.5 : 5.3), top ? deck * 0.62 : 0, mount * (0.61 + (at.getZ(i) + 0.5) * (top ? 0.6 : 1.1)))
  }
  bank.computeVertexNormals()
  add(bank, concrete, 0, 0, 0)
  add(bank.clone().rotateY(Math.PI), concrete, 0, 0, 0)
  add(new THREE.CylinderGeometry(mount * 0.5, mount * 0.5, mount * 1.05, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, (deck * 0.6) / (mount * 0.75), 1), dark, 0, deck * 0.2, 0)

  // Service tower with a lightning rod, and two arms reaching the rocket. It stands on its own slab over the trench.
  const towerW = Math.max(height * 0.085, 2.2)
  const towerH = standoff + height * 1.04
  const towerX = -(mount + towerW * 0.9)
  const tower = lattice(towerW, towerH, steel)
  tower.position.set(towerX, 0, 0)
  group.add(tower)
  add(new THREE.BoxGeometry(towerW * 1.9, deck * 0.35, Math.max(towerW * 1.5, mount * 1.4)), concrete, towerX - towerW * 0.05, deck * 0.825, 0)
  // Inside the lattice: the lift shaft, and a work platform every few levels.
  add(new THREE.BoxGeometry(towerW * 0.36, towerH, towerW * 0.36), concrete, towerX - towerW * 0.18, towerH / 2, -towerW * 0.18)
  const floor = new THREE.BoxGeometry(towerW * 1.1, towerW * 0.05, towerW * 1.1)
  for (let y = towerH * 0.16; y < towerH; y += towerH * 0.14) add(floor, steel, towerX, y, 0)
  add(new THREE.CylinderGeometry(towerW * 0.03, towerW * 0.06, height * 0.22, 6), steel, towerX, towerH + height * 0.11, 0)
  const arms: THREE.Object3D[] = []
  for (const f of [0.52, 0.86]) {
    const pivot = new THREE.Group()
    pivot.position.set(towerX + towerW / 2, standoff + height * f, 0)
    const reach = -towerX - towerW / 2 - footprint * 0.45
    add(new THREE.BoxGeometry(reach, towerW * 0.22, towerW * 0.3), steel, reach / 2, 0, 0, pivot)
    // The umbilical plate at the tip, with its propellant line back along the arm.
    add(new THREE.BoxGeometry(towerW * 0.12, towerW * 0.42, towerW * 0.42), dark, reach, 0, 0, pivot)
    add(new THREE.CylinderGeometry(towerW * 0.035, towerW * 0.035, reach, 6).rotateZ(Math.PI / 2), white, reach / 2, -towerW * 0.16, 0, pivot)
    group.add(pivot)
    arms.push(pivot)
  }

  // The flag: a banner on a short arm off the tower's outer corner, facing the cameras. About an eighth of the rocket long.
  const flagH = height * 0.13
  const flagW = flagH / 1.9
  const armY = standoff + height * 0.985
  const cornerX = towerX - towerW / 2
  const tipX = cornerX - flagW * 1.3
  add(bar(cornerX, armY, towerW / 2, tipX, armY, towerW / 2, flagW * 0.035), steel, 0, 0, 0)
  add(bar(cornerX, armY + flagW * 0.6, towerW / 2, tipX, armY, towerW / 2, flagW * 0.02), steel, 0, 0, 0)
  const flag = makeFlag(flagW, flagH, sky.uTime)
  flag.position.set(cornerX - flagW * 0.72, armY - flagW * 0.05, towerW / 2)
  group.add(flag)

  // Three lightning towers, taller than the rocket, as at Kennedy's pad 39B: a wide steel lattice for the lower 80%,
  // a slim white fibreglass mast on top, and wires strung between the tips. The three lattices share one instanced mesh.
  const mastH = towerH * 1.3
  const latticeH = mastH * 0.8
  const one = lattice(Math.max(height * 0.05, 1.4), latticeH, steel)
  const masts = new THREE.InstancedMesh(one.geometry, steel, one.count * site.masts.length)
  const place = new THREE.Matrix4()
  const part = new THREE.Matrix4()
  site.masts.forEach(([x, z], k) => {
    place.makeTranslation(x, 0, z)
    for (let i = 0; i < one.count; i++) {
      one.getMatrixAt(i, part)
      masts.setMatrixAt(k * one.count + i, part.premultiply(place))
    }
  })
  masts.instanceMatrix.needsUpdate = true
  group.add(masts)
  const mastTop = new THREE.CylinderGeometry(height * 0.003, height * 0.007, mastH - latticeH, 8)
  for (const [x, z] of site.masts) add(mastTop, white, x, (latticeH + mastH) / 2, z)
  const wire: number[] = []
  const span = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, sag: number) => {
    const droop = Math.hypot(bx - ax, by - ay, bz - az) * sag
    for (let i = 0; i <= 16; i++) {
      const f = i / 16
      // Every inner point twice: the end of one segment and the start of the next.
      for (let k = i === 0 || i === 16 ? 1 : 0; k < 2; k++) wire.push(ax + (bx - ax) * f, ay + (by - ay) * f - droop * 4 * f * (1 - f), az + (bz - az) * f)
    }
  }
  site.masts.forEach(([x, z], i) => {
    const [nx, nz] = site.masts[(i + 1) % 3]!
    span(x, mastH, z, nx, mastH, nz, 0.05)
  })
  for (const [x, z, m] of site.anchors) span(site.masts[m]![0], mastH, site.masts[m]![1], x, 0, z, 0.02)
  const wires = new THREE.BufferGeometry()
  wires.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3))
  group.add(new THREE.LineSegments(wires, new THREE.LineBasicMaterial({ color: 0x6c727a, transparent: true, opacity: 0.55 })))

  // The water tower that floods the pad at ignition: a white ball on a riser and six legs.
  const [wx, wz] = site.waterTower
  const ball = Math.max(height * 0.062, 1.6)
  const ballY = towerH * 0.52
  add(new THREE.SphereGeometry(ball, 28, 18).scale(1, 0.85, 1), white, wx, ballY, wz)
  add(new THREE.CylinderGeometry(ball * 0.2, ball * 0.26, ballY, 12), white, wx, ballY / 2, wz)
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    add(bar(wx + Math.cos(a) * ball * 1.05, 0, wz + Math.sin(a) * ball * 1.05, wx + Math.cos(a) * ball * 0.72, ballY - ball * 0.5, wz + Math.sin(a) * ball * 0.72, ball * 0.075), white, 0, 0, 0)
  }
  // Propellant spheres at the edge of the pad, each on a skirt with a vent stack and an insulated line to the mount.
  for (const [x, z, r] of site.spheres) {
    add(new THREE.SphereGeometry(r, 28, 18), white, x, r * 1.2, z)
    add(new THREE.CylinderGeometry(r * 0.62, r * 0.7, r * 0.6, 20), concrete, x, r * 0.3, z)
    add(bar(x + r * 0.5, r * 1.9, z, x + r * 0.5, r * 2.9, z, r * 0.035), steel, 0, 0, 0)
    const reach = (mount * 1.9) / Math.hypot(x, z)
    add(bar(x, r * 0.12, z, x * reach, r * 0.12, z * reach, r * 0.05), white, 0, 0, 0)
  }
  // Low support buildings by the crawlerway: ribbed cladding, a flat dark roof.
  const cladding = new THREE.MeshStandardMaterial({ map: claddingTexture(), roughness: 0.8 })
  for (const [x, z, w, h, d] of site.sheds) {
    add(shed(w, h, d), cladding, x, h / 2, z)
    add(new THREE.BoxGeometry(w * 1.03, h * 0.06, d * 1.04), dark, x, h * 1.03, z)
  }

  // A real-size van (6 m long) parked on the apron: the pad is sized to the rocket, so this is what shows how big the rocket is.
  // It stands behind the pad: in front, it would block the close shot of a small rocket's engines.
  const vanX = mount + 7
  const vanZ = -(mount * 1.9 + 5)
  add(new THREE.BoxGeometry(4.2, 2.3, 2.2), white, vanX - 0.9, 1.45, vanZ)
  add(new THREE.BoxGeometry(1.8, 1.7, 2.2), steel, vanX + 2.1, 1.15, vanZ)
  add(new THREE.BoxGeometry(5.4, 0.5, 2.3), dark, vanX, 0.35, vanZ)

  for (const [mat, list] of batches) group.add(new THREE.Mesh(mergeGeometries(list), mat))

  // ---- Backdrop.
  const backdrop = new THREE.Group()
  // Clumps of scrub on the sand between the apron and the water, and along the shore a dense band of darker, taller
  // trees and scrub (the green line between the pad and the water in lift-off photos). One instanced mesh for both.
  const clear: [number, number, number][] = [
    ...site.spheres.map(([x, z, r]): [number, number, number] => [x, z, r * 2.2]),
    ...site.sheds.map(([x, z, w]): [number, number, number] => [x, z, w * 0.75]),
    [wx, wz, ball * 2],
  ]
  const SCRUB = 170
  const TREES = 300
  const scrub = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), SCRUB + TREES)
  const m = new THREE.Matrix4()
  const where = new THREE.Vector3()
  const size = new THREE.Vector3()
  const turn = new THREE.Quaternion()
  const leaf = new THREE.Color()
  let n = 0
  let inland = 0
  let shore = 0
  for (let i = 0; i < 6000 && n < SCRUB + TREES; i++) {
    const x = (hash(i) * 11 - 6) * unit
    const z = (0.9 - hash(i + 0.5) * 3.4) * unit
    const land = -waterDepth(x, z, unit) - shoreWobble(x, z, unit)
    const onApron = (x / unit) ** 4 + (z / (0.8 * unit)) ** 4 < 1.25
    const onWay = x < 0 && Math.abs(z) < 0.32 * unit
    if (land < 0.02 * unit || land > 0.75 * unit || onApron || onWay || clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue
    // Only the far shore, behind the pad (the camera is on +z): in front of it the band would hide the engines.
    const isShore = land < 0.16 * unit && z < -0.4 * unit
    if (isShore ? shore >= TREES : inland >= SCRUB) continue
    if (isShore) shore++
    else inland++
    const s = unit * (isShore ? 0.016 + 0.016 * hash(i + 0.2) : 0.012 + 0.02 * hash(i + 0.2))
    size.set(s * (0.9 + 0.9 * hash(i + 0.3)), s * (isShore ? 0.9 + 0.6 * hash(i + 0.4) : 0.55 + 0.3 * hash(i + 0.4)), s * (0.9 + 0.9 * hash(i + 0.6)))
    scrub.setMatrixAt(n, m.compose(where.set(x, size.y * 0.35, z), turn.setFromAxisAngle(UP, hash(i + 0.7) * 6.28), size))
    const dim = isShore ? 0.7 : 1
    scrub.setColorAt(n, leaf.setRGB((0.07 + 0.05 * hash(i + 0.8)) * dim, (0.11 + 0.06 * hash(i + 0.9)) * dim, 0.05 * dim))
    n++
  }
  scrub.count = n
  backdrop.add(scrub)
  const far = new THREE.Mesh(assemblyComplex(), makeHazed(sky))
  far.position.set(ASSEMBLY[0], 0, ASSEMBLY[1])
  // Its doors face the pad.
  far.rotation.y = Math.atan2(-ASSEMBLY[0], -ASSEMBLY[1])
  backdrop.add(far)

  return { group, standoff, mount, arms, backdrop }
}

// ---------------------------------------------------------------- Carrier aircraft

/** A round frame of a tube: [x along the aircraft, height of its centre, radius]. */
type Station = [x: number, y: number, r: number]
/** A rib of a wing: [z along the span, x of the leading edge, chord, height, thickness as a fraction of the chord]. */
type Rib = [z: number, lead: number, chord: number, y: number, thick: number]
/** Lays a point of a marking on a surface. */
type Put = (a: number, b: number) => number[]

/** Half-thickness of an aerofoil at chord fraction u, for a chord and a maximum thickness of 1 (NACA four-digit, closed at the trailing edge). */
const foilAt = (u: number) => 5 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4)
/** Signed chord fractions round a rib, + over the top and - back underneath; and the same for the leading edge alone. */
const FOIL = [0, 0.02, 0.08, 0.18, 0.32, 0.5, 0.7, 0.87, 1, -0.87, -0.7, -0.5, -0.32, -0.18, -0.08, -0.02]
const EDGE = [-0.07, -0.03, -0.008, 0, 0.008, 0.03, 0.07]

/** A skin over rows of equally many points (flat xyz each): closed rows are loops, open ones make a sheet. */
function loft(rows: number[][], closed = true): THREE.BufferGeometry {
  const n = rows[0]!.length / 3
  const index: number[] = []
  for (let i = 0; i + 1 < rows.length; i++) {
    for (let j = 0; j < (closed ? n : n - 1); j++) {
      const a = i * n + j
      const b = i * n + ((j + 1) % n)
      index.push(a, b, a + n, b, b + n, a + n)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(rows.flat(), 3))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}

/** A round tube through stations listed tail to nose; listed nose to tail it faces inward. */
const tube = (stations: Station[], seg = 24) =>
  loft(stations.map(([x, y, r]) => Array.from({ length: seg }, (_, j) => [x, y + r * Math.cos((j / seg) * 2 * Math.PI), r * Math.sin((j / seg) * 2 * Math.PI)]).flat()))

/** Centre height and radius of a tube at x, between its stations. */
function tubeAt(stations: Station[], x: number): [number, number] {
  let i = 1
  while (i < stations.length - 1 && stations[i]![0] < x) i++
  const [x0, y0, r0] = stations[i - 1]!
  const [x1, y1, r1] = stations[i]!
  const f = (x - x0) / (x1 - x0)
  return [y0 + (y1 - y0) * f, r0 + (r1 - r0) * f]
}

/** A wing through ribs listed root to tip along +z, the chord running back along -x. `under` below 1 flattens the underside. */
const surface = (ribs: Rib[], around: number[], under = 1, closed = true) =>
  loft(ribs.map(([z, lead, chord, y, thick]) => around.flatMap((u) => [lead - chord * Math.abs(u), y + Math.sign(u) * chord * thick * foilAt(Math.abs(u)) * (u > 0 ? 2 - under : under), z])), closed)

/** A marking: a sheet from a lower edge to an upper edge (matching points, running toward the nose), laid on a surface by `put`. */
const decal = (put: Put, lower: [number, number][], upper: [number, number][], rows = 1) =>
  loft(Array.from({ length: rows + 1 }, (_, k) => lower.flatMap(([a, b], i) => put(a + (upper[i]![0] - a) * (k / rows), b + (upper[i]![1] - b) * (k / rows)))), false)
const rect = (put: Put, x0: number, x1: number, y0: number, y1: number, rows = 1) => decal(put, [[x0, y0], [x1, y0]], [[x0, y1], [x1, y1]], rows)

/** The same part on the other side of the aircraft. */
function mirrored(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const other = geo.clone().scale(1, 1, -1)
  const index = other.getIndex()!
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i)
    index.setX(i, index.getX(i + 1))
    index.setX(i + 1, a)
  }
  return other
}

const tint = new THREE.Color()
/** Paints a part one colour, its downward faces another, and drops what a merged mesh cannot share. */
function coat(geo: THREE.BufferGeometry, hex: number, below = hex): THREE.BufferGeometry {
  const normal = geo.getAttribute('normal')
  const color = new Float32Array(normal.count * 3)
  for (let i = 0; i < normal.count; i++) tint.set(normal.getY(i) < -0.3 ? below : hex).toArray(color, i * 3)
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3))
  geo.deleteAttribute('uv')
  return geo
}

/**
 * A three-engine wide-body jet with the rocket slung under its belly, after the Lockheed L-1011 that air-launches
 * Pegasus: 54 m long, 47.5 m across the wings, the third engine breathing through an intake at the foot of the fin.
 * Long axis +x (the nose), origin where the rocket's centre hangs. Four meshes: paint, bare metal, glass and lights.
 */
export function buildCarrier(rocketRadius: number): THREE.Group {
  const plane = new THREE.Group()
  const paint = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.05, vertexColors: true })
  // Bare metal and glass lie on the paint: the offset keeps them from flickering against it.
  const metal = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.75, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  const glass = new THREE.MeshStandardMaterial({ roughness: 0.12, metalness: 0.6, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  const lamp = new THREE.MeshBasicMaterial({ vertexColors: true })
  // The scene's ground light is a pad at dawn. Up here the sea and the cloud deck light the underside, the side the cameras see.
  paint.onBeforeCompile = metal.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * vec3(0.17, 0.2, 0.25) * max(-inverseTransformDirection(normal, viewMatrix).y, 0.0);`)
  }
  const WHITE = 0xe9ebee
  const GREY = 0xb9bec6
  const LINE = 0x1c3f77
  const DARK = 0x15171b
  const STEEL = 0xcfd2d6
  const HOT = 0xb0a698
  const centre = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const right = new Map<THREE.Material, THREE.BufferGeometry[]>()
  /** `both` puts the part on the right side and its mirror image on the left. */
  const add = (mat: THREE.Material, geo: THREE.BufferGeometry, hex: number, both = false, below = hex) => {
    const to = both ? right : centre
    if (!to.has(mat)) to.set(mat, [])
    to.get(mat)!.push(coat(geo, hex, below))
  }
  const r = 2.9
  const cy = r + rocketRadius * 1.9
  const belly = cy - r

  // ---- Fuselage: a long tail cone swept up to the exhaust, a constant tube, a blunt nose that droops.
  const hull: Station[] = [[-26.3, cy + 1.58, 0.98], [-25.5, cy + 1.52, 1.08], [-23.5, cy + 1.36, 1.38], [-21, cy + 1.1, 1.75], [-18, cy + 0.75, 2.15], [-15, cy + 0.42, 2.48], [-12, cy + 0.18, 2.72], [-9.5, cy + 0.04, 2.86], [-8, cy, r]]
  for (const f of [1, 0.86, 0.72, 0.58, 0.46, 0.35, 0.25, 0.17, 0.1, 0.05, 0.02, 0.004, 0]) hull.push([27 - 7.6 * f, cy - 0.7 * (1 - f) ** 2, r * (1 - (1 - f) ** 2) ** 0.56])
  add(paint, tube(hull, 32), WHITE)
  // Where the wing meets the body, a fairing bulges out of the belly; it stays clear of the rocket.
  add(paint, new THREE.SphereGeometry(1, 24, 12).scale(8.5, 1.25, 3.5).translate(2, cy - 1.9, 0), WHITE)
  // The rocket's wing hangs from a short pylon, and its rudder stands up into a housing in the belly.
  add(paint, new THREE.BoxGeometry(2.6, 0.47, 0.8).translate(-4.4, belly - 0.1, 0), GREY)
  add(paint, new THREE.SphereGeometry(1, 12, 6).scale(1.3, 0.28, 0.22).translate(-7.55, belly, 0), WHITE)

  // ---- The tail engine: a round intake on top of the body feeds a duct that curves down to the end of the tail cone.
  const duct: Station[] = [[-26, cy + 1.6, 0.97], [-23, cy + 2.1, 1.3], [-19.5, cy + 3.2, 1.42], [-16.5, cy + 3.9, 1.42], [-14.2, cy + 4.1, 1.36], [-13.7, cy + 4.1, 1.3]]
  add(paint, tube(duct), WHITE)
  add(metal, tube([[-13.7, cy + 4.1, 1.3], [-13.5, cy + 4.1, 1.22], [-13.7, cy + 4.1, 1.12]]), STEEL)
  add(paint, tube([[-13.7, cy + 4.1, 1.12], [-15.5, cy + 3.95, 0.9], [-16, cy + 3.9, 0.01]]), DARK)
  add(metal, tube([[-27, cy + 1.62, 0.72], [-26.3, cy + 1.58, 0.99]]), HOT)
  add(paint, tube([[-26.5, cy + 1.6, 0.01], [-27, cy + 1.62, 0.7]]), DARK)

  // ---- Fin, low tailplane and wing, each a loft of aerofoil ribs with a rounded tip.
  const FIN_Y = cy + 3
  const FIN_H = 8.7
  add(paint, surface([[0, -14.2, 9, 0, 0.1], [FIN_H, -22.8, 3.5, 0, 0.09], [FIN_H + 0.2, -23.6, 2.4, 0, 0.03]], FOIL).rotateX(-Math.PI / 2).translate(0, FIN_Y, 0), WHITE)
  const stab: Rib[] = [[0.6, -18, 6.4, cy + 1.25, 0.1], [10.8, -24.4, 2.5, cy + 1.8, 0.09], [11, -25, 1.7, cy + 1.81, 0.03]]
  const wing: Rib[] = [[1.2, 7.5, 10.8, cy - 1.95, 0.13], [8.5, 2.2, 7.6, cy - 1.15, 0.115], [23.5, -8.7, 3, cy + 0.5, 0.09], [23.74, -9.5, 1.9, cy + 0.52, 0.03]]
  for (const ribs of [wing, stab]) {
    add(paint, surface(ribs, FOIL, 0.8), WHITE, true, GREY)
    // Unpainted leading edges.
    add(metal, surface(ribs.map(([z, lead, chord, y, thick]): Rib => [z, lead + 0.02, chord, y, thick * 1.08]), EDGE, 0.8, false), STEEL, true)
  }
  // Flap-track fairings: the canoes under the back of the wing.
  for (const z of [5, 11.5, 15.2, 18.9]) {
    const i = z < wing[1]![0] ? 0 : 1
    const at = (k: number) => wing[i]![k]! + ((wing[i + 1]![k]! - wing[i]![k]!) * (z - wing[i]![0])) / (wing[i + 1]![0] - wing[i]![0])
    add(paint, new THREE.SphereGeometry(1, 10, 6).scale(1.5, 0.2, 0.16).translate(at(1) - at(2) + 0.9, at(3) - 0.16, z), GREY, true)
  }

  // ---- Wing engines: a short fat cowl hung ahead of the leading edge, a fan behind a bright intake lip, a bare hot core.
  const ex = 5.9
  const ey = cy - 3.05
  const ez = 8.5
  const pod = (profile: [number, number][]) => tube(profile.map(([dx, rr]): Station => [ex + dx, ey, rr])).translate(0, 0, ez)
  add(paint, pod([[-3.9, 1.16], [-3.2, 1.3], [-2.2, 1.38], [-1, 1.38], [-0.3, 1.3]]), WHITE, true)
  add(metal, pod([[-0.3, 1.3], [-0.1, 1.25], [0, 1.16], [-0.1, 1.07], [-0.3, 1.03]]), STEEL, true)
  add(paint, pod([[-0.3, 1.03], [-0.95, 1]]), DARK, true)
  const fan = coat(new THREE.RingGeometry(0.3, 1, 36).rotateY(Math.PI / 2).translate(ex - 0.95, ey, ez), DARK)
  // Every other vertex round the disc is lighter: fan blades.
  for (let i = 0; i < fan.getAttribute('color').count; i += 2) tint.set(0x5a6069).toArray(fan.getAttribute('color').array, i * 3)
  right.get(paint)!.push(fan)
  add(paint, pod([[-0.95, 0.32], [-0.75, 0.24], [-0.5, 0.02]]), GREY, true)
  add(paint, new THREE.RingGeometry(0.9, 1.16, 24).rotateY(-Math.PI / 2).translate(ex - 3.85, ey, ez), DARK, true)
  add(metal, pod([[-5.3, 0.5], [-4.6, 0.74], [-3.85, 0.92], [-3.4, 0.92]]), HOT, true)
  add(metal, pod([[-6, 0.02], [-5.3, 0.42]]), HOT, true)
  add(paint, surface([[0, ex - 1, 5, 0, 0.07], [0.85, 2.6, 3.6, 0, 0.07]], FOIL).rotateX(-Math.PI / 2).translate(0, ey + 1.2, ez), WHITE, true)

  // ---- Markings, laid just proud of the skin: [x, height] on the side of a tube or of the fin, [x, angle from the top] on the nose.
  const side = (stations: Station[], lift: number): Put => (x, y) => {
    const [yc, rr] = tubeAt(stations, x)
    const a = Math.acos(THREE.MathUtils.clamp((y - yc) / rr, -1, 1))
    return [x, yc + (rr + lift) * Math.cos(a), (rr + lift) * Math.sin(a)]
  }
  const onNose: Put = (x, a) => {
    const [yc, rr] = tubeAt(hull, x)
    return [x, yc + (rr + 0.03) * Math.cos(a), (rr + 0.03) * Math.sin(a)]
  }
  const onFin = (lift: number): Put => (x, y) => {
    const f = (y - FIN_Y) / FIN_H
    const chord = 9 - 5.5 * f
    return [x, y, (0.9 - 0.585 * f) * foilAt(THREE.MathUtils.clamp((-14.2 - 8.6 * f - x) / chord, 0, 1)) + lift]
  }
  // Cockpit windscreen: three panes a side wrapping the top of the nose.
  const span = (a: [number, number], b: [number, number]) => [0, 1, 2, 3].map((k): [number, number] => [a[0] + ((b[0] - a[0]) * k) / 3, a[1] + ((b[1] - a[1]) * k) / 3])
  for (const [a0, a1, back0, back1, front0, front1] of [[0.07, 0.5, 23.75, 23.6, 25, 24.95], [0.56, 0.96, 23.55, 23.2, 24.9, 24.55], [1.01, 1.4, 23.15, 22.9, 24.45, 23.6]] as const) {
    add(glass, decal(onNose, span([back0, a0], [back1, a1]), span([front0, a0], [front1, a1]), 3), DARK, true)
  }
  // Cabin windows, with a gap and a door outline at each of the four doors.
  const onHull = side(hull, 0.03)
  const onDoor = side(hull, 0.04)
  const doors = [20.6, 12.4, -2.2, -10.6]
  for (let x = 21.6; x > -11.5; x -= 0.52) {
    if (doors.every((d) => Math.abs(x - d) > 0.9)) add(glass, rect(onHull, x - 0.11, x + 0.11, cy + 0.62, cy + 0.95), DARK, true)
  }
  for (const d of doors) {
    add(glass, rect(onHull, d - 0.1, d + 0.1, cy + 0.62, cy + 0.95), DARK, true)
    for (const [x0, x1, y0, y1] of [[d - 0.53, d - 0.47, cy - 0.8, cy + 1.15], [d + 0.47, d + 0.53, cy - 0.8, cy + 1.15], [d - 0.53, d + 0.53, cy + 1.09, cy + 1.15], [d - 0.53, d + 0.53, cy - 0.8, cy - 0.74]] as const) {
      add(paint, rect(onDoor, x0, x1, y0, y1, 6), 0x7d838c, true)
    }
  }
  // The cheat line: under the windows from the nose, then up over the tail engine's duct and up the fin.
  const ribbon = (put: Put, path: [number, number][], w: number) => {
    const edge = (sign: number) => path.map(([x, y], i): [number, number] => {
      const [ax, ay] = path[Math.max(i - 1, 0)]!
      const [bx, by] = path[Math.min(i + 1, path.length - 1)]!
      return [x, y + sign * 0.5 * w * Math.hypot(1, (by - ay) / (bx - ax))]
    })
    // The path runs toward the tail, so the upper edge comes first to keep the sheet facing out.
    return decal(put, edge(1), edge(-1), 4)
  }
  const along: [number, number][] = Array.from({ length: 17 }, (_, k) => 25.6 - 0.5 * k).map((x) => [x, 0.05 + 0.9 * (tubeAt(hull, x)[0] - cy)])
  for (let k = 0; k <= 8; k++) {
    const t = k / 8
    // A bend from the window line into the sweep of the fin.
    along.push([-8.4 * (1 - t) ** 2 - 11.93 * 2 * t * (1 - t) - 14.06 * t * t, 0.05 * (1 - t * t) + 2.2 * t * t])
  }
  const sweep = (y0: number, y1: number, n: number) => Array.from({ length: n + 1 }, (_, k): [number, number] => [-11.93 - 0.99 * (y0 + ((y1 - y0) * k) / n - 0.05), cy + y0 + ((y1 - y0) * k) / n])
  add(paint, ribbon(side(hull, 0.02), [...along.map(([x, y]): [number, number] => [x, cy + y]), ...sweep(2.3, 2.6, 3)], 0.34), LINE, true)
  add(paint, ribbon(side(duct, 0.03), sweep(2.5, 5.3, 24), 0.34), LINE, true)
  add(paint, ribbon(onFin(0.02), sweep(4.7, 11.55, 5), 0.34), LINE, true)
  // The flag on the fin, its union toward the nose on both sides.
  const fx = -21.6
  const fy = cy + 9.2
  const fw = 2.4
  const fh = 1.26
  for (let i = 0; i < 13; i++) add(paint, rect(onFin(0.035), fx - fw, i < 7 ? fx - 0.4 * fw : fx, fy - ((i + 1) * fh) / 13, fy - (i * fh) / 13), i % 2 ? 0xffffff : 0xb22234, true)
  add(paint, rect(onFin(0.035), fx - 0.4 * fw, fx, fy - (7 * fh) / 13, fy), 0x3c3b6e, true)
  for (let i = 0; i < 9; i++) {
    for (let j = (i % 2); j < 11; j += 2) {
      const sx = fx - (0.4 * fw * (j + 1)) / 12
      const sy = fy - ((7 * fh) / 13) * ((i + 1) / 10)
      add(paint, rect(onFin(0.045), sx - 0.02, sx + 0.02, sy - 0.02, sy + 0.02), 0xffffff, true)
    }
  }

  // ---- Navigation lights: red on the left wingtip, green on the right, white at the tail.
  const light = new THREE.SphereGeometry(0.2, 8, 6)
  add(lamp, light.clone().translate(-9.4, cy + 0.52, 23.75), 0x1dff5a)
  add(lamp, light.clone().translate(-9.4, cy + 0.52, -23.75), 0xff2a1a)
  add(lamp, light.translate(-26.7, cy + 0.6, 0), 0xffffff)

  for (const mat of [paint, metal, glass, lamp]) {
    const parts = [...(centre.get(mat) ?? []), ...(right.get(mat) ?? []).flatMap((geo) => [geo, mirrored(geo)])]
    plane.add(new THREE.Mesh(mergeGeometries(parts), mat))
  }
  return plane
}
