---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 10:26
---

## What I need / what I'm handing off

The parts catalogs are ready in **PR #8** (`jamie-claude/parts-catalogs`), so you don't need to wait on columns for the sim core. Everything is documented in `data/README.md`. Short version:

- **Import from `data/index.ts`:** `getScenario('demo')`, `getDatasets(config.datasets)` for `init`, `getPart(catalogId, partId)` → row object, `rowsAsObjects(ds)`, `parseIdList(params.instruments)`, plus `CATALOG_IDS`, `PARAM_CATALOG` and `BUS_CLASSES`.
- **Design params:** `launch_vehicle`, `orbit`, `bus`, `instruments` (comma-separated ids), `solar`, `battery`, `comms`. Scenario-only: `objective`, `objective_text`, `budget_usd`, `target_science_score`, `mission_duration_s`.
- **Columns the sim needs:**
  - launch-vehicles: `payload_leo_kg / payload_sso_kg / payload_gto_kg / payload_tli_kg` (0 = can't reach), `cost_usd`, `cost_per_kg_usd`, `reliability`
  - orbits: `launch_capacity_column` (names the launcher column), `delta_v_required_ms`, `eclipse_fraction`, `period_s`, `contact_s_per_day`, `comm_range_m`, `radiation_factor`, `max_lifetime_s`, `coverage_fraction`
  - spacecraft-buses: `class`, `dry_mass_kg`, `max_added_mass_kg`, `max_instruments`, `base_power_w`, `propulsion_delta_v_ms`, `cost_usd`, `design_life_s`, `reliability`
  - instruments: `mass_kg`, `power_w`, `cost_usd`, `data_rate_bps`, `duty_cycle`, `science_value`, `best_orbit` (orbit id or `any`), `min_bus_class`
  - power-systems: `type` (solar/battery/rtg), `mass_kg`, `cost_usd`, `power_w`, `capacity_wh`, `degradation_per_year`, `min_bus_class`
  - comms-systems: `mass_kg`, `power_w`, `cost_usd`, `data_rate_bps`, `reference_range_m`, `min_bus_class`
- **Suggested budget math** (mass, launch, power, battery, cost, data downlink, science, lifetime) is in `data/README.md`. It's only a suggestion; the sim owns the rules. `data/data.test.ts` uses that same math to prove the demo is balanced: the starting design flies but loses (data downlink is the bottleneck), and a reference design wins.
- **Demo `dt_s` is 86400** (one step = one day, 365 steps).

## Context (files, branches, commits)

PR #8 depends on PR #4 (scaffold) + PR #5 (shared). Verified on those combined: `tsc` clean, 11/11 tests, build OK.

## What "done" looks like

The sim core reads these columns, or you tell me what to rename or add (new columns are fine; renames are cheap until PR #8 merges). Set this to done when the sim builds against it.
