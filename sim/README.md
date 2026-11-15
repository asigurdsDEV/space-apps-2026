# sim/ — the mission simulator

Owner: claude@ethan. Pure TypeScript: no React, no DOM, no I/O, no `Math.random()`. Implements `init` / `step` / `summary` from `.agents/CONTRACTS.md`.

```ts
import { getDatasets, getScenario } from '../data'
import { init, step, summary } from '../sim'

const config = getScenario('demo')!
let state = init(config, getDatasets(config.datasets))             // design phase, t = 0
;({ state } = step(state, [{ type: 'set_param', payload: { key: 'bus', value: 'cubesat-12u' } }], config.dt_s))
;({ state, events } = step(state, [{ type: 'launch', payload: {} }], config.dt_s))
while (state.status !== 'ended') ({ state, events } = step(state, [], config.dt_s))
const report = summary(state)                                       // score, grade, why
```

The sim reads the catalogs and scenario in `data/` exactly as they are: same dataset ids, columns, units and param keys. It never imports `data/`; the caller passes the `Config` and `Dataset`s in. Run the tests with `npm test`.

`sim/testing/fixtures.ts` exports `fixtureDatasets` (the six real catalogs), `demoConfig` (data's demo scenario) and `goodDesign` (data's reference design, which passes every launch check and wins).

## How a mission runs

`metrics.phase` goes `design` → `cruise` → `operations` → `ended`.

- **design:** time stands still. Every step re-checks the design and refreshes the budgets in `state.metrics` and the problems in `state.issues`. `set_param` changes a choice. `launch` starts the mission, or is refused with a `warning` event while any issue has severity `error`.
- **launch:** with `random_failures` on, one random roll against the launch vehicle's `reliability`. Failure ends the mission (`launch_failure`).
- **cruise:** lasts the orbit's `cruise_days` (or `cruise_s`). data/ has no such column today, so cruise takes no time: the launch step enters `cruise` and the next step enters `operations`.
- **operations:** each day the instruments make data, the radio sends what it can, the rest waits in storage, and anything that does not fit is lost. **Science only counts when its data reaches the ground**, and the radio sends the most valuable data (most science per GB) first. With `random_failures` on, the bus can fail (`spacecraft_failure`) and random events can cost a day.
- **ended:** `success` if `science_score` reached `science_goal` (within 0.000001 of a point, because the score is a sum of daily amounts), otherwise `science_shortfall`. A spacecraft that fails after the goal was reached is still a `success`. A `scenario_ended` event carries `summary(state)`.

The mission clock starts at launch and runs for `mission_duration_s`. With the demo's `dt_s` of one day that is the launch step plus 365 steps. After launch the design is locked, including for `set_param` commands that follow `launch` in the same step. After `ended`, `step` returns the same state. A `dt_s` that is not a positive number moves no time. Malformed commands are skipped.

## Catalogs the sim reads

Six `table` Datasets. Every row needs an `id` and a `name`; all other columns end up unchanged in the part's `props`. A rule whose column is missing is switched off.

| Dataset id | Entity `kind` | Columns the sim reads |
|---|---|---|
| `launch-vehicles` | `launch_vehicle` | `cost_usd`, `cost_per_kg_usd`, `reliability`, and the `payload_*_kg` column named by the orbit (0 = cannot reach) |
| `orbits` | `orbit` | `central_body`, `altitude_m`, `period_s`, `launch_capacity_column`, `delta_v_required_ms`, `eclipse_fraction`, `contact_s_per_day`, `comm_range_m`, `radiation_factor`, `max_lifetime_s`. Optional: `cruise_days` or `cruise_s`, `solar_flux_factor` (sunlight relative to Earth, default 1; multiplies solar power, not an RTG), `coverage_fraction` (share of the planet the orbit passes over, default 1; an imager off its `best_orbit` earns half its science times this) |
| `spacecraft-buses` | `bus` | `class`, `dry_mass_kg`, `max_added_mass_kg`, `max_instruments`, `base_power_w`, `propulsion_delta_v_ms`, `cost_usd`, `design_life_s`, `reliability`. Optional: `storage_gb`, `build_months` |
| `instruments` | `instrument` | `mass_kg`, `power_w`, `cost_usd`, `data_rate_bps`, `duty_cycle`, `science_value`, `best_orbit` (orbit id or `any`), `min_bus_class`. Optional: `build_months` |
| `power-systems` | `power_system` | `type` (`solar`, `rtg` or `battery`), `mass_kg`, `cost_usd`, `power_w`, `capacity_wh`, `degradation_per_year`, `min_bus_class`. Optional: `build_months` |
| `comms-systems` | `comms_system` | `mass_kg`, `power_w`, `cost_usd`, `data_rate_bps`, `reference_range_m`, `min_bus_class`. Optional: `build_months` |

Not used: `inclination_rad`, `band`, `provider`, `description`.

Every catalog row becomes an Entity in `state.entities`, so the UI can list the parts from there. Orbit entities also get `props.altitude_km` (from `altitude_m`), which the mission view reads.

## Params

Player choices, changed with `set_param` in the design phase:

| key | value |
|---|---|
| `launch_vehicle`, `orbit`, `bus`, `comms` | one part id |
| `solar` | a `power-systems` id with `type` `solar` or `rtg` |
| `battery` | a `power-systems` id with `type` `battery`. May be empty |
| `instruments` | comma-separated instrument ids, e.g. `"camera-basic,ir-spectrometer"` |
| `spacecraft_name` | optional name for the mission view |

Scenario settings (`Config.params`):

| key | meaning | when absent |
|---|---|---|
| `target_science_score` | science points needed for success | any science is a success |
| `mission_duration_s` | planned mission length from launch | `Config.duration_s` |
| `budget_usd` | whole-mission budget | no limit |
| `random_failures` | `true` = launches and the bus can fail, and random events happen. The rolls depend only on the seed, so test the seed before shipping a scenario with this on | `false` (sandbox) |
| `event_rate_per_day` | chance per day of a solar storm or ground station outage | 0 (off) |
| `ops_cost_usd_per_day`, `ground_station_cost_usd_per_day` | running costs | 0 (off) |
| `ground_stations` | 1 to 6; multiplies the daily contact time. Ignored unless `ground_station_cost_usd_per_day` is above 0 | 1 |
| `deadline_months`, `integration_months_per_instrument` | schedule limit; needs `build_months` columns | off |

`objective` and `objective_text` are for the UI; the sim does not read them.

Values are checked in `init` and on every `set_param` (`cleanParam` in `sim/params.ts`): a number sent as text for a numeric key is converted (`"100"` → 100), and `NaN`, `null`, objects and non-numeric text for a numeric key are refused (`set_param` then raises a `warning` event).

### Aliases

All in `sim/params.ts` (`PARAM_ALIASES`, `SCENARIO_ALIASES`), nowhere else.

| alias | means | note |
|---|---|---|
| `power` | `solar` | what ui/builder sends today. If the part is a battery it sets `battery` instead |
| `power_system` | `solar` | old sim name |
| `comms_system` | `comms` | old sim name |
| `science_goal` | `target_science_score` | old sim name |
| `mission_days` | `mission_duration_s` / 86400 | old sim name |

In `Config.params` an alias is used only when the real key is unset. A `set_param` on an alias also sets the real key. `state.params.power` is kept equal to `solar` (also when `power_system` is the key sent), because the builder reads it back to show the current pick.

## The rules, one sentence each

| Rule | Sentence | Columns |
|---|---|---|
| Mass | The spacecraft weighs the bus plus everything bolted onto it. | `dry_mass_kg`, `mass_kg` |
| Bus capacity | A bus can carry only so many kilograms and so many instruments. | `max_added_mass_kg`, `max_instruments` |
| Bus size | Big parts need a big enough class of bus (`cubesat` < `smallsat` < `medium` < `flagship`). | `min_bus_class`, `class` |
| Launch | The rocket must be able to lift the whole spacecraft to the chosen orbit. | the orbit's `launch_capacity_column` |
| Propulsion | If the orbit needs a burn of more than 100 m/s the bus must be able to do it; a smaller shortfall still flies, but the spacecraft drifts and stays in that orbit half as long (only mentioned, as `orbit_life_short`, when that is shorter than the mission). | `delta_v_required_ms`, `propulsion_delta_v_ms`, `max_lifetime_s` |
| Power | Solar panels only make power in sunlight (an RTG always does), and that average must cover the bus and radio; instruments take turns on whatever is left. | `power_w`, `eclipse_fraction`, `base_power_w` |
| Battery | The battery must run everything through each eclipse, or the instruments switch off in shadow. Uptime is the smaller of the power share and the sunlit share, not their product. | `capacity_wh`, `period_s`, `eclipse_fraction` |
| Fading | The power source loses `degradation_per_year` of its output each year. | `degradation_per_year` |
| Cost | You pay for every part and for the launch, and some rockets also charge per kilogram. | `cost_usd`, `cost_per_kg_usd` |
| Data | Instruments make data while they are on; the radio sends data only while a ground station is in view. | `data_rate_bps`, `duty_cycle`, `contact_s_per_day` |
| Range | Beyond its reference range a radio slows down with the square of the distance. | `reference_range_m`, `comm_range_m` |
| Storage | The spacecraft holds one day of observations (or the bus's `storage_gb`); when that is full, new data is lost. | `storage_gb` |
| Science | Each instrument earns its `science_value` over the full planned mission, in step with how much of its data gets home; when the radio cannot send everything, the data worth the most science per GB goes first, so adding an instrument never lowers the total. | `science_value` |
| Best orbit | An instrument flown outside its best orbit earns half its science. | `best_orbit` |
| Lifetime | The mission ends at the planned time, or sooner if the bus wears out or the orbit decays. | `design_life_s`, `max_lifetime_s` |
| Risk (only with `random_failures` on) | A bus's `reliability` is its chance of lasting its whole design life near Earth, and radiation multiplies the failure rate. | `reliability`, `design_life_s`, `radiation_factor` |
| Schedule (off) | The slowest part sets the build time, plus a month per instrument. | `build_months` |

The constants are in `sim/design.ts`: `OFF_ORBIT_SCIENCE_FACTOR` 0.5, `CAPTURE_DELTA_V_MS` 100, `DRIFT_LIFETIME_FACTOR` 0.5, mass margin warning at 90%, survival warning below 90% (`radiation_risk`, only with `random_failures` on), `SCIENCE_TOLERANCE` 0.000001.

**Time is not a trade-off in the demo.** Of the six resources (mass, power, budget, data, comms, time), the demo exercises five. The Schedule rule is off because the catalogs have no `build_months` column and the scenario has no `deadline_months`; cruise takes no time; and the Lifetime rule cannot bind, because every bus and every orbit outlasts the one-year mission. The sim already reads all of these, so time becomes a real trade-off as soon as data/ adds `build_months` columns and a `deadline_months` key (and, for lifetime, a mission longer than the shortest bus or orbit life).

## Anomaly cards (decision 004)

Off unless the scenario sets `anomaly_cards` (how many to draw; the app sets 1 / 2 / 3 for easy / normal / hard). Rules:

- **When:** one card per equal slice of the operations phase, at least a week apart. Each card is drawn at most once, and only if it fits the mission (a Mars mission never gets the Earth-storm card).
- **Waiting:** the sim emits `decision_required` and stops the clock. `step` changes nothing until `resolve_decision` arrives with the right `decision_id` and option `a` or `b`. `pendingDecision(state)` rebuilds the card from the state, so a late joiner or a reload still sees it.
- **Answering:** the option's effects are applied and `decision_resolved` says what happened. Effects: safe-mode days (no observations), science, downlink and storage multipliers (lasting, or for some days), losing stored data, a cost, a dice roll, or the end of the mission.
- **Design matters:** a more reliable bus, a bigger battery and a higher orbit improve the odds on the gambles. The numbers are game balance; the stories are real.
- **Random stream:** cards use their own seeded stream, so the same seed and answers replay exactly and the failure rolls are untouched.
- **Cost:** money a card costs is in `metrics.card_cost_usd` and is added to the summary's `cost_usd`.
- **Reruns:** `flyMission` (what-if, success rate) takes option `a` of every card.

Card state lives in flat metrics: `card_days`, `cards_drawn`, `card_rng`, `decision_id`, `decision_card`, `decision_console`, `end_reason`, `card_cost_usd` and the `fx_*` multipliers.

## state.metrics

Budgets, refreshed every step:

| key | meaning |
|---|---|
| `mass_kg` / `mass_limit_kg` | launch mass / what the launch vehicle lifts to this orbit |
| `added_mass_kg` / `added_mass_limit_kg` | parts bolted onto the bus / the bus's limit |
| `payload_mass_kg`, `instrument_count` / `instrument_limit` | instruments only |
| `power_w` / `power_available_w` | draw with everything on / orbit-average generation at launch |
| `battery_wh` / `battery_needed_wh` | battery size / energy for one eclipse |
| `instrument_uptime` | share of the time the instruments can run, 0 to 1 |
| `cost_usd` / `budget_usd` | whole-mission cost / budget. Also `build_cost_usd`, `launch_cost_usd`, `ops_cost_usd`, `ops_cost_usd_per_day` |
| `data_generated_gb_per_day` / `downlink_gb_per_day` | data made / data the radio can send, per day |
| `data_rate_bps` | radio rate while in contact, after the range penalty. `link_factor` is that penalty (1 = none) |
| `storage_gb` | on-board storage |
| `science_per_day`, `science_expected` / `science_goal` | forecast for this design / the scenario target |
| `delta_v_ms` / `delta_v_required_ms` | bus propulsion / what the orbit needs |
| `launch_reliability`, `bus_reliability` | chance the launch works / chance the bus survives this mission |
| `mission_days`, `lifetime_days`, `cruise_days` | planned length / when the mission will really end / trip time |
| `schedule_months` / `deadline_months`, `ground_stations` | optional features (0, 0 and 1 when off) |

Progress: `phase`, `outcome`, `mission_day` (days since launch), `science_score`, `data_generated_gb`, `data_downlinked_gb`, `data_stored_gb`, `data_lost_gb`, `cost_spent_usd`.

`science_score` is the science returned so far. **In the design phase it shows the forecast** (`science_expected`) so the builder's "Science score" means something; it starts again from 0 at launch. The forecast is the flight run ahead of time with no bad luck (same days, same fading power source, same radio, via `dayOfData` in `sim/design.ts`), so the two agree.

## state.issues

Each code appears at most once. Each `message` is written for students and says how to fix the problem. Show it as is.

| code | severity | resource |
|---|---|---|
| `missing_launch_vehicle`, `missing_orbit`, `missing_bus`, `missing_solar`, `missing_comms`, `missing_instrument` | error | design |
| `unknown_<key>` (e.g. `unknown_bus`), `unknown_instrument`, `wrong_type_solar`, `wrong_type_battery` | error | design |
| `orbit_unreachable`, `mass_over_limit`, `added_mass_over_bus` | error | mass |
| `too_many_instruments`, `bus_too_small`, `delta_v_short` | error | design |
| `power_negative` | error | power |
| `over_budget` | error | budget |
| `behind_schedule` (optional feature) | error | time |
| `mass_margin_low` | warning | mass |
| `off_best_orbit`, `radiation_risk`, `science_short` | warning | design |
| `power_short`, `power_fades`, `battery_small` | warning | power |
| `link_weak`, `downlink_short` | warning | comms |
| `bus_life_short`, `orbit_life_short` | warning | time |

## Events

`scenario_started` (first step), `threshold_crossed` (in design: `mass_kg`, `added_mass_kg`, `power_w`, `cost_usd` or `schedule_months` goes over or back under its limit; in flight: `data_stored_gb` when storage fills, `science_score` when the goal is reached), `phase_changed`, `entity_added` (the body and the `spacecraft` at launch), `warning` (refused launch, locked design, random events, the bus or orbit giving out early), `scenario_ended` (`reason` is the outcome: `success`, `science_shortfall`, `launch_failure` or `spacecraft_failure`).

## Mission view

`state.frame` is `body-centered`: metres, the body (`kind: "body"`, `props.radius_m`) at the origin, the spacecraft (`id: "spacecraft"`, `props.body`, `props.orbit`, `props.altitude_m`) on a circle in the x-y plane. At launch both are put first in `state.entities`, replacing any entity the scenario listed with the same id (their names are kept). During cruise the spacecraft spirals out from the surface, which is for looks only.

## summary(state)

`outcome`, `score` (0 to 1,000: 700 science, 100 budget left, 100 launch margin, 100 data delivered; a failed mission scores at most 690; grade A at 850), `grade` (A to F; a failed mission gets at most a C), `science_score`, `science_goal`, `cost_usd`, `budget_usd`, `mass_kg`, `mass_limit_kg`, `data_generated_gb`, `data_downlinked_gb`, `data_lost_gb`, `mission_days_flown`, and `why`: sentences explaining the result. After a flown mission the design warnings follow, one sentence each, every one introduced by "Before launch the design check said:"; a launch failure lists none, and a lost spacecraft only `radiation_risk`.

## The demo scenario in the sim

`sim/demo.test.ts` flies data's demo with `random_failures: false`:

- **Starting design:** no launch blockers, flies 365 days, returns 1.7 of 30 points (`science_shortfall`, grade F). The camera makes 2.16 GB a day and the S-band radio sends 0.375 GB.
- **Reference design** (12U, camera + IR spectrometer, large wings, X-band): no issues at all, returns 40 points against a target of 30 (`success`, score 94, grade A).

Random failures are off unless the scenario sets `random_failures: true`, so the demo as shipped is decided by the design alone. Only the Hard difficulty turns them on. A scenario that does must test its seed: `tests/playthrough.test.ts` flies each reference design on Hard with the scenario's own seed.
