// Real daily space weather from NASA SPDF OMNI, 1996 → late 2026. See README.md here.

import type { TimeseriesDataset } from '../../shared'
import raw from './space-weather.json'

export const spaceWeather = raw as unknown as TimeseriesDataset

export interface SpaceWeatherDay {
  date: string
  /** Daily max Kp, 0–9. */
  kp_max: number
  /** NOAA geomagnetic storm level: 0 none, 1 minor … 5 extreme. */
  storm_g: number
  dst_min_nt: number
  f107_sfu: number
  sunspots: number
}

const DAY_MS = 86_400_000

/** The real space weather on `date` (YYYY-MM-DD or full ISO), or null outside 1996 → latest. */
export function weatherOn(date: string, ds: TimeseriesDataset = spaceWeather): SpaceWeatherDay | null {
  const t = ds.data.t as string[]
  const day = date.slice(0, 10)
  const i = Math.round((Date.parse(day) - Date.parse(t[0])) / DAY_MS) // rows are one per day, no gaps
  if (!(i >= 0 && i < t.length) || t[i] !== day) return null
  const col = (k: string) => ds.data[k][i] as number
  return { date: day, kp_max: col('kp_max'), storm_g: col('storm_g'), dst_min_nt: col('dst_min_nt'), f107_sfu: col('f107_sfu'), sunspots: col('sunspots') }
}

/**
 * Missions are set in the future, so they replay a real stretch of history: mission day `n`
 * gets the weather of `start` + n days (see README.md).
 */
export function weatherForMissionDay(start: string, missionDay: number, ds: TimeseriesDataset = spaceWeather): SpaceWeatherDay | null {
  const date = new Date(Date.parse(start.slice(0, 10)) + Math.floor(missionDay) * DAY_MS).toISOString()
  return weatherOn(date, ds)
}
