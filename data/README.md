# data/

Parts catalogs and scenarios for the Space Mission Design Game, in the shapes from `.agents/CONTRACTS.md`. Owner: claude@jamie.

Everything is static JSON bundled at build time (decision 002). Import from `data/index.ts`; don't read the JSON files directly.

```ts
import { getScenario, getDatasets, getPart, rowsAsObjects, parseIdList, CATALOG_IDS } from '../data'

const config = getScenario('demo')!
const state = sim.init(config, getDatasets(config.datasets))
const falcon = getPart(CATALOG_IDS.launchVehicles, 'falcon-9') // { id, name, payload_leo_kg, ... }
```

> **The numbers are hand-tuned for gameplay.** They're loosely based on real hardware (NASA CubeSat 101, public launcher figures, NASA mission-design references) so the trade-offs feel right, but they aren't authoritative. Each Dataset's `source` says so.

## Files

| File | Dataset id | One row per |
|------|-----------|-------------|
| `catalogs/launch-vehicles.json` | `launch-vehicles` | rocket |
| `catalogs/orbits.json` | `orbits` | destination orbit |
| `catalogs/spacecraft-buses.json` | `spacecraft-buses` | spacecraft size class (structure, computer, attitude control, propulsion) |
| `catalogs/instruments.json` | `instruments` | science instrument |
| `catalogs/power-systems.json` | `power-systems` | solar array, battery or RTG |
| `catalogs/comms-systems.json` | `comms-systems` | radio + antenna |
| `scenarios/demo.json`, `moon.json`, `mars.json` | (each a `Config`) | a playable mission |

All are `kind: "table"` with `id` as the first column. Each row also has a `name` and a one-sentence, student-friendly `description` for the UI.

**Units** are short display units, because the builder renders them directly: `kg`, `W`, `Wh`, `m`, `m/s`, `s`, `s/day`, `rad`, `pts`, `USD` (shown as `$8M`) and `bps` (shown as `2 Mbps`). Every numeric column has an entry; `""` means a unitless ratio or count (`reliability`, `duty_cycle`, `eclipse_fraction`, `coverage_fraction`, `radiation_factor` relative to LEO = 1, `degradation_per_year`, `max_instruments`). String columns (`best_orbit`, `min_bus_class`, `launch_capacity_column`, …) have no unit. Instrument `power_w` / `data_rate_bps` are while operating; comms `data_rate_bps` is at or below `reference_range_m`.

## Design params (`Config.params` / `set_param` keys)

| Param key | Value | Catalog |
|-----------|-------|---------|
| `launch_vehicle` | part id | `launch-vehicles` |
| `orbit` | part id | `orbits` |
| `bus` | part id | `spacecraft-buses` |
| `instruments` | **comma-separated** part ids, e.g. `"camera-basic,magnetometer"`; use `parseIdList()` | `instruments` |
| `solar` | part id (`type` solar or rtg) | `power-systems` |
| `battery` | part id (`type` battery) | `power-systems` |
| `comms` | part id | `comms-systems` |

`PARAM_CATALOG` in `index.ts` has this mapping in code. Scenario-only params (not player-editable): `objective`, `objective_text`, `budget_usd`, `target_science_score`, `mission_duration_s`.

## Suggested budget math

These are suggestions for the sim, matching what `data.test.ts` uses to prove the demo is balanced. **sim/ owns the real rules**, so change them there freely.

- **Mass:** `dry_mass_kg + Σ part mass_kg`. Added mass ≤ bus `max_added_mass_kg`; instrument count ≤ `max_instruments`.
- **Launch:** total mass ≤ launcher's capacity column for the orbit (`orbit.launch_capacity_column`, e.g. `payload_sso_kg`). `0` = can't reach that orbit.
- **Bus size:** a part's `min_bus_class` must be ≤ the bus `class`, ordered by `BUS_CLASSES` (`cubesat < smallsat < medium < flagship`).
- **Propulsion:** bus `propulsion_delta_v_ms` ≥ orbit `delta_v_required_ms`.
- **Power:** load = bus `base_power_w` + Σ instrument `power_w` + radio `power_w`. Solar average = `power_w × (1 − eclipse_fraction)` (an RTG gives `power_w` always). It should be ≥ load.
- **Battery:** `capacity_wh ≥ load × eclipse_fraction × period_s / 3600`.
- **Cost:** launcher `cost_usd + cost_per_kg_usd × mass` + Σ part `cost_usd`. Compare with `budget_usd`.
- **Data:** generated per day = Σ `data_rate_bps × duty_cycle × 86400`. Downlinked per day = radio `data_rate_bps × min(1, (reference_range_m / orbit.comm_range_m)²) × contact_s_per_day`. Data that can't be sent home is lost science.
- **Science:** Σ instrument `science_value`, scaled by the fraction of data returned, reduced outside `best_orbit` (`"any"` = no penalty).
- **Lifetime:** mission ends at the earliest of `mission_duration_s`, bus `design_life_s` and orbit `max_lifetime_s`. Solar output drops by `degradation_per_year`. `reliability` and orbit `radiation_factor` are there for random failure events.

## Scenarios

Each one is proven winnable in the real sim by `tests/playthrough.test.ts` (PR #12). That file holds one reference win per scenario. One step = one day.

| id | Title | Goal | Starting design teaches | A tested win |
|---|---|---|---|---|
| `demo` | *First Light* | 30 pts, 1 year, $8M, Earth orbit (SSO) | Flies, but earns 10 pts: the S-band radio can't send home what the camera makes | 12U + camera + IR spectrometer + large wings + X-band, about $7.3M |
| `moon` | *Moon Mapper* | 75 pts, 2 years, $300M, low lunar orbit | Refused at launch: a smallsat can't brake into lunar orbit (`delta_v_short`) | medium bus + laser altimeter + radiation detector + IR spectrometer + high-gain dish, about $238M |
| `mars` | *Red Planet Radar* | 65 pts, 3 years incl. a 210-day cruise, $500M, low Mars orbit | Flies, but earns ~0: the deep-space transponder is far too slow at Mars range | add IR spectrometer, swap to the Mars high-gain dish, about $272M |

**Difficulty:** `getScenario(id, 'easy' | 'normal' | 'hard')`, or `withDifficulty(config, level)`. Normal is the file as written. The other levels change only params the sim reads:

| Level | Budget | Science goal | Random failures | Random events |
|---|---|---|---|---|
| easy | ×1.5 | ×0.8 | off | off |
| normal | as written | as written | on | off |
| hard | ×0.95 | as written | on | 3% chance per day |

Easy and hard get their own `scenario_id` (`moon-hard`), a title suffix (`… (Hard)`) and `params.difficulty`. Every reference win in the table above still wins at all three levels (tested). There's no deadline knob yet, because the sim's schedule rule needs `build_months` columns. `objective_text` never states numbers; show `budget_usd` / `target_science_score` from params.

**Ids:** a scenario entity's id must never equal a part id (`data.test.ts` checks it). The sim turns every part into an entity, so a clash replaces the part. That's why the Mars orbit is `low-mars-orbit`, not `mars`.

**Columns added for Moon/Mars**, appended last so rows built by position elsewhere stay valid:
- `launch-vehicles.payload_tmi_kg`: mass to a Mars transfer.
- `orbits.cruise_days`: trip time, which the sim spends before operations start.

## Adding to the catalogs

1. Add a row, keeping the column order. Ids are lowercase kebab-case and never renamed (CONTRACTS rule 6).
2. A new column needs a `units` entry if it's numeric. Tell claude@jamie or leave a handoff, since sim/ui may read it.
3. Run `npm test`. `data.test.ts` checks shapes, cross-references and that the demo is still winnable.
