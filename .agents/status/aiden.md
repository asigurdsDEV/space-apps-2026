# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 13:08

## claude@aiden

**Branch:** aiden-claude/part-fit (working now, on #35); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
[P1] Builder part compatibility: badges for `min_bus_class` ("needs a SmallSat bus") and `best_orbit`, dim parts that can't fit the picked bus.

### Files / folders I'm touching (hands off)
- `ui/builder/` (branch aiden-claude/part-fit).

### Just finished
[P1] Builder console lights (PR #35): live PLAN / SPACECRAFT / SCIENCE / COMMS calls from ui/gonogo. Also added 7 improvement tasks to the board (12:55).
[P0] Builder budget bars match the reviewed sim (PR #32): Bus capacity bar was missing, Science bar ignored the radio (demo 10/30 shown vs 1.7 forecast), new Battery-vs-eclipse bar. Merge #29 first.
Glossary adopted (PR #29): briefing terms from the shared glossary, builder tooltips on the Orbit heading, 4 columns and 3 budget labels. Asked cursor@kaipo for unique tooltip ids (`useId`).
[P1] Anomaly card sources (PR #28, into main): an official source for every card + the MCO line, each story checked; Starlink count, SOHO "still observing" and DSN "landings" wording flagged to claude@sarah.
[P2] 3D space view (decision 003, PR #22): `<SpaceView state mode>` in `ui/scene3d/`, a three.js planet (Earth/Moon/Mars, clouds, night lights, atmosphere), stars, Sun, the orbit and a spacecraft built from the picked parts. The builder (PR #10) opens with the 3D close-up. `three` added to PR #4.
Shared theme adopted in builder (PR #10) + briefing (PR #14): local palettes → `--game-*` tokens, dark palettes removed. Both PRs now stack on PR #16 (merge #16 first).
[P1] Role-aware builder (PR #10): with 2+ players each section shows its role + holder, other roles' sections are locked, "Last changed by …" per section, Launch only for mission planning. Optional props `players` + `me` (Session snapshot). Also: tsconfig type-checks `tests/` (PR #4, for claude@jamie).

### Missing / I need from someone
- claude@ethan: `ROLE_PARAM_KEYS` needs `solar`, `battery`, `comms` (or whatever keys the sim reads); pass `players`/`me` to the builder (handoff role-keys).
- claude@ethan: show the briefing between Start and the builder (handoff mount-briefing); sim catalog/param fixes (handoff builder-aligned).
- Aiden: turn on GitHub Pages; merge PRs in the order in docs/GAME_PLAN.md (now plus #14).

### Heads up for other agents
`ui/scene3d/` (PR #22) is handed to claude@ethan (Aiden: build the 3D on Ethan's Fable). I don't edit it anymore; dependency requests for it still come to me (scaffold).
Aiden also runs codex@aiden. It gets its own section in this file; claude@aiden never edits it or its branches. The briefing's key terms are a local list; whoever takes "Glossary + tooltips" (ui/learn/) can reuse or replace `KEY_TERMS` from `ui/briefing`.

## codex@aiden

**Branch:** aiden-codex/daily-records
**Last updated:** 2026-11-14 11:43

### Working on right now

[P1] Daily leaderboard records + stars, following Sarah's 11:45 game-design handoff addressed to Codex. User asked to continue. App assembly remains actively claimed by Ethan, so working independently in my own folder.

### Files / folders I'm touching (hands off)

- `ui/leaderboard/` only: additive optional daily-seed/stars props, scoped persistence, UI, tests, preview and README.
- Own status/BOARD entries, append-only LOG and own/addressed handoffs.
- No app/, shared/, sim/, data/, ui/mission/, ui/start/, ui/builder/, or Claude source branches/sections.

### Just finished

Synced all coordination and read current contracts. Ethan is assembling app/ + e2e/ on ethan-claude/app (not yet published as a remote branch). All P0 implementation scopes are already owned. Daily UTC seed approach agreed between app/start owners; existing leaderboard is the next non-overlapping handoff for Codex.

### Missing / I need from someone

Ethan/Sarah: pass daily seed and the existing results helper's star count when mounting the leaderboard. Codex will not compute star rules, unlock missions, edit sim scoring or duplicate app wiring. Final integration still needs owner adoption.

### Heads up for other agents

Changes stay additive: existing leaderboard calls/storage keys keep working; normal records remain separate from daily records. A saved score retains its corresponding design/star metadata. Browser storage stays optional and validated. Branches: aiden-codex/<short-task>.
