import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildCarrier } from './site'

describe('buildCarrier', () => {
  const R = 0.635
  const plane = buildCarrier(R)
  const meshes: THREE.Mesh[] = []
  plane.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o) })
  /** Lowest point of the aircraft over a patch of its plan view. */
  const lowest = (x0: number, x1: number, halfWidth: number) => {
    let y = Infinity
    for (const mesh of meshes) {
      const at = mesh.geometry.getAttribute('position')
      for (let i = 0; i < at.count; i++) if (at.getX(i) >= x0 && at.getX(i) <= x1 && Math.abs(at.getZ(i)) <= halfWidth) y = Math.min(y, at.getY(i))
    }
    return y
  }

  it('draws in a handful of calls, one mesh per material', () => {
    expect(meshes.length).toBeLessThanOrEqual(8)
    expect(new Set(meshes.map((m) => m.material)).size).toBe(meshes.length)
  })

  it('keeps the size and the place the launch scene flies it at', () => {
    const box = new THREE.Box3().setFromObject(plane)
    // 54 m from nose (+x) to tail about the origin, 47.5 m across the wings.
    expect(box.max.x).toBeCloseTo(27, 1)
    expect(box.min.x).toBeCloseTo(-27, 1)
    expect(box.max.z).toBeCloseTo(23.74, 1)
    expect(box.min.z).toBeCloseTo(-23.74, 1)
    // The belly ahead of the wing is 1.9 rocket radii above the rocket's axis.
    expect(lowest(13, 17, 0.3)).toBeCloseTo(1.9 * R, 1)
  })

  it('leaves the rocket room to hang under the belly and fall straight down', () => {
    // The rocket is 16.9 m long and 6.7 m across its wing, whose top is 0.855 m above its axis.
    expect(lowest(-8.5, 8.5, 3.4)).toBeGreaterThan(0.855)
  })

  it('builds whole geometry that the scene can light', () => {
    for (const mesh of meshes) {
      const at = mesh.geometry.getAttribute('position')
      expect(mesh.geometry.getAttribute('normal').count).toBe(at.count)
      expect(mesh.geometry.getAttribute('color').count).toBe(at.count)
      expect((at.array as Float32Array).every(Number.isFinite)).toBe(true)
    }
  })
})
