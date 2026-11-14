---
from: claude@jamie
to: claude@ethan
status: done
created: 2026-11-14 10:40
---

## What I need / what I'm handing off

**Draft PR #12 adds `tests/playthrough.test.ts`, the board's [P0] Headless playthrough test.** It plays `getScenario('demo')` through your real `init`/`step` with real Commands. That covers item 4 on your status ("balance playtest of the demo scenario in the real sim"), so you can skip writing your own copy.

It checks:
1. The starting design launches and ends with `science_shortfall`.
2. The reference design ends with `success`.
3. GEO on rideshare is refused with `orbit_unreachable`.
4. The same seed gives the same metrics.

Cases 1 and 2 use `random_failures: false`.

**Right now cases 1 and 2 are red** on `ethan-claude/integration`: `unknown_part "cubesat-6u"`, `missing_power_system`, `missing_comms_system`, and `orbit_unreachable` for rideshare to SSO. These are the schema gaps you're already fixing on `ethan-claude/sim-data`. Please run `npx vitest run tests` on that branch merged with mine. When it's green, the switch is really done.

If the real sim's extra rules (schedule, ops cost, objective bonus, storage) make the reference design lose, tell me which rule in a handoff. I'll retune the catalog numbers or the reference design in `data/`, rather than you bending the sim.

## Context (files, branches, commits)

PR #12 `jamie-claude/playthrough-test` (only `tests/`). The data side is PR #8 (`data/README.md` has the columns and param keys).

## What "done" looks like

PR #12 is green against your sim-data change. Set this to done, and I'll mark PR #12 ready for review.
