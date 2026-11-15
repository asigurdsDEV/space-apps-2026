// A dark angular stealth fighter built as geometry, for the sandbox interception film.
// No photograph was attached to the request. The shape follows the written reference:
// charcoal metal, faceted fuselage, a single canopy, swept wings, canted tails, exhausts and nav lights.
// Length is about 19 m, so it reads correctly beside a full-size rocket.
import * as THREE from 'three'

export interface FighterModel {
  root: THREE.Group
  /** Empty object on the right-wing rail. The missile starts here. */
  hardpoint: THREE.Object3D
  /** Empty object at the right exhaust, for the plume. */
  nozzle: THREE.Object3D
  lights: { left: THREE.Mesh; right: THREE.Mesh; tail: THREE.Mesh }
}

const CHARCOAL = 0x2a2e33
const EDGE = 0x3a4048
const GLASS = 0x14181e

function metal(color: number, roughness = 0.38): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.74, roughness })
}

function put(parent: THREE.Object3D, mesh: THREE.Mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  mesh.position.set(x, y, z)
  mesh.rotation.set(rx, ry, rz)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

/** Nose points along +z, up is +y, right is +x. Origin at the wing root, mid-fuselage. */
export function buildFighter(): FighterModel {
  const root = new THREE.Group()
  root.name = 'fighter'
  const skin = metal(CHARCOAL)
  const edge = metal(EDGE, 0.46)
  const dark = metal(0x14171b, 0.55)
  const glass = new THREE.MeshStandardMaterial({ color: GLASS, metalness: 0.15, roughness: 0.08, transparent: true, opacity: 0.72 })

  // Faceted body: a long diamond section, a chine shelf, and a wedge nose.
  put(root, new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 8.2), skin), 0, 0.15, 0.4)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.42, 7.4), edge), 0, -0.15, -0.2)
  const nose = put(root, new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 3.4), skin), 0, 0.12, 5.5)
  nose.scale.set(1, 0.72, 1)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 1.6), edge), 0, 0.05, 7.6)
  // Spine and belly panels, so the skin is not one blank box.
  put(root, new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 6.4), edge), 0, 0.76, -0.2)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 5.2), dark), 0, -0.4, -0.6)

  // Canopy: a flattened dark glass shell just behind the nose.
  put(root, new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), glass), 0, 0.72, 2.55, 0, 0, 0).scale.set(0.85, 0.48, 1.55)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 1.7), edge), 0, 0.55, 2.5)

  // Wings: thin, swept, with a leading-edge tooth and a trailing flap line.
  const wingGeo = new THREE.BoxGeometry(5.6, 0.08, 2.5)
  const leftWing = put(root, new THREE.Mesh(wingGeo, skin), -3.5, -0.05, -0.3, 0, 0.42, 0.04)
  const rightWing = put(root, new THREE.Mesh(wingGeo, skin), 3.5, -0.05, -0.3, 0, -0.42, -0.04)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.03, 0.12), edge), -3.2, 0.01, 0.55, 0, 0.42, 0.04)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.03, 0.12), edge), 3.2, 0.01, 0.55, 0, -0.42, -0.04)
  // Wing-root gloves.
  put(root, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 3.2), edge), -1.15, -0.02, 0.2)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 3.2), edge), 1.15, -0.02, 0.2)

  // Canted tails.
  const fin = new THREE.BoxGeometry(0.08, 1.7, 1.5)
  put(root, new THREE.Mesh(fin, skin), -0.85, 1.15, -3.3, 0, 0.15, 0.45)
  put(root, new THREE.Mesh(fin, skin), 0.85, 1.15, -3.3, 0, -0.15, -0.45)

  // Intakes, dark inside.
  put(root, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.48, 2.2), dark), -0.85, -0.22, 1.4)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.48, 2.2), dark), 0.85, -0.22, 1.4)

  // Exhausts: metal cans plus a glow the scene brightens.
  const hot = new THREE.MeshStandardMaterial({ color: 0x3a2218, emissive: 0xff6a2a, emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.45 })
  put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 16), dark), -0.48, 0.05, -4.35, Math.PI / 2, 0, 0)
  put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 16), dark), 0.48, 0.05, -4.35, Math.PI / 2, 0, 0)
  put(root, new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), hot), -0.48, 0.05, -4.72)
  put(root, new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), hot), 0.48, 0.05, -4.72)

  const hardpoint = new THREE.Object3D()
  hardpoint.position.set(4.3, -0.18, -0.15)
  rightWing.add(hardpoint)
  // The wing is already rotated, and the hardpoint is a child, so the missile inherits the sweep.
  // A second marker in root space is easier for the film. Place it on the root at the rail.
  hardpoint.position.set(0, -0.2, 0.2)
  const rail = new THREE.Object3D()
  rail.position.set(4.6, -0.22, -0.2)
  root.add(rail)
  put(root, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.18), dark), 4.6, -0.12, -0.2)

  const nozzle = new THREE.Object3D()
  nozzle.position.set(0.48, 0.05, -4.8)
  root.add(nozzle)

  const lamp = (color: number) => new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, roughness: 0.4 }),
  )
  const left = put(root, lamp(0xff3344), -6.1, 0.02, 0.15)
  const right = put(root, lamp(0x33ff88), 6.1, 0.02, 0.15)
  const tail = put(root, lamp(0xfff2d0), 0, 1.85, -3.7)

  // Keep the unused wing-local hardpoint from being the one the film reads.
  void leftWing
  return { root, hardpoint: rail, nozzle, lights: { left, right, tail } }
}

export function buildMissile(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'missile'
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 2.4, 16),
    metal(0x4a5058, 0.32),
  )
  body.rotation.x = Math.PI / 2
  group.add(body)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 16), metal(0x8a9098, 0.28))
  nose.rotation.x = Math.PI / 2
  nose.position.z = 1.4
  group.add(nose)
  const finMat = metal(0x2a2e33, 0.5)
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.28), finMat)
    const a = (i / 4) * Math.PI * 2
    fin.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, -1.05)
    fin.lookAt(fin.position.clone().setZ(-1.05))
    group.add(fin)
  }
  const plume = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 1.1, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb15a, transparent: true, opacity: 0.9, depthWrite: false }),
  )
  plume.name = 'plume'
  plume.rotation.x = Math.PI / 2
  plume.position.z = -2.1
  group.add(plume)
  return group
}
