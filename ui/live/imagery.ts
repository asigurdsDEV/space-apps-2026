// Yesterday's Earth as one picture: a whole-globe true-colour mosaic from NASA GIBS.
// Layer: VIIRS on NOAA-20. Its 3,000 km swath leaves no gaps between orbits at the equator, where MODIS
// (Terra, Aqua) leaves a black wedge every orbit, and on 2026-11-14 the Suomi NPP VIIRS layer was empty.
import { GIBS_SOURCE } from '../probe/nasa'
import { failureReason, get, OFFLINE, released, unavailable, type Feed } from './feed'

const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi'
export const IMAGERY_LAYER = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor'
/** NORAD number of the satellite that took the picture (NOAA-20), to point at it in the satellite list. */
export const IMAGERY_SATELLITE_ID = 43013
const SOURCE = { source: 'NASA GIBS, VIIRS on NOAA-20', sourceUrl: GIBS_SOURCE }
const CACHE = 'live-earth-imagery'

export interface Imagery {
  /** The UTC day pictured, YYYY-MM-DD. Each place was photographed near 13:25 its own local time. */
  day: string
  layer: string
  width: number
  height: number
  /** A JPEG, equirectangular, longitude -180 at the left edge and north at the top: the same layout as the bundled Earth map. */
  blob: Blob
}

/**
 * The most recent UTC day whose daylight passes are all published. GIBS files a day's passes from the date line
 * westward, so the last strip (just east of the date line) is photographed about 01:30 UTC the next morning. On
 * 2026-11-15 passes appeared about an hour after they were taken; NASA allows three. Six hours past midnight is safe.
 */
export function latestFullDay(now: Date): string {
  return new Date(now.getTime() - 30 * 3_600_000).toISOString().slice(0, 10)
}

/** One WMS request for the whole globe. 2048 wide is 0.56 MB and about a second; 4096 is 2.0 MB and five to eight. */
export function imageryUrl(day: string, width: 2048 | 4096 = 2048): string {
  const q = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: IMAGERY_LAYER,
    CRS: 'EPSG:4326',
    BBOX: '-90,-180,90,180',
    WIDTH: String(width),
    HEIGHT: String(width / 2),
    FORMAT: 'image/jpeg',
    TIME: day,
  })
  return `${WMS}?${q}`
}

/** GIBS answers 200 with an all-black JPEG for a day it has not got, and with XML for a bad request. A full day at 2048 wide is about 550 kB. */
export function looksLikeEarth(type: string, bytes: number, width: number): boolean {
  return type.startsWith('image/jpeg') && bytes > 250_000 * (width / 2048) ** 2
}

const inflight = new Map<string, Promise<Feed<Imagery>>>()

async function load(day: string, width: 2048 | 4096): Promise<Feed<Imagery>> {
  const url = imageryUrl(day, width)
  const done = (blob: Blob): Feed<Imagery> =>
    ({ ok: true, data: { day, layer: IMAGERY_LAYER, width, height: width / 2, blob }, ...SOURCE, asOf: `${day}T00:00:00.000Z`, fetchedAt: new Date().toISOString() })
  // GIBS marks its answers no-store, so the browser would download the same day again on every visit: keep it ourselves.
  const cache = await globalThis.caches?.open(CACHE).catch(() => undefined)
  const held = await cache?.match(url).catch(() => undefined)
  if (held) return done(await held.blob())
  if (globalThis.navigator?.onLine === false) return unavailable(SOURCE, OFFLINE)
  try {
    const response = await get(url, 'NASA GIBS')
    const blob = await response.clone().blob()
    if (!looksLikeEarth(blob.type, blob.size, width)) return unavailable(SOURCE, `NASA GIBS has no full picture for ${day} yet.`)
    if (cache) {
      // One day is enough: drop the pictures of earlier days.
      for (const old of await cache.keys()) await cache.delete(old)
      await cache.put(url, response).catch(() => undefined)
    }
    return done(blob)
  } catch (error) {
    return unavailable(SOURCE, failureReason(error, 'NASA GIBS'))
  }
}

/**
 * The picture for the latest full day, downloaded once per day and kept in the browser's Cache Storage.
 * On `ok: false` keep the bundled Earth. Never throws.
 */
export function fetchImagery(signal?: AbortSignal, width: 2048 | 4096 = 2048): Promise<Feed<Imagery>> {
  const day = latestFullDay(new Date())
  const key = `${day}:${width}`
  let job = inflight.get(key)
  if (!job) {
    job = load(day, width).finally(() => inflight.delete(key))
    inflight.set(key, job)
  }
  return released(job, signal, unavailable(SOURCE, 'Cancelled.'))
}
