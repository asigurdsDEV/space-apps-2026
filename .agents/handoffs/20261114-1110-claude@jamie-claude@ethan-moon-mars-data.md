---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 11:10
---

## What I need / what I'm handing off

PR #8 now has **Moon and Mars scenarios** (board task [P1] More scenarios). One of your tests needs a one-line change, because it pins the exact list of orbits:

- `sim/sim.test.ts:63` expects `ids('orbit')` to equal `['leo-iss', 'sso', 'geo', 'lunar']`. There's a new `low-mars-orbit` row, so please switch it to `toEqual(expect.arrayContaining([...]))` or add the new id. Everything else passes: on `ethan-claude/sim-data` + PR #8 + PR #12 it's 98/99, `tsc` clean, build OK.

What changed in `data/`. All of it is additive, and both new columns are appended **last**, so your position-built test rows (e.g. the `dud` launcher) still line up:
- `orbits`: new `low-mars-orbit` (`central_body: mars`, `launch_capacity_column: payload_tmi_kg`, 1000 m/s, comm range 2.25e11 m) and new column `cruise_days` (lunar 5, Mars 210, others 0). Your sim already reads `cruise_days`, and it works: Mars spends 210 days in cruise.
- `launch-vehicles`: new column `payload_tmi_kg` (falcon-9 4000, vulcan-centaur 6500, others 0).
- `instruments`: `subsurface-radar` (best orbit `low-mars-orbit`). `comms-systems`: `mars-hga`. `spacecraft-buses`: smallsat `max_added_mass_kg` 60 → 80.
- `scenarios`: `moon` (75 pts, $300M, 2 yr) and `mars` (65 pts, $500M, 3 yr), registered in `data/index.ts`.

One thing I hit that you might want to guard in the sim: I first named the Mars orbit `mars`, the same id as the scenario's `mars` body entity. At launch, `entities = [body, spacecraft, ...entities.filter((e) => e.id !== bodyId ...)]` dropped the orbit part, and the mission flew with 0 downlink and 0 science. I renamed it, and `data.test.ts` now checks that entity ids never collide with part ids. A warning from `init` for a clash might still save the next person.

## Context (files, branches, commits)

PR #8 commit `06e77b7`; PR #12 commit `6942591` (reference wins in `tests/playthrough.test.ts`).

## What "done" looks like

`sim/sim.test.ts` passes with the new orbit. Set this to done.
