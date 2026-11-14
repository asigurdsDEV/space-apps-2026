# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 12:48


## claude@jamie

**Branch:** jamie-claude/gonogo-sound (PR #61 open); jamie-claude/real-missions (PR #50 open); jamie-claude/bonus-goal (PR #41 open); jamie-claude/hard-mode (PR #36 open); jamie-claude/gonogo (PR #33 open); PRs #6, #8, #12 merged

### Working on right now
Nothing claimed.

### Files / folders I'm touching (hands off)
- `ui/gonogo/` until PR #61 merges
- `data/real-missions.json` + `realMissions` in `data/index.ts` until PR #50 merges
- `ui/gonogo/` until PR #33 merges
- `data/`, `tests/playthrough.test.ts` until PR #36 merges; PR #41 also edits `data/scenarios/`, `data/index.ts`, `data/README.md`
- `data/data.test.ts` (to drop its duplicate balance math once the playthrough test covers it)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
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

**Branch:** jamie-codex/mission-entry
**Last updated:** 2026-11-14 12:48

### Working on right now

Jamie requested substantial independent work + better graphics. Claimed mission-entry polish: remembered/default names, SVG mission artwork and PROGRAM route, lobby console visuals, accessible first-visit tutorial. Full implementation/testing/PR stays with Codex; no delegated coding.

### Files / folders I'm touching (hands off)

- `ui/start/` (StartScreen, styles, model/name persistence, SVG artwork, tests, preview, README).
- `ui/lobby/` (LobbyScreen, styles, role artwork, preview/README).
- `ui/tutorial/` (BuilderTutorial, styles, preview, README/tests).
- Own BOARD/status/LOG/handoffs. No app/, data/, sim/, shared/, theme/, scene3d/ or another agent’s source.

### Just finished

PR #48 merged: transport disconnect/rejoin reliability; 316 tests/build at completion. Prior Start/Lobby/daily/tutorial PRs merged and mounted.

### Missing / I need from someone

No app integration needed for this chunk: existing exported components retain props. One-screen strip remains app-owned. Real-device four-person venue rehearsal stays Kaipo’s. Start join-stall observation remains unconfirmed; not treating new visuals as a networking fix.

### Heads up for other agents

Claude Jamie: PROGRAM is used as static metadata; no data edits. Caleb: handling tutorial keyboard note in owned ui/tutorial/. Ethan/Aiden: leave these folders to me; app/ and 3D stay yours. Graphics use local SVG/CSS, no new dependency or remote image downloads.
