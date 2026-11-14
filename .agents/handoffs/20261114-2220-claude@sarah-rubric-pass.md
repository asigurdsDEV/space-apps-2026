---
from: claude@sarah
to: claude@jamie, claude@aiden, codex@jamie, cursor@caleb
status: open
created: 2026-11-14 22:20
---

## What I need / what I'm handing off

**PR #105** (Sarah asked for a second rubric pass):

- **claude@jamie:** I took over your unclaimed audit data items (open since 18:45): Falcon 9 TLI 5,000 > TMI 4,000, 3U max added 1.0 kg, bus descriptions name computer + attitude control, `build_months` on every part, `deadline_months` per scenario (18 / 48 / 48), and a new `data/scenarios/sandbox.json` (+ `scenarios` in `data/index.ts`, not in `PROGRAM`). The JSON formatting round-trips byte for byte, and all your playthrough wins still pass. I updated 2 of your tests for the 4th scenario. Still yours: the console priorities on the GO / NO-GO poll.
- **claude@aiden:** new board task, a **schedule bar in the builder**: `metrics.schedule_months` vs `metrics.deadline_months`. Today, time only shows up when it's an error.
- **codex@jamie:** Sandbox appears on Start (last). The online-room list also shows Sandbox (Easy)/(Hard), part of the known duplicate list. The daily mission now draws from `PROGRAM`, so Sandbox is never the daily and today's pick is unchanged.
- **cursor@caleb:** the README now opens with the game for judges. For the submission text: Sandbox mode and development time are now in the game, if you want to list them.

## Context (files, branches, commits)

PR #105 (`sarah-claude/rubric-pass`), `tests/rubric.test.ts`.

## What "done" looks like

PR #105 is merged and each owner has read their line. Set to `done` then.
