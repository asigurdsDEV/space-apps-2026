# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 10:34


## claude@jamie

**Branch:** jamie-claude/parts-catalogs (PR #8 open); jamie-claude/challenge-readme (PR #6 open)

### Working on right now
Nothing claimed. Waiting for Jamie to pick the next task.

### Files / folders I'm touching (hands off)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
- **Parts catalogs + first scenario (PR #8):** 6 `table` Datasets (launch vehicles, orbits, buses, instruments, power, comms), `data/scenarios/demo.json` (*First Light*), a `data/index.ts` loader + helpers, `data/README.md` (columns, param keys, suggested budget math) and `data/data.test.ts` (11 tests incl. game balance). Verified on #4 + #5 + #8 combined: tsc clean, 11/11 tests, build OK.
- PR #8: units switched to terse display units for the builder (`USD`, `bps`, ...); 15/15 tests, tsc, build pass on #4 + #5 + #8.
- PR #6: added Sarah's Team row (claude@sarah's handoff, done) and replaced the pass-and-play note with online co-op.
- Handoffs: catalog columns → claude@ethan; demo designs + NASA sources → codex@jamie (answers its scope handoff, done).

### Missing / I need from someone
- A human to merge PRs #4 and #5 before #8 (PR #8's loader imports `shared/` and runs under the scaffold's vitest).
- claude@ethan: switching sim (PR #7) to the PR #8 columns (his handoff, 10:30).
- claude@aiden: builder slots need `spacecraft-buses` + separate `solar`/`battery` (my handoff).

### Heads up for other agents
- **UI builders (claude@aiden builder, claude@sarah mission view):** use `getPart` / `rowsAsObjects` from `data/index.ts`. Every row has `name` + a student-friendly `description` for tooltips, and `units` covers every numeric column.
- Catalog numbers are hand-tuned for gameplay and loosely based on NASA references, not exact.

## codex@jamie

**Branch:** jamie-codex/transport-demo — PR #9

### Working on right now

Transport + shared-protocol rooms implemented; awaiting scaffold dependency, app integration and live browser verification. Read-only integration audit complete for the recorded snapshot; follow-up after sim adapter lands. No extra app/UI/data scope claimed.

### Files / folders I'm touching (hands off)

- `net/` (whole folder): transport, concrete room API, runtime validators, lobby authority, tests and integration notes.
- `docs/PITCH.md`, `docs/DEMO.md`, `docs/NASA_SOURCES.md`, `docs/INTEGRATION_REPORT.md`.
- Own status section, own board entries, append-only log, and own handoffs. No edits to others’ source.

### Just finished

PR #9: PeerTransport, LocalTransport, HostRoom; concrete createLocalRoom/hostRoom/joinRoom requested by Ethan; shared NetMessage runtime validation, role release, authoritative roster, canSend enforcement. 22 owned net tests pass; 58 module tests pass in combined snapshot. Build passes after adding peerjs in temporary snapshot. Integrated actual-data probes both fail (documented in report). Claude supplied First Light designs and NASA sources, now included in docs.

### Missing / I need from someone

- Aiden: add peerjs dependency + lockfile to scaffold (request handoff on main).
- Ethan: app integration using Room API; catalog/sim adapter. Snapshot fails on bus dataset id, power/comms params, launcher capacity, science goal and objective mapping. Exact reproduction in docs/INTEGRATION_REPORT.md on PR #9.
- Team: merge/review PRs, enable Pages, then live two-browser/venue rehearsal. Network stays In progress until verified; demo winning design remains a candidate until integrated sim confirms it.

### Heads up for other agents

Jamie authorized autonomous remaining-work selection and heavier tasks. Other owners keep their scopes. The concrete API now follows Ethan’s requested signatures; no need to implement a duplicate room layer in app/. All changes pushed; paused at integration boundaries pending their source updates, not claiming a working live session.
