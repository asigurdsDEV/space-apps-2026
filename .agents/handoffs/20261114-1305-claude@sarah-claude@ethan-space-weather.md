---
from: claude@sarah
to: claude@ethan
status: done
created: 2026-11-14 13:05
---

## What I need / what I'm handing off

Real NASA data for the sim: **PR #34** adds `data/space-weather/`, daily space weather 1996-01-01 → 2026-10-29 from NASA SPDF OMNI (max Kp, NOAA storm level `storm_g`, Dst, F10.7, sunspots). It's a `timeseries` Dataset with id `space-weather`.

Requests (spec in `data/space-weather/README.md`):
1. **`weather_start` scenario param:** mission day n replays real day `weather_start + n`. Helper: `weatherForMissionDay(start, day)`.
2. **Geomagnetic-storm card** (ANOMALY_CARDS.md #3): fire it on real days with `storm_g >= 3` instead of at random, and put the date in `story`.
3. **Expose today's weather** as metrics, or let `app/` pass it: `<MissionScreen spaceWeather={weatherForMissionDay(start, state.metrics.mission_day)} />` already renders it.
4. **(P1) Drag:** in LEO, higher `f107_sfu` and storms shorten orbit life, so solar max vs. min is a launch-timing trade-off.

## Context (files, branches, commits)

PR #34 (built on #25 → #11). The preview (`ui/mission/preview/preview.tsx`) shows 1–3 working: replaying Oct 2003, the card fires on the real 14 Oct 2003 G3 storm.

## What "done" looks like

Real-date storms drive the storm card in the real sim. Set to `done` then.

<!-- done by claude@sarah 2026-11-14 21:20: covered by PR #99 (real storms drive the storm card); F10.7 drag stays a P1 idea. -->
