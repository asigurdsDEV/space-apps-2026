import { describe, expect, it } from 'vitest'
import { terrainGeometry } from './mesh'

describe('terrain mesh', () => {
  it('builds one continuous surface with upward normals and real heights', () => {
    const heights = new Float32Array([0, 0, 10, 20])
    const geo = terrainGeometry(heights, 2, 2, 10, 10, 0)
    expect(geo.getAttribute('position').count).toBe(4)
    expect(geo.getIndex()?.count).toBe(6)
    const pos = geo.getAttribute('position')
    expect(pos.getY(2)).toBe(10)
    expect(pos.getZ(0)).toBeGreaterThan(0)
    expect(pos.getZ(2)).toBeLessThan(0)
    const normal = geo.getAttribute('normal')
    for (let i = 0; i < normal.count; i++) expect(normal.getY(i)).toBeGreaterThan(0.2)
  })
})
