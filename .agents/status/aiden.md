# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 16:00

## claude@aiden

**Branch:** aiden-claude/story-popouts (PR #70); aiden-claude/launch-visible (PR #68); aiden-claude/debrief-fixes (PR #65); aiden-claude/risk-meter (PR #57); aiden-claude/what-if (PR #55); aiden-claude/app-safety (PR #53); aiden-claude/bundle-check (PR #54); aiden-claude/briefing-bonus (PR #49); aiden-claude/mobile-budgets (PR #46); aiden-claude/audio (PR #45); aiden-claude/offline (PR #43); aiden-claude/part-fit (PR #39); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Story in the game (decision 005): CAPCOM + cutscenes wired into app/ (branch aiden-claude/story-app, stacked on PR #70).

### Files / folders I'm touching (hands off)
None outside my open PRs #65 (`sim/analysis.ts`, one argument in `app/App.tsx` Flight) #68 (`ui/builder/builder.css`) and #70 (`ui/story/`).

### Just finished
First-person story direction from Aiden: decision 005, GAME_DESIGN §4.9, 5 board tasks, handoff to all. Story pop-outs + cutscene frame (PR #70, `ui/story/`).
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

**Branch:** main (done coordination); aiden-codex/visual-overhaul-plan (PR #69)
**Last updated:** 2026-11-14 13:03

### Working on right now

V0 complete: interactive 3D overhaul plan and seven independent work packages published. PR #69 is open with a green build. No implementation scope claimed; V1 flight input is my proposed next independent task, not yet locked. Aiden chose both spacecraft flight and a walkable mission-control/hangar, starting with flight.

### Files / folders I'm touching (hands off)

No active production source edits. PR #69 changes only `docs/VISUAL_OVERHAUL.md` and `.agents/decisions/005-interactive-3d.md`; own BOARD/status/log/handoffs on main. CONTRACTS.md, all Ethan source/branches, Claude section/branches, existing mission/start/lobby/tutorial/data source untouched. Unrelated docs/CHALLENGE 2.md left untouched.

### Just finished

Inspected current Three.js scene, procedural craft/planets, published SpaceView props, fly mounting and PWA asset listing. All six proposed imports (GLTFLoader, FlyControls, PointerLockControls, Raycaster, AnimationMixer, LoadingManager) resolve from installed dependencies; no npm change needed. Plan defines actual player-craft movement and observation/relay interactions, GLB asset pipeline with credits, 7 isolated scopes, a second-milestone hangar, load/device targets and additive owner-led integration. PR #69 CI build is green.

Previous PR #56 Daily-record QA merged; matching score/design/stars survived reload and regular/Daily isolation. Last follow-up test/build run passed 331 tests; this planning PR's newer head is covered by its green CI, not a fresh manual gameplay check.

### Missing / I need from someone

V1–V7 implementation remains. Ethan keeps renderer/launch/part models and chooses the integration checkpoint; no immediate interruption requested. Owners should claim isolated modules on BOARD before coding and publish their actual local exports. New scored piloting must go through sim/shared/CONTRACTS ownership; the current day-step simulator is not a real-time flight controller. New public GLBs need explicit cache/version handling by Claude's PWA owner.

### Heads up for other agents

Seven tasks are Open with suggested owners, not silently claimed on their behalf. Codex Jamie's existing mission-entry graphics scope stays separate. Reuse Three.js and existing configurable models; model/texture candidate links are not downloaded assets. Source/API changes were deliberately left for the corresponding implementation tasks. Ethan remains merge coordinator.
