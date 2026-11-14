# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 16:00

## claude@aiden

**Branch:** aiden-claude/launch-visible (PR #68); aiden-claude/debrief-fixes (PR #65); aiden-claude/risk-meter (PR #57); aiden-claude/what-if (PR #55); aiden-claude/app-safety (PR #53); aiden-claude/bundle-check (PR #54); aiden-claude/briefing-bonus (PR #49); aiden-claude/mobile-budgets (PR #46); aiden-claude/audio (PR #45); aiden-claude/offline (PR #43); aiden-claude/part-fit (PR #39); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Nothing claimed.

### Files / folders I'm touching (hands off)
None outside my open PRs #65 (`sim/analysis.ts`, one argument in `app/App.tsx` Flight) and #68 (`ui/builder/builder.css`).

### Just finished
Builder Launch stays on screen on short laptops (PR #68).
What-if reruns replay the player's anomaly-card answers (PR #65); Ethan wired the debrief fixes himself.
Builder risk meter (PR #57): chance of success from background test flights on Hard.
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

**Branch:** aiden-codex/visual-overhaul-plan (claim on main first)
**Last updated:** 2026-11-14 12:57

### Working on right now

V0: create non-overlapping visual-overhaul work packages and a sourced import/asset plan. Aiden chose both spacecraft flight and walkable mission-control/hangar, starting with flight. Existing Three.js renderer, launch and part-model branches remain Ethan's; no source implementation is being taken over.

### Files / folders I'm touching (hands off)

`docs/VISUAL_OVERHAUL.md` (new), `.agents/decisions/005-interactive-3d.md` (new), own status/BOARD entries, append-only LOG and own handoffs. All existing source, CONTRACTS.md, Claude's section/branches and Ethan's scene3d/app/sim/shared/e2e are read-only. Unrelated docs/CHALLENGE 2.md stays untouched.

### Just finished

Live bundle index-Df1Hs8x_.js matches tested de0d869 build. Daily Moon ignores ordinary Hard picker: Normal budget $300M/goal75. Reference Daily win: 100 points, 3 stars, 730 days. After reload, regular Moon lower design: 69 points/0 stars, separate regular record. After another reload, lower Daily: current 69/0, saved Daily still 100/3 with original three instruments/high-gain dish. Expanded record fits 390px viewport with no horizontal overflow; console error log empty at inspection. 316/316 tests + typecheck/build pass. Exact steps and limitations in PR #56.

### Missing / I need from someone

No Daily/record integration defect found. Ethan merged PR #56 with #52–#55; his merge receipt reports 331 tests/build pass. Live midnight rollover, blocked storage in browser, offline, venue co-op and newer recovery PR #53 are outside this check; Caleb/Kaipo/Claude retain their scopes. The former difficulty/Daily/GO-NO-GO/stars prop gaps are resolved on the tested revision.

### Heads up for other agents

Readiness handoff 1156 is closed with observed assembled-app evidence. No app/shared/sim/data/UI source changes. Tests use existing coverage; no duplicate test harness/dependency added. Personal-best stars belong to the matching best-score design, not independent progression. Ethan remains merge coordinator; this QA does not certify later code changes.
