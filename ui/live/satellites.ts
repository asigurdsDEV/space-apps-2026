// Real satellites a student would know, with where CelesTrak says they are.
import { CELESTRAK, CELESTRAK_URL, epochIso, fetchGroup, type Elements } from './elements'
import { unavailable, type Feed } from './feed'

type Group = 'stations' | 'science' | 'resource' | 'weather'

/** The curated set: NORAD number, the CelesTrak group that lists it, a plain name and one sentence on what it does. */
export const KNOWN: readonly { id: number; group: Group; name: string; does: string }[] = [
  { id: 25544, group: 'stations', name: 'International Space Station', does: 'A laboratory with a crew on board. People have lived there without a break since November 2000.' },
  { id: 48274, group: 'stations', name: 'Tiangong', does: "China's space station. Its first module, Tianhe, launched in 2021." },
  { id: 20580, group: 'science', name: 'Hubble Space Telescope', does: 'A telescope above the air, launched in 1990. It sees visible, ultraviolet and near-infrared light.' },
  { id: 39084, group: 'resource', name: 'Landsat 8', does: 'Maps all of Earth’s land in 30-metre detail every 16 days. Launched in 2013.' },
  { id: 49260, group: 'resource', name: 'Landsat 9', does: 'Landsat 8’s twin, launched in 2021. Together they image every place on land every 8 days.' },
  { id: 25994, group: 'resource', name: 'Terra', does: 'Launched in 1999 with five instruments, MODIS among them, to watch land, ocean, air and ice together.' },
  { id: 27424, group: 'resource', name: 'Aqua', does: 'Launched in 2002 to follow Earth’s water: oceans, clouds, vapour, rain, snow and ice.' },
  { id: 37849, group: 'weather', name: 'Suomi NPP', does: 'Launched in 2011 as the first of today’s polar weather satellites. Carries the VIIRS camera.' },
  { id: 43013, group: 'weather', name: 'NOAA-20', does: 'A polar weather satellite launched in 2017. Its VIIRS camera photographs the whole planet every day.' },
  { id: 54234, group: 'weather', name: 'NOAA-21', does: 'A polar weather satellite launched in 2022. It sees the whole planet twice a day.' },
  { id: 60133, group: 'weather', name: 'GOES-19', does: 'Launched in 2024. It hangs over one spot, 35,786 km above the equator, watching the Americas and the Atlantic.' },
  { id: 39574, group: 'resource', name: 'GPM Core Observatory', does: 'Launched in 2014 by NASA and Japan’s JAXA. Its radar measures rain and snow inside storms.' },
  { id: 43613, group: 'resource', name: 'ICESat-2', does: 'Launched in 2018. Its laser measures the height of ice sheets, sea ice and forests.' },
  { id: 54754, group: 'resource', name: 'SWOT', does: 'Launched in 2022 by NASA and France’s CNES. It measures the height of oceans, rivers and lakes.' },
]

export interface Satellite {
  id: number
  name: string
  does: string
  elements: Elements
}

export interface Satellites {
  /** In KNOWN order, so the International Space Station is first when it is there. */
  list: Satellite[]
  /** Names of curated satellites the feed did not list (a group failed, or the object is gone). */
  missing: string[]
}

/** The curated satellites' current orbits: four small CelesTrak groups, each cached for two hours. */
export async function fetchSatellites(signal?: AbortSignal): Promise<Feed<Satellites>> {
  const groups = [...new Set(KNOWN.map((known) => known.group))]
  const keep = new Set(KNOWN.map((known) => known.id))
  const results = await Promise.all(groups.map((group) => fetchGroup(group, signal, keep)))
  const found = new Map<number, Elements>()
  for (const result of results) if (result.ok) for (const elements of result.data) found.set(elements.NORAD_CAT_ID, elements)
  const firstOk = results.find((result) => result.ok)
  if (!firstOk || found.size === 0) {
    const failed = results.find((result) => !result.ok)
    return unavailable({ source: CELESTRAK, sourceUrl: CELESTRAK_URL }, failed && !failed.ok ? failed.reason : 'CelesTrak listed none of these satellites.')
  }
  const list: Satellite[] = []
  const missing: string[] = []
  for (const { id, name, does } of KNOWN) {
    const elements = found.get(id)
    if (elements) list.push({ id, name, does, elements })
    else missing.push(name)
  }
  const times = results.flatMap((result) => (result.ok ? [result] : []))
  return {
    ok: true,
    data: { list, missing },
    source: CELESTRAK,
    sourceUrl: CELESTRAK_URL,
    // The newest orbit among the satellites shown; each one's own time is epochIso(satellite.elements).
    asOf: list.map((sat) => epochIso(sat.elements)).sort().at(-1)!,
    fetchedAt: times.map((result) => result.fetchedAt).sort()[0],
  }
}
