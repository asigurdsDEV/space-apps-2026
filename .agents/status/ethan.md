# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/app-loop
**Last updated:** 2026-11-14 11:52

## claude@ethan

**Branch:** ethan-claude/integration (base: every open code PR merged together, pushed); work branches ethan-claude/sim-data, ethan-claude/app-loop; PRs #2, #5, #7 open

### Working on right now
Two sets of subagents are running (all as claude@ethan, all inside my folders):
1. **App assembly** (`app/`, `shared/`, `e2e/`, branch `ethan-claude/app`): the app loop merged onto `main`, every screen mounted (Start → Lobby → Briefing → Builder → launch → Mission → Results), solo + same-screen + online, then browser end-to-end tests, review and fixes. This is what turns the live site from the scaffold page into the game.
2. **3D build** (`ui/scene3d/`, branch `ethan-claude/scene3d`), see below.

Next, not started: the sim side of decision 004 (anomaly cards: `decision_required` / `resolve_decision`, what-if analysis) together with my sim random events + difficulty knobs task.

**3D build** (`ui/scene3d/`, branch `ethan-claude/scene3d`), handed over by claude@aiden at Aiden's request, claimed 11:33. **Paused at 11:52** so the app assembly finishes first; it restarts after about 16:20. Partial work is on `ethan-claude/scene3d-launch` and `ethan-claude/scene3d-fly` (unfinished, untested). Scope: a model for every catalog part, a launch sequence, the fly scene tied to sim time, Moon/Mars scenes, phone performance. `SpaceView`'s existing props stay as they are; I only add new ones.

Other claims:
5. **Sim random events + difficulty knobs** (`sim/`) and **browser end-to-end tests** (`e2e/`): start when sim-data and the app loop land.
6. **Mounting in `app/`** once the app loop branch is up: `StartScreen` (PR #13), lobby (PR #15), briefing (PR #14), `MissionBuilder` with `players`/`me` (PR #10), `MissionScreen` (PR #11), `SharePanel` (PR #18).
The lobby screen is codex@jamie's (`ui/lobby/`). More scenarios and difficulty variants are claude@jamie's (claimed 11:02), so my 10:46 offer is closed.

### Files / folders I'm touching (hands off)
- `ui/scene3d/` (whole folder, taken over from claude@aiden)
- `ui/share/` (PR #18), `e2e/` (new). `ui/spacecraft/` is released (superseded by decision 003).
- `app/` (whole folder), including `app/main.tsx` on my branch (it is stacked on the scaffold, PR #4)
- `sim/` (PR #7). Want a rule or number changed? Send me a handoff.
- `shared/` (PR #5) and `.agents/CONTRACTS.md` + `.agents/decisions/001-module-contracts.md` (PR #2)
- Plus my usual shared-file edits: this section, my BOARD.md lines, append-only LOG.md lines, my own handoffs

### Just finished
- **Merged 21 PRs into `main`** (c1b8d30, tested: 178/178 tests, build and Pages deploy pass). Held #6 and #25. See handoff `20261114-1129-claude@ethan-all-main-is-live.md`. I am the merge coordinator: tell me when a PR is ready.
- **Sim reads the real catalogs** (PR #26, merged).
- **Save / share / compare** (PR #18, `ui/share/`): `<SharePanel state send />`, share link in the URL hash, saved designs, compare table. 114 tests pass merged with sim-data, shared-types, the builder and the playthrough test.
- **Role keys fixed** (claude@aiden's handoff): `ROLE_PARAM_KEYS` now lists `bus`, `solar`, `battery` for spacecraft and `comms`, `ground_stations` for comms-resources. Pushed to PR #5 (`shared/net.ts`) and PR #2 (CONTRACTS.md). Re-merge `origin/ethan-claude/shared-types` to get it.
- **SVG spacecraft drawing**: built and reviewed, then superseded by the 3D view (decision 003). No PR; branch `ethan-claude/spacecraft` is kept as a possible no-WebGL fallback.
- Rehearsed merging all open PRs and asked claude@aiden who merges (handoff 20261114-1100).
- Earlier: sim core (PR #7), multiplayer shapes (PR #5), contracts (PR #2).

### Missing / I need from someone
- claude@jamie: fix the README conflict on #6. claude@sarah: tell me when #25 is ready.
- claude@sarah: keep `num` and `formatMetric` exported from `ui/mission/format.ts` (`ui/share` imports them).
- Ethan's Role for the README Team table.

### Heads up for other agents
- **Ethan takes the heavy tasks.** If your task is too big for your usage, write a handoff to claude@ethan with the hard part and I'll take it. Open tasks on the board are tagged (light) / (medium) / (heavy).
- To build against the sim that reads the real catalogs: `git merge origin/ethan-claude/sim-data`, then read `sim/README.md`. It is still under review, so numbers may move.
- **Roster: "kimchi" on the official team page = Caleb** (confirmed by Ethan). See handoff `20261114-1009-claude@ethan-all-roster.md`.
- Building data, sim or ui? Code against `.agents/CONTRACTS.md` v0.1 (PR #2). The sim core must stay pure: no I/O, no global random, and it never mutates its input state. The UI only sends Commands.
- Adding new optional fields or event types is fine; just add the row. Renames and removals need a decision record.
- Branches use `ethan-claude/<short-task>`.
