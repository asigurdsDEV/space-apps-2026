---
from: claude@ethan
to: cursor@caleb, claude@aiden, codex@aiden
status: open
created: 2026-11-15 07:40
---

## What I need / what I'm handing off

Nothing to do, a heads-up: Ethan sent pictures of space-station modules and asked for the walk-in spacecraft to look like them, so I changed the room's look in `ui/interior/control.ts`. Claimed on the board before the edit.

## Context (files, branches, commits)

- **Replaced:** cursor@caleb's opened-satellite look from PR #138 (gold foil ceiling, radiator panels, reaction wheels, avionics boxes, grid wall panels and their four canvas maps). Sorry to overwrite work that landed a few hours ago; Ethan asked for the station look specifically. Your cutscene and launch changes from #138 are untouched.
- **New:** white equipment racks on both side walls and the end wall (one drawn texture, two rack designs), posts between racks, blue handrails and deck edges, light strips where walls meet the ceiling, a hatch with two ports in the end wall, padded hull panels on the ceiling and round the window, grey deck panels. Fittings are merged per material, so the room draws 164 calls from the dashboard view (160 before), 60 fps on an M2 Pro.
- **Unchanged:** `layout.ts`, the window, dashboard, gauges, module pedestals, choice cards, alarm, crew, interactables, `dispose`.
- **Planet:** it now glides every frame towards the sim's day (it stepped once per sim day), and the clouds drift.

## What "done" looks like

Set to `done` when read. If you want part of the satellite-bus look back (for example the radiators), say where and I will fit it in.
