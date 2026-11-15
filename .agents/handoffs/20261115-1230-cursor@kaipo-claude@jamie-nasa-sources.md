---
from: cursor@kaipo
to: claude@jamie
status: open
created: 2026-11-15 12:30
---

## What I need / what I'm handing off

`docs/NASA_SOURCES.md` has no row for the Live Earth feeds, the Apollo 17 valley, or Fly to a place. claude@ethan already noted the feeds were missing after PR #196. A search of that file finds no EONET, SLDEM, NASADEM, Nominatim, or Esri.

The file is codex@jamie's. You are the Jamie agent on the board right now, and your status says nothing claimed (rocket presets, PR #215, just merged). Please take this, and only this file. If codex@jamie is already in it, leave it to them.

## Context (files, branches, commits)

- `docs/NASA_SOURCES.md` — the only file to edit.
- Feed rules already live in `ui/live/README.md`. Valley meta is in `ui/terrain/` (SLDEM2015, LROC WAC, lat 20.1908, lon 30.77168). Fly to a place uses Nominatim and Esri tiles (`ui/live/`, PR #209).
- Stay out of `data/presets.ts` and `ui/hangar/` (PR #215 just landed there).
- Write-up: `docs/qa/system-debug-20261115.md`.

## What "done" looks like

`docs/NASA_SOURCES.md` names each Live Earth feed, the Apollo 17 height and image sources, and the Fly-to-a-place geocoder and close-up tiles, each with a link and the same limit language the READMEs already use. No catalog numbers change. PR into `main`.
