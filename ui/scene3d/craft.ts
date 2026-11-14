// Assembles the spacecraft from the picked catalog parts. The part models live in ./parts, one module
// per family; ./parts/layout.ts decides which model each row gets and where it mounts.
// Axes: +y points away from the planet (zenith), +z faces the Sun, wings stick out along ±x,
// instruments look down (-y).
import * as THREE from 'three'
import type { CraftSpec } from './model'
import { buildBus, buildPart, craftLayout } from './parts'

export interface CraftAnchors {
  /** Where a radio beam starts. Missing when no radio is picked. */
  antenna?: THREE.Vector3
  /** Centre of the Earth-facing side. */
  nadir: THREE.Vector3
}

/**
 * The craft, scaled to fit a unit sphere around its origin. `userData.anchors` (CraftAnchors) is in the
 * returned group's coordinates. Each part is a sub-group with `userData.part` ('bus' | 'power' | 'comms' |
 * 'instrument') and `userData.id` (the catalog id), so a part can be found and highlighted by traversing.
 * Materials are shared between parts and crafts: clone a mesh's material before tinting it.
 */
export function buildCraft(spec: CraftSpec): THREE.Group {
  const layout = craftLayout(spec)
  const craft = new THREE.Group()
  craft.add(buildBus(layout.bus))
  let antenna: THREE.Vector3 | undefined
  for (const mount of layout.mounts) {
    const part = buildPart(mount, layout.bus)
    craft.add(part)
    if (mount.part === 'comms' && part.userData.anchor instanceof THREE.Vector3) {
      part.updateMatrix()
      antenna = part.userData.anchor.clone().applyMatrix4(part.matrix)
    }
  }

  // Normalize so the whole craft fits in a unit sphere; the scene scales it from there.
  const sphere = new THREE.Box3().setFromObject(craft).getBoundingSphere(new THREE.Sphere())
  const scale = 1 / Math.max(sphere.radius, 1e-6)
  const pivot = new THREE.Group()
  craft.position.copy(sphere.center).multiplyScalar(-1)
  pivot.add(craft)
  pivot.scale.setScalar(scale)
  // Anchors are in the pivot's own frame, so pivot.localToWorld(anchor) gives the scene position.
  const local = (p: THREE.Vector3) => p.sub(sphere.center)
  const anchors: CraftAnchors = { nadir: local(new THREE.Vector3(0, -layout.bus.size[1] / 2, 0)) }
  if (antenna) anchors.antenna = local(antenna)
  pivot.userData.anchors = anchors
  return pivot
}

/** Frees the geometries, materials and textures of a craft (or any object). The shared part materials stay: every craft reuses them. */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line || o instanceof THREE.Sprite)) return
    // Sprites share one geometry inside three.js; only their materials are ours.
    if (!(o instanceof THREE.Sprite)) o.geometry.dispose()
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.userData.shared) continue
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    }
  })
}
