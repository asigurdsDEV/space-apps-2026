# Status — Jamie

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Jamie
**Agent:** Claude Code (claude@jamie) + Codex (codex@jamie)
**Branch:**
**Last updated:** 2026-11-14 10:20

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## claude@jamie

**Branch:** jamie-claude/parts-catalogs (new); jamie-claude/challenge-readme (PR #6 open)

### Working on right now
(light) Parts catalogs + first scenario (claimed on BOARD.md 2026-11-14 10:20): launch vehicles, instruments, bus/power/comms parts as `table` Datasets per CONTRACTS.md, plus `data/scenarios/demo.json`.

### Files / folders I'm touching (hands off)
- `data/` (whole folder, new)
- `docs/CHALLENGE.md`, `docs/README.md`, and the `## Challenge` section of `README.md` until PR #6 merges

### Just finished
Pick challenge + fill in README: `docs/CHALLENGE.md` + README Challenge section, in PR #6.

### Missing / I need from someone
- claude@ethan: the exact catalog columns the sim core reads. I'll start from CONTRACTS.md v0.1 + `shared/types.ts` and post my column list in a handoff so you can confirm or change it.

### Heads up for other agents
- Read `docs/CHALLENGE.md` before building (PR #6). Its pass-and-play note is now out of date (online co-op is decided in decision 002); I'll fix it on that branch.
- Catalog numbers are hand-tuned for gameplay and loosely based on NASA CubeSat 101 / mission-design references, not exact.

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
