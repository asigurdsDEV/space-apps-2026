// Today's real event for the Daily mission, chosen from the Live Earth feeds (ui/live) by a fixed priority.
// Only types are imported from ui/live: its code is loaded with import(), so it stays out of the first download.

import type { Config } from '../shared'
import type { Debris, Feed, KpNow, Storm } from '../ui/live'
import type { DailyMission } from '../ui/start'

const CARD = { 'solar-storm': 'geomagnetic-storm', 'severe-storm': 'station-bumped', debris: 'debris-pass' } as const
type Kind = keyof typeof CARD

export interface DailyEvent {
  kind: Kind
  title: string
  /** Two plain sentences: the feed's real numbers, then what they mean for the mission. */
  text: string
  source: string
  /** ISO UTC time the numbers describe. */
  asOf: string
  /** The alarm card this event brings first (the sim's `headline_card`). */
  card: (typeof CARD)[Kind]
  /** NOAA storm level, solar storms only. */
  g?: 1 | 2 | 3 | 4 | 5
}

/** A daily mission, and the event it is built on when there is one. */
export type DailyPlay = DailyMission & { event?: DailyEvent }

export interface DailyFeeds {
  kp?: Feed<KpNow>
  storms?: Feed<Storm[]>
  debris?: Feed<Debris>
}

const G_WORDS = ['minor', 'moderate', 'strong', 'severe', 'extreme']
const isTime = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
const cut = (value: string, length: number) => value.trim().slice(0, length)
/** A storm's wind in knots, or 0 when the report has none a storm could have. */
const wind = (storm: Storm) => (typeof storm.windKts === 'number' && storm.windKts > 0 && storm.windKts < 250 ? storm.windKts : 0)

/**
 * The day's event, first that applies: a geomagnetic storm (Kp 5 or more), an open severe storm, tracked debris.
 * null when no feed answered. Feed answers also come back from localStorage, so every value is checked again here.
 */
export function dailyEvent({ kp, storms, debris }: DailyFeeds): DailyEvent | null {
  if (kp?.ok && typeof kp.data?.kp === 'number' && kp.data.kp >= 5 && kp.data.kp <= 9 && isTime(kp.asOf)) {
    const g = Math.min(5, Math.floor(kp.data.kp + 1e-6) - 4) as 1 | 2 | 3 | 4 | 5
    return {
      kind: 'solar-storm',
      title: `Solar storm: G${g}, ${G_WORDS[g - 1]}`,
      text: `A burst from the Sun is shaking Earth’s magnetic field: NOAA measured Kp ${kp.data.kp.toFixed(1)} out of 9, a G${g} storm on its scale of G1 to G5. Storms like this swell the top of the atmosphere, so expect extra drag on a low orbit in today’s mission.`,
      source: cut(kp.source, 60),
      asOf: kp.asOf,
      card: CARD['solar-storm'],
      g,
    }
  }
  if (storms?.ok && Array.isArray(storms.data)) {
    const open = storms.data.filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string' && s.name.trim() && isTime(s.at))
    // The same pick for everyone who gets the same list: the strongest wind, then the id.
    const storm = open.sort((a, b) => wind(b) - wind(a) || (a.id < b.id ? -1 : 1))[0]
    if (storm) {
      const name = cut(storm.name, 60)
      const kts = wind(storm)
      const seen = kts ? `with winds of ${Math.round(kts)} knots (${Math.round(kts * 1.852)} km/h) at its last report` : 'an open severe storm'
      return {
        kind: 'severe-storm',
        title: `Severe storm: ${name}`,
        text: `NASA’s event tracker lists ${name}, ${seen}. Ground antennas are stowed in high wind and passes are lost, so expect to lose ground station time in today’s mission.`,
        source: cut(storms.source, 60),
        asOf: storm.at,
        card: CARD['severe-storm'],
      }
    }
  }
  if (debris?.ok && Array.isArray(debris.data?.clouds) && isTime(debris.asOf)) {
    const counts = debris.data.clouds.map((cloud) => cloud?.count).filter((n): n is number => Number.isSafeInteger(n) && n! > 0 && n! < 1e6)
    const pieces = counts.reduce((sum, n) => sum + n, 0)
    if (pieces > 0) {
      const from = counts.length === 1 ? 'one broken-up satellite' : `${counts.length} broken-up satellites`
      return {
        kind: 'debris',
        title: `Tracked debris: ${pieces.toLocaleString('en-US')} pieces`,
        text: `Right now CelesTrak lists ${pieces.toLocaleString('en-US')} tracked pieces from ${from} circling Earth. Expect a close pass in today’s mission, if your spacecraft has a thruster to dodge with.`,
        source: cut(debris.source, 60),
        asOf: debris.asOf,
        card: CARD.debris,
      }
    }
  }
  return null
}

/** First Light: the program's Earth-orbit mission, the only one where all three headline cards can come up. */
export const EVENT_SCENARIO = 'demo'

/**
 * The daily built on an event: the Earth-orbit mission, with a seed of its own (the date's digits, then the kind).
 * The seed is also the personal-best slot (ui/leaderboard), so this daily and the ordinary one of the same date never share a record.
 */
export function eventMission<T extends DailyMission>(daily: T, event: DailyEvent): T & { event: DailyEvent } {
  const kind = Object.keys(CARD).indexOf(event.kind) + 1
  return { ...daily, scenarioId: EVENT_SCENARIO, seed: Number(daily.date.replaceAll('-', '')) * 10 + kind, event }
}

/** The mission as the sim flies it: the event's card first, and no storm from the seed's historical weather ahead of it. */
export function withEvent(config: Config, event: DailyEvent | undefined): Config {
  return event ? { ...config, params: { ...config.params, headline_card: event.card, real_storms: '' } } : config
}

const KEY = 'space-apps-2026:daily-event:v1'
/** The feeds get this long. After it the daily is the ordinary one. */
export const WAIT_MS = 4000

/** The event already chosen on this device for this UTC day, so a player sees one event all day whatever the feeds say later. */
export function savedDailyEvent(date: string): DailyEvent | null {
  try {
    const saved = JSON.parse(globalThis.localStorage.getItem(KEY) ?? 'null') as { date?: unknown; event?: Record<string, unknown> } | null
    const e = saved?.event
    if (saved?.date !== date || !e || typeof e.kind !== 'string' || !Object.keys(CARD).includes(e.kind)) return null
    if (typeof e.title !== 'string' || typeof e.text !== 'string' || typeof e.source !== 'string' || !isTime(e.asOf)) return null
    const kind = e.kind as Kind
    const g = kind === 'solar-storm' && [1, 2, 3, 4, 5].includes(e.g as number) ? { g: e.g as DailyEvent['g'] } : {}
    return { kind, title: cut(e.title, 120), text: cut(e.text, 400), source: cut(e.source, 60), asOf: e.asOf, card: CARD[kind], ...g }
  } catch {
    return null // storage is blocked or the entry is damaged: ask the feeds
  }
}

async function fromFeeds(stop: AbortSignal): Promise<DailyEvent | null> {
  const live = await import('../ui/live')
  const [weather, storms] = await Promise.all([live.fetchSpaceWeather(stop), live.fetchStorms(stop)])
  const feeds = { kp: weather.kp, storms }
  const event = dailyEvent(feeds)
  // CelesTrak asks for few downloads and its debris lists are large: they are asked for only when nothing above applies.
  return event || stop.aborted ? event : dailyEvent({ ...feeds, debris: await live.fetchDebris(stop) })
}

/** Today's event: this device's saved one, else from the feeds (their caches answer at once; the network gets WAIT_MS). Never throws. */
export async function loadDailyEvent(date: string): Promise<DailyEvent | null> {
  const saved = savedDailyEvent(date)
  if (saved) return saved
  // The abort releases the feeds' callers; a request already on its way still finishes into the feed cache for next time.
  const stop = new AbortController()
  const late = new Promise<null>((resolve) => setTimeout(() => { stop.abort(); resolve(null) }, WAIT_MS))
  const event = await Promise.race([late, fromFeeds(stop.signal)]).catch(() => null)
  if (event) {
    try {
      globalThis.localStorage.setItem(KEY, JSON.stringify({ date, event }))
    } catch { /* Full or blocked: the event still shows for this visit. */ }
  }
  return event
}
