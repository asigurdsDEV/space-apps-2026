import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadAssets, readAssetManifest, type AssetProgress } from './assets-download'

afterEach(() => vi.unstubAllGlobals())
const base = new URL('https://example.test/space-apps-2026/')

describe('game asset preparation', () => {
  it('rejects files outside the deployment base and deduplicates valid files', () => {
    expect(readAssetManifest({ version: 'abc-1', files: ['assets/a.js', 'assets/a.js'] }, base, new URL('assets/a.js', base)).files).toEqual(['assets/a.js'])
    for (const file of ['https://elsewhere.test/a.js', '../outside.js', 'assets/a.js?x=1']) {
      expect(() => readAssetManifest({ version: 'abc', files: [file] }, base, new URL('assets/a.js', base))).toThrow()
    }
    expect(() => readAssetManifest({ version: 'abc', files: [] }, base, new URL('assets/a.js', base))).toThrow()
    expect(() => readAssetManifest({ version: 'abc', files: ['assets/old.js'] }, base, new URL('assets/new.js', base))).toThrow('another build')
  })

  it('reuses a cached file and only reports completed responses; failure cannot produce ready', async () => {
    const stored = new Map<string, Response>([[new URL('assets/a.js', base).href, new Response('cached')]])
    const cache = {
      match: vi.fn(async (url: string) => stored.get(url)),
      put: vi.fn(async (url: string, r: Response) => { await r.arrayBuffer(); stored.set(url, r) }),
    }
    vi.stubGlobal('caches', { open: async () => cache })
    const fetcher = vi.fn(async () => new Response('model'))
    vi.stubGlobal('fetch', fetcher)
    const updates: AssetProgress[] = []
    const manifest = { version: 'abc', files: ['assets/a.js', 'model.glb'] }
    const done = await downloadAssets(manifest, base, new AbortController().signal, (p) => updates.push(p))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(cache.match).toHaveBeenCalledWith(new URL('assets/a.js', base).href, { ignoreVary: true })
    expect(done).toEqual({ completed: 2, total: 2, phase: 'prepare' })
    expect(updates.at(-1)).toEqual({ completed: 2, total: 2, phase: 'download' })
    vi.stubGlobal('fetch', async () => new Response('missing', { status: 404 }))
    await expect(downloadAssets({ version: 'abc', files: ['missing.glb'] }, base, new AbortController().signal, (p) => updates.push(p))).rejects.toThrow('404')
    expect(updates.some((p) => p.phase === 'ready')).toBe(false)
  })

  it('supports cache-blocked browsers and aborts without counting unfinished files', async () => {
    vi.stubGlobal('caches', { open: async () => { throw new Error('private window') } })
    vi.stubGlobal('fetch', async () => new Response('model'))
    const job = new AbortController()
    const progress = vi.fn()
    await downloadAssets({ version: 'abc', files: ['model.glb'] }, base, job.signal, progress)
    expect(progress).toHaveBeenLastCalledWith({ completed: 1, total: 1, phase: 'download' })
    job.abort()
    await expect(downloadAssets({ version: 'abc', files: ['model.glb'] }, base, job.signal, progress)).rejects.toThrow()
  })

  it('can prepare this visit when a cache write runs out of storage', async () => {
    vi.stubGlobal('caches', { open: async () => ({ match: async () => undefined, put: async () => { throw new Error('quota') } }) })
    vi.stubGlobal('fetch', async () => new Response('model'))
    const progress = vi.fn()
    await downloadAssets({ version: 'abc', files: ['model.glb'] }, base, new AbortController().signal, progress)
    expect(progress).toHaveBeenLastCalledWith({ completed: 1, total: 1, phase: 'download' })
  })
})
