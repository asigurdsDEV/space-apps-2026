# data/space-weather/: real NASA space weather

Owner: claude@sarah (this subfolder only. The rest of `data/` is claude@jamie's).

**What:** one row per day, **1 Jan 1996 → 29 Oct 2026** (11,260 days), built from NASA SPDF's **OMNI2 hourly** data. That covers solar cycles 23–25, including the Halloween 2003 storms, the Feb 2022 Starlink storm and the May 2024 Gannon storm.

| column | meaning |
|---|---|
| `t` | UTC date, `YYYY-MM-DD` |
| `kp_max` | daily **max** Kp (0–9). Daily averages hide storm peaks, so we take the max of the 3-hour values |
| `storm_g` | NOAA geomagnetic storm level from `kp_max`: 0 none, G1 minor (Kp 5) … G5 extreme (Kp 9) |
| `dst_min_nt` | daily min Dst, nT (more negative = stronger storm) |
| `f107_sfu` | 10.7 cm solar radio flux: high = hot, puffed-up upper atmosphere = more drag in low orbit |
| `sunspots` | daily sunspot number (SILSO v2) |

Gaps: none in Kp/Dst. 11 days of F10.7 and 29 of sunspots carry the previous day forward.

**Source / credit:** NASA/GSFC Space Physics Data Facility, OMNIWeb: <https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/> (format: `omni2.text` there). Index providers: Kp GFZ Potsdam, Dst WDC Kyoto, F10.7 NRCan, sunspots SILSO. Listed on data.nasa.gov as "OMNI Daily/Hourly Data Set".

## Use

```ts
import { spaceWeather, weatherOn, weatherForMissionDay } from '../data/space-weather'
weatherOn('2003-10-30')                  // { kp_max: 9, storm_g: 5, dst_min_nt: -383, … }
weatherForMissionDay('2003-10-01', 29)   // mission day 29 replays 30 Oct 2003
```

`spaceWeather` is a normal `timeseries` Dataset (CONTRACTS.md), so the sim can take it like any other dataset.

## The game feature: fly through real history

Missions are set in the future, so each one **replays a real stretch of space weather**: mission day *n* gets the real day `weather_start + n`.

- **Where the start date comes from:** a scenario param `weather_start` (e.g. `"2003-10-01"` for a "Halloween storms" challenge, `"2019-06-01"` for a calm solar minimum). The daily mission picks a seeded random start in 1996–2025. The debrief says which real stretch you flew through.
- **The geomagnetic-storm anomaly card** (`docs/game-design/ANOMALY_CARDS.md` #3) fires on **real storm days** (`storm_g >= 3`) instead of at random, and its story names the real date.
- **Drag (sim, P1):** in low Earth orbit, a high `f107_sfu` and storms shorten orbit life. Solar maximum (2001, 2014, 2024) is harder than solar minimum (2008, 2019). That's a real launch-timing trade-off.
- **On screen:** the fly view's strip (`ui/mission`, prop `spaceWeather`) shows today's real storm level, Kp, sunspots and solar flux, labelled "Real NASA data from <date>".

## Rebuild

```bash
mkdir -p /tmp/omni && cd /tmp/omni && for y in $(seq 1996 2026); do curl -sO https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2_$y.dat; done
```

```bash
node data/space-weather/build.mjs /tmp/omni/
```

`space-weather.test.ts` checks the shape, that days are contiguous, and the known storms above.
