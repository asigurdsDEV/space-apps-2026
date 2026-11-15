// A low-poly crew member for co-op: cream suit, dark visor, orange bands, backpack.
// Built from boxes so it needs no model file and works offline. The name sits above the helmet.

import * as THREE from 'three'

const suit = new THREE.MeshStandardMaterial({ color: 0xf3eadc, roughness: 0.74 })
const dark = new THREE.MeshStandardMaterial({ color: 0x3c3834, roughness: 0.82 })
const visorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.22, metalness: 0.45 })
const band = new THREE.MeshStandardMaterial({ color: 0xe07a32, roughness: 0.5 })

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  return mesh
}

/** Short name that still fits over the helmet. */
export function crewLabel(name: string): string {
  const trimmed = name.trim() || 'Crew'
  return trimmed.length > 18 ? `${trimmed.slice(0, 17)}…` : trimmed
}

function nameTag(name: string): THREE.Object3D {
  const label = crewLabel(name)
  if (typeof document === 'undefined') {
    const holder = new THREE.Object3D()
    holder.name = label
    holder.position.y = 2.15
    return holder
  }
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const g = canvas.getContext('2d')!
  g.font = '600 64px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineWidth = 12
  g.strokeStyle = 'rgba(8, 10, 16, 0.85)'
  g.strokeText(label, 256, 68, 480)
  g.fillStyle = '#f7f1e6'
  g.fillText(label, 256, 68, 480)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.position.y = 2.15
  sprite.scale.set(1.7, 0.42, 1)
  sprite.name = label
  return sprite
}

/** One leg, foot on the floor. `side` is -1 (left) or 1 (right). */
function leg(side: number, parent: THREE.Object3D): void {
  const x = side * 0.15
  parent.add(box(0.16, 0.1, 0.28, dark, x, 0.05, -0.02))
  parent.add(box(0.17, 0.05, 0.2, band, x, 0.13, 0))
  parent.add(box(0.15, 0.3, 0.16, suit, x, 0.3, 0))
  parent.add(box(0.17, 0.08, 0.18, band, x, 0.48, 0.01))
  parent.add(box(0.17, 0.32, 0.18, suit, x, 0.68, 0))
}

/** An arm hanging just off the shoulder, glove out. `side` is -1 or 1. */
function arm(side: number, parent: THREE.Object3D): void {
  const limb = new THREE.Group()
  limb.position.set(side * 0.28, 1.38, 0)
  limb.rotation.z = side * -0.35
  limb.add(box(0.32, 0.12, 0.12, suit, side * 0.16, 0, 0))
  limb.add(box(0.06, 0.13, 0.13, band, side * 0.3, 0, 0))
  limb.add(box(0.12, 0.12, 0.13, dark, side * 0.38, 0, 0))
  parent.add(limb)
}

/**
 * A standing astronaut, about 1.8 m, origin at the feet.
 * The visor faces local -Z, the same way the first-person camera looks when yaw is 0.
 */
export function createAstronaut(name: string): THREE.Group {
  const crew = new THREE.Group()
  crew.name = crewLabel(name)
  leg(-1, crew)
  leg(1, crew)
  crew.add(box(0.42, 0.16, 0.24, suit, 0, 0.9, 0))
  crew.add(box(0.46, 0.46, 0.26, suit, 0, 1.2, 0))
  crew.add(box(0.34, 0.1, 0.28, dark, 0, 1.18, 0))
  crew.add(box(0.08, 0.12, 0.04, suit, 0, 1.28, -0.14))
  crew.add(box(0.3, 0.38, 0.16, dark, 0, 1.22, 0.2))
  crew.add(box(0.02, 0.32, 0.02, dark, 0.08, 1.56, 0.2))
  crew.add(box(0.12, 0.08, 0.12, suit, 0, 1.48, 0))
  crew.add(box(0.34, 0.32, 0.32, suit, 0, 1.68, 0))
  crew.add(box(0.24, 0.14, 0.06, visorMat, 0, 1.68, -0.16))
  arm(-1, crew)
  arm(1, crew)
  crew.add(nameTag(name))
  return crew
}
