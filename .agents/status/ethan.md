# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/app-loop
**Last updated:** 2026-11-14 10:28

## claude@ethan

**Branch:** ethan-claude/app-loop (next); ethan-claude/sim-core (PR #7 open); ethan-claude/shared-types (PR #5 open); ethan-claude/contracts (PR #2 open)

### Working on right now
**First: adapt the sim (PR #7) to claude@jamie's catalog schema from PR #8** (their column names and param keys win; see handoff `20261114-1030-claude@ethan-claude@jamie-keep-your-columns.md`). Then:
**App loop + state store** (`app/`), claimed on BOARD.md, starting on `ethan-claude/app-loop`: a store that loads data, runs the sim on the host, takes Commands from the UI and from `net/`, and gives the UI `state`, `events`, `send(command)`, `players`.

### Files / folders I'm touching (hands off)
- `app/` (whole folder), including `app/main.tsx` on my branch (it is stacked on the scaffold, PR #4)
- `sim/` (PR #7). Want a rule or number changed? Send me a handoff.
- `shared/` (PR #5) and `.agents/CONTRACTS.md` + `.agents/decisions/001-module-contracts.md` (PR #2)
- Plus my usual shared-file edits: this section, my BOARD.md lines, append-only LOG.md lines, my own handoffs

### Just finished
- **Sim core** (PR #7): design checks with plain-language issues, launch, cruise, operations with data storage and downlink, seeded failures and random events, scoring with a "why" explanation. 19 tests pass; `tsc` and `npm run build` are clean.
- **Multiplayer shapes** for decision 002: `shared/net.ts` (PR #5) and the Multiplayer section of CONTRACTS.md (PR #2): `Player`, `Role`, `NetMessage`, role permissions with `canSend()`.
- Contract additions (PR #2 + #5): `launch` command, `phase_changed` event, `SimState.issues`.
- Handoff to all with how to build against the sim and net shapes: `20261114-1027-claude@ethan-all-sim-and-net-shapes.md`. Set the two handoffs addressed to me to done.

### Missing / I need from someone
- A human to review and merge, in order: #3, #2, #4, #5, #7.
- codex@jamie: the `Room` API I asked for in the 10:27 handoff (or your own shape), so the app loop can plug into `net/`.
- claude@jamie: real catalogs + `data/scenarios/demo.json`. Until then the app uses `sim/testing/fixtures.ts`.
- Aiden: turn on GitHub Pages (Settings → Pages → Source: GitHub Actions).
- Ethan's Role for the README Team table.

### Heads up for other agents
- **Ethan takes the heavy tasks.** If your task is too big for your usage, write a handoff to claude@ethan with the hard part and I'll take it. Open tasks on the board are tagged (light) / (medium) / (heavy).
- To build against the sim now: `git merge origin/ethan-claude/sim-core`, then read `sim/README.md`. The catalog columns for `data/` are in the 10:27 handoff.
- **Roster: "kimchi" on the official team page = Caleb** (confirmed by Ethan). See handoff `20261114-1009-claude@ethan-all-roster.md`.
- Building data, sim or ui? Code against `.agents/CONTRACTS.md` v0.1 (PR #2). The sim core must stay pure: no I/O, no global random, and it never mutates its input state. The UI only sends Commands.
- Adding new optional fields or event types is fine; just add the row. Renames and removals need a decision record.
- Branches use `ethan-claude/<short-task>`.
