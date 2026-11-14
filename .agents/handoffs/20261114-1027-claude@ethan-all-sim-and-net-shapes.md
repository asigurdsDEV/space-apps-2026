---
from: claude@ethan
to: all
status: open
created: 2026-11-14 10:27
---

## What I need / what I'm handing off

The **sim core is done** (PR #7) and the **multiplayer shapes are in the contract** (PR #2) and in `shared/` (PR #5). This answers the handoffs from claude@aiden (multiplayer contracts) and codex@jamie (transport interface), and claude@jamie's request for the catalog columns. Everything below is on branches, not on `main` yet. To build against it now:

```
git fetch && git merge origin/ethan-claude/sim-core     # brings scaffold + shared/ + sim/
```

Full reference: `sim/README.md` on that branch, and `.agents/CONTRACTS.md` on `ethan-claude/contracts`.

### claude@jamie (data/): the catalog columns the sim reads

Six `table` Datasets with exactly these ids. Every row needs an `id` (kebab-case, unique across all six tables) and a `name`. Extra columns are fine.

| Dataset id | Columns |
|---|---|
| `launch-vehicles` | `cost_usd`, `reliability` (0 to 1), one `capacity_<class>_kg` per orbit class it can reach |
| `orbits` | `body` (`earth`/`moon`/`mars`), `class` (matches `capacity_<class>_kg`), `altitude_km`, `eclipse_fraction` (0 to 1), `contact_min_per_day` (per ground station), `science_multiplier`, `cruise_days` |
| `buses` | `mass_kg`, `cost_usd`, `max_payload_kg`, `power_draw_w`, `storage_gb`, `reliability`, `build_months` |
| `power-systems` | `mass_kg`, `cost_usd`, `power_w`, `battery_wh`, `build_months` |
| `comms-systems` | `mass_kg`, `cost_usd`, `power_draw_w`, `data_rate_mbps`, `build_months` |
| `instruments` | `mass_kg`, `cost_usd`, `power_draw_w`, `data_gb_per_day`, `science_per_day`, `objective` (tag), `build_months` |

Scenario `Config.params`: `objective`, `budget_usd`, `science_goal`, `deadline_months`, `ops_cost_usd_per_day`, `ground_station_cost_usd_per_day`, `event_rate_per_day`. The scenario should start with no parts picked. `sim/testing/fixtures.ts` is a working example of all six tables and a scenario (placeholder numbers). Balance tip: make the obvious design fail on one resource so players have to trade (in my demo, one ground station only gets 47% of the data home).

### claude@aiden (ui/builder/) and claude@sarah (ui/mission/)

- **Parts to choose from:** `state.entities` filtered by `kind` (`launch_vehicle`, `orbit`, `bus`, `power_system`, `comms_system`, `instrument`). Each has `name` and `props` with the columns above. Don't import `data/`.
- **Current choices:** `state.params` (`launch_vehicle`, `orbit`, `bus`, `power_system`, `comms_system`, `instruments` as a comma-separated string, `ground_stations`).
- **Changing a choice:** send `{ type: 'set_param', payload: { key, value } }`. Budgets update on the next state.
- **Budget bars:** `state.metrics` pairs: `mass_kg`/`mass_limit_kg`, `payload_mass_kg`/`payload_limit_kg`, `power_w`/`power_available_w`, `cost_usd`/`budget_usd`, `data_generated_gb_per_day`/`downlink_gb_per_day`, `schedule_months`/`deadline_months`, `science_per_day` and `science_goal`.
- **Problems:** `state.issues` (`severity`, `resource`, `message`). Show the `message` as is; it's written for students. `error` blocks launch.
- **Launch button:** send `{ type: 'launch', payload: {} }`. Enabled when no issue has severity `error`.
- **Mission view:** `metrics.phase` (`design`, `cruise`, `operations`, `ended`), `metrics.mission_day`/`mission_days`, `science_score`, `data_stored_gb`/`storage_gb`, `data_lost_gb`, `cost_spent_usd`. The body (`kind: 'body'`, `props.radius_m`) is at the origin and the spacecraft is entity `spacecraft` with `position` in metres (x-y plane).
- **Results screen:** the `scenario_ended` event's `payload.summary`: `outcome`, `score`, `grade`, `why` (sentences explaining the result) and the totals.
- **How you get state and send commands:** I'm building that next in `app/` (a store with `useGame()`, giving `state`, `events`, `send(command)`, `players`, `me`). Until it lands, call `init`/`step` from `sim/` directly in a component with the fixtures.

### codex@jamie (net/)

- `shared/net.ts` has `PlayerId`, `Role`/`ROLES`, `Player`, `MAX_PLAYERS`, the `NetMessage` union, `ROLE_PARAM_KEYS`, `ownerRole()` and `canSend(role, command, claimedRoles)`.
- **Messages:** guest → host `join`, `claim_role`, `command`, `leave`; host → all `roster`, `state`, `rejected`, `ended`.
- **No `player_id`/`role` on Commands.** The host takes the sender from the transport's `from` and looks up the role in its roster. A guest's payload is never trusted for identity. `rejected` carries the `player_id` it is for, since the host can only broadcast.
- **Permissions:** each command has one owning role; a player may send it if they hold that role or nobody holds it (so 1 to 3 players can finish a mission).
- **What `app/` needs from `net/`:**
  ```ts
  createLocalRoom(name): Room                 // same screen / solo, no network
  hostRoom(name): Promise<Room>               // opens PeerJS, room.code is the room code
  joinRoom(code, name): Promise<Room>
  interface Room {
    code: string | null
    self: Player                              // who I am, including is_host
    transport: Transport                      // send / onMessage / close, from decision 002
    close(): void
  }
  ```
  Please keep the **roster inside net/**: on the host, handle `join`, `claim_role` and `leave` (4-player cap, one player per role) and broadcast `roster`. `app/` handles `command` (checks `canSend`, runs `step`) and broadcasts `state`. If you'd rather split it differently, say so in a handoff and I'll follow your shape.

### Everyone

- Two additions to the contract since v0.1, both in PR #2: the `launch` command and `phase_changed` event, and `SimState.issues`, `params`, `rng_state`.
- PR #2 now includes PR #3's commits (I merged the stack branch in and updated the Stack line for online co-op, as claude@aiden asked). **Merge #3 first, then #2.** If you squash-merge, I'll fix any conflict on #2.

## Context (files, branches, commits)

- PR #7 `ethan-claude/sim-core` (contains #4 scaffold and #5 shared types), PR #5 `ethan-claude/shared-types`, PR #2 `ethan-claude/contracts`.
- Checked on `ethan-claude/sim-core`: `tsc --noEmit`, `npm test` (19 tests) and `npm run build` pass.

## What "done" looks like

data/, ui/ and net/ are built against these shapes, and anyone who needs a change has sent claude@ethan a handoff. Any agent can set this to `done` once PRs #2, #5 and #7 are merged.
