# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 13:11


## claude@jamie

**Branch:** jamie-claude/pilot-training (PR #73 merged); jamie-claude/card-counts (PR #67 open); jamie-claude/gonogo-sound (PR #61 open); jamie-claude/real-missions (PR #50 open); jamie-claude/bonus-goal (PR #41 open); jamie-claude/hard-mode (PR #36 open); jamie-claude/gonogo (PR #33 open); PRs #6, #8, #12 merged

### Working on right now
Nothing claimed.

### Files / folders I'm touching (hands off)
- `data/index.ts`, `data/README.md`, `tests/playthrough.test.ts` until PR #67 merges
- `ui/gonogo/` until PR #61 merges
- `data/real-missions.json` + `realMissions` in `data/index.ts` until PR #50 merges
- `ui/gonogo/` until PR #33 merges
- `data/`, `tests/playthrough.test.ts` until PR #36 merges; PR #41 also edits `data/scenarios/`, `data/index.ts`, `data/README.md`
- `data/data.test.ts` (to drop its duplicate balance math once the playthrough test covers it)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
- **[P1] V4 Training route (PR #73, merged by Ethan):** `data/pilot-training/` with 3 targets (hurricane, wildfire, TDRS relay), feedback texts, a sourced NASA fact each, `interact()` + `routeComplete()`. Any design can finish (missing instrument → `partial` with a hint). tsc clean, 364/364. Handoffs: V2 HUD (claude@sarah), V7 scene (claude@ethan).
- **[P1] Anomaly card counts (PR #67):** `DIFFICULTIES.*.anomaly_cards` 1/2/3 (data only). New test: each reference win wins with its level's cards answering `a`. Found Moon unwinnable on Normal (reaction-wheel card); Moon reference now adds camera + magnetometer. tsc clean, 369/369. Handoff: app reads the count (claude@ethan).
- **[P2] GO / NO-GO sounds (PR #61):** `soundFor()` + `playSound` in the poll: one sound per console call, one for Skip / reduced motion. tsc clean, 332/332; browser preview played NO-GO, GO, GO, NO-GO in order. Answers claude@aiden's sound handoff.
- PR #50: merged main in (kept PROGRAM + realMissions), mergeable again.
- **[P1] Real missions table (PR #50):** 12 missions (IceCube, Terra, GOES-16, Lunar Prospector, LRO, LADEE, GRAIL, CAPSTONE, MAVEN, MRO, Odyssey, MarCO), launch mass + year each from a cited NASA/NOAA page; tests require an https source on every row. tsc clean, 308/308. Match helper → claude@sarah (handoff).
- **[P1] Bonus star goal + program order (PR #41):** `params.bonus_goal` per scenario (demo/mars `no_data_lost`, moon `budget_left_20`, codes from ui/mission `BONUS_GOALS`), `PROGRAM` export. Each reference win earns its bonus on Normal (tested). tsc clean, 222/222. Handoffs: app passes bonusGoal (claude@ethan), briefing shows it (claude@aiden), program map (codex@jamie).
- **[P0] Hard mode fix (PR #36):** demo seed 42 → 1 (42 lost every demo design to a day-193 bus failure; reference survives ~92/100 seeds). Normal's `random_failures` now false, README row fixed. New test: each reference win survives Hard with failures on. tsc clean, 189/189.
- **[P0] GO / NO-GO poll (PR #33):** `ui/gonogo/` maps each sim issue to PLAN / SPACECRAFT / SCIENCE / COMMS; errors = NO-GO, warnings = GO with concerns; Launch disabled while any console is NO-GO. tsc clean, 189/189 tests on main. Not mounted yet (handoff to claude@ethan).
- **[P1] Difficulty levels:** `DIFFICULTIES` + `withDifficulty()` + `getScenario(id, level)` in PR #8; easy ×1.5 budget/×0.8 goal/no failures, hard ×0.95 budget/3% daily events. All 9 scenario×level combos win with the reference design (PR #12). 106/107 on sim-data, tsc + build clean. Objective texts no longer hard-code numbers.
- **[P1] More scenarios:** `moon` (*Moon Mapper*) and `mars` (*Red Planet Radar*), plus Mars parts and `cruise_days` / `payload_tmi_kg` columns, in PR #8. Proven winnable in the real sim by PR #12 (one reference win each). 98/99 on sim-data; the one failure is sim's hard-coded orbit list (handoff to claude@ethan).
- **[P0] Headless playthrough test (PR #12):** the demo through the real sim + data + Commands. 4/4 pass on `ethan-claude/sim-data`, so the starting design loses and the reference design wins in the real sim. Full suite 92/92, tsc clean.
- **Parts catalogs + first scenario (PR #8):** 6 `table` Datasets (launch vehicles, orbits, buses, instruments, power, comms), `data/scenarios/demo.json` (*First Light*), a `data/index.ts` loader + helpers, `data/README.md` (columns, param keys, suggested budget math) and `data/data.test.ts` (11 tests incl. game balance). Verified on #4 + #5 + #8 combined: tsc clean, 11/11 tests, build OK.
- PR #8: units switched to terse display units for the builder (`USD`, `bps`, ...); 15/15 tests, tsc, build pass on #4 + #5 + #8.
- PR #6: added Sarah's Team row (claude@sarah's handoff, done) and replaced the pass-and-play note with online co-op.
- Handoffs: catalog columns → claude@ethan; demo designs + NASA sources → codex@jamie (answers its scope handoff, done).

### Missing / I need from someone
- claude@ethan: update `sim/sim.test.ts:63` orbit list for `low-mars-orbit` (handoff).
- A human to merge PRs #4 and #5 before #8 (PR #8's loader imports `shared/` and runs under the scaffold's vitest).
- claude@aiden: add `"tests"` to tsconfig `include` (handoff).
- claude@aiden: builder slots need `spacecraft-buses` + separate `solar`/`battery` (my handoff).

### Heads up for other agents
- **UI builders (claude@aiden builder, claude@sarah mission view):** use `getPart` / `rowsAsObjects` from `data/index.ts`. Every row has `name` + a student-friendly `description` for tooltips, and `units` covers every numeric column.
- Catalog numbers are hand-tuned for gameplay and loosely based on NASA references, not exact.

## codex@jamie

**Branch:** main (coordination); jamie-codex/mission-entry (PR #72)
**Last updated:** 2026-11-14 13:11

### Working on right now

Claimed P0 30-second demo + NASA data story. Updating docs/PITCH.md, docs/DEMO.md, docs/NASA_SOURCES.md; verify shipped behavior against source. No delegation.

### Files / folders I'm touching (hands off)

Active: docs/PITCH.md, docs/DEMO.md, docs/NASA_SOURCES.md. Branch jamie-codex/demo-story. PR #72 merged; previous scope was `ui/start/`, `ui/lobby/`, `ui/tutorial/`; review/fixes remain mine until merge. Own BOARD/status/LOG/handoffs only on main. No app/data/sim/shared/theme/scene3d edits.

### Just finished

PR #72: default/remembered name; PROGRAM-ordered mission route; local SVG Earth/Moon/Mars and spacecraft art; illustrated lobby consoles; modal builder tour with focus entry/return, Tab containment, Escape/Skip, replay and remembered dismissal. 363 tests, TypeScript/build and size check pass (129.5 kB gzip / 150 kB). Browser checked desktop/390px layouts, light/dark visuals, name persistence, lobby claim/release and guest controls, tour keyboard/phone behavior. No overflow in checked phone views.

PR #48 merged: transport disconnect/rejoin reliability; 316 tests/build at completion. Prior Start/Lobby/daily/tutorial PRs merged and mounted.

### Missing / I need from someone

Ethan: review/merge PR #72. No app wiring required; exported props unchanged. Four-device venue rehearsal remains Kaipo's; no physical-device or screen-reader run in this chunk. Interactive 3D/story integration remains with assigned owners.

### Heads up for other agents

Claude Jamie: PROGRAM handoff completed, all three missions remain accessible; no data edits or assignment to you. Caleb: dialog keyboard handoff completed and browser verified. Latest all-handoff has evidence and remaining boundaries. SVG/CSS assets add no dependencies or remote downloads.
