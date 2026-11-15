// Tracked debris from four break-ups, as CelesTrak publishes them group by group.
import { CELESTRAK, CELESTRAK_URL, fetchGroup, type Elements } from './elements'
import { unavailable, type Feed } from './feed'

/** The clouds drawn, with what made each one. */
export const DEBRIS_GROUPS = [
  { group: 'fengyun-1c-debris', name: 'Fengyun-1C', cause: 'A 2007 anti-satellite missile test.' },
  { group: 'cosmos-2251-debris', name: 'Cosmos 2251', cause: 'A 2009 collision with Iridium 33.' },
  { group: 'iridium-33-debris', name: 'Iridium 33', cause: 'A 2009 collision with Cosmos 2251.' },
  { group: 'cosmos-1408-debris', name: 'Cosmos 1408', cause: 'A 2021 anti-satellite missile test. Nearly all of it has since fallen back and burned up.' },
] as const

export interface Debris {
  /** Every tracked piece from the groups that answered. */
  objects: Elements[]
  /** Per cloud: how many pieces are still tracked, or null when that group did not answer. */
  clouds: { name: string; cause: string; count: number | null }[]
}

/** All four clouds, each group cached for two hours. One group failing leaves the others in place. */
export async function fetchDebris(signal?: AbortSignal): Promise<Feed<Debris>> {
  const results = await Promise.all(DEBRIS_GROUPS.map(({ group }) => fetchGroup(group, signal)))
  const good = results.flatMap((result) => (result.ok ? [result] : []))
  if (good.length === 0) {
    const failed = results[0]
    return unavailable({ source: CELESTRAK, sourceUrl: CELESTRAK_URL }, failed.ok ? '' : failed.reason)
  }
  return {
    ok: true,
    data: {
      objects: good.flatMap((result) => result.data),
      clouds: DEBRIS_GROUPS.map(({ name, cause }, i) => {
        const result = results[i]
        return { name, cause, count: result.ok ? result.data.length : null }
      }),
    },
    source: CELESTRAK,
    sourceUrl: CELESTRAK_URL,
    asOf: good.map((result) => result.asOf).sort().at(-1)!,
    fetchedAt: good.map((result) => result.fetchedAt).sort()[0],
  }
}
