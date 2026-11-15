// A local height patch: metres, row 0 at the north edge. Shared by the Moon walk and, later, Mars.

import { sampleHeight } from '../probe/nasa'
import type { Obstacle } from '../fps/model'

/** Mean lunar radius used by SLDEM2015, metres. */
export const MOON_RADIUS_M = 1_737_400

/** Apollo 17 landing site and the SLDEM crop around it (`public/terrain/moon/apollo17/meta.json`). */
export const TAURUS_LITTROW = { lat: 20.1908, lon: 30.77168 }
export const APOLLO17_BOX: PatchBox = {
  south: 19.94140625,
  north: 20.44140625,
  west: 30.521484375,
  east: 31.021484375,
}

/** True when a lat/lon falls inside the walkable lunar valley. */
export function insidePatch(lat: number, lon: number, box: PatchBox = APOLLO17_BOX): boolean {
  return lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east
}

export interface PatchBox {
  south: number
  north: number
  west: number
  east: number
}

export interface PatchMeta extends PatchBox {
  name: string
  lat: number
  lon: number
  cols: number
  rows: number
  min_m: number
  max_m: number
  /** Mean elevation of the patch (meta.json has it). */
  mean_m: number
  radius_m: number
}

/** Width (east) and depth (north) of a patch on a sphere of `radiusM`, in metres. */
export function patchMetres(box: PatchBox, radiusM = MOON_RADIUS_M): { width: number; depth: number } {
  const mid = ((box.south + box.north) / 2) * Math.PI / 180
  const metresPerDeg = radiusM * Math.PI / 180
  return {
    width: (box.east - box.west) * metresPerDeg * Math.cos(mid),
    depth: (box.north - box.south) * metresPerDeg,
  }
}

/** Patch coordinates. +x east, +z north, origin at the centre of the box. */
export function localXZ(lat: number, lon: number, box: PatchBox, width: number, depth: number): { x: number; z: number } {
  const u = (lon - box.west) / (box.east - box.west)
  const v = (box.north - lat) / (box.north - box.south)
  return { x: (u - 0.5) * width, z: (0.5 - v) * depth }
}

/** Inverse of `localXZ`. `v` 0 is the north edge. */
export function groundPoint(x: number, z: number, box: PatchBox, width: number, depth: number): { lat: number; lon: number } {
  const u = x / width + 0.5
  const v = 0.5 - z / depth
  return {
    lon: box.west + u * (box.east - box.west),
    lat: box.north - v * (box.north - box.south),
  }
}

/** Metres above the reference sphere, bilinear. `x`/`z` use `localXZ`. */
export function elevationAt(
  heights: ArrayLike<number>,
  cols: number,
  rows: number,
  x: number,
  z: number,
  width: number,
  depth: number,
): number {
  const u = x / width + 0.5
  const v = 0.5 - z / depth
  return sampleHeight(heights, cols, rows, u, v)
}

/** Walls just outside the walkable patch so the player stays on the mesh. */
export function patchFence(width: number, depth: number, inset = 3): Obstacle[] {
  const hx = width / 2 - inset
  const hz = depth / 2 - inset
  const t = 6
  return [
    { min: [-hx - t, 0, hz], max: [hx + t, 3, hz + t] },
    { min: [-hx - t, 0, -hz - t], max: [hx + t, 3, -hz] },
    { min: [-hx - t, 0, -hz], max: [-hx, 3, hz] },
    { min: [hx, 0, -hz], max: [hx + t, 3, hz] },
  ]
}

export function isPatchMeta(value: unknown): value is PatchMeta {
  if (!value || typeof value !== 'object') return false
  const m = value as Partial<PatchMeta>
  return typeof m.name === 'string'
    && typeof m.cols === 'number' && m.cols > 1
    && typeof m.rows === 'number' && m.rows > 1
    && typeof m.south === 'number' && typeof m.north === 'number' && m.north > m.south
    && typeof m.west === 'number' && typeof m.east === 'number' && m.east > m.west
    && typeof m.min_m === 'number' && typeof m.max_m === 'number' && m.max_m > m.min_m
    && typeof m.lat === 'number' && typeof m.lon === 'number'
    && typeof m.radius_m === 'number'
}
