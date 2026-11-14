# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 11:46


## claude@jamie

**Branch:** jamie-claude/gonogo (PR #33 open); PRs #6, #8, #12 merged

### Working on right now
Nothing claimed. Next likely: fix Hard difficulty (seed 42 + random failures kills every demo design on day 193, per claude@ethan's sim review).

### Files / folders I'm touching (hands off)
- `ui/gonogo/` until PR #33 merges
- `data/data.test.ts` (to drop its duplicate balance math once the playthrough test covers it)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
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

**Branch:** jamie-codex/daily-mission (new, stacked on #30); jamie-codex/start-polish — PR #30; jamie-codex/lobby — PR #15; jamie-codex/start-screen — PR #13; jamie-codex/transport-demo — PR #9

### Working on right now

[P0] Daily mission Start UI + pure date/scenario/seed helper. Ethan accepted UTC day, YYYYMMDD seed, Normal difficulty and sorted base scenario IDs in his 11:41 all-handoff. App applies helper output in its own files. Difficulty/theme/glossary complete in #30.

### Files / folders I'm touching (hands off)

- `ui/start/` (active): daily helper, tests, optional button/callback, preview and README.
- `ui/lobby/` follow-up ownership, no active changes in daily chunk.
- Follow-up ownership retained for `net/` and docs/PITCH.md, docs/DEMO.md, docs/NASA_SOURCES.md, docs/INTEGRATION_REPORT.md; no active edits there in this chunk.
- Own status section/board lines/log entries/handoffs only. No app/, data/, shared/, ui/theme/, ui/learn/ changes.

### Just finished

PR #30: difficulty + actual budget/goal preview callback; Start/Lobby share palette/fonts and use Term tooltips. 179 tests pass, tsc/build and theme contrast pass. Browser verified Easy $12M/24 pts, Hard $7.6M/30 pts, difficulty request, light/dark, focused tooltips; fixed phone overflow. Original #13/#15 unchanged.

PR #15: LobbyScreen with room copy/manual fallback, roster, 4 role choices, authoritative claim/release, host-only Continue and leave. Two role-model tests pass; combined Start/shared/lobby 10 tests, tsc/build pass. Browser checked claim/release/copy/host-vs-guest and 390px layout. Both screens expose pure props/callbacks; no app/ source touched.

PR #13: StartScreen, scoped CSS, preview and typed callbacks. Three request validation tests pass, tsc/build clean against scaffold/shared. Browser verified solo/host/join payloads + 390px layout. App mounting handoff to Ethan.

PR #9: PeerTransport, LocalTransport, HostRoom; concrete createLocalRoom/hostRoom/joinRoom requested by Ethan; shared NetMessage runtime validation, role release, authoritative roster, canSend enforcement. 22 owned net tests pass; 58 module tests pass in combined snapshot. Build passes after adding peerjs in temporary snapshot. Integrated actual-data probes both fail (documented in report). Claude supplied First Light designs and NASA sources, now included in docs.

### Missing / I need from someone

- PeerJS is now in scaffold PR #4; app/live integration still pending.
- Ethan: app integration using Room API; catalog/sim adapter. Snapshot fails on bus dataset id, power/comms params, launcher capacity, science goal and objective mapping. Exact reproduction in docs/INTEGRATION_REPORT.md on PR #9.
- Team: merge/review PRs, enable Pages, then live two-browser/venue rehearsal. Network stays In progress until verified; demo winning design remains a candidate until integrated sim confirms it.

### Heads up for other agents

Jamie authorized autonomous remaining-work selection and heavier tasks. Other owners keep their scopes. Room API follows Ethan’s requested signatures. New screen APIs in ui/start/README.md and ui/lobby/README.md on their PRs. All changes pushed. App owner controls guest navigation to briefing; lobby Continue is not spacecraft launch. No working live session claimed.
