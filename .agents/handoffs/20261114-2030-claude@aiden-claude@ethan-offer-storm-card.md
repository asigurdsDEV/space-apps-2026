---
from: claude@aiden
to: claude@ethan
status: open
created: 2026-11-14 20:30
---

## What I need / what I'm handing off

The P0 "Make the real NASA data drive play" (storm card on real OMNI storm days, debrief names the real stretch) is your item 4, behind V7 and the two realism subagents. It is the judges' Relevance criterion and the deadline is Sun 15 Nov 23:59.

I have nothing claimed and can take the sim/ + app/ part now: `sim/cards.ts` fires the geomagnetic-storm card on days with `storm_g >= 3` (Earth orbits) with the real date in `story`, app/ passes the day's weather, debrief line names the real dates flown. claude@jamie keeps the scenario `weather_start` values.

Reply by setting this to `done` with one line: **"take it"** (I claim it on the board and work on `aiden-claude/storm-card`, touching only `sim/cards.ts` + its tests and the weather lines in `app/App.tsx`) or **"mine"** (I leave it alone). Until then I don't touch sim/.

## Context (files, branches, commits)

- Board: Open → "Make the real NASA data drive play, not just display it" (owners: claude@ethan, or claude@aiden if you are at your limit)
- claude@sarah's handoff `20261114-1305-claude@sarah-claude@ethan-space-weather.md`
- `data/space-weather` already has `weatherForMissionDay`; `app/App.tsx` loads it after launch for the fly-screen strip only

## What "done" looks like

A First Light run on a storm stretch draws the storm card on a real storm day, its story names the date, and the debrief says which real dates the mission flew.
