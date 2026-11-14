# GO / NO-GO: game design

**Status:** proposed (decision 004), by claude@sarah for Sarah, 2026-11-14. Working title: the team can rename it.
**Read with:** [`docs/CHALLENGE_OFFICIAL.md`](../CHALLENGE_OFFICIAL.md) (what the judges asked for), [`docs/GAME_PLAN.md`](../GAME_PLAN.md) (screens, folders, owners), [`BRAINSTORM.md`](BRAINSTORM.md) (why this design), [`ANOMALY_CARDS.md`](ANOMALY_CARDS.md) (the card content).

This is the **basis every screen builds toward**. It doesn't replace GAME_PLAN.md or any built screen. It adds the layer that makes them a game. If you're about to build something that fights this doc, write a handoff to claude@sarah first.

---

## 1. The pitch (say this to a judge)

> **You're the Flight Director.** NASA-style mission calls come in: map crops from orbit, relay signals from the Moon, watch weather on Mars. Design the spacecraft, then win a **GO from every flight controller**, each of whom checks a real constraint. Launch, and **keep it alive** when things break, with choices real missions faced: Kepler's broken reaction wheels, Galileo's stuck antenna, the storm that took down 38 satellites. The debrief shows **exactly what would have saved your mission** and **which real NASA mission yours resembles**.

One mission takes **5–8 minutes**. Failing takes 2 seconds to recover from.

## 2. Design pillars (use these to settle arguments)

1. **Every decision has a consequence you can see.** No choice is cosmetic. If a choice doesn't move a bar, a GO/NO-GO, or the outcome, cut it.
2. **Never just watching for more than ~20 seconds.** Something to decide, or something tense to watch (launch roll, storage filling), at all times.
3. **Failure teaches, then gets out of the way.** Every loss explains *why* in one sentence, shows the fix, and offers "Fix it and fly again" in one click.
4. **True stories, honest numbers.** Every anomaly is based on a real event. Every number is sourced or labelled as an approximation (§7).
5. **Co-op is a conversation.** The rules force the four roles to talk (GO/NO-GO, role priorities), not just share a form.

## 3. The loop

```
 ┌─ MISSION CALL ──► DESIGN ──► GO / NO-GO POLL ──► LAUNCH ──► OPERATIONS ──► DEBRIEF ─┐
 │  (briefing)       (builder)  4 consoles vote     (roll!)    anomaly cards   stars,     │
 │  objective,       live bars, all GO = unlock     3D view    pause + choose  what-if,   │
 │  requirements,    risk meter launch button                  real stories    real match │
 │  bonus goal                                                                            │
 └──────────── "Fix it and fly again" (design kept) ◄──── or ──── next mission call ◄────┘
```

| Step | Screen / folder | What's new in this design |
|---|---|---|
| Mission call | `ui/briefing/` (claude@aiden) | Shows the **bonus star goal** and which consoles matter most for this mission |
| Design | `ui/builder/` (claude@aiden) | **Risk meter** ("succeeds ~78% of the time"). Consoles' live GO/NO-GO lights |
| GO / NO-GO poll | `ui/gonogo/` (**new**) | The poll itself, solo and co-op (§4.1) |
| Launch | `ui/scene3d/` + `ui/mission/` | Countdown, reliability shown, the roll |
| Operations | `ui/mission/` (claude@sarah) | **Anomaly cards** (§4.2). The mission pauses until you choose |
| Debrief | `ui/mission/` results (claude@sarah) | **Stars**, **what would have fixed it**, **real mission match**, share card |
| Program / daily | `ui/start/` (codex@jamie's start-screen) | **Mission program map** with stars, **Daily mission** button |

## 4. Features

Each feature lists: what the player sees, why it's fun, what it teaches, how it stays accurate, and how to build it.

### 4.1 GO / NO-GO poll (P0 solo, P1 co-op)

**Player sees:** before launch, four flight-controller consoles in a row, named after the co-op roles (`shared/net.ts` `ROLES`):

| Console | Role | Checks (from `state.issues`) |
|---|---|---|
| **PLAN** | `mission-planning` | launcher can reach the orbit, launch mass vs capacity, schedule vs deadline |
| **SPACECRAFT** | `spacecraft` | payload vs bus limit, power balance, battery through eclipse |
| **SCIENCE** | `science` | instruments chosen, instruments match the objective, science per day can reach the goal |
| **COMMS** | `comms-resources` | downlink vs data generated, budget |

Each console shows **GO** (green), **GO, with concerns** (amber: only `warning` issues), or **NO-GO** (red: any `error` issue), with its issue `message`s as the controller's spoken reason: *"COMMS is NO-GO. We'd make 12 GB a day but only get 5 GB home. Add a ground station or a faster radio."* The **Launch** button unlocks only when all four say GO or GO-with-concerns. The poll runs top to bottom with a short pause between calls. That's the drama.

**Why fun:** it turns a list of errors into characters with opinions, and makes fixing a design feel like winning people over. It's the real ritual: NASA polls every console before launch.
**Teaches:** which subsystem owns which constraint, which is the brief's "how decisions affect other parts of the mission".
**Accurate:** reasons are the sim's own issue messages. The poll invents nothing.
**Co-op (P1):** each player presses GO on their own console. Launch needs every *claimed* console to say GO, and unclaimed consoles are voted by the NPC rule above. A player can press GO over an amber warning (it's a judgement call), but never over a red NO-GO.

**Build:** pure view in a new `ui/gonogo/`. Map issue → console by `code`, falling back to `resource`. Codes are from `sim/README.md` on `ethan-claude/sim-data`. Keep this table in sync if they change.

| Issue codes | Console |
|---|---|
| `missing_launch_vehicle`, `missing_orbit`, `unknown_launch_vehicle`, `unknown_orbit`, `orbit_unreachable`, `mass_over_limit`, `mass_margin_low`, `delta_v_short`, `no_station_keeping`, `orbit_life_short`, `behind_schedule` | PLAN |
| `missing_bus`, `missing_solar`, `unknown_bus`, `unknown_solar`, `unknown_battery`, `wrong_type_solar`, `wrong_type_battery`, `added_mass_over_bus`, `bus_too_small`, `power_negative`, `power_short`, `power_fades`, `battery_small`, `bus_life_short`, `radiation_risk` | SPACECRAFT |
| `missing_instrument`, `unknown_instrument`, `too_many_instruments`, `off_best_orbit`, `science_short` | SCIENCE |
| `missing_comms`, `unknown_comms`, `link_weak`, `downlink_short`, `over_budget` | COMMS |
| anything else, by `resource`: `mass`, `time`, `design` → PLAN · `power` → SPACECRAFT · `data` → SCIENCE · `comms`, `budget` → COMMS | |

Heads-up for claude@ethan: `ROLE_PARAM_KEYS` in `shared/net.ts` still lists `power_system` / `comms_system`, but the sim now uses `solar`, `battery` and `comms`. SPACECRAFT should own `bus`, `solar` and `battery`, and COMMS should own `comms` (plus `ground_stations` if it comes back).

Co-op votes are app state, not sim state: an app/net-level command `go_vote { go: boolean }`, like `select_entity` (owner: the sender's role). It's a contract row for claude@ethan.

### 4.2 Anomaly cards (P0)

**Player sees:** during operations, the mission **pauses** and a card slides over the 3D view:

> ⚠ **REACTION WHEEL FAILURE**, day 143
> One of the wheels that points your spacecraft has stopped. You can't hold the camera steady on targets.
> **A.** Switch to a coarse-pointing mode. *Science −40% for the rest of the mission. No risk.*
> **B.** Try to restart the wheel. *60%: fixed. 40%: it seizes, and you lose 5 days in safe mode.*
> *This really happened. Kepler lost its second wheel in 2013. Engineers used sunlight pressure to balance it and flew a whole new mission, K2.*

Every card has **no single right answer**: a sure, smaller loss vs. a gamble. Its odds and costs depend on your design (bigger battery, more ground stations or a more reliable bus make some options better). The full deck is in [`ANOMALY_CARDS.md`](ANOMALY_CARDS.md).

**Why fun:** stakes and agency right when the current game goes passive, and a story you'll retell.
**Teaches:** margins matter. The battery you skimped on is why the dust-storm card hurts. Plus real mission history.
**Accurate:** each card cites the real event (mission, year, what happened, NASA source). Effects use only quantities the sim already models.

**Draws:** seeded by the sim RNG, so they're replayable. Draw count by difficulty: easy 1, normal 2, hard 3, never two in the same week of mission time. Cards have conditions (body, orbit class, part properties), so a Mars mission never draws the Earth-storm card.

**Build (contract, additive; see decision 004):**
- New SimEvent `decision_required`, payload
  `{ decision_id, card_id, title, body, console: Role, options: [{ id, label, effect_text }], story: { mission, year, text, source_url } }`
- New Command `resolve_decision`, payload `{ decision_id, option_id }`. The owning role is the card's `console`. If that console is unclaimed, anyone can answer.
- While a decision is pending, `step` doesn't advance time (like the design phase) and re-emits nothing. Determinism holds: same seed + same choices = same mission.
- Effects vocabulary the sim implements (small on purpose): `lose_days(n)`, `science_rate_mult(x)`, `downlink_mult(x)`, `storage_mult(x)`, `lose_stored_data()`, `cost_usd(n)`, `chance(p, effects_if_true, effects_if_false)`, `end_mission(reason)`. Effects last for the rest of the mission unless the card says otherwise.
- Owners: sim rules and card encoding, **claude@ethan** (`sim/`). Card content and stories, **claude@sarah** (`ANOMALY_CARDS.md`; claude@jamie checks numbers if it moves into `data/`). Card UI, **claude@sarah** (`ui/mission/`).

### 4.3 Debrief: what would have fixed it (P0) + risk meter (P1)

**Player sees, on a loss:** *"**Change one thing:** with **3 ground stations instead of 1**, this exact mission scores **88 (B+)** instead of 52."* It shows up to 3 single-change fixes, best first, each with a **"Try it"** button that loads the design with that change into the builder.
**On a win:** *"**Even better:** swapping to the **X-band radio** would have scored 94."*
**Risk meter (in the builder and the poll):** *"Flown 50 times, this design succeeds **78%** of the time."* It shows the number, not a verdict.

**Why fun:** losing becomes a puzzle with the next move handed to you. That's the "one more try" loop.
**Teaches:** sensitivity: which constraint actually bound your mission. Risk as probability, which is how real mission assurance works.
**Accurate:** it's the real sim, rerun. The what-if uses the same seed and the same anomaly choices, so it's a fair comparison.

**Build:** a pure helper next to the sim, e.g. `sim/analysis.ts` (claude@ethan): `whatIf(config, datasets, params, choices) → [{ change, summary }]` (tries every single-slot swap in the catalog, plus ±1 ground station, keeps the top 3 by score delta) and `successRate(config, datasets, params, n=50)`. It runs in a few ms per mission, so 50–100 reruns are fine in the browser. The UI receives results via the app (`app/` passes them as props). UI screens still don't import `sim/`.

### 4.4 Real mission match (P1)

**Player sees on the debrief:** *"Your mission is most like **Lunar Prospector** (NASA, 1998): a small, spin-stabilised orbiter that mapped the Moon's surface composition from a low polar orbit."* It shows one fun fact and a link, and on a mismatch, a contrast: *"Real Mars orbiters carry far bigger antennas than yours. Here's why."*

**Why fun / teaches:** it ties the toy to the real thing, the Webb game's best idea (it's in the official resource list).
**Accurate:** a small hand-written table, `data/real-missions.json` (claude@jamie), with `name, agency, year, body, orbit_class, mass_kg, objective, fact, source_url` for ~10–15 missions. **Every number needs a source URL.** No URL, no number. Matching is a nearest neighbour on body → orbit class → objective → mass, done in a pure UI helper.
Candidates to research: Landsat 9, Terra, GPM Core Observatory, a NASA CubeSat (e.g. one from the CubeSat Launch Initiative), MarCO, Lunar Prospector, LRO, MAVEN, Mars Reconnaissance Orbiter.

### 4.5 Stars and the mission program (P1)

Each mission awards up to **3 stars**:
1. ★ **Mission success** (the sim's `outcome === 'success'`).
2. ★ **Bonus goal**, one per scenario, shown in the mission call: e.g. *"Lose no data"*, *"Finish with 20% budget left"*, *"Keep a 10% mass margin"*.
3. ★ **Excellent**: sim `score ≥ 85`.

The **mission program** is a short map of 4–5 calls with rising difficulty, modelled on how NASA groups missions by size and cost (CubeSat → small explorer → planetary orbiter). Stars unlock the next call and, from mission 3, the **advanced parts** tier: better radios, bigger arrays and higher-reliability buses, with higher cost. That covers the brief's "simple vs advanced components". Stars live in `localStorage`, next to codex@aiden's leaderboard.

| # | Call (draft, claude@jamie owns scenarios) | Body | Teaches mainly |
|---|---|---|---|
| 1 | First Light: Earth-imaging CubeSat (exists: `demo`) | Earth | mass vs launcher, downlink |
| 2 | Storm Watch: weather smallsat, two instruments | Earth | power + data trade |
| 3 | Lunar mapper | Moon | eclipse + battery, comms distance |
| 4 | Mars orbiter (exists: `mars`) | Mars | long cruise, budget + reliability |
| 5 | Sandbox: no limits, every part | any | free experimenting (brief's sandbox mode) |

### 4.6 Daily mission + share card (P0)

A **Daily mission** button on the start screen: today's date picks the scenario and the seed (`seed = YYYYMMDD`), so everyone gets the same launch rolls and anomaly cards. The debrief offers a **share card** to copy:

```
GO / NO-GO · Daily 2026-11-14 · First Light
★★☆  84 pts (B)   🟢🟢🟢🟡 GO   ⚠ 2 anomalies survived
```

**Why fun:** friendly competition (the brief's "competitive scenarios" without sabotage), and a reason to return tomorrow.
**Accurate / cheap:** it's just a seed. Build: `ui/start/` (seed choice) + `ui/mission/` (share text) + app passes the seed into `Config`.

### 4.7 Role priorities in co-op (P1)

Each console gets a **priority**, shown on its screen and the poll:
**PLAN:** launch on schedule with ≥10% mass margin · **SPACECRAFT:** no power or battery warnings · **SCIENCE:** beat the science goal by 25% · **COMMS:** lose zero data and stay in budget.
They pull against each other on purpose (more instruments vs. no data lost vs. budget). The debrief shows a **team card**: each priority met or missed, and a team bonus star when 3 of 4 are met. This is "negotiate competing priorities" plus "the final result depends on how the team coordinates", both word for word from the brief. Solo players see the same priorities as advice.

### 4.8 CAPCOM: one friendly voice (P2)

The tips, glossary links (cursor@kaipo's `ui/learn/`) and the poll's spoken reasons come from one character: **CAPCOM**, the single voice that talks to the crew in real mission control. One short line, never a paragraph: *"Eclipse means no sunlight, so your battery runs everything. Yours lasts 20 minutes and the eclipse lasts 35."*

## 5. Scoring, in one place

- **Score 0–100 and grade A–F:** unchanged, from the sim's `summary()` (70 science, 10 budget left, 10 mass margin, 10 data delivered).
- **Stars 0–3:** on top of the score (§4.5). Stars drive progression. The score drives leaderboards.
- **Team bonus star:** co-op only (§4.7).
- Nothing in the UI recomputes the score. Stars are derived from `summary` + the scenario's bonus goal, in one pure helper (`ui/mission/stars.ts`).

## 6. Pacing targets (for a 2-minute demo and a 5–8 minute real game)

| Step | Real play | Demo |
|---|---|---|
| Mission call | 20 s | 10 s |
| Design | 2–3 min | 30 s (load a near-miss design) |
| GO / NO-GO | 15 s | 15 s (show one NO-GO, fix it, all GO) |
| Launch | 5 s | 5 s |
| Operations | 1–2 min with 1–3 cards | 30 s at high speed, one card |
| Debrief | 30 s | 30 s (what-if + real mission match) |

**Demo script hook:** load First Light with one ground station → COMMS is NO-GO → add stations → all GO → launch → *"Antenna won't deploy"* card (the Galileo story) → debrief: what would have fixed it + "your mission is like…" + share card.

## 7. Accuracy rules (non-negotiable)

1. **Real stories are real.** Every anomaly card names the mission and year, says what actually happened in one or two sentences, and links a NASA (or other space agency) page. If we can't source it, the card says *"Inspired by common spacecraft failures"* and names no mission.
2. **Numbers are sourced or labelled.** Catalog and real-mission numbers carry a `source_url`, or are marked *educational approximation* in `docs/NASA_SOURCES.md`. Never invent a precise-looking number for a real mission.
3. **Physics stays honest where it's cheap:** orbit periods from real gravitational parameters (`sim/orbit.ts`), SI units everywhere, eclipse and ground contact per orbit. Simplifications are fine but get said out loud (e.g. "altitude not to scale").
4. **Game effects are plausible, not historical replays.** A card's odds are game balance, so the card says "based on", never "this is what would happen".
5. **No fake NASA branding.** We reference NASA missions and resources, and we don't use NASA logos or present the game as a NASA product.

## 8. Build map: who does what

| Feature | Priority | Folder → owner | Contract change | Depends on |
|---|---|---|---|---|
| GO/NO-GO poll (solo) | **P0** | `ui/gonogo/` (new) → open task | none | builder, `state.issues` |
| Anomaly cards: sim | **P0** | `sim/` → claude@ethan | `decision_required` event, `resolve_decision` command | sim-data branch |
| Anomaly cards: content | **P0** | `docs/game-design/ANOMALY_CARDS.md` → claude@sarah | none | — |
| Anomaly cards: UI | **P0** | `ui/mission/` → claude@sarah | none | sim cards |
| What would have fixed it | **P0** | `sim/analysis.ts` → claude@ethan; debrief UI → claude@sarah | none (pure helper) | sim |
| Daily mission + share card | **P0** | `ui/start/` → codex@jamie; share text `ui/mission/` → claude@sarah; seed in `app/` → claude@ethan | none | start screen, app loop |
| Risk meter | P1 | `sim/analysis.ts` → claude@ethan; builder → claude@aiden | none | what-if helper |
| Stars + bonus goals | P1 | `ui/mission/stars.ts` → claude@sarah; bonus goal per scenario in `data/scenarios/` → claude@jamie | additive scenario param `bonus_goal` | — |
| Mission program map + unlocks | P1 | `ui/start/` → codex@jamie; scenarios + advanced parts → claude@jamie | additive part prop `tier` | stars |
| Real mission match | P1 | `data/real-missions.json` → claude@jamie; debrief UI → claude@sarah | none | — |
| Co-op GO votes | P1 | `ui/gonogo/` + `app/` + `net/` | `go_vote` app command | net, lobby |
| Role priorities + team card | P1 | `ui/mission/` + `ui/gonogo/` | none | stars |
| CAPCOM voice | P2 | `ui/learn/` → cursor@kaipo | none | glossary |

**Rule for everyone:** if your screen already exists, keep it. Add the new piece where the table says. The sim stays the only rulebook, and UI screens stay pure views.
