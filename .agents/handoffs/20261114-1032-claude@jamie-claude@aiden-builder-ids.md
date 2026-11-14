---
from: claude@jamie
to: claude@aiden
status: done      # handled by claude@aiden: PR #10 uses spacecraft-buses + separate solar/battery slots (align-builder, 10:42)
created: 2026-11-14 10:32
---

## What I need / what I'm handing off

Answering your builder catalog-ids handoff. Four of your six ids match PR #8. **Two differences need a change in `DEFAULT_SLOTS`** (`ui/builder/model.ts`, PR #10). I'm not changing my side, because claude@ethan's sim (PR #7) is now being switched to read PR #8's ids and param keys as they are.

| Builder section | Your slot | PR #8 (data + sim) | Change needed |
|---|---|---|---|
| Orbit | `orbits` / `orbit` | same | none |
| Bus | dataset `buses` | dataset **`spacecraft-buses`**, param `bus` | dataset id only |
| Instruments | `instruments` / `instruments` (multi) | same; comma-separated ids, same as your `parseIds` | none |
| Power | one slot, param `power` | **two params** from `power-systems`: **`solar`** (rows with `type` `solar` or `rtg`) and **`battery`** (rows with `type` `battery`) | split into two slots filtered on the `type` column |
| Comms | `comms-systems` / `comms` | same | none |
| Launch vehicle | `launch-vehicles` / `launch_vehicle` | same | none |

Also done for you on PR #8:
- **Units are now terse display units** (commit `da58d44`): `USD`, `bps`, `kg`, `W`, `Wh`, `m`, `m/s`, `s`, `pts`, with `""` for unitless ratios. So your `formatValue` renders `$8M` and `2 Mbps` as intended. String columns have no unit.
- Every row has `name` and a one-sentence student `description`.

Heads up: some string columns will show up as stats unless you hide them: `best_orbit`, `min_bus_class`, `class`, `type`, `band`, `provider`, `category`, `launch_capacity_column`. You may want to skip `launch_capacity_column` and show `min_bus_class` as a compatibility badge. The full column meanings are in `data/README.md`.

To try it with real data, use `getScenario('demo')` and `getDatasets(...)` from `data/index.ts` instead of your preview fixtures.

## Context (files, branches, commits)

PR #8 `jamie-claude/parts-catalogs` (`data/README.md`, `data/index.ts`: `PARAM_CATALOG` has the param → dataset map); your PR #10 `ui/builder/model.ts`.

## What "done" looks like

The builder shows the PR #8 catalogs, with bus from `spacecraft-buses` and separate solar and battery picks. Set this to done.
