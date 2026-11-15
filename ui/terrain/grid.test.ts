// @ts-expect-error The app's tsconfig has no Node types; Vitest runs this file in Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { elevationAt, groundPoint, isPatchMeta, localXZ, patchMetres, type PatchMeta } from './grid'

const meta = JSON.parse(readFileSync(new URL('../../public/terrain/moon/apollo17/meta.json', import.meta.url), 'utf8')) as PatchMeta
const heights = readFileSync(new URL('../../public/terrain/moon/apollo17/height.f32', import.meta.url))

describe('Apollo 17 terrain patch', () => {
  it('is a real SLDEM crop around the landing site, not a flat plane', () => {
    expect(isPatchMeta(meta)).toBe(true)
    expect(meta.name).toContain('Apollo 17')
    expect(meta.lat).toBeCloseTo(20.1908, 3)
    expect(meta.lon).toBeCloseTo(30.77168, 3)
    expect(meta.south).toBeLessThan(meta.lat)
    expect(meta.north).toBeGreaterThan(meta.lat)
    expect(meta.west).toBeLessThan(meta.lon)
    expect(meta.east).toBeGreaterThan(meta.lon)
    expect(meta.max_m - meta.min_m).toBeGreaterThan(1000)
    expect(heights.byteLength).toBe(meta.cols * meta.rows * 4)
  })

  it('places the landing site on the patch and reads a valley elevation', () => {
    const size = patchMetres(meta, meta.radius_m)
    expect(size.width).toBeGreaterThan(10_000)
    expect(size.depth).toBeGreaterThan(10_000)
    const at = localXZ(meta.lat, meta.lon, meta, size.width, size.depth)
    const back = groundPoint(at.x, at.z, meta, size.width, size.depth)
    expect(back.lat).toBeCloseTo(meta.lat, 4)
    expect(back.lon).toBeCloseTo(meta.lon, 4)
    const view = new Float32Array(heights.buffer.slice(heights.byteOffset, heights.byteOffset + heights.byteLength))
    const h = elevationAt(view, meta.cols, meta.rows, at.x, at.z, size.width, size.depth)
    expect(h).toBeGreaterThan(meta.min_m - 1)
    expect(h).toBeLessThan(meta.max_m + 1)
    expect(h).toBeLessThan(-1500)
  })
})
