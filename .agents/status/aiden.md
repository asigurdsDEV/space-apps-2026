# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 15:45

## claude@aiden

**Branch:** aiden-claude/risk-meter (working now, on #55); aiden-claude/what-if (PR #55); aiden-claude/app-safety (PR #53); aiden-claude/bundle-check (PR #54); aiden-claude/briefing-bonus (PR #49); aiden-claude/mobile-budgets (PR #46); aiden-claude/audio (PR #45); aiden-claude/offline (PR #43); aiden-claude/part-fit (PR #39); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
[P1] Builder risk meter: chance of success from `successRate` (PR #55) on Hard; background test flights wired in app/ (one small addition, Aiden's OK while claude@ethan is at his limit).

### Files / folders I'm touching (hands off)
- `ui/builder/` and `app/App.tsx` (the `Design` component only: one prop + a small background hook). Branch aiden-claude/risk-meter.
- Plus open PRs #55, #54, #49.

### Just finished
What-if + success-rate helpers (PR #55, taken over from claude@ethan at Aiden's request).
Took over claude@ethan's scroll-to-top + crash safety (PR #53) at Aiden's request; bundle-size check in CI (PR #54, first load 117 kB / 150 kB). Ethan's lazy 3D, GO/NO-GO and daily lines moved to Done in his name.
Briefing shows the bonus star goal (PR #49, claude@jamie handoff 1225 done).
Playtest of main (won A 94 / lost F 26, no errors), 7 findings posted with owners. Fixed mine: compact phone budgets panel (PR #46).
[P2] Sound (PR #45): `ui/audio/` generated sound effects + mute toggle; builder part-pick clicks; handoff to app/gonogo/results owners.
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

**Branch:** aiden-codex/daily-regression (claim on main first)
**Last updated:** 2026-11-14 12:26

### Working on right now

Claiming focused Daily/stars/personal-best regression of the assembled game. Browser checks and existing tests only; document observed behavior and hand failures to source owners. Separate from Caleb's broad live/a11y check and Ethan's e2e implementation.

### Files / folders I'm touching (hands off)

`docs/qa/daily-records.md` (new report), own status section, own BOARD line/Missing findings, append-only LOG and own handoffs. All app/, sim/, shared/, ui/mission/, ui/start/, net/, ui/scene3d/, workflow/config and Claude branches are read-only. No recovery changes: Claude owns them. Unrelated docs/CHALLENGE 2.md stays untouched.

### Just finished

Checked main 8c7a293 (latest coordination caa0791): 294/294 tests, typecheck and production build pass. Live solo First Light Normal: Start → Briefing → Builder → Launch → Mission at 60× → Results. Starting design correctly misses science goal: 26 points, 365 days, 1.7/30 science, local best displayed. PRs #41 (bonus goals/program), #43 (offline), #44 (tips) are open with green build checks. Main entry JS is 959.41 kB / 263.53 kB gzip, so Ethan's lazy 3D split remains relevant.

### Missing / I need from someone

Ethan: Start currently ignores request.difficulty and shows variant IDs twice; daily callback/seed/UTC refresh, GO/NO-GO poll mounting, bonusGoal/stars/leaderboard metadata and spaceWeather still need app wiring. Sarah's anomaly/what-if UI requires Ethan's sim events/analysis. Kaipo and Caleb: live page now unblocks your network, phone and accessibility rehearsals. Jamie/Caleb: finalize demo run sheet and update submission/source descriptions that still describe a scaffold or no measured data. Detailed evidence in completion-check handoff.

### Heads up for other agents

No blanket claim of multiplayer, phone, offline or winning live-run verification: this check was one desktop solo losing run. Ethan remains sole merge coordinator for ready PRs. Claude Aiden owns offline/PWA, bundle-size workflow and newly claimed sound; Ethan owns all 3D; Jamie Codex already completed tips in PR #44. Daily/stars storage helper is ready, but stars accompany the best-score design rather than an independent progression store.
