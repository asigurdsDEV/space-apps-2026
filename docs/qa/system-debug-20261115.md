# System debug — 2026-11-15 12:30

Filed by cursor@kaipo on Kaipo's machine (Windows, Node 22.21.1). Measured on `main` at `d7e0851`. While the suite was running, `main` fast-forwarded to `ad8d778` (claude@jamie rocket presets, PR #215). That commit only adds `data/presets.ts` and `ui/hangar/presets.ts`. The failures below are in files that commit does not touch.

Each finding has an open handoff. This pass did not change game code.

## Typecheck

`npx tsc --noEmit` failed once:

`ui/probe/nasa.ts(323,36): Cannot find module 'geotiff'`

`package.json` and `package-lock.json` already list `geotiff` `^3.0.5` (lockfile entry `node_modules/geotiff`). The package was missing from this machine's `node_modules`. `npm install` restored it and left the git tree clean. `npx tsc --noEmit` then exited 0.

`docs/qa/browser-regression.md` already says a dev server without `geotiff` answers 500 for `app/App.tsx`. Run `npm ci` after pulling before the next local build or deploy.

## Unit tests

`npx vitest run` on `d7e0851`: **7 failed, 749 passed**, 97 files. The six failing files were run again on their own.

Passed alone (the full-suite timeouts were load, not a wrong assertion):

- `app/App.test.tsx`
- `app/review.test.ts`

Still failing alone:

| Test | File | What happened |
| --- | --- | --- |
| whatIf "is fast enough for a debrief screen" | `sim/analysis.test.ts:59` | 3279 ms, then 3107 ms. The limit is 3000 ms. Failed twice, so this is the budget, not a one-off. |
| successRate "is between 0 and 1 with random failures on, and repeatable" | `sim/analysis.test.ts:69` | Hit the 5000 ms limit. The case flies the hard demo 30 times. |
| "only draws cards that fit the mission…" | `sim/cards.test.ts:104` | 21414 ms. Its own limit is 20000 ms (50 full missions). |
| "keeps its feet on the floor when walking and off it when floating" | `ui/crew/astronaut.test.ts:61` | 16166 ms against the 5000 ms default. The runner stopped it for time. claude@jamie already saw this timeout at 12:10 and said it passes when run alone. |
| "every bus with every power, radio and instrument one at a time" | `ui/scene3d/parts/parts.test.ts:206` | 10578 ms against the 5000 ms default. Same pattern: time, not a failed collision assertion. |

On claude@ethan's machine at 12:11 the suite was green (754 tests) before the preset merge. CI may still be green if that runner is faster. These five are red on this Windows machine.

## Live site

Checked 2026-11-15 12:30.

- https://nasaspacemission.vercel.app/ — HTTP 200, title **First Flight**.
- https://kimchispacemission.vercel.app/ — HTTP 200, title still **Space Mission Design Game**.

On `nasaspacemission`, these chunks were opened: `assets/index-_Ik116Vb.js`, `App-DwkJ8y3P.js`, `moon-BVzSqOiu.js`, `nasa-DQDFR5_j.js`, `gonogo-CpTIrUJY.js`, `LaunchView-Dypm3pr-.js`, `timeline-B4z7o-uC.js`, `sim-BmJWGkWY.js`.

Present: "Launch anyway" (gonogo), "What went wrong" and "First Light" (App), `geotiff` (nasa), the word "survey" (App).

Absent from those eight chunks: "Taurus-Littrow", "Only the host", "Apollo 17", "20.1908", "SLDEM", "LROC", "Walk the surface". The entry references 34 chunks. The other 26 were not opened, so the valley UI may sit in one of them. The board note that production is `affb0a6` is older than this bundle: "Launch anyway" is already in it, and that landed in PR #211 after `affb0a6`.

The last hand deploy recorded in `.agents/status/kaipo.md` is still `d70c4e8` (`dpl_Cq7xhw4P4aFipP2rTYrt5aegyTmC`) on the kimchi host.

## Not run

`e2e/solo.mjs`, `e2e/world.mjs`, and `e2e/coop.mjs` were not run. The last full browser pass in the log is claude@ethan at `0f64dee` (solo 15/15, world 1/1, co-op 24/24). That is before the moon-survey crew fix, the window alarm, Live Earth fly-to-a-place, launch-anyway, the team page, and rocket presets.

No `TODO` / `FIXME` / `HACK` comments in `ts` / `tsx` / `mjs`.

## Already tracked (no new task)

- Launch timelines are 15–26 s (`ui/scene3d/launch/timeline.test.ts`). Decision 005 says 10 s at most. claude@ethan already has this open.
- Fly scene tied to sim time is still Open. The folder is claude@ethan's; ask before taking it.
- Desktop acceptance at 1280×800 / 1920×1080 is still In progress on `docs/qa/first-person.md` — cursor@kaipo.
- claude@aiden is In progress on co-op roles (`shared/net.ts`, `app/session.ts`, `app/World.tsx`, `app/App.tsx`, lobby, builder, CONTRACTS). The deploy check does not edit those files.
- codex@aiden is In progress on guided design objectives (`ui/campaign/model.ts`).

## Handoffs

| Who | File | Task |
| --- | --- | --- |
| claude@ethan | `.agents/handoffs/20261115-1230-cursor@kaipo-claude@ethan-test-timeouts.md` | Make the five slow tests finish inside their limits, and give `power_negative` / `delta_v_short` a launch caption. |
| claude@jamie | `.agents/handoffs/20261115-1230-cursor@kaipo-claude@jamie-nasa-sources.md` | List Live Earth, the Apollo 17 patch, and Fly-to-a-place in `docs/NASA_SOURCES.md`. |
| claude@aiden | `.agents/handoffs/20261115-1230-cursor@kaipo-claude@aiden-live-deploy.md` | Name the commit `nasaspacemission` is serving and say whether the valley strings are in that bundle. Stay out of the co-op role files. |
| claude@sarah | `.agents/handoffs/20261115-1230-cursor@kaipo-claude@sarah-storm-aurora.md` | Show G1 and G2 storms in `ui/mission/MissionView.tsx` so the aurora in the Earth view can be seen. |
| cursor@kaipo | `.agents/handoffs/20261115-1230-cursor@kaipo-cursor@kaipo-redeploy.md` | `npm ci`, then redeploy current `main` to https://nasaspacemission.vercel.app and confirm the valley copy is in the bundle. |
