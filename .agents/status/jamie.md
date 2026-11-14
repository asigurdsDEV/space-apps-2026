# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 10:45


## claude@jamie

**Branch:** jamie-claude/playthrough-test (draft PR #12); jamie-claude/parts-catalogs (PR #8 open); jamie-claude/challenge-readme (PR #6 open)

### Working on right now
[P0] Headless playthrough test (claimed 2026-11-14 10:38): demo scenario through the real sim via real Commands; starting design loses, reference design wins.
**Where it stands:** `tests/playthrough.test.ts` is written and in draft PR #12. It runs on `ethan-claude/integration`: `tsc` clean, 64 other tests pass, and 2 of 4 cases are red because the sim still reads its placeholder schema. Waiting on claude@ethan's `ethan-claude/sim-data`; then I re-run it, mark #12 ready, and drop the duplicate balance math from `data/data.test.ts`.

### Files / folders I'm touching (hands off)
- `tests/` (new folder)
- `data/data.test.ts` (to drop its duplicate balance math once the playthrough test covers it)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
- **Parts catalogs + first scenario (PR #8):** 6 `table` Datasets (launch vehicles, orbits, buses, instruments, power, comms), `data/scenarios/demo.json` (*First Light*), a `data/index.ts` loader + helpers, `data/README.md` (columns, param keys, suggested budget math) and `data/data.test.ts` (11 tests incl. game balance). Verified on #4 + #5 + #8 combined: tsc clean, 11/11 tests, build OK.
- PR #8: units switched to terse display units for the builder (`USD`, `bps`, ...); 15/15 tests, tsc, build pass on #4 + #5 + #8.
- PR #6: added Sarah's Team row (claude@sarah's handoff, done) and replaced the pass-and-play note with online co-op.
- Handoffs: catalog columns → claude@ethan; demo designs + NASA sources → codex@jamie (answers its scope handoff, done).

### Missing / I need from someone
- A human to merge PRs #4 and #5 before #8 (PR #8's loader imports `shared/` and runs under the scaffold's vitest).
- claude@ethan: `ethan-claude/sim-data` (sim reads PR #8's schema) so PR #12 goes green (handoff).
- claude@aiden: add `"tests"` to tsconfig `include` (handoff).
- claude@aiden: builder slots need `spacecraft-buses` + separate `solar`/`battery` (my handoff).

### Heads up for other agents
- **UI builders (claude@aiden builder, claude@sarah mission view):** use `getPart` / `rowsAsObjects` from `data/index.ts`. Every row has `name` + a student-friendly `description` for tooltips, and `units` covers every numeric column.
- Catalog numbers are hand-tuned for gameplay and loosely based on NASA references, not exact.

## codex@jamie

**Branch:** jamie-codex/lobby (new); jamie-codex/start-screen — PR #13; jamie-codex/transport-demo — PR #9

### Working on right now

[P1] Lobby screen: full room code + copy, authoritative roster, claim/release roles, host continue, leave, busy/error states. Pure props/callbacks. Start screen done in PR #13. Net PR #9 awaits app/live integration.

### Files / folders I'm touching (hands off)

- `ui/lobby/` (whole folder): component, scoped CSS, tests, preview and README.
- `ui/start/` (whole folder; follow-up ownership, no active edits): component, scoped styles, tests, preview and integration README.
- `net/` (whole folder): transport, concrete room API, runtime validators, lobby authority, tests and integration notes.
- `docs/PITCH.md`, `docs/DEMO.md`, `docs/NASA_SOURCES.md`, `docs/INTEGRATION_REPORT.md`.
- Own status section, own board entries, append-only log, and own handoffs. No edits to others’ source.

### Just finished

PR #13: StartScreen, scoped CSS, preview and typed callbacks. Three request validation tests pass, tsc/build clean against scaffold/shared. Browser verified solo/host/join payloads + 390px layout. App mounting handoff to Ethan.

PR #9: PeerTransport, LocalTransport, HostRoom; concrete createLocalRoom/hostRoom/joinRoom requested by Ethan; shared NetMessage runtime validation, role release, authoritative roster, canSend enforcement. 22 owned net tests pass; 58 module tests pass in combined snapshot. Build passes after adding peerjs in temporary snapshot. Integrated actual-data probes both fail (documented in report). Claude supplied First Light designs and NASA sources, now included in docs.

### Missing / I need from someone

- PeerJS is now in scaffold PR #4; app/live integration still pending.
- Ethan: app integration using Room API; catalog/sim adapter. Snapshot fails on bus dataset id, power/comms params, launcher capacity, science goal and objective mapping. Exact reproduction in docs/INTEGRATION_REPORT.md on PR #9.
- Team: merge/review PRs, enable Pages, then live two-browser/venue rehearsal. Network stays In progress until verified; demo winning design remains a candidate until integrated sim confirms it.

### Heads up for other agents

Jamie authorized autonomous remaining-work selection and heavier tasks. Other owners keep their scopes. The concrete API now follows Ethan’s requested signatures; no need to implement a duplicate room layer in app/. All changes pushed; paused at integration boundaries pending their source updates, not claiming a working live session.
