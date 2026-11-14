// Builds the V3 flight training GLBs. Original low-poly markers (not NASA meshes).
// Run: node art/flight/build-glbs.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../public/visual-assets/flight')

function box(cx, cy, cz, w, h, d) {
  const x = w / 2
  const y = h / 2
  const z = d / 2
  const c = [
    [cx - x, cy - y, cz - z],
    [cx + x, cy - y, cz - z],
    [cx + x, cy + y, cz - z],
    [cx - x, cy + y, cz - z],
    [cx - x, cy - y, cz + z],
    [cx + x, cy - y, cz + z],
    [cx + x, cy + y, cz + z],
    [cx - x, cy + y, cz + z],
  ]
  const quads = [
    [0, 1, 2, 3],
    [5, 4, 7, 6],
    [4, 0, 3, 7],
    [1, 5, 6, 2],
    [3, 2, 6, 7],
    [4, 5, 1, 0],
  ]
  const positions = []
  const indices = []
  for (const q of quads) {
    const base = positions.length / 3
    for (const i of q) positions.push(...c[i])
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return { positions, indices }
}

function disc(y, radius, segments, lift = 0) {
  const positions = [0, y + lift, 0]
  const indices = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius)
  }
  for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1)
  return { positions, indices }
}

function cone(cy, radius, height, segments) {
  const positions = [0, cy + height, 0]
  const indices = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    positions.push(Math.cos(a) * radius, cy, Math.sin(a) * radius)
  }
  for (let i = 1; i <= segments; i++) indices.push(0, i + 1, i)
  return { positions, indices }
}

function dish(radius, depth, segments) {
  // Shallow dish opening toward -Z (forward).
  const positions = []
  const indices = []
  const rings = 4
  for (let r = 0; r <= rings; r++) {
    const t = r / rings
    const rad = radius * t
    const z = -depth * t * t
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      positions.push(Math.cos(a) * rad, Math.sin(a) * rad, z)
    }
  }
  const stride = segments + 1
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < segments; i++) {
      const a = r * stride + i
      const b = a + stride
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  return { positions, indices }
}

function translate(part, x, y, z) {
  const positions = part.positions.slice()
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += x
    positions[i + 1] += y
    positions[i + 2] += z
  }
  return { ...part, positions }
}

function boundsOf(parts) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let triangles = 0
  for (const part of parts) {
    triangles += part.indices.length / 3
    for (let i = 0; i < part.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], part.positions[i + k])
        max[k] = Math.max(max[k], part.positions[i + k])
      }
    }
  }
  return {
    min: min.map((n) => round(n)),
    max: max.map((n) => round(n)),
    triangles,
  }
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

function buildGlb(parts, nodeName, targetId) {
  const chunks = []
  let cursor = 0
  const accessors = []
  const bufferViews = []
  const materials = []
  const primitives = []

  for (const part of parts) {
    const pos = Float32Array.from(part.positions)
    const idx = Uint16Array.from(part.indices)
    const posBytes = Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength)
    const idxBytes = Buffer.from(idx.buffer, idx.byteOffset, idx.byteLength)
    const posPad = (4 - (cursor % 4)) % 4
    cursor += posPad
    const posOffset = cursor
    cursor += posBytes.length
    const idxPad = (4 - (cursor % 4)) % 4
    cursor += idxPad
    const idxOffset = cursor
    cursor += idxBytes.length
    chunks.push(Buffer.alloc(posPad), posBytes, Buffer.alloc(idxPad), idxBytes)

    let min = [Infinity, Infinity, Infinity]
    let max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], pos[i + k])
        max[k] = Math.max(max[k], pos[i + k])
      }
    }
    const posView = bufferViews.length
    bufferViews.push({ buffer: 0, byteOffset: posOffset, byteLength: posBytes.length, target: 34962 })
    const idxView = bufferViews.length
    bufferViews.push({ buffer: 0, byteOffset: idxOffset, byteLength: idxBytes.length, target: 34963 })
    const posAcc = accessors.length
    accessors.push({
      bufferView: posView,
      componentType: 5126,
      count: pos.length / 3,
      type: 'VEC3',
      min: min.map(round),
      max: max.map(round),
    })
    const idxAcc = accessors.length
    accessors.push({ bufferView: idxView, componentType: 5123, count: idx.length, type: 'SCALAR' })
    const mat = materials.length
    materials.push({
      name: part.name,
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: part.color,
        metallicFactor: 0.05,
        roughnessFactor: 0.65,
      },
    })
    primitives.push({ attributes: { POSITION: posAcc }, indices: idxAcc, material: mat })
  }

  const bin = Buffer.concat(chunks)
  const binPad = (4 - (bin.length % 4)) % 4
  const binPadded = Buffer.concat([bin, Buffer.alloc(binPad)])
  const json = {
    asset: { version: '2.0', generator: 'art/flight/build-glbs.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: nodeName, mesh: 0, extras: { targetId } }],
    meshes: [{ name: nodeName, primitives }],
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binPadded.length }],
  }
  let jsonBuf = Buffer.from(JSON.stringify(json))
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)])
  const total = 12 + 8 + jsonBuf.length + 8 + binPadded.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(total, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonBuf.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binPadded.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binPadded])
}

const white = [0.93, 0.95, 0.98, 1]
const storm = [0.2, 0.45, 0.85, 1]
const ember = [0.95, 0.35, 0.08, 1]
const smoke = [0.35, 0.34, 0.32, 1]
const gold = [0.85, 0.72, 0.28, 1]
const panel = [0.12, 0.22, 0.45, 1]
const bus = [0.75, 0.78, 0.82, 1]

const models = [
  {
    id: 'hurricane',
    file: 'hurricane.glb',
    role: 'observation-target',
    label: 'Hurricane marker',
    parts: [
      { ...disc(0.15, 3.2, 20), color: white, name: 'cloud-deck' },
      { ...disc(0.35, 1.15, 16, 0.05), color: storm, name: 'eye' },
    ],
  },
  {
    id: 'wildfire',
    file: 'wildfire.glb',
    role: 'observation-target',
    label: 'Wildfire marker',
    parts: [
      { ...cone(0, 1.1, 2.4, 12), color: ember, name: 'heat' },
      { ...translate(box(0, 3.1, 0, 1.4, 1.2, 1.4), 0, 0, 0), color: smoke, name: 'smoke' },
    ],
  },
  {
    id: 'tdrs-relay',
    file: 'tdrs-relay.glb',
    role: 'relay',
    label: 'Relay satellite marker',
    parts: [
      { ...box(0, 0, 0, 1.2, 0.7, 0.9), color: bus, name: 'bus' },
      { ...box(-2.2, 0, 0, 2.6, 0.08, 0.9), color: panel, name: 'panel-port' },
      { ...box(2.2, 0, 0, 2.6, 0.08, 0.9), color: panel, name: 'panel-starboard' },
      { ...translate(dish(1.15, 0.35, 16), 0, 0, -0.7), color: gold, name: 'dish' },
    ],
  },
]

mkdirSync(outDir, { recursive: true })

const manifest = {
  pack: 'flight-training-v3',
  generated: '2026-11-14',
  units: 'meters',
  up: '+Y',
  forward: '-Z',
  origin: 'model center (hurricane deck sits on y=0; wildfire base on y=0; relay bus centered on origin)',
  note: 'Classroom-scale markers for the training route. They are not true-size storms or a flight TDRS spacecraft. The player craft and planets stay in ui/scene3d/.',
  load: '${import.meta.env.BASE_URL}visual-assets/flight/<file>',
  assets: [],
}

for (const model of models) {
  const bytes = buildGlb(model.parts, model.id, model.id)
  writeFileSync(join(outDir, model.file), bytes)
  const measured = boundsOf(model.parts)
  manifest.assets.push({
    id: model.id,
    file: model.file,
    role: model.role,
    label: model.label,
    bytes: bytes.length,
    triangles: measured.triangles,
    bounds_m: { min: measured.min, max: measured.max },
    clips: [],
  })
}

const total = manifest.assets.reduce((sum, asset) => sum + asset.bytes, 0)
manifest.total_bytes = total
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote ${manifest.assets.length} glbs, ${total} bytes, to ${outDir}`)
