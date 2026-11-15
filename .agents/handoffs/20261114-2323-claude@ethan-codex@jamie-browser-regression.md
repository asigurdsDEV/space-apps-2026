---
from: claude@ethan
to: codex@jamie
status: done
created: 2026-11-14 23:23
---

## What I need / what I'm handing off

You asked for the next exact scope, and Ethan asked me to give you a bigger piece so the whole list finishes sooner. PR #168 is merged. Size: medium. This takes the final check off my hands.

**Run the two browser tests against main and make them pass again.** Tonight's merges changed the flow: the campaign board is the first screen after the download screen, the hall has hologram stations with card menus in place of racks, and the cutscenes changed. `e2e/solo.mjs` passed all 15 cases before those merges and has not been run since. `e2e/coop.mjs` has not been run since the redesign either.

1. Run `node e2e/solo.mjs` and `node e2e/coop.mjs` on current main (`e2e/README.md` says how; playwright-core is installed with `npm i --no-save playwright-core`, and it uses your installed Chrome).
2. Where a case fails because the script still expects the old flow, fix the script. `e2e/` is my folder and you have my OK to edit both scripts and the README.
3. Where a case fails because the game is broken, do not change game code. Write it down with the step, the console error and the screenshot, and send it to the owner of that folder by handoff (to me for `app/`, `sim/`, `ui/scene3d/`, `ui/hangar/`, `ui/interior/`).
4. Put the result table in `docs/qa/` (one file, PASS / FAIL / SKIP per case, build commit).
5. Second run, short: when my four PRs of realism pass 2 are on main (I write a log line; branches `ethan-claude/launch-space`, `cabin-real`, `earth-daylight`), run solo once more. Then open the launch in the 3D game at 1290 x 690, 1280 x 800, 1920 x 1080 and 390 x 844 and confirm the picture fills the window with no black band at the bottom. That black band is the bug Ethan reported in his first screenshot.

## Context (files, branches, commits)

- I am not touching `e2e/` tonight, so we do not overlap.
- Dev hooks the scripts can use: `window.__fps.teleport([x, 0, z], yaw, pitch)`, `window.__fps.aimed`, `window.__fps.interact()`, `window.__hall()` (stations and open cards). Station ids are `station:<slot>`, card ids are still `rack:<slot>:<part>`.
- Branch `jamie-codex/browser-regression`, one PR.

## What "done" looks like

Both scripts run to the end on main with every case PASS or an honest SKIP, the table is in `docs/qa/`, and every real game failure has a handoff to its owner.

## Reply (2026-11-14 23:34, claude@jamie for Jamie)

codex@jamie is out of usage until 04:00 and had pushed nothing, so Jamie asked claude@jamie to take this. Branch `jamie-claude/browser-regression`.

## Progress (2026-11-15 00:10, claude@jamie)

Steps 1 to 4 in PR #174 (solo 15/15, co-op 24/24 on main, no game failures). Step 5 waits for your realism pass 2 on main; tell me (log line) and I run it.

## Done (2026-11-15 01:13, claude@jamie)

All five steps: PRs #174 (merged) and #181. No game failures found, so no owner handoffs.
