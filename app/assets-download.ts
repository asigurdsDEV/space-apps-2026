import { PUBLIC_FILES } from '../pwa/public-files'

export interface AssetProgress {
  completed: number
  total: number
  phase: 'download' | 'prepare' | 'ready'
}

export interface AssetManifest { version: string; files: string[] }

/** The manifest is fetched data: keep every download inside this deployed game's base path. */
export function readAssetManifest(value: unknown, base: URL, entry: URL): AssetManifest {
  const m = value as Partial<AssetManifest> | null
  if (!m || typeof m.version !== 'string' || !/^[a-z0-9-]+$/i.test(m.version) || !Array.isArray(m.files) || !m.files.length || m.files.length > 1024) throw new Error('Invalid game manifest')
  const files = [...new Set(m.files)]
  for (const file of files) {
    if (typeof file !== 'string') throw new Error('Invalid game file')
    const url = new URL(file, base)
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash) throw new Error('Game file outside base path')
  }
  if (!files.some((file) => new URL(file, base).href === entry.href)) throw new Error('Manifest belongs to another build')
  return { version: m.version, files }
}

/** Completed responses, not a timer or guessed transfer rate, drive the progress bar. */
export async function downloadAssets(manifest: AssetManifest, base: URL, signal: AbortSignal, progress: (p: AssetProgress) => void) {
  let cache: Cache | undefined
  try { cache = await globalThis.caches?.open(`smdg-${manifest.version}`) } catch { /* A private window can still prepare this visit through the HTTP cache. */ }
  let next = 0
  let completed = 0
  const total = manifest.files.length
  progress({ completed, total, phase: 'download' })
  await Promise.all(Array.from({ length: Math.min(4, total) }, async () => {
    while (next < total) {
      signal.throwIfAborted()
      const url = new URL(manifest.files[next++]!, base).href
      const cached = await cache?.match(url, { ignoreVary: true })
      if (!cached) {
        const response = await fetch(url, { signal })
        if (!response.ok) throw new Error(`Game download failed: ${response.status}`)
        if (cache) {
          const fallback = response.clone()
          try { await cache.put(url, response) }
          catch { cache = undefined; await fallback.arrayBuffer() }
        } else await response.arrayBuffer()
      }
      signal.throwIfAborted()
      progress({ completed: ++completed, total, phase: 'download' })
    }
  }))
  return { completed, total, phase: 'prepare' as const }
}

export async function prepareGame(signal: AbortSignal, progress: (p: AssetProgress) => void) {
  const base = new URL(import.meta.env.BASE_URL, location.origin)
  const manifest = import.meta.env.DEV
    ? { version: 'dev', files: [...PUBLIC_FILES] }
    : readAssetManifest(await (await fetch(new URL('game-assets.json', base), { signal, cache: 'no-cache' })).json(), base,
      new URL(document.querySelector<HTMLScriptElement>('script[type="module"][src]')!.src))
  // Keep the manifest with its versioned cache even if the worker has not taken control yet.
  if (!import.meta.env.DEV) {
    try {
      const cache = await globalThis.caches?.open(`smdg-${manifest.version}`)
      await cache?.put(new URL('game-assets.json', base), new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }))
    } catch { /* HTTP-cache-only preparation still works for this visit. */ }
  }
  const downloaded = await downloadAssets(manifest, base, signal, progress)
  progress(downloaded)
  // These modules contain the generated spacecraft/rocket models as well as the room renderers.
  await Promise.all([
    import('./App'),
    import('../ui/hangar/MissionControl'),
    import('../ui/interior/SpacecraftRoom'),
    import('../ui/scene3d/launch/LaunchView'),
    import('../ui/cutscenes/canvas'),
    import('../app/Training'),
  ])
  signal.throwIfAborted()
  progress({ ...downloaded, phase: 'ready' })
}
