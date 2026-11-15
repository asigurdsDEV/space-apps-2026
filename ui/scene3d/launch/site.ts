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
  float free = 1.0 - at.y;
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

  // Three lightning masts, taller than the rocket: steel below, a white fibreglass top, and wires strung between them.
  const mastH = towerH * 1.3
  const mastLow = new THREE.CylinderGeometry(height * 0.006, height * 0.011, mastH * 0.72, 8)
  const mastTop = new THREE.CylinderGeometry(height * 0.003, height * 0.006, mastH * 0.28, 8)
  for (const [x, z] of site.masts) {
    add(mastLow, steel, x, mastH * 0.36, z)
    add(mastTop, white, x, mastH * 0.86, z)
  }
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
    add(bar(wx + Math.cos(a) * ball * 1.05, 0, wz + Math.sin(a) * ball * 1.05, wx + Math.cos(a) * ball * 0.72, ballY - ball * 0.5, wz + Math.sin(a) * ball * 0.72, ball * 0.045), white, 0, 0, 0)
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
  // Clumps of scrub on the sand between the apron and the water.
  const clear: [number, number, number][] = [
    ...site.spheres.map(([x, z, r]): [number, number, number] => [x, z, r * 2.2]),
    ...site.sheds.map(([x, z, w]): [number, number, number] => [x, z, w * 0.75]),
    [wx, wz, ball * 2],
  ]
  const scrub = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), 170)
  const m = new THREE.Matrix4()
  const where = new THREE.Vector3()
  const size = new THREE.Vector3()
  const turn = new THREE.Quaternion()
  const leaf = new THREE.Color()
  let n = 0
  for (let i = 0; i < 1400 && n < 170; i++) {
    const x = (hash(i) * 11 - 6) * unit
    const z = (0.9 - hash(i + 0.5) * 3.4) * unit
    const land = -waterDepth(x, z, unit) - shoreWobble(x, z, unit)
    const onApron = (x / unit) ** 4 + (z / (0.8 * unit)) ** 4 < 1.25
    const onWay = x < 0 && Math.abs(z) < 0.32 * unit
    if (land < 0.02 * unit || land > 0.75 * unit || onApron || onWay || clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue
    const s = unit * (0.012 + 0.02 * hash(i + 0.2))
    size.set(s * (0.9 + 0.9 * hash(i + 0.3)), s * (0.55 + 0.3 * hash(i + 0.4)), s * (0.9 + 0.9 * hash(i + 0.6)))
    scrub.setMatrixAt(n, m.compose(where.set(x, size.y * 0.35, z), turn.setFromAxisAngle(UP, hash(i + 0.7) * 6.28), size))
    scrub.setColorAt(n, leaf.setRGB(0.07 + 0.05 * hash(i + 0.8), 0.11 + 0.06 * hash(i + 0.9), 0.05))
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

/**
 * A three-engine wide-body jet with the rocket slung under its belly. Long axis +x (the nose), origin where
 * the rocket's centre hangs.
 */
export function buildCarrier(rocketRadius: number): THREE.Group {
  const plane = new THREE.Group()
  const white = std(0xe6e8ec, 0.4, 0.1)
  const grey = std(0xaab0b8, 0.45, 0.4)
  const dark = std(0x23262c, 0.5, 0.4)
  const blue = std(0x1c3f77, 0.45, 0.1)
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    plane.add(mesh)
    return mesh
  }
  const r = 2.9
  const cy = r + rocketRadius * 1.9
  const body = [[0.2, -27], [1.5, -21], [2.6, -13], [r, -6], [r, 18], [2.5, 22.5], [1.5, 25.6], [0.0001, 27]].map(([x, y]) => new THREE.Vector2(x, y))
  add(new THREE.LatheGeometry(body, 28).rotateZ(-Math.PI / 2), white, 0, cy, 0)
  add(new THREE.BoxGeometry(46, 0.5, 0.2), blue, -1, cy + 0.2, r * 0.99)
  add(new THREE.BoxGeometry(46, 0.5, 0.2), blue, -1, cy + 0.2, -r * 0.99)
  add(new THREE.BoxGeometry(2.4, 0.8, 4.4), dark, 23.3, cy + 0.9, 0)
  // Swept wings and tailplanes: one outline, extruded flat and mirrored.
  const surface = (root: number, tip: number, span: number, sweep: number, thick: number) => {
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-root, 0), new THREE.Vector2(-sweep - tip, span), new THREE.Vector2(-sweep, span)])
    return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }).rotateX(Math.PI / 2)
  }
  const wing = surface(10.5, 3, 22, 14, 0.7)
  add(wing, grey, 6, cy - 1.2, r * 0.6)
  add(wing, grey, 6, cy - 1.2, -r * 0.6).scale.z = -1
  const stab = surface(5.5, 2, 9, 6, 0.4)
  add(stab, grey, -19, cy + 0.8, 1)
  add(stab, grey, -19, cy + 0.8, -1).scale.z = -1
  const fin = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-8, 0), new THREE.Vector2(-10.5, 9.5), new THREE.Vector2(-7.5, 9.5)])
  add(new THREE.ExtrudeGeometry(fin, { depth: 0.5, bevelEnabled: false }), white, -16.5, cy + 2.2, -0.25)
  // Engines: one under each wing and one in the tail.
  const pod = new THREE.CylinderGeometry(1.25, 1.05, 5.2, 20).rotateZ(-Math.PI / 2)
  const intake = new THREE.CylinderGeometry(1.1, 1.1, 0.3, 20).rotateZ(-Math.PI / 2)
  for (const [x, y, z] of [[3.5, cy - 3.2, 9.5], [3.5, cy - 3.2, -9.5], [-20.5, cy + 3, 0]] as const) {
    add(pod, white, x, y, z)
    add(intake, dark, x + 2.6, y, z)
  }
  add(new THREE.BoxGeometry(0.4, 1.6, 0.4), grey, 3, cy - 2, 9.5)
  add(new THREE.BoxGeometry(0.4, 1.6, 0.4), grey, 3, cy - 2, -9.5)
  return plane
}
