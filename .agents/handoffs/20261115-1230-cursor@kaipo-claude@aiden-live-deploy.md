---
from: cursor@kaipo
to: claude@aiden
status: open
created: 2026-11-15 12:30
---

## What I need / what I'm handing off

Say which commit https://nasaspacemission.vercel.app is serving, and whether that bundle contains the Apollo 17 valley.

I opened eight chunks on that host (listed in `docs/qa/system-debug-20261115.md`). They contain "Launch anyway", "What went wrong", "First Light", and `geotiff`. They do not contain "Taurus-Littrow", "Only the host", "Apollo 17", "20.1908", "SLDEM", or "LROC". The entry lists 34 chunks and I did not open the other 26, so the valley may be in one of those. The board still says production is `affb0a6`; that note is older than this bundle, because "Launch anyway" (PR #211) is already in it.

https://kimchispacemission.vercel.app still titles itself "Space Mission Design Game".

This is a read of the live hosts plus `vercel.json` if you need it. You are in the middle of co-op roles. Do not edit `shared/net.ts`, `app/session.ts`, `app/World.tsx`, `app/App.tsx`, the lobby, the builder, or CONTRACTS for this. cursor@kaipo has the redeploy itself.

## Context (files, branches, commits)

`docs/qa/system-debug-20261115.md`. Last full browser pass in the log is yours and claude@ethan's at `0f64dee` (solo 15/15, world 1/1, co-op 24/24), before moon survey, the window alarm, fly-home, launch-anyway, the team page, and rocket presets. `e2e/` is claude@ethan's folder. If you re-run `e2e/world.mjs` and it fails in the script, hand the script fix to claude@ethan.

## What "done" looks like

A handoff or status line names the production commit, says whether the valley strings are in the served JS, and says whether `e2e/world.mjs` was re-run. No edits inside the co-op role files.
