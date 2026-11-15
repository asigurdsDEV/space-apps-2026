// Orbits as CelesTrak publishes them: one "GP" element set per tracked object, in the CCSDS OMM JSON form.
// JSON, not the old two-line text: catalogue numbers passed 99999 in 2026 and no longer fit a TLE's five digits.
import { feed, type Feed, type FeedSpec } from './feed'

export const CELESTRAK = 'CelesTrak'
export const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/'
/** CelesTrak asks for at most one download of a group per two hours; its data updates less often than that. */
export const CELESTRAK_TTL_MS = 2 * 60 * 60_000

const FIELDS = [
  'OBJECT_NAME', 'NORAD_CAT_ID', 'EPOCH', 'MEAN_MOTION', 'ECCENTRICITY', 'INCLINATION',
  'RA_OF_ASC_NODE', 'ARG_OF_PERICENTER', 'MEAN_ANOMALY', 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT',
] as const

/** One object's mean orbital elements, with the field names and units the feed uses (degrees, revolutions per day, UTC). */
export interface Elements {
  OBJECT_NAME: string
  /** NORAD catalogue number. */
  NORAD_CAT_ID: number
  /** ISO UTC time the elements were fitted. Accuracy falls off by a few km per day from here. */
  EPOCH: string
  /** Revolutions per day. */
  MEAN_MOTION: number
  ECCENTRICITY: number
  INCLINATION: number
  RA_OF_ASC_NODE: number
  ARG_OF_PERICENTER: number
  MEAN_ANOMALY: number
  BSTAR: number
  MEAN_MOTION_DOT: number
  MEAN_MOTION_DDOT: number
}

/** A compact row per object, in FIELDS order: what the cache stores (a third the size of the keyed form). */
type Row = (string | number)[]

export function groupUrl(group: string): string {
  return `${CELESTRAK_URL}gp.php?GROUP=${group}&FORMAT=json`
}

const EPOCH = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?$/

/** Validates a GP JSON body. Objects with a missing or impossible field are dropped; a body with none left is an error. */
export function parseElements(body: unknown): Row[] {
  if (!Array.isArray(body)) throw new Error('not a list')
  const rows: Row[] = []
  for (const item of body as Record<string, unknown>[]) {
    if (!item || typeof item !== 'object') continue
    const row = FIELDS.map((field) => item[field]) as Row
    const [name, , epoch, meanMotion, eccentricity] = row
    const numbers = row.every((value, i) => (i === 0 || i === 2 ? typeof value === 'string' : typeof value === 'number' && Number.isFinite(value)))
    if (!numbers || !name || !EPOCH.test(epoch as string)) continue
    if ((meanMotion as number) <= 0 || (eccentricity as number) < 0 || (eccentricity as number) >= 1) continue
    rows.push(row)
  }
  if (rows.length === 0) throw new Error('no usable element sets')
  return rows
}

const fromRow = (row: Row): Elements => Object.fromEntries(FIELDS.map((field, i) => [field, row[i]])) as unknown as Elements

/** The epoch as a real ISO UTC time (the feed leaves the Z off). */
export const epochIso = (elements: Elements): string => `${elements.EPOCH.slice(0, 23)}Z`

function newestEpoch(rows: Row[]): string {
  let newest = rows[0][2] as string
  for (const row of rows) if ((row[2] as string) > newest) newest = row[2] as string
  return `${newest.slice(0, 23)}Z`
}

/** One CelesTrak group, at most once per two hours across reloads. `keep` limits what is stored to the catalogue numbers wanted. */
export async function fetchGroup(group: string, signal?: AbortSignal, keep?: ReadonlySet<number>): Promise<Feed<Elements[]>> {
  const spec: FeedSpec<Row[]> = {
    key: `gp:${group}`,
    url: groupUrl(group),
    source: CELESTRAK,
    sourceUrl: CELESTRAK_URL,
    ttlMs: CELESTRAK_TTL_MS,
    parse: (body) => {
      const rows = parseElements(body)
      return keep ? rows.filter((row) => keep.has(row[1] as number)) : rows
    },
    // A group with nothing wanted in it has no epoch to report: fall back to the download time.
    asOf: (rows) => (rows.length ? newestEpoch(rows) : null),
  }
  const result = await feed(spec, signal)
  return result.ok ? { ...result, data: result.data.map(fromRow) } : result
}

const MU_KM3_S2 = 398600.4418
export const EARTH_RADIUS_KM = 6378.137

/** Lowest and highest height above the equator the mean orbit reaches, km. Real heights wobble about 10 km around these. */
export function altitudeBand(elements: Elements): { lowKm: number; highKm: number } {
  const radPerSec = (elements.MEAN_MOTION * 2 * Math.PI) / 86_400
  const semiMajorKm = Math.cbrt(MU_KM3_S2 / (radPerSec * radPerSec))
  return {
    lowKm: semiMajorKm * (1 - elements.ECCENTRICITY) - EARTH_RADIUS_KM,
    highKm: semiMajorKm * (1 + elements.ECCENTRICITY) - EARTH_RADIUS_KM,
  }
}

/** Minutes for one trip round the Earth. */
export const periodMinutes = (elements: Elements): number => 1440 / elements.MEAN_MOTION
