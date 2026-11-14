# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 10:26

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## claude@jamie

**Branch:** jamie-claude/parts-catalogs (PR #8 open); jamie-claude/challenge-readme (PR #6 open)

### Working on right now
Nothing claimed. Waiting for Jamie to pick the next task.

### Files / folders I'm touching (hands off)
- `data/` (whole folder) until PR #8 merges. After that I'm still its owner, so send catalog changes via handoff.
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section + Team table of `README.md` until PR #6 merges

### Just finished
- **Parts catalogs + first scenario (PR #8):** 6 `table` Datasets (launch vehicles, orbits, buses, instruments, power, comms), `data/scenarios/demo.json` (*First Light*), a `data/index.ts` loader + helpers, `data/README.md` (columns, param keys, suggested budget math) and `data/data.test.ts` (11 tests incl. game balance). Verified on #4 + #5 + #8 combined: tsc clean, 11/11 tests, build OK.
- PR #6: added Sarah's Team row (claude@sarah's handoff, done) and replaced the pass-and-play note with online co-op.
- Handoffs: catalog columns → claude@ethan; demo designs + NASA sources → codex@jamie (answers its scope handoff, done).

### Missing / I need from someone
- A human to merge PRs #4 and #5 before #8 (PR #8's loader imports `shared/` and runs under the scaffold's vitest).
- claude@ethan: confirm the catalog columns work for the sim core (handoff).

### Heads up for other agents
- **UI builders (claude@aiden builder, claude@sarah mission view):** use `getPart` / `rowsAsObjects` from `data/index.ts`. Every row has `name` + a student-friendly `description` for tooltips, and `units` covers every numeric column.
- Catalog numbers are hand-tuned for gameplay and loosely based on NASA references, not exact.

## codex@jamie

**Branch:** jamie-codex/transport-demo (claim pushed on main first)

### Working on right now

Multiplayer transport + rooms (heavy) and pitch / demo / source documentation. Jamie authorized selecting unowned work autonomously and taking higher effort tasks.

### Files / folders I'm touching (hands off)

- `net/` (whole folder): PeerJS transport, local fallback, room lifecycle, tests and integration notes.
- `docs/PITCH.md`, `docs/DEMO.md`, `docs/NASA_SOURCES.md`.
- Own status section, own board entries, append-only log, and handoffs from codex@jamie.
- No package/scaffold, shared/, app/, sim/, data/, ui/, or claude@jamie challenge files.

### Just finished

Synced main and inspected pending stack, shared types and contract PRs. Claimed unowned network and demo work before coding.

### Missing / I need from someone

Ethan: finalized NetMessage/roles and app integration; Aiden: PeerJS dependency in scaffold. Existing merge/Pages blockers remain on BOARD.

### Heads up for other agents

Preserve claude@jamie's section. Branches use jamie-codex/<short-task>. Network implementation will expose Transport from decision 002, isolate PeerJS behind an adapter, and keep sim execution in app/ on the host only.
