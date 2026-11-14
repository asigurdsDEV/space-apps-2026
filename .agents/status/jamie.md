# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 12:25


## claude@jamie

**Branch:** jamie-claude/bonus-goal (PR #41 open); jamie-claude/hard-mode (PR #36 open); jamie-claude/gonogo (PR #33 open); PRs #6, #8, #12 merged

### Working on right now
Nothing claimed.

### Files / folders I'm touching (hands off)
- `ui/gonogo/` until PR #33 merges
- `data/`, `tests/playthrough.test.ts` until PR #36 merges; PR #41 also edits `data/scenarios/`, `data/index.ts`, `data/README.md`
- `data/data.test.ts` (to drop its duplicate balance math once the playthrough test covers it)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
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

**Branch:** jamie-codex/builder-tips (new); jamie-codex/daily-mission — PR #31 (after #30); jamie-codex/start-polish — PR #30. Original #9/#13/#15 merged.

### Working on right now

[P2] First-time builder tips: four skippable coach marks (orbit, budgets, errors, launch), remembered in browser storage. Highest-priority eligible unowned task; P0/P1 Open scopes belong to other owners. Component stays under ui/tutorial; mounting handed to builder/app owners.

### Files / folders I'm touching (hands off)

- `ui/tutorial/` (new, whole folder): component, scoped theme CSS, persistence helper/tests, preview and README.
- Own status/board/log/handoffs only. No ui/builder/, app/, shared/, data/, sim/ edits.
- Prior follow-up ownership remains ui/start/, ui/lobby/, net/ and pitch/demo/source/audit docs; no active changes to those in this chunk.

### Just finished

- PR #31: pure dailyMissionForDate helper + optional Solo daily button/separate callback. UTC day, YYYYMMDD seed, sorted/deduplicated base IDs, fixed Normal. Ethan accepted this in 11:41 handoff. 191 full-suite tests, tsc/build pass. Browser: missing-name validation, trim, seed/date/scenario payload, Normal despite Hard ordinary picker, no daily controls on Join.
- PR #30: Easy/Normal/Hard + callback-supplied actual budget/goal, shared light/dark token adoption and Term tooltips in Start/Lobby. 179 tests + tsc/build/theme contrast passed at that snapshot; browser both themes/difficulty payload/numbers/390px tooltip containment.
- Original transport, Start and Lobby are merged. Actual-data playthrough now passes after sim-data #26; the old integration report is explicitly a historical snapshot.
- Responded to Ethan’s net questions: HostRoom.claimRole(from,null) and nullable authorize policy already work on main; avoid rebuilding lobby to release roles. Short room-code mapping belongs to app wrapper; raw PeerTransport still uses full peer IDs.
- Caleb has pitch/demo/provenance guidance via polish-ready handoff; his submission file stays his.

### Missing / I need from someone

- Ethan: merge/review #30 then #31, mount Start/Lobby, pass scenarioPreview=getScenario, honor request.difficulty, apply DailyMission.seed before init and refresh UTC day at midnight/resume. Full app/live WebRTC remains unverified here.
- Program map/unlocks need scenario-order + star-progress data from their owners; not fabricated in Start.
- Team: real device/venue rehearsal, then finalize demo/submission claims to the behavior actually shipped. Pages is enabled and the scaffold deploy is live; app-loop is still a separate owner’s integration task.

### Heads up for other agents

Original PR heads were not rewritten during merge batch. Daily adds a separate callback, no new Command/NetMessage/StartRequest variant. UI never duplicates difficulty scaling or creates sessions. Latest APIs in ui/start/README.md. Keep claude@jamie’s section and ui/gonogo/data/tests scopes untouched.
