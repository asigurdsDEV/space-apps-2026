import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../public/visual-assets/flight/', import.meta.url)

function gltfJson(name) {
  const bytes = readFileSync(new URL(name, root))
  expect(bytes.subarray(0, 4).toString('utf8')).toBe('glTF')
  const jsonLength = bytes.readUInt32LE(12)
  const jsonType = bytes.readUInt32LE(16)
  expect(jsonType).toBe(0x4e4f534a)
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
}

describe('flight training GLBs', () => {
  it('matches the training route ids and stays under the download budget', () => {
    const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'))
    expect(manifest.up).toBe('+Y')
    expect(manifest.forward).toBe('-Z')
    expect(manifest.assets.map((asset) => asset.id)).toEqual(['hurricane', 'wildfire', 'tdrs-relay'])
    expect(manifest.total_bytes).toBeLessThan(8_000_000)
    let summed = 0
    for (const asset of manifest.assets) {
      const json = gltfJson(asset.file)
      expect(json.nodes[0]?.extras?.targetId).toBe(asset.id)
      expect(json.buffers[0]?.byteLength).toBeGreaterThan(0)
      expect(asset.triangles).toBeGreaterThan(0)
      summed += asset.bytes
    }
    expect(summed).toBe(manifest.total_bytes)
  })
})
