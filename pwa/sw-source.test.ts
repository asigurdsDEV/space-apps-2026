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

it('serves allowlisted static modules regardless of Origin Vary, while leaving API calls alone', async () => {
  const handlers = new Map<string, (event: unknown) => void>()
  const cached = new Response('module code')
  const matches: unknown[][] = []
  const origin = 'https://example.test'
  const worker = { registration: { scope: origin + '/space-apps-2026/' }, location: { origin }, addEventListener: (name: string, cb: (e: unknown) => void) => handlers.set(name, cb) }
  const cache = { match: async (...args: unknown[]) => { matches.push(args); return cached } }
  new Function('self', 'caches', serviceWorkerSource(['assets/room.js', 'index.html', 'game-assets.json'], 'v1'))(worker, cache)
  let response: Promise<Response> | undefined
  handlers.get('fetch')!({ request: { method: 'GET', mode: 'cors', url: origin + '/space-apps-2026/assets/room.js' }, respondWith: (r: Promise<Response>) => { response = r } })
  expect(await response).toBe(cached)
  expect(matches[0]?.[1]).toEqual({ ignoreVary: true })
  response = undefined
  handlers.get('fetch')!({ request: { method: 'GET', mode: 'cors', url: origin + '/api/ice' }, respondWith: (r: Promise<Response>) => { response = r } })
  expect(response).toBeUndefined()
})

it.each(['/', '/space-apps-2026/'])('leaves the demo on the network without touching the cached game at scope %s', (base) => {
  const handlers = new Map<string, (event: unknown) => void>()
  const origin = 'https://example.test'
  const worker = { registration: { scope: origin + base }, location: { origin }, addEventListener: (name: string, cb: (event: unknown) => void) => handlers.set(name, cb) }
  const touched: string[] = []
  const caches = { match: () => { touched.push('cache') }, open: () => { touched.push('cache') } }
  const fetch = () => { touched.push('network') }
  new Function('self', 'caches', 'fetch', serviceWorkerSource(['index.html'], 'v1'))(worker, caches, fetch)
  for (const file of ['demo', 'demo/', 'demo/index.html', 'demo/first-flight-demo.mp4']) {
    handlers.get('fetch')!({ request: { method: 'GET', mode: 'navigate', url: origin + base + file }, respondWith: () => touched.push('intercepted') })
  }
  expect(touched).toEqual([])
})
