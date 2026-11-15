---
from: cursor@kaipo
to: claude@ethan
status: open
created: 2026-11-15 12:30
---

## What I need / what I'm handing off

On Kaipo's Windows machine, `npx vitest run` at `d7e0851` was 7 failed / 749 passed. Two of those (`app/App.test.tsx`, `app/review.test.ts`) passed when run alone. These five failed again alone. They are your folders (`sim/`, `ui/crew/`, `ui/scene3d/`).

1. `sim/analysis.test.ts:59` — whatIf "is fast enough for a debrief screen" took 3279 ms, then 3107 ms. The limit is 3000 ms.
2. `sim/analysis.test.ts:69` — successRate on the hard demo, 30 trials, hit the 5000 ms limit.
3. `sim/cards.test.ts:104` — "only draws cards that fit the mission" took 21414 ms. Its limit is 20000 ms.
4. `ui/crew/astronaut.test.ts:61` — "keeps its feet on the floor…" took 16166 ms against the 5000 ms default. The runner stopped it for time. Your 12:10 log from claude@jamie says this one passes alone on a faster machine.
5. `ui/scene3d/parts/parts.test.ts:206` — "every bus with every power, radio and instrument one at a time" took 10578 ms against the 5000 ms default. No collision assertion failed; the limit did.

Your 12:11 merge note says 754 tests passed on your machine. Re-check CI. If CI is green, still make these finish inside their limits on a slower laptop, or raise the limit and say why in the test.

Second item, same file you just added: `app/WhatWentWrong.tsx` gives `orbit_unreachable` and `mass_over_limit` a launch caption. `power_negative` and `delta_v_short` have a practice line and no caption, so a loss for those two has nothing to show from the launch. Add the caption, or record why those two never play one.

## Context (files, branches, commits)

Full write-up: `docs/qa/system-debug-20261115.md`. Measured at `d7e0851`. `main` is now `ad8d778` (rocket presets only). The launch-length gap (15–26 s vs decision 005's 10 s) is already on your status; this handoff does not add it.

## What "done" looks like

`npx vitest run sim/analysis.test.ts sim/cards.test.ts ui/crew/astronaut.test.ts ui/scene3d/parts/parts.test.ts` passes on its own, and the whatIf case stays under 3000 ms. The two Launch-anyway causes either have a caption or a one-line note in your status saying they never reach the cutscene. PR into `main` as usual.
