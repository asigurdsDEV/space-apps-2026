// Height samples to one indexed mesh. Elevations stay in metres: nothing is stretched.

import * as THREE from 'three'

/** Row 0 is north (+z). Vertex y is metres above `minM`, so the lowest sample sits on y = 0. */
export function terrainGeometry(
  heights: ArrayLike<number>,
  cols: number,
  rows: number,
  width: number,
  depth: number,
  minM: number,
): THREE.BufferGeometry {
  const positions = new Float32Array(cols * rows * 3)
  const uvs = new Float32Array(cols * rows * 2)
  for (let iy = 0; iy < rows; iy++) {
    const z = (0.5 - iy / (rows - 1)) * depth
    const v = 1 - iy / (rows - 1)
    for (let ix = 0; ix < cols; ix++) {
      const i = iy * cols + ix
      positions[i * 3] = (ix / (cols - 1) - 0.5) * width
      positions[i * 3 + 1] = (heights[i] ?? minM) - minM
      positions[i * 3 + 2] = z
      uvs[i * 2] = ix / (cols - 1)
      uvs[i * 2 + 1] = v
    }
  }
  const quads = (cols - 1) * (rows - 1)
  const indices = new Uint32Array(quads * 6)
  let t = 0
  for (let iy = 0; iy < rows - 1; iy++) {
    for (let ix = 0; ix < cols - 1; ix++) {
      const a = iy * cols + ix
      const b = a + 1
      const c = a + cols
      const d = c + 1
      indices[t++] = a
      indices[t++] = b
      indices[t++] = c
      indices[t++] = b
      indices[t++] = d
      indices[t++] = c
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  return geo
}
