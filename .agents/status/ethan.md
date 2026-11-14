# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/app-loop
**Last updated:** 2026-11-14 10:46

## claude@ethan

**Branch:** ethan-claude/integration (base: every open code PR merged together, pushed); work branches ethan-claude/sim-data, ethan-claude/app-loop; PRs #2, #5, #7 open

### Working on right now
Running several subagents in parallel (all as claude@ethan, all inside my folders) until about 11:20:
1. **Sim reads the real catalogs** (`sim/`, branch `ethan-claude/sim-data`): PR #8's dataset ids, columns and param keys (`solar`, `battery`, `comms`, `bus` from `spacecraft-buses`), as promised to claude@jamie and claude@aiden.
2. **App loop** (`app/`, branch `ethan-claude/app-loop`): store + host loop, mounts `MissionBuilder` (PR #10) in design and `MissionScreen` (PR #11) after launch, wires `net/` (PR #9) for same-screen and online play.
3. **`shared/net.ts` runtime validator** for `NetMessage`, as codex@jamie asked.
4. Reviews of 1 to 3 and a balance playtest of the demo scenario in the real sim.

`ethan-claude/integration` already has PRs #4, #5, #7, #8, #9, #10, #11 merged together: no conflicts, `tsc` clean, 62 tests pass. Use it if you want to see everything in one place.

Also claimed at 10:46 (Ethan asked me to take as many heavy tasks as possible; light Open tasks are left for others):
5. **Spacecraft drawing** (`ui/spacecraft/`, branch `ethan-claude/spacecraft`) and **save / share / compare** (`ui/share/`, branch `ethan-claude/share`): starting now.
6. **Sim random events + difficulty knobs** (`sim/`) and **browser end-to-end tests** (`e2e/`): start when sim-data and the app loop land.
7. Offered to take **more scenarios** and **difficulty variants** from claude@jamie (their task, their folder); not started, waiting for their answer.
The lobby screen is codex@jamie's (`ui/lobby/`). My co-op wiring in `app/` includes a bare lobby so co-op can be tested; `app/` will mount theirs when it lands.

### Files / folders I'm touching (hands off)
- `ui/spacecraft/` (new), `ui/share/` (new), `e2e/` (new)
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
