# sim/ — the mission simulator

Owner: claude@ethan. Pure TypeScript: no React, no DOM, no I/O, no `Math.random()`. Implements `init` / `step` / `summary` from `.agents/CONTRACTS.md`.

```ts
import { init, step, summary } from '../sim'

let state = init(config, datasets)                                  // design phase, t = 0
;({ state } = step(state, [{ type: 'set_param', payload: { key: 'bus', value: 'smallsat' } }], dt))
;({ state, events } = step(state, [{ type: 'launch', payload: {} }], dt))
while (state.status !== 'ended') ({ state, events } = step(state, [], dt))
const report = summary(state)                                       // score, grade, why
```

Run the tests with `npm test`. `sim/testing/fixtures.ts` has placeholder catalogs and a demo scenario you can use until the real ones are in `data/`.

## How a mission runs

`metrics.phase` goes `design` → `cruise` → `operations` → `ended`.

- **design:** time stands still. Every step re-checks the design and refreshes the budgets in `state.metrics` and the problems in `state.issues`. `set_param` changes a choice. `launch` starts the mission, or is refused with a `warning` event while any issue has severity `error`.
- **launch:** one random roll against the launch vehicle's `reliability`. Failure ends the mission (`launch_failure`).
- **cruise:** `cruise_days` of the chosen orbit pass. Nothing is collected.
- **operations:** each day the instruments make data, the radio sends what it can, the rest waits in storage, and anything that does not fit is lost. **Science only counts when its data reaches the ground.** The bus can fail (`spacecraft_failure`) and random events can cost a day.
- **ended:** `success` if `science_score` reached `science_goal`, otherwise `science_shortfall`. A `scenario_ended` event carries `summary(state)`.

After launch the design is locked. After `ended`, `step` returns the same state.

## What data/ must provide

Six `table` Datasets with exactly these ids. Every row needs a unique kebab-case `id` (unique across all six tables) and a `name`. Extra columns are fine and end up in the part's `props`.

| Dataset id | Columns the sim reads |
|---|---|
| `launch-vehicles` | `cost_usd`, `reliability` (0 to 1), and one `capacity_<class>_kg` per orbit class it can reach (0 or missing = cannot reach) |
| `orbits` | `body` (`earth`, `moon`, `mars`), `class` (matches the launcher's `capacity_<class>_kg`), `altitude_km`, `eclipse_fraction` (0 to 1), `contact_min_per_day` (per ground station), `science_multiplier`, `cruise_days` |
| `buses` | `mass_kg`, `cost_usd`, `max_payload_kg`, `power_draw_w`, `storage_gb`, `reliability` (chance of surviving the planned mission), `build_months` |
| `power-systems` | `mass_kg`, `cost_usd`, `power_w` (in sunlight), `battery_wh`, `build_months` |
| `comms-systems` | `mass_kg`, `cost_usd`, `power_draw_w`, `data_rate_mbps`, `build_months` |
| `instruments` | `mass_kg`, `cost_usd`, `power_draw_w`, `data_gb_per_day`, `science_per_day`, `objective` (tag), `build_months` |

Every catalog row becomes an Entity in `state.entities` with `kind` = `launch_vehicle`, `orbit`, `bus`, `power_system`, `comms_system` or `instrument`. The UI lists the parts from there, so it never imports `data/` directly.

## Config.params

Scenario settings (set by the scenario file):

| key | meaning | default |
|---|---|---|
| `objective` | tag; instruments with the same `objective` earn 1.5x science | none |
| `budget_usd` | whole-mission budget | 0 = no limit |
| `science_goal` | science points needed for success | 0 = any |
| `deadline_months` | months until the launch window closes | 0 = no limit |
| `ops_cost_usd_per_day`, `ground_station_cost_usd_per_day` | running costs | 0 |
| `integration_months_per_instrument` | schedule added per instrument | 1 |
| `event_rate_per_day` | chance per day of a random event | 0 |
| `random_failures` | `false` = sandbox: no launch failure, bus failure or random events | `true` |
| `mission_days` | length of operations | `duration_s / 86400` |

Player choices (changed with `set_param` in the design phase): `launch_vehicle`, `orbit`, `bus`, `power_system`, `comms_system` (each a part `id`), `instruments` (comma-separated ids, e.g. `"mini-camera,magnetometer"`), `ground_stations` (1 to 6), `spacecraft_name`.

## state.metrics

Live budgets (design numbers, refreshed every step): `mass_kg` / `mass_limit_kg`, `payload_mass_kg` / `payload_limit_kg`, `power_w` / `power_available_w`, `duty_cycle`, `cost_usd` / `budget_usd` (plus `build_cost_usd`, `launch_cost_usd`, `ops_cost_usd`, `ops_cost_usd_per_day`), `data_generated_gb_per_day` / `downlink_gb_per_day`, `data_rate_bps`, `storage_gb`, `science_per_day` / `science_goal`, `schedule_months` / `deadline_months`, `ground_stations`, `launch_reliability`, `bus_reliability`, `cruise_days`, `mission_days`.

Mission progress: `phase`, `outcome`, `mission_day`, `science_score`, `data_generated_gb`, `data_downlinked_gb`, `data_stored_gb`, `data_lost_gb`, `cost_spent_usd`.

## state.issues

| code | severity | resource |
|---|---|---|
| `missing_<slot>`, `missing_instrument`, `unknown_part` | error | design |
| `orbit_unreachable`, `mass_over_limit`, `payload_over_bus` | error | mass |
| `mass_margin_low` | warning | mass |
| `power_negative` | error | power |
| `power_short`, `battery_small` | warning | power |
| `downlink_short` | warning | comms |
| `over_budget` | error | budget |
| `behind_schedule` | error | time |
| `objective_mismatch` | warning | design |

Each has a `message` written for students. Show it as is.

## Events

`scenario_started` (first step), `threshold_crossed` (a budget bar goes over or back under its limit in design; storage fills or the science goal is reached in flight), `phase_changed`, `entity_added` (the body and the `spacecraft` at launch), `warning` (refused launch, locked design, random events), `scenario_ended`.

## Mission view

`state.frame` is `body-centered`: metres, the body (`kind: "body"`, `props.radius_m`) at the origin, the spacecraft (`id: "spacecraft"`) on a circle in the x-y plane. During cruise it spirals out from the surface, which is for looks only.

## summary(state)

`outcome`, `score` (0 to 100: 70 science, 10 budget left, 10 launch margin, 10 data delivered), `grade` (A to F), `science_score`, `science_goal`, `cost_usd`, `budget_usd`, `mass_kg`, `mass_limit_kg`, `data_generated_gb`, `data_downlinked_gb`, `data_lost_gb`, `mission_days_flown`, and `why`: sentences explaining the result.
