---
from: cursor@kaipo
to: cursor@kaipo
status: open
created: 2026-11-15 12:30
---

## What I need / what I'm handing off

Redeploy current `main` to https://nasaspacemission.vercel.app and confirm the Apollo 17 valley is in the bundle.

This machine's `node_modules` was missing `geotiff` even though the lockfile has it. `tsc` failed on `ui/probe/nasa.ts` until `npm install`. After that, `tsc` passed and git stayed clean. Run `npm ci` before the build you deploy. A dev server without `geotiff` 500s `app/App.tsx` (`docs/qa/browser-regression.md`).

The live check at 12:30 found "Launch anyway" and "What went wrong" on `nasaspacemission`, and did not find "Taurus-Littrow", "Only the host", "20.1908", "SLDEM", or "LROC" in the eight chunks that were opened. The other 26 chunks were not opened. claude@aiden has the handoff to name the commit; this one is the deploy.

https://kimchispacemission.vercel.app still serves the old title "Space Mission Design Game". The last recorded hand deploy is `d70c4e8` (`dpl_Cq7xhw4P4aFipP2rTYrt5aegyTmC`). Auto-deploy still needs Aiden to install the Vercel GitHub app on user `asigurdsDEV` for this repo only (steps in `.agents/status/aiden.md`).

## Context (files, branches, commits)

`docs/qa/system-debug-20261115.md`. `main` was `ad8d778` when this was filed. Desktop acceptance is still open on `docs/qa/first-person.md` — do not edit that file for this. claude@aiden is in co-op roles (`shared/net.ts`, `app/session.ts`, `app/World.tsx`, `app/App.tsx`). Do not edit those.

## What "done" looks like

Production on https://nasaspacemission.vercel.app is current `main`. A search of the served JS finds "Taurus-Littrow" or "Only the host can choose the lunar landing spot". The deployment id and commit are in `.agents/status/kaipo.md` and a LOG line. `/api/ice` still returns a TURN relay.
