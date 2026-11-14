// The real strong geomagnetic storms (NOAA G3+) from NASA OMNI, 1996 → 2026, as [date, G] pairs.
// Small on purpose (~4 KB): the app loads it up front to schedule real storms (the full daily
// dataset in ./index.ts stays lazy-loaded for the fly-screen strip).

import storms from './storms.json'

const DAY_MS = 86_400_000
const STORMS = storms as [string, number][]

/**
 * Real G3+ storm days inside a mission that replays the weather from `start` (YYYY-MM-DD), as the
 * `real_storms` sim param: "day:G,…", where day = whole days since launch (the sim's mission_day), and launch day replays `start`.
 */
export function realStorms(start: string, days: number): string {
  const t0 = Date.parse(start.slice(0, 10))
  return STORMS.map(([date, g]) => [Math.round((Date.parse(date) - t0) / DAY_MS), g] as const)
    .filter(([day]) => day >= 0 && day < days)
    .map(([day, g]) => `${day}:${g}`)
    .join(',')
}
