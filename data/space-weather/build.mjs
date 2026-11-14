// Builds space-weather.json from NASA SPDF OMNI2 hourly files (one row per day, 1996 → latest).
//
//   mkdir omni && cd omni
//   for y in $(seq 1996 2026); do curl -sO https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2_$y.dat; done
//   node data/space-weather/build.mjs omni/
//
// Format: https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2.text
// Words (1-based): 1 year, 2 day-of-year, 39 Kp×10 (3-hour value), 40 sunspot number R,
// 41 Dst (nT), 51 F10.7 (sfu). Fill values: 99, 999, 99999, 999.9.
// Daily OMNI averages hide storm peaks (the 2022 Starlink storm averages out), so we take the
// day's MAX Kp and MIN Dst from the hourly rows.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) throw new Error('usage: node data/space-weather/build.mjs <dir with omni2_YYYY.dat>')

const days = new Map() // 'YYYY-MM-DD' -> { kp, dst, f107, r }
for (const file of readdirSync(dir).filter((f) => /^omni2_\d{4}\.dat$/.test(f)).sort()) {
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    const w = line.trim().split(/\s+/)
    if (w.length < 51) continue
    const [year, doy] = [Number(w[0]), Number(w[1])]
    const date = new Date(Date.UTC(year, 0, doy)).toISOString().slice(0, 10)
    const kp = Number(w[38]), r = Number(w[39]), dst = Number(w[40]), f107 = Number(w[50])
    const d = days.get(date) ?? { kp: null, dst: null, f107: null, r: null }
    if (kp !== 99) d.kp = Math.max(d.kp ?? 0, kp)
    if (dst !== 99999) d.dst = Math.min(d.dst ?? Infinity, dst)
    if (f107 < 999) d.f107 = f107
    if (r !== 999) d.r = r
    days.set(date, d)
  }
}

// End at the last day with both storm indices; earlier gaps carry the previous value forward.
const dates = [...days.keys()].sort()
let end = dates.length - 1
while (end >= 0 && (days.get(dates[end]).kp === null || days.get(dates[end]).dst === null)) end--
const keep = dates.slice(0, end + 1)

const out = { t: [], kp_max: [], storm_g: [], dst_min_nt: [], f107_sfu: [], sunspots: [] }
const last = { kp: 0, dst: 0, f107: 70, r: 0 }
const filled = { kp: 0, dst: 0, f107: 0, r: 0 }
for (const date of keep) {
  const d = days.get(date)
  for (const k of Object.keys(last)) {
    if (d[k] === null) filled[k]++
    else last[k] = d[k]
  }
  const kp = Math.round(last.kp) / 10 // 53 → 5.3 ("5+")
  out.t.push(date)
  out.kp_max.push(kp)
  // NOAA G-scale: Kp 5 = G1 (minor) … Kp 9 = G5 (extreme); "5-" (4.7) counts as 5, "9-" (8.7) as 9.
  out.storm_g.push(Math.max(0, Math.min(5, Math.round(kp) - 4)))
  out.dst_min_nt.push(last.dst)
  out.f107_sfu.push(last.f107)
  out.sunspots.push(last.r)
}

const dataset = {
  id: 'space-weather',
  source: 'NASA Space Physics Data Facility (SPDF), OMNI2 hourly data',
  source_url: 'https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/',
  license:
    'Public NASA data; acknowledge NASA/GSFC SPDF OMNIWeb. Kp: GFZ Potsdam, Dst: WDC Kyoto, F10.7: NRCan, sunspots: SILSO (see omni2.text).',
  retrieved_utc: new Date().toISOString().slice(0, 19) + 'Z',
  kind: 'timeseries',
  units: { t: 'UTC date', kp_max: 'Kp (0–9), daily max of 3-hour values', storm_g: 'NOAA G-scale (0 = none, 1–5)', dst_min_nt: 'nT, daily min', f107_sfu: 'sfu (10.7 cm solar radio flux)', sunspots: 'count (SILSO v2)' },
  data: out,
}
writeFileSync(new URL('./space-weather.json', import.meta.url), JSON.stringify(dataset))
// Only the strong-storm days (NOAA G3+), small enough for the app to load up front: [date, G][].
const storms = out.t.map((t, i) => [t, out.storm_g[i]]).filter(([, g]) => g >= 3)
writeFileSync(new URL('./storms.json', import.meta.url), JSON.stringify(storms))
console.log(`${keep[0]} → ${keep.at(-1)}: ${keep.length} days; carried-forward gaps:`, filled)
