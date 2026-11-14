# Contracts

**Stack:** TypeScript + Vite + React, static browser app, no backend. See `.agents/decisions/002-stack.md`.

The interfaces between parts of the simulator. Agents must not break these without a decision record.

**Version:** 0.1 (see `.agents/decisions/001-module-contracts.md`)
**Status:** the challenge is the **Space Mission Design Game** and the stack is TypeScript (decision 002). The shapes below are written as JSON so they stay readable; the real TypeScript types live in `shared/types.ts` and must match this file. If the two ever disagree, this file wins and `shared/` gets fixed.

## Ground rules

1. **Three modules, one direction of data flow:** `data` → `sim` → `ui`. The UI never changes sim state directly. It sends **commands**, and the sim answers with new **state** and **events**.
2. **The sim core is pure.** It does no file or network I/O, no rendering and no wall-clock time. With the same config, datasets and seed, it gives the same result every time. That way it can be tested headless and the demo can be replayed.
3. **Everything that crosses a module boundary is plain JSON-serializable data.** No class instances, functions or engine objects.
4. **Units:** SI everywhere (m, kg, s, K, W). Field names carry the unit when it isn't obvious, e.g. `altitude_m`. Angles are radians internally; the UI converts to degrees for display.
5. **Time:** sim time is `t_s`, seconds since the scenario starts. Real-world timestamps are ISO 8601 UTC strings (`"2026-11-14T09:00:00Z"`).
6. **IDs** are lowercase kebab-case strings (`"iss"`, `"crater-a"`) and stay stable for the whole run.
7. **Additive changes are fine** (new optional fields, new event types). Renaming, removing or changing the meaning of a field needs a decision record.

## Modules

| Module | Folder | Owner | Talks to |
|--------|--------|-------|----------|
| data: load NASA datasets, normalize them to `Dataset` | `data/` | unclaimed | sim (hands over `Dataset`s), ui (only for static metadata/credits) |
| sim: scenario state + step function | `sim/` | unclaimed | receives `Config` + `Dataset`s + `Command`s, emits `SimState` + `SimEvent`s |
| ui: render state, take user input | `ui/` | unclaimed | reads `SimState`/`SimEvent`, sends `Command`s |
| app: glue, main loop, wiring | `app/` | unclaimed | owns the loop that calls sim and hands results to ui |
| shared: types/constants from this file | `shared/` | contracts owner (claude@ethan for now) | imported by everyone, depends on nothing |

Folder names are confirmed by decision 002: top-level `data/`, `sim/`, `ui/`, `app/`, `shared/`.

## Shared data formats

### `Config`: scenario setup (a JSON file in `data/scenarios/<id>.json`)

```json
{
  "contract_version": "0.1",
  "scenario_id": "demo",
  "title": "Human-readable name",
  "seed": 42,
  "dt_s": 1.0,
  "duration_s": 3600,
  "start_utc": "2026-11-14T00:00:00Z",
  "datasets": ["dataset-id-1"],
  "entities": [ /* initial Entity objects, see below */ ],
  "params": { /* scenario-specific tunables, flat key → number|string|bool */ }
}
```

### `Dataset`: what `data/` hands to `sim/`

```json
{
  "id": "dataset-id-1",
  "source": "NASA <mission/portal name>",
  "source_url": "https://...",
  "license": "public domain | CC-BY | ...",
  "retrieved_utc": "2026-11-14T10:00:00Z",
  "kind": "timeseries | grid | table | points",
  "units": { "column_name": "unit" },
  "data": { /* shape depends on kind, see below */ }
}
```

`data` by `kind`:
- `timeseries`: `{ "t": [..ISO or seconds..], "<column>": [..numbers..] }`, with all arrays the same length
- `table`: `{ "columns": ["a", "b"], "rows": [[1, 2], [3, 4]] }`
- `points`: `{ "points": [{ "lat_rad": 0, "lon_rad": 0, "<field>": 0 }] }`
- `grid`: `{ "width": W, "height": H, "origin": {..}, "cell_size": {..}, "values": [..row-major..] }`

Raw downloads stay in `data/raw/` (gitignored if large). Only normalized `Dataset`s cross into `sim`.

### `Entity`: anything the sim tracks

```json
{
  "id": "iss",
  "kind": "spacecraft | body | station | sensor | region | ...",
  "name": "Display name",
  "position": [0, 0, 0],
  "velocity": [0, 0, 0],
  "props": { /* kind-specific, flat key → number|string|bool */ }
}
```

`position` and `velocity` are optional, in SI units, and in the frame named by `SimState.frame`. Entities that aren't spatial leave them out.

### `SimState`: snapshot after each step (sim → app → ui)

```json
{
  "contract_version": "0.1",
  "scenario_id": "demo",
  "tick": 0,
  "t_s": 0.0,
  "utc": "2026-11-14T00:00:00Z",
  "frame": "scene | earth-centered-inertial | lat-lon | ...",
  "status": "running | paused | ended",
  "entities": [ /* Entity */ ],
  "metrics": { /* named numbers the UI may chart, e.g. "fuel_kg": 120 */ }
}
```

The UI treats `SimState` as read-only. The app keeps the latest one plus an optional history buffer for charts.

## Sim core API

The sim core exports exactly these three functions:

```
init(config: Config, datasets: Dataset[]) -> SimState
step(state: SimState, commands: Command[], dt_s: number) -> { state: SimState, events: SimEvent[] }
summary(state: SimState) -> { [key: string]: number | string }   // for end-of-run / results screen
```

- `step` must not mutate its input `state`; it returns a new one.
- Commands are applied at the start of the step, in array order.
- Randomness comes only from an RNG seeded by `config.seed` and carried in `state` (e.g. `metrics._rng` or a hidden field), never from a global random.

## Events / messages between modules

### Commands (ui → app → sim)

`{ "type": "<name>", "payload": { ... } }`

| type | payload | who sends | who handles |
|------|---------|-----------|-------------|
| `pause` | `{}` | ui | app (stops calling `step`) |
| `resume` | `{}` | ui | app |
| `set_speed` | `{ "multiplier": number }` | ui | app (sim steps per real second) |
| `reset` | `{}` | ui | app (calls `init` again) |
| `set_param` | `{ "key": string, "value": number\|string\|bool }` | ui | sim |
| `select_entity` | `{ "id": string \| null }` | ui | app/ui only (no sim effect) |

Scenario-specific commands are allowed. Add a row here when you add one.

### Sim events (sim → app → ui)

`{ "type": "<name>", "tick": number, "t_s": number, "payload": { ... } }`

| type | payload | who sends | who listens |
|------|---------|-----------|-------------|
| `scenario_started` | `{ "scenario_id": string }` | sim (`init`) | ui |
| `entity_added` | `{ "entity": Entity }` | sim | ui |
| `entity_removed` | `{ "id": string, "reason": string }` | sim | ui |
| `threshold_crossed` | `{ "metric": string, "value": number, "threshold": number, "direction": "up"\|"down" }` | sim | ui (alerts) |
| `scenario_ended` | `{ "reason": string, "summary": object }` | sim | ui (results screen) |
| `warning` | `{ "message": string }` | any | ui (log/toast) |

## Mission design mapping (Space Mission Design Game)

How the game's ideas fit the shapes above. Nothing here is a new shape.

- **Design choices** (launch vehicle, bus, instruments, power system, antenna, orbit) are plain values in `Config.params`. The player changes them with the `set_param` command, e.g. `{ "type": "set_param", "payload": { "key": "launch_vehicle", "value": "falcon-9" } }`.
- **Parts catalogs** (launch vehicles, instruments, bus parts) are `Dataset`s of kind `table` in `data/`, one row per part with an `id` column. Params refer to parts by that `id`.
- **Budgets** are numbers in `SimState.metrics`. Use these keys when they apply so the UI can chart them without asking: `mass_kg`, `mass_limit_kg`, `power_w`, `power_available_w`, `cost_usd`, `budget_usd`, `data_rate_bps`, `delta_v_ms`, `science_score`.
- **Going over a limit** emits `threshold_crossed`. **Mission success or failure** is `scenario_ended` with `reason` (`"success"`, `"over_budget"`, `"launch_failure"`, ...) and the `summary` object for the results screen.
- **Phases** (design → launch → cruise → operations) go in `metrics.phase` as a string until someone needs more than that.

## Open questions

- Which coordinate `frame` the mission view uses (2D orbit diagram, Earth-centered, lat/lon map). The first person building the mission view decides and adds it here.
- Which concrete NASA datasets we load. Each one gets listed in `docs/` with its source and license.
- Answered by decision 002: the sim runs in the browser only, so Commands and SimState are passed as plain objects with no WebSocket.
