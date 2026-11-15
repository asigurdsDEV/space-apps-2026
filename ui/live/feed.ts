// What every Live Earth feed returns, and the one polite way to ask for it: a timeout, a timestamped cache
// that survives reloads, one request shared by everyone who asks at once, and no retry loop.

/** A feed's answer. `ok: false` means "say this one item is unavailable"; nothing here throws. */
export type Feed<T> =
  | {
      ok: true
      data: T
      /** Who publishes it, for the on-screen credit. */
      source: string
      sourceUrl: string
      /** ISO UTC time the data describes (a reading's time, an imaged day), not when it was downloaded. */
      asOf: string
      /** ISO UTC time this browser downloaded it. Older than the refresh rule only when a refresh just failed. */
      fetchedAt: string
    }
  | { ok: false; reason: string; source: string; sourceUrl: string }

export interface FeedSpec<T> {
  /** Cache key, unique per URL. */
  key: string
  url: string
  source: string
  sourceUrl: string
  /** Do not ask the network again for this long after a good answer. */
  ttlMs: number
  /** Validate the JSON body and keep only what the screen needs. Throw on anything unexpected. */
  parse(body: unknown): T
  /** The time the data describes, or null to use the download time. */
  asOf(data: T): string | null
}

export const TIMEOUT_MS = 12_000
/** After a failed request, leave that feed alone this long. */
export const RETRY_MS = 10 * 60_000
/** After a failed refresh, an older answer is still shown (with its real times) up to this many refresh periods. */
export const STALE_PERIODS = 24
export const OFFLINE = 'Live data needs a connection.'

const PREFIX = 'live-earth:1:'

interface Saved<T> { at: number; data: T }

const memory = new Map<string, Saved<unknown>>()
const failures = new Map<string, { at: number; reason: string }>()
const inflight = new Map<string, Promise<Feed<unknown>>>()

export const unavailable = (spec: { source: string; sourceUrl: string }, reason: string): Feed<never> =>
  ({ ok: false, reason, source: spec.source, sourceUrl: spec.sourceUrl })

function answer<T>(spec: FeedSpec<T>, saved: Saved<T>): Feed<T> {
  const fetchedAt = new Date(saved.at).toISOString()
  return { ok: true, data: saved.data, source: spec.source, sourceUrl: spec.sourceUrl, asOf: spec.asOf(saved.data) ?? fetchedAt, fetchedAt }
}

function read<T>(key: string): Saved<T> | undefined {
  const held = memory.get(key)
  if (held) return held as Saved<T>
  try {
    const saved: unknown = JSON.parse(globalThis.localStorage.getItem(PREFIX + key) ?? 'null')
    if (saved && typeof saved === 'object' && typeof (saved as Saved<T>).at === 'number' && 'data' in saved) {
      memory.set(key, saved as Saved<unknown>)
      return saved as Saved<T>
    }
  } catch { /* Storage is blocked or the entry is damaged: ask the network. */ }
  return undefined
}

/** A human sentence for why a request failed. */
export function failureReason(error: unknown, source: string): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'TimeoutError' || name === 'AbortError') return `${source} took too long to answer.`
  if (name === 'TypeError') return `Could not reach ${source}.`
  if (error instanceof HttpError) return error.message
  return `${source} sent data this screen could not read.`
}

export class HttpError extends Error {}

/** A GET that sends nothing about the player: no cookies, no referrer, and it gives up after TIMEOUT_MS. */
export async function get(url: string, source: string): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (!response.ok) throw new HttpError(`${source} answered ${response.status}.`)
  return response
}

async function refresh<T>(spec: FeedSpec<T>, old: Saved<T> | undefined): Promise<Feed<T>> {
  const fallback = (reason: string) =>
    old && Date.now() - old.at < spec.ttlMs * STALE_PERIODS ? answer(spec, old) : unavailable(spec, reason)
  // Offline is not a failed request: nothing was asked, so nothing holds back the next try.
  if (globalThis.navigator?.onLine === false) return fallback(OFFLINE)
  try {
    // NOAA's flare file is rewritten in place and sometimes ends in a stray NUL byte (seen 2026-11-15), which JSON.parse refuses.
    const text = (await (await get(spec.url, spec.source)).text()).replace(/\0+$/, '')
    const saved: Saved<T> = { at: 0, data: spec.parse(JSON.parse(text)) }
    saved.at = Date.now()
    memory.set(spec.key, saved)
    failures.delete(spec.key)
    try { globalThis.localStorage.setItem(PREFIX + spec.key, JSON.stringify(saved)) } catch { /* Full or blocked: this visit still has it in memory. */ }
    return answer(spec, saved)
  } catch (error) {
    const reason = failureReason(error, spec.source)
    failures.set(spec.key, { at: Date.now(), reason })
    return fallback(reason)
  }
}

/**
 * The feed, from the cache while it is fresh, else from the network once. Never throws.
 * `signal` only releases this caller: the request itself runs on, so a remount finds it cached instead of asking twice.
 */
export function feed<T>(spec: FeedSpec<T>, signal?: AbortSignal): Promise<Feed<T>> {
  const saved = read<T>(spec.key)
  if (saved && Date.now() - saved.at < spec.ttlMs) return Promise.resolve(answer(spec, saved))
  const failed = failures.get(spec.key)
  if (failed && Date.now() - failed.at < RETRY_MS) {
    return Promise.resolve(saved && Date.now() - saved.at < spec.ttlMs * STALE_PERIODS ? answer(spec, saved) : unavailable(spec, failed.reason))
  }
  let job = inflight.get(spec.key) as Promise<Feed<T>> | undefined
  if (!job) {
    job = refresh(spec, saved).finally(() => inflight.delete(spec.key))
    inflight.set(spec.key, job)
  }
  return released(job, signal, unavailable(spec, 'Cancelled.'))
}

/** `job`, or `instead` as soon as `signal` aborts. */
export function released<T>(job: Promise<T>, signal: AbortSignal | undefined, instead: T): Promise<T> {
  if (!signal) return job
  if (signal.aborted) return Promise.resolve(instead)
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(instead), { once: true })
    void job.then(resolve)
  })
}

/** Tests only: forget everything held in memory. */
export function forgetFeeds(): void {
  memory.clear()
  failures.clear()
  inflight.clear()
}
