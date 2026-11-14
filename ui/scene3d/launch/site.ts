// What a rocket starts from: a launch pad with its tower, or a carrier aircraft. Meters, +y up.
import * as THREE from 'three'

const std = (color: number, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })

export interface Pad {
  group: THREE.Group
  /** Height of the rocket's base above the ground. */
  standoff: number
  /** Half-width of the launch mount: the flame trench throws smoke out past this along ±x. */
  mount: number
  /** Swing arms from the tower to the rocket; rotate about y to retract. */
  arms: THREE.Object3D[]
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

/**
 * A pad for a rocket `height` tall and `footprint` wide at the base: a launch mount over a flame trench,
 * a service tower on the -x side (the rocket pitches over toward +x, away from it), lightning masts and tanks.
 */
export function buildPad(height: number, footprint: number, bellDrop: number): Pad {
  const group = new THREE.Group()
  const steel = std(0x8a9099, 0.6, 0.5)
  const concrete = std(0x8d8c88, 0.9)
  const dark = std(0x2b2d31, 0.8, 0.2)
  const white = std(0xe4e6ea, 0.5)
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  const mount = Math.max(footprint * 1.5, height * 0.06)
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
  // Scorched trench floor under the mount.
  add(new THREE.BoxGeometry(mount * 5, 0.2, mount * 1.1), dark, 0, 0.1, 0)

  // Service tower with a lightning rod, and two arms reaching the rocket.
  const towerW = Math.max(height * 0.085, 2.2)
  const towerH = standoff + height * 1.04
  const towerX = -(mount + towerW * 0.9)
  const tower = lattice(towerW, towerH, steel)
  tower.position.set(towerX, 0, 0)
  group.add(tower)
  add(new THREE.CylinderGeometry(towerW * 0.03, towerW * 0.06, height * 0.22, 6), steel, towerX, towerH + height * 0.11, 0)
  const arms: THREE.Object3D[] = []
  for (const f of [0.52, 0.86]) {
    const pivot = new THREE.Group()
    pivot.position.set(towerX + towerW / 2, standoff + height * f, 0)
    const reach = -towerX - towerW / 2 - footprint * 0.45
    add(new THREE.BoxGeometry(reach, towerW * 0.22, towerW * 0.3), steel, reach / 2, 0, 0, pivot)
    group.add(pivot)
    arms.push(pivot)
  }

  // Lightning masts around the pad, taller than the rocket.
  const mastH = towerH * 1.3
  const mast = new THREE.CylinderGeometry(height * 0.004, height * 0.014, mastH, 6)
  const ring = Math.max(mount * 3.2, height * 0.55)
  for (const a of [2.0, 3.9, 5.6]) add(mast, steel, Math.cos(a) * ring, mastH / 2, Math.sin(a) * ring)

  // Propellant tanks and a hangar, for scale.
  const tankR = Math.max(height * 0.07, 2)
  add(new THREE.SphereGeometry(tankR, 24, 16), white, -ring * 1.5, tankR * 1.25, -ring * 0.9)
  add(new THREE.CylinderGeometry(tankR * 0.12, tankR * 0.12, tankR * 1.2, 8), steel, -ring * 1.5, tankR * 0.3, -ring * 0.9)
  const tank = new THREE.CapsuleGeometry(tankR * 0.55, tankR * 2.4, 6, 16).rotateZ(Math.PI / 2)
  add(tank, white, -ring * 1.4, tankR * 0.7, ring * 0.7)
  add(tank, white, -ring * 1.4, tankR * 0.7, ring * 0.7 + tankR * 1.6)
  add(new THREE.BoxGeometry(height * 0.5, height * 0.16, height * 0.3), concrete, -ring * 4.5, height * 0.08, -ring * 2.2)
  add(new THREE.BoxGeometry(height * 0.52, height * 0.015, height * 0.32), dark, -ring * 4.5, height * 0.165, -ring * 2.2)

  // A real-size van (6 m long) parked on the apron: the pad is sized to the rocket, so this is what shows how big the rocket is.
  const vanX = mount + 7
  const vanZ = mount * 1.5 + 5
  add(new THREE.BoxGeometry(4.2, 2.3, 2.2), white, vanX - 0.9, 1.45, vanZ)
  add(new THREE.BoxGeometry(1.8, 1.7, 2.2), steel, vanX + 2.1, 1.15, vanZ)
  add(new THREE.BoxGeometry(5.4, 0.5, 2.3), dark, vanX, 0.35, vanZ)

  return { group, standoff, mount, arms }
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
