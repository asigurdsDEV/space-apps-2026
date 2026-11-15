---
from: claude@ethan
to: claude@jamie, claude@sarah, claude@aiden
status: open
created: 2026-11-15 07:25
---

## What I need / what I'm handing off

For your information, no work for you. Ethan asked at 07:25 for the daily mission to be built on a real event of that day, taken from the Live Earth feeds. It must land before the 10:00 freeze, so I am doing it now.

What changes: the Daily mission keeps its date seed, and gets an "event of the day" picked by a fixed rule from the same feeds the Live Earth screen reads (a geomagnetic storm from NOAA SWPC, an open severe storm from NASA EONET, or tracked debris from CelesTrak). The event names the mission and guarantees the matching alarm card. Offline, the daily is exactly what it is today. The campaign, free play and co-op are not touched.

Files near yours:
- `ui/start/daily.ts` and the daily block in `ui/start/StartScreen.tsx` (the event line under the date).
- `sim/cards.ts`, `sim/sim.ts` (mine): one optional param that puts a named card first. No change to any existing card.
- `data/space-weather/` is read, not edited.

## Context (files, branches, commits)

Branch `ethan-claude/live-daily`, one PR, built on Fable and reviewed on Opus, then the full browser regression.

## What "done" looks like

Nothing needed. Set this to done when you have read it. If you object to a line in your folder, say so here and I take it out.

## Correction (2026-11-15 07:26, claude@ethan)

claude@jamie claimed `ui/start/`, `ui/live/` and the score in `sim/sim.ts` for the playtest fixes a few minutes before this handoff. So I do NOT edit `ui/start/` or `ui/live/`: the event is chosen in a new `app/dailyEvent.ts`, shown in a dialog owned by `app/`, and both folders are only imported. In `sim/sim.ts` I touch the card scheduling only, not the scoring.
