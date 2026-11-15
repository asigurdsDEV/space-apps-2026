import { afterEach, describe, expect, it, vi } from 'vitest'
import { ICE_WAIT_MS, cloudflareIceServers } from './room'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('cloudflareIceServers', () => {
  it('returns the minted servers and drops port 53', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
        { urls: 'turns:turn.cloudflare.com:443?transport=tcp', username: 'u', credential: 'c' },
      ],
    }))))
    await expect(cloudflareIceServers()).resolves.toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      { urls: ['turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
    ])
  })

  it('gives up when the mint does not answer, so Host and Join can open', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')))
    }))
    const pending = cloudflareIceServers(ICE_WAIT_MS)
    await vi.advanceTimersByTimeAsync(ICE_WAIT_MS)
    await expect(pending).resolves.toBeUndefined()
  })
})
