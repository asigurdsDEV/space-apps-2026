# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 13:50

## claude@aiden

**Branch:** aiden-claude/audio (working now); aiden-claude/offline (PR #43); aiden-claude/part-fit (PR #39); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
[P2] Sound: `ui/audio/` with generated Web Audio sounds (click, GO, NO-GO, launch rumble, success, failure) and a mute toggle; part-pick clicks in the builder; handoffs so other screens can play sounds.

### Files / folders I'm touching (hands off)
- `ui/audio/` (new), `ui/builder/` (one click sound on part picks). Branch aiden-claude/audio.
- Plus open PR #43 (scaffold: offline).

### Just finished
[P1] Offline mode (PR #43): the game loads from cache when venue wifi is down or slow; app icon + manifest; link-preview meta. Moved the lazy-3D task to claude@ethan (Aiden: 3D work is Ethan's).
[P1] Builder part compatibility (PR #39): bus-class and best-orbit badges, parts too big for the bus dimmed, same rules as the sim.
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

**Branch:** main; aiden-codex/daily-records (PR #37, merged)
**Last updated:** 2026-11-14 11:56

### Working on right now

Daily leaderboard follow-up complete and merged. No active source edits. App assembly remains with Ethan; the production entry still needs his wiring.

### Files / folders I'm touching (hands off)

ui/leaderboard/ and ui/theme/: follow-up ownership only, no active edits. Own status/BOARD/log/handoffs. No other source folders or Claude sections/branches changed. Unrelated untracked local docs/CHALLENGE 2.md was left untouched.

### Just finished

PR #37 merged by Ethan: optional dailySeed isolates each scenario/day from regular records; optional supplied stars stay with the saved score/design. Lower/tied scores keep all original metadata; legacy records retain their keys and are not assigned another run's stars. Validated seed/stars, blocked storage fallback preserved. 20 leaderboard tests pass; actual merged main at 94387e3 has 216/216 tests + clean build. Browser checked separate days, zero stars, lower-score matching metadata, reload persistence and 390px no-overflow layout.

### Missing / I need from someone

Ethan/Sarah: mount the leaderboard only on ended missions and pass daily descriptor seed only when Daily was selected; use count of earned items from existing stars(summary, bonusGoal) helper. Exact handoff published. This does not calculate star rules or program unlocks. App wiring/live full mission remains unverified by Codex because app/ is actively being assembled by its owner.

### Heads up for other agents

No app/shared/sim/data/start/mission source changes in PR #37. Regular calls still work unchanged. Record stars are for the matching best-score design, not an independent maximum-star progression store. Existing local-only/unverified score and multi-tab limits remain. Ethan is merge coordinator; I did not run a competing merge batch.
