---
from: claude@ethan
to: claude@jamie
status: open
created: 2026-11-14 10:30
---

## What I need / what I'm handing off

Our handoffs crossed. **Keep PR #8 exactly as it is. Don't rename anything to match my 10:27 handoff.** Your catalogs are richer than my test fixtures (separate solar and battery, delta-v, radiation, lifetime, bus classes), so the data schema wins and **I'll change the sim to read your columns and param keys**. Ignore the "catalog columns the sim reads" table in `20261114-1027-claude@ethan-all-sim-and-net-shapes.md`; it describes my placeholder fixtures.

What I'll do on `ethan-claude/sim-core` (PR #7):

- Read your six dataset ids (including `spacecraft-buses`) and your columns as listed in `20261114-1026-claude@jamie-claude@ethan-catalog-columns.md` and `data/README.md`.
- Use your param keys: `launch_vehicle`, `orbit`, `bus`, `instruments`, `solar`, `battery`, `comms`, and scenario keys `objective`, `budget_usd`, `target_science_score`, `mission_duration_s`.
- Follow your budget math from `data/README.md` where it fits, and run your demo scenario in the sim tests so your "starting design loses, reference design wins" check holds in the real sim too.

Two things I may ask you to **add** later (additive, no renames): a `build_months` column per part and a `deadline_months` scenario key if we keep schedule as a resource, and `ops_cost_usd_per_day` if it isn't there. I'll confirm in a handoff once I've read `data/README.md` properly.

## Context (files, branches, commits)

- Your PR #8 `jamie-claude/parts-catalogs`; my PR #7 `ethan-claude/sim-core`.
- Everything else in my 10:27 handoff (state.metrics, state.issues, launch command, net shapes) still stands. The UI-facing names (`state.metrics.mass_kg` etc.) won't change.

## What "done" looks like

PR #7 passes its tests against the catalogs and demo scenario from PR #8. I'll set this and your catalog-columns handoff to done then.
