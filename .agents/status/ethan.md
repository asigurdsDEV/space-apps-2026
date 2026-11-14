# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/app-loop
**Last updated:** 2026-11-14 11:07

## claude@ethan

**Branch:** ethan-claude/integration (base: every open code PR merged together, pushed); work branches ethan-claude/sim-data, ethan-claude/app-loop; PRs #2, #5, #7 open

### Working on right now
Running several subagents in parallel (all as claude@ethan, all inside my folders) until about 11:20:
1. **Sim reads the real catalogs** (`sim/`, branch `ethan-claude/sim-data`): PR #8's dataset ids, columns and param keys (`solar`, `battery`, `comms`, `bus` from `spacecraft-buses`), as promised to claude@jamie and claude@aiden.
2. **App loop** (`app/`, branch `ethan-claude/app-loop`): store + host loop, mounts `MissionBuilder` (PR #10) in design and `MissionScreen` (PR #11) after launch, wires `net/` (PR #9) for same-screen and online play.
3. **`shared/net.ts` runtime validator** for `NetMessage`, as codex@jamie asked.
4. Reviews of 1 to 3 and a balance playtest of the demo scenario in the real sim.

`ethan-claude/integration` already has PRs #4, #5, #7, #8, #9, #10, #11 merged together: no conflicts, `tsc` clean, 62 tests pass. Use it if you want to see everything in one place.

Other claims:
5. **Sim random events + difficulty knobs** (`sim/`) and **browser end-to-end tests** (`e2e/`): start when sim-data and the app loop land.
6. **Mounting in `app/`** once the app loop branch is up: `StartScreen` (PR #13), lobby (PR #15), briefing (PR #14), `MissionBuilder` with `players`/`me` (PR #10), `MissionScreen` (PR #11), `SharePanel` (PR #18).
The lobby screen is codex@jamie's (`ui/lobby/`). More scenarios and difficulty variants are claude@jamie's (claimed 11:02), so my 10:46 offer is closed.

### Files / folders I'm touching (hands off)
- `ui/share/` (PR #18), `e2e/` (new). `ui/spacecraft/` is released (superseded by decision 003).
- `app/` (whole folder), including `app/main.tsx` on my branch (it is stacked on the scaffold, PR #4)
- `sim/` (PR #7). Want a rule or number changed? Send me a handoff.
- `shared/` (PR #5) and `.agents/CONTRACTS.md` + `.agents/decisions/001-module-contracts.md` (PR #2)
- Plus my usual shared-file edits: this section, my BOARD.md lines, append-only LOG.md lines, my own handoffs

### Just finished
- **Save / share / compare** (PR #18, `ui/share/`): `<SharePanel state send />`, share link in the URL hash, saved designs, compare table. 114 tests pass merged with sim-data, shared-types, the builder and the playthrough test.
- **Role keys fixed** (claude@aiden's handoff): `ROLE_PARAM_KEYS` now lists `bus`, `solar`, `battery` for spacecraft and `comms`, `ground_stations` for comms-resources. Pushed to PR #5 (`shared/net.ts`) and PR #2 (CONTRACTS.md). Re-merge `origin/ethan-claude/shared-types` to get it.
- **SVG spacecraft drawing**: built and reviewed, then superseded by the 3D view (decision 003). No PR; branch `ethan-claude/spacecraft` is kept as a possible no-WebGL fallback.
- Rehearsed merging all open PRs and asked claude@aiden who merges (handoff 20261114-1100).
- Earlier: sim core (PR #7), multiplayer shapes (PR #5), contracts (PR #2).

### Missing / I need from someone
- Aiden: who merges the open PRs, and when (handoff 20261114-1100). Order is in that handoff; #18 goes after #11.
- Aiden: turn on GitHub Pages (Settings → Pages → Source: GitHub Actions).
- claude@sarah: keep `num` and `formatMetric` exported from `ui/mission/format.ts` (`ui/share` imports them).
- Ethan's Role for the README Team table.

### Heads up for other agents
- **Ethan takes the heavy tasks.** If your task is too big for your usage, write a handoff to claude@ethan with the hard part and I'll take it. Open tasks on the board are tagged (light) / (medium) / (heavy).
- To build against the sim that reads the real catalogs: `git merge origin/ethan-claude/sim-data`, then read `sim/README.md`. It is still under review, so numbers may move.
- **Roster: "kimchi" on the official team page = Caleb** (confirmed by Ethan). See handoff `20261114-1009-claude@ethan-all-roster.md`.
- Building data, sim or ui? Code against `.agents/CONTRACTS.md` v0.1 (PR #2). The sim core must stay pure: no I/O, no global random, and it never mutates its input state. The UI only sends Commands.
- Adding new optional fields or event types is fine; just add the row. Renames and removals need a decision record.
- Branches use `ethan-claude/<short-task>`.
