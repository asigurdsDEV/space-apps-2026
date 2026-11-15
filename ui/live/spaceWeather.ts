// Space weather right now, from NOAA's Space Weather Prediction Center open JSON products.
import { feed, type Feed, type FeedSpec } from './feed'

const SWPC = 'NOAA Space Weather Prediction Center'
const SWPC_URL = 'https://www.swpc.noaa.gov/'
export const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
export const FLARE_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json'
// The Kp product changes every three hours and the flare product every minute; five minutes keeps both honest and quiet.
const TTL_MS = 5 * 60_000

export interface KpNow {
  /** Planetary K index, 0 to 9 in thirds. */
  kp: number
  /** NOAA geomagnetic storm level, 0 (no storm) to 5. */
  g: 0 | 1 | 2 | 3 | 4 | 5
  /** NOAA's word for that level. */
  label: 'quiet' | 'unsettled' | 'active' | 'minor storm' | 'moderate storm' | 'strong storm' | 'severe storm' | 'extreme storm'
  /** ISO UTC start of the three-hour window the value covers. */
  from: string
}

export interface FlareNow {
  /** Peak class of the most recent flare, for example "C1.0" or "X2.3". */
  flareClass: string
  /** ISO UTC time of that peak. */
  peakAt: string
  /** The Sun's X-ray level at the last measurement, same scale. */
  nowClass: string
  /** ISO UTC time of that measurement. */
  measuredAt: string
}

const G_LABELS = ['quiet', 'minor storm', 'moderate storm', 'strong storm', 'severe storm', 'extreme storm'] as const

/** NOAA's G scale: Kp 5 is G1, 6 is G2, 7 is G3, 8 (and 9-) is G4, 9 is G5. */
export function stormLevel(kp: number): KpNow['g'] {
  return Math.max(0, Math.min(5, Math.floor(kp + 1e-6) - 4)) as KpNow['g']
}

const utc = (stamp: string): string => (/Z$/.test(stamp) ? stamp : `${stamp}Z`)
const isTime = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(utc(value)))

/** The newest reading in noaa-planetary-k-index.json: a list of { time_tag, Kp } with the latest last. */
export function parseKp(body: unknown): KpNow {
  if (!Array.isArray(body) || body.length === 0) throw new Error('not a list')
  const last = body[body.length - 1] as { time_tag?: unknown; Kp?: unknown } | null
  const kp = last?.Kp
  if (!last || !isTime(last.time_tag) || typeof kp !== 'number' || !(kp >= 0 && kp <= 9)) throw new Error('no Kp reading')
  const g = stormLevel(kp)
  // Below storm level NOAA calls Kp under 3 quiet, 3 unsettled and 4 active.
  return { kp, g, label: g || kp < 3 ? G_LABELS[g] : kp < 4 ? 'unsettled' : 'active', from: new Date(utc(last.time_tag)).toISOString() }
}

const FLARE_CLASS = /^[ABCMX]\d+(\.\d+)?$/

/** xray-flares-latest.json: one record with the last flare's peak and the current level. */
export function parseFlare(body: unknown): FlareNow {
  const record = (Array.isArray(body) ? body[0] : null) as Record<string, unknown> | null
  if (!record) throw new Error('no flare record')
  const { max_class, max_time, current_class, time_tag } = record
  if (typeof max_class !== 'string' || !FLARE_CLASS.test(max_class) || !isTime(max_time)) throw new Error('no flare peak')
  if (typeof current_class !== 'string' || !FLARE_CLASS.test(current_class) || !isTime(time_tag)) throw new Error('no current level')
  return { flareClass: max_class, peakAt: new Date(utc(max_time)).toISOString(), nowClass: current_class, measuredAt: new Date(utc(time_tag)).toISOString() }
}

const KP: FeedSpec<KpNow> = { key: 'kp', url: KP_URL, source: SWPC, sourceUrl: SWPC_URL, ttlMs: TTL_MS, parse: parseKp, asOf: (kp) => kp.from }
const FLARE: FeedSpec<FlareNow> = { key: 'flare', url: FLARE_URL, source: SWPC, sourceUrl: SWPC_URL, ttlMs: TTL_MS, parse: parseFlare, asOf: (flare) => flare.measuredAt }

/** Kp and the latest flare, each on its own so one can be missing without the other. */
export async function fetchSpaceWeather(signal?: AbortSignal): Promise<{ kp: Feed<KpNow>; flare: Feed<FlareNow> }> {
  const [kp, flare] = await Promise.all([feed(KP, signal), feed(FLARE, signal)])
  return { kp, flare }
}
