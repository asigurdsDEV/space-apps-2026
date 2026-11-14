// Builds the decision 007 mission-control prop GLBs. Original low-poly furniture.
// Run: node art/world/build-glbs.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../public/visual-assets/world')

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
    min: min.map(round),
    max: max.map(round),
    triangles,
  }
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

function buildGlb(parts, nodeName, propId) {
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
        metallicFactor: 0.08,
        roughnessFactor: 0.6,
      },
    })
    primitives.push({ attributes: { POSITION: posAcc }, indices: idxAcc, material: mat })
  }

  const bin = Buffer.concat(chunks)
  const binPad = (4 - (bin.length % 4)) % 4
  const binPadded = Buffer.concat([bin, Buffer.alloc(binPad)])
  const json = {
    asset: { version: '2.0', generator: 'art/world/build-glbs.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: nodeName, mesh: 0, extras: { propId } }],
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

const steel = [0.55, 0.58, 0.62, 1]
const shelf = [0.32, 0.35, 0.39, 1]
const crate = [0.72, 0.45, 0.22, 1]
const desk = [0.14, 0.16, 0.2, 1]
const screen = [0.22, 0.55, 0.78, 1]
const housing = [0.72, 0.74, 0.77, 1]
const red = [0.86, 0.12, 0.1, 1]
const pole = [0.28, 0.3, 0.33, 1]
const amber = [0.95, 0.62, 0.12, 1]
const base = [0.18, 0.2, 0.24, 1]
const handle = [0.92, 0.78, 0.18, 1]
const frame = [0.12, 0.13, 0.15, 1]
const face = [0.06, 0.22, 0.2, 1]

const models = [
  {
    id: 'part-rack',
    file: 'part-rack.glb',
    role: 'assembly-bay',
    label: 'Part rack',
    parts: [
      { ...box(-0.62, 0.9, 0, 0.06, 1.8, 0.4), color: steel, name: 'upright-left' },
      { ...box(0.62, 0.9, 0, 0.06, 1.8, 0.4), color: steel, name: 'upright-right' },
      { ...box(0, 0.35, 0, 1.2, 0.04, 0.36), color: shelf, name: 'shelf-low' },
      { ...box(0, 0.9, 0, 1.2, 0.04, 0.36), color: shelf, name: 'shelf-mid' },
      { ...box(0, 1.45, 0, 1.2, 0.04, 0.36), color: shelf, name: 'shelf-high' },
      { ...box(-0.28, 1.08, 0, 0.28, 0.32, 0.28), color: crate, name: 'crate' },
    ],
  },
  {
    id: 'console-desk',
    file: 'console-desk.glb',
    role: 'flight-console',
    label: 'Console desk',
    parts: [
      { ...box(0, 0.74, 0, 1.3, 0.06, 0.62), color: desk, name: 'top' },
      { ...box(-0.52, 0.36, 0, 0.08, 0.72, 0.5), color: desk, name: 'leg-left' },
      { ...box(0.52, 0.36, 0, 0.08, 0.72, 0.5), color: desk, name: 'leg-right' },
      { ...box(0, 1.05, -0.26, 0.7, 0.42, 0.04), color: screen, name: 'screen' },
    ],
  },
  {
    id: 'launch-button',
    file: 'launch-button.glb',
    role: 'launch',
    label: 'Launch button',
    parts: [
      { ...box(0, 0.55, 0, 0.28, 1.1, 0.28), color: housing, name: 'pedestal' },
      { ...box(0, 1.16, 0, 0.22, 0.1, 0.22), color: red, name: 'button' },
    ],
  },
  {
    id: 'alarm-beacon',
    file: 'alarm-beacon.glb',
    role: 'anomaly',
    label: 'Alarm beacon',
    parts: [
      { ...box(0, 0.04, 0, 0.28, 0.08, 0.28), color: pole, name: 'base' },
      { ...box(0, 0.42, 0, 0.08, 0.68, 0.08), color: pole, name: 'pole' },
      { ...box(0, 0.86, 0, 0.22, 0.18, 0.22), color: amber, name: 'lamp' },
    ],
  },
  {
    id: 'time-lever',
    file: 'time-lever.glb',
    role: 'time',
    label: 'Time lever',
    parts: [
      { ...box(0, 0.06, 0, 0.36, 0.12, 0.28), color: base, name: 'base' },
      { ...box(0, 0.38, 0, 0.06, 0.52, 0.06), color: handle, name: 'lever' },
      { ...box(0, 0.68, 0, 0.12, 0.1, 0.12), color: handle, name: 'knob' },
    ],
  },
  {
    id: 'gauge-frame',
    file: 'gauge-frame.glb',
    role: 'gauge',
    label: 'Gauge frame',
    parts: [
      { ...box(0, 0.9, 0, 0.56, 0.08, 0.04), color: frame, name: 'rail-top' },
      { ...box(0, 0.5, 0, 0.56, 0.08, 0.04), color: frame, name: 'rail-bottom' },
      { ...box(-0.26, 0.7, 0, 0.06, 0.36, 0.04), color: frame, name: 'rail-left' },
      { ...box(0.26, 0.7, 0, 0.06, 0.36, 0.04), color: frame, name: 'rail-right' },
      { ...box(0, 0.7, 0.01, 0.42, 0.28, 0.02), color: face, name: 'face' },
    ],
  },
]

mkdirSync(outDir, { recursive: true })

const manifest = {
  pack: 'world-props-v1',
  generated: '2026-11-14',
  units: 'meters',
  up: '+Y',
  forward: '-Z',
  origin: 'floor center under the prop (y=0 is the floor)',
  note: 'Room-scale stand-ins for mission control. They are not NASA hardware. Hangar and interior code place them; these files are the meshes only.',
  load: '${import.meta.env.BASE_URL}visual-assets/world/<file>',
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
if (total > 200_000) {
  console.error(`pack is ${total} bytes, over the 200 kB budget`)
  process.exit(1)
}
