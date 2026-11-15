// Severe storms that are open right now in NASA's Earth Observatory Natural Event Tracker (EONET).
import { feed, type Feed, type FeedSpec } from './feed'

export const STORMS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=severeStorms'

export interface Storm {
  id: string
  /** As EONET names it, for example "Typhoon Cempaka". */
  name: string
  /** Last reported position, degrees. */
  lat: number
  lon: number
  /** ISO UTC time of that report. Open storms can be days past their last report. */
  at: string
  /** Sustained wind at that report in knots, when the report has one. */
  windKts: number | null
  /** The event's own page of sources. */
  link: string
}

/** One marker per open event: its newest point. Events without a usable point are left out. */
export function parseStorms(body: unknown): Storm[] {
  const events = (body as { events?: unknown } | null)?.events
  if (!Array.isArray(events)) throw new Error('no event list')
  const storms: Storm[] = []
  const seen = new Set<string>()
  for (const event of events as Record<string, unknown>[]) {
    const points = Array.isArray(event?.geometry) ? (event.geometry as Record<string, unknown>[]) : []
    const point = points.filter((p) => p?.type === 'Point' && typeof p.date === 'string' && !Number.isNaN(Date.parse(p.date))).sort((a, b) => Date.parse(a.date as string) - Date.parse(b.date as string)).at(-1)
    const [lon, lat] = Array.isArray(point?.coordinates) ? (point.coordinates as unknown[]) : []
    if (!point || typeof event.id !== 'string' || seen.has(event.id) || typeof event.title !== 'string' || !event.title.trim()) continue
    if (typeof lat !== 'number' || typeof lon !== 'number' || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
    seen.add(event.id)
    const wind = point.magnitudeValue
    storms.push({
      id: event.id,
      // The feed is not ours: a name is kept to one short line, and a wind no storm has reached is left out.
      name: event.title.trim().slice(0, 60),
      lat,
      lon,
      at: new Date(point.date as string).toISOString(),
      windKts: point.magnitudeUnit === 'kts' && typeof wind === 'number' && wind > 0 && wind < 250 ? wind : null,
      link: typeof event.link === 'string' && event.link.startsWith('https://eonet.gsfc.nasa.gov/') ? event.link : 'https://eonet.gsfc.nasa.gov/',
    })
  }
  return storms
}

const STORMS: FeedSpec<Storm[]> = {
  key: 'storms',
  url: STORMS_URL,
  source: 'NASA EONET',
  sourceUrl: 'https://eonet.gsfc.nasa.gov/',
  ttlMs: 30 * 60_000,
  parse: parseStorms,
  asOf: (storms) => storms.map((storm) => storm.at).sort().at(-1) ?? null,
}

/** Open severe storms. An empty list is a real answer: no storm is open. */
export function fetchStorms(signal?: AbortSignal): Promise<Feed<Storm[]>> {
  return feed(STORMS, signal)
}
