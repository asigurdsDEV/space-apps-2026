import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { feed, forgetFeeds, OFFLINE, RETRY_MS, STALE_PERIODS, type FeedSpec } from './feed'

const HOUR = 3_600_000
const SPEC: FeedSpec<{ n: number }> = {
  key: 'test',
  url: 'https://example.test/feed.json',
  source: 'Test feed',
  sourceUrl: 'https://example.test/',
  ttlMs: 2 * HOUR,
  parse: (body) => {
    if (typeof (body as { n?: unknown }).n !== 'number') throw new Error('bad')
    return body as { n: number }
  },
  asOf: () => null,
}

let stored: Map<string, string>
let calls: number
let respond: () => Promise<Response>
const json = (body: unknown, status = 200) => () => Promise.resolve(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T10:00:00Z'))
  stored = new Map()
  calls = 0
  respond = json({ n: 1 })
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value) })
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('fetch', () => {
    calls++
    return respond()
  })
  forgetFeeds()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('polite feed cache', () => {
  it('asks once, then answers from the cache until the refresh period has passed, across reloads', async () => {
    const first = await feed(SPEC)
    expect(first).toMatchObject({ ok: true, data: { n: 1 }, source: 'Test feed', fetchedAt: '2026-11-15T10:00:00.000Z', asOf: '2026-11-15T10:00:00.000Z' })
    vi.setSystemTime(Date.now() + 2 * HOUR - 1000)
    forgetFeeds() // a reload: only localStorage is left
    respond = json({ n: 2 })
    expect(await feed(SPEC)).toMatchObject({ ok: true, data: { n: 1 }, fetchedAt: '2026-11-15T10:00:00.000Z' })
    expect(calls).toBe(1)
    vi.setSystemTime(Date.now() + 2000)
    expect(await feed(SPEC)).toMatchObject({ ok: true, data: { n: 2 } })
    expect(calls).toBe(2)
  })

  it('shares one request between callers that ask at the same moment', async () => {
    const answers = await Promise.all([feed(SPEC), feed(SPEC), feed(SPEC)])
    expect(answers.every((answer) => answer.ok)).toBe(true)
    expect(calls).toBe(1)
  })

  it('reports a failure as unavailable and leaves the feed alone for a while', async () => {
    respond = json({}, 503)
    expect(await feed(SPEC)).toEqual({ ok: false, reason: 'Test feed answered 503.', source: 'Test feed', sourceUrl: 'https://example.test/' })
    respond = json({ n: 3 })
    expect(await feed(SPEC)).toMatchObject({ ok: false })
    expect(calls).toBe(1)
    vi.setSystemTime(Date.now() + RETRY_MS + 1)
    expect(await feed(SPEC)).toMatchObject({ ok: true, data: { n: 3 } })
    expect(calls).toBe(2)
  })

  it('names what went wrong: unreadable data, no route, too slow', async () => {
    respond = json({ n: 'seven' })
    expect(await feed(SPEC)).toMatchObject({ ok: false, reason: 'Test feed sent data this screen could not read.' })
    forgetFeeds()
    respond = () => Promise.resolve(new Response('<html>busy</html>'))
    expect(await feed(SPEC)).toMatchObject({ ok: false, reason: 'Test feed sent data this screen could not read.' })
    forgetFeeds()
    respond = () => Promise.reject(new TypeError('Failed to fetch'))
    expect(await feed(SPEC)).toMatchObject({ ok: false, reason: 'Could not reach Test feed.' })
    forgetFeeds()
    respond = () => Promise.reject(new DOMException('timed out', 'TimeoutError'))
    expect(await feed(SPEC)).toMatchObject({ ok: false, reason: 'Test feed took too long to answer.' })
  })

  it('keeps showing the last good answer, with its real time, when a refresh fails, but not for ever', async () => {
    await feed(SPEC)
    respond = json({}, 500)
    vi.setSystemTime(Date.now() + 3 * HOUR)
    expect(await feed(SPEC)).toMatchObject({ ok: true, data: { n: 1 }, fetchedAt: '2026-11-15T10:00:00.000Z' })
    vi.setSystemTime(Date.now() + 2 * HOUR * STALE_PERIODS)
    expect(await feed(SPEC)).toMatchObject({ ok: false, reason: 'Test feed answered 500.' })
  })

  it('does not ask the network while the browser is offline, and asks as soon as it is back', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(await feed(SPEC)).toMatchObject({ ok: false, reason: OFFLINE })
    expect(calls).toBe(0)
    vi.stubGlobal('navigator', { onLine: true })
    expect(await feed(SPEC)).toMatchObject({ ok: true })
  })

  it('reads a body that ends in a stray NUL byte, as the NOAA flare file did on 2026-11-15', async () => {
    respond = () => Promise.resolve(new Response('{"n": 4}\u0000'))
    expect(await feed(SPEC)).toMatchObject({ ok: true, data: { n: 4 } })
  })

  it('works when storage is blocked or full', async () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('blocked') }, setItem() { throw new Error('quota') } })
    expect(await feed(SPEC)).toMatchObject({ ok: true, data: { n: 1 } })
    expect(await feed(SPEC)).toMatchObject({ ok: true, data: { n: 1 } })
    expect(calls).toBe(1)
  })

  it('lets go of a caller whose signal aborts, while the one request still lands in the cache', async () => {
    let finish: (response: Response) => void = () => {}
    respond = () => new Promise((resolve) => { finish = resolve })
    const gone = new AbortController()
    const waiting = feed(SPEC, gone.signal)
    gone.abort()
    expect(await waiting).toMatchObject({ ok: false, reason: 'Cancelled.' })
    const second = feed(SPEC)
    finish(new Response(JSON.stringify({ n: 9 })))
    expect(await second).toMatchObject({ ok: true, data: { n: 9 } })
    expect(calls).toBe(1)
  })
})
