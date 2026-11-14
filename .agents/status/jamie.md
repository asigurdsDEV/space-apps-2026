# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 11:01


## claude@jamie

**Branch:** jamie-claude/playthrough-test (PR #12, ready); jamie-claude/parts-catalogs (PR #8 open); jamie-claude/challenge-readme (PR #6 open)

### Working on right now
Nothing claimed. Waiting for Jamie to pick the next task.

### Files / folders I'm touching (hands off)
- `tests/` until PR #12 merges
- `data/data.test.ts` (to drop its duplicate balance math once the playthrough test covers it)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
- **[P0] Headless playthrough test (PR #12):** the demo through the real sim + data + Commands. 4/4 pass on `ethan-claude/sim-data`, so the starting design loses and the reference design wins in the real sim. Full suite 92/92, tsc clean.
- **Parts catalogs + first scenario (PR #8):** 6 `table` Datasets (launch vehicles, orbits, buses, instruments, power, comms), `data/scenarios/demo.json` (*First Light*), a `data/index.ts` loader + helpers, `data/README.md` (columns, param keys, suggested budget math) and `data/data.test.ts` (11 tests incl. game balance). Verified on #4 + #5 + #8 combined: tsc clean, 11/11 tests, build OK.
- PR #8: units switched to terse display units for the builder (`USD`, `bps`, ...); 15/15 tests, tsc, build pass on #4 + #5 + #8.
- PR #6: added Sarah's Team row (claude@sarah's handoff, done) and replaced the pass-and-play note with online co-op.
- Handoffs: catalog columns → claude@ethan; demo designs + NASA sources → codex@jamie (answers its scope handoff, done).

### Missing / I need from someone
- A human to merge PRs #4 and #5 before #8 (PR #8's loader imports `shared/` and runs under the scaffold's vitest).
- claude@aiden: add `"tests"` to tsconfig `include` (handoff).
- claude@aiden: builder slots need `spacecraft-buses` + separate `solar`/`battery` (my handoff).

### Heads up for other agents
- **UI builders (claude@aiden builder, claude@sarah mission view):** use `getPart` / `rowsAsObjects` from `data/index.ts`. Every row has `name` + a student-friendly `description` for tooltips, and `units` covers every numeric column.
- Catalog numbers are hand-tuned for gameplay and loosely based on NASA references, not exact.

## codex@jamie

**Branch:** jamie-codex/lobby — PR #15; jamie-codex/start-screen — PR #13; jamie-codex/transport-demo — PR #9

### Working on right now

Start (PR #13) and Lobby (PR #15) complete. Active screen editing released; ownership retained for follow-up. Net PR #9 and screens await Ethan’s app integration and live rehearsal. Both requested screens pushed; no other UI scopes claimed.

### Files / folders I'm touching (hands off)

- `ui/lobby/` (follow-up ownership; no active edits): component, scoped CSS, tests, preview and README.
- `ui/start/` (whole folder; follow-up ownership, no active edits): component, scoped styles, tests, preview and integration README.
- `net/` (whole folder): transport, concrete room API, runtime validators, lobby authority, tests and integration notes.
- `docs/PITCH.md`, `docs/DEMO.md`, `docs/NASA_SOURCES.md`, `docs/INTEGRATION_REPORT.md`.
- Own status section, own board entries, append-only log, and own handoffs. No edits to others’ source.

### Just finished

PR #15: LobbyScreen with room copy/manual fallback, roster, 4 role choices, authoritative claim/release, host-only Continue and leave. Two role-model tests pass; combined Start/shared/lobby 10 tests, tsc/build pass. Browser checked claim/release/copy/host-vs-guest and 390px layout. Both screens expose pure props/callbacks; no app/ source touched.

PR #13: StartScreen, scoped CSS, preview and typed callbacks. Three request validation tests pass, tsc/build clean against scaffold/shared. Browser verified solo/host/join payloads + 390px layout. App mounting handoff to Ethan.

PR #9: PeerTransport, LocalTransport, HostRoom; concrete createLocalRoom/hostRoom/joinRoom requested by Ethan; shared NetMessage runtime validation, role release, authoritative roster, canSend enforcement. 22 owned net tests pass; 58 module tests pass in combined snapshot. Build passes after adding peerjs in temporary snapshot. Integrated actual-data probes both fail (documented in report). Claude supplied First Light designs and NASA sources, now included in docs.

### Missing / I need from someone

- PeerJS is now in scaffold PR #4; app/live integration still pending.
- Ethan: app integration using Room API; catalog/sim adapter. Snapshot fails on bus dataset id, power/comms params, launcher capacity, science goal and objective mapping. Exact reproduction in docs/INTEGRATION_REPORT.md on PR #9.
- Team: merge/review PRs, enable Pages, then live two-browser/venue rehearsal. Network stays In progress until verified; demo winning design remains a candidate until integrated sim confirms it.

### Heads up for other agents

Jamie authorized autonomous remaining-work selection and heavier tasks. Other owners keep their scopes. Room API follows Ethan’s requested signatures. New screen APIs in ui/start/README.md and ui/lobby/README.md on their PRs. All changes pushed. App owner controls guest navigation to briefing; lobby Continue is not spacecraft launch. No working live session claimed.
