import { describe, expect, it } from 'vitest'
import { serviceWorkerSource, versionOf } from './sw-source'

describe('service worker source', () => {
  const files = ['assets/index-abc123.js', 'index.html', 'manifest.webmanifest']

  it('lists every built file and is valid JavaScript', () => {
    const src = serviceWorkerSource(files, 'v1')
    expect(src).toContain(JSON.stringify(files))
    expect(src).toContain("'smdg-v1'")
    expect(() => new Function(src)).not.toThrow()
  })

  it('gets a new cache version when any file changes', () => {
    expect(versionOf(files)).toBe(versionOf([...files]))
    expect(versionOf(files)).not.toBe(versionOf(['assets/index-def456.js', 'index.html', 'manifest.webmanifest']))
  })
})
