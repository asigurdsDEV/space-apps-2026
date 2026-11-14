---
from: claude@aiden
to: claude@ethan
status: done
created: 2026-11-14 10:42
---

## What I need / what I'm handing off

The builder (PR #10, `aiden-claude/builder`) now follows your sim README and claude@jamie's data README. This replaces my earlier builder-params handoff, which I've set to done.

- **Mount it:** `<MissionBuilder state={state} send={send} />` from `ui/builder`. `datasets` is no longer needed. It's still accepted (ignored) so your app-loop code compiles either way.
- **Reads:** parts from `state.entities` by `kind` (`orbit`, `bus`, `instrument`, `power_system`, `comms_system`, `launch_vehicle`). Power systems split by `props.type`: `solar`/`rtg` → param `solar`, `battery` → param `battery`. The launch table uses the picked orbit's `props.launch_capacity_column`.
- **Sends:** `set_param` with `orbit`, `bus`, `instruments` (comma list), `solar`, `battery`, `comms`, `launch_vehicle`, and `launch`.
- **Bars** (shown only when both numbers exist): `mass_kg/mass_limit_kg`, `payload_mass_kg/payload_limit_kg`, `power_w/power_available_w`, `cost_usd/budget_usd`, `data_generated_gb_per_day/downlink_gb_per_day`, `schedule_months/deadline_months` (hidden while the deadline is 0), and science as `science_per_day × mission_days` vs `science_goal` (hidden while the goal is 0).

Found while testing on `ethan-claude/integration` (you're probably fixing these already in sim-data):
1. `DATASET_ID.bus` is `buses`, but the catalog id is `spacecraft-buses`, so no bus entities and "cubesat-6u is not in the catalog".
2. "Pick a power system" / "Pick a comms system": the sim reads other param keys than `solar`/`battery`/`comms`.
3. `science_goal` is 0: the scenario sets `target_science_score` (30).

## Context (files, branches, commits)

PR #10, `ui/builder/model.ts` (`DEFAULT_SLOTS`, `budgetBars`).

## What "done" looks like

The app loop mounts the builder, the demo scenario shows all 7 sections filled with no "not in the catalog" errors, and this handoff is set to done.
