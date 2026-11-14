# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 16:00

## claude@aiden

**Branch:** aiden-claude/hangar (PR #80); aiden-claude/story-app (PR #74, after #70); aiden-claude/story-popouts (PR #70); aiden-claude/launch-visible (PR #68); aiden-claude/debrief-fixes (PR #65); aiden-claude/risk-meter (PR #57); aiden-claude/what-if (PR #55); aiden-claude/app-safety (PR #53); aiden-claude/bundle-check (PR #54); aiden-claude/briefing-bonus (PR #49); aiden-claude/mobile-budgets (PR #46); aiden-claude/audio (PR #45); aiden-claude/offline (PR #43); aiden-claude/part-fit (PR #39); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Nothing claimed. Next: app/ walk between stations (needs #74 + #80).

### Files / folders I'm touching (hands off)
None outside my open PRs #65 (`sim/analysis.ts`, one argument in `app/App.tsx` Flight) #68 (`ui/builder/builder.css`) #70 (`ui/story/`) and #80 (`ui/hangar/`), #74 (`app/StoryLayer.tsx`, `<StoryLayer>` lines + `online`/clock hold in `app/App.tsx`).

### Just finished
Walkable mission control in 3D (PR #80, V6 = decision 005's rooms), after splitting the 3D story work at Aiden's request.
Story wired into the game (PR #74): CAPCOM on every station, cutscenes at arrival/launch/Moon-Mars orbit/anomaly/ending.
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

**Branch:** main (done coordination); aiden-codex/pilot-input (PR #78); aiden-codex/visual-overhaul-plan (PR #69)
**Last updated:** 2026-11-14 13:25

### Working on right now

V1 complete in PR #78; handoff published for V2/V7 owners. No new implementation claimed. Astra performed read-only flight-control design review at Aiden's request; implementation/testing can use Sol. Latest cutscene task is now Caleb's; V6 is Claude Aiden's. No overlapping work taken.

### Files / folders I'm touching (hands off)

No active production edits. PR #78 owns new `ui/pilot-input/` until review/merge; PR #69 only `docs/VISUAL_OVERHAUL.md` and `.agents/decisions/006-interactive-3d.md`. Own coordination only on main. Ethan's source/branches, Claude's section/branches, app/story/HUD/data/sim/shared/config untouched. Unrelated docs/CHALLENGE 2.md untouched.

### Just finished

PR #78: plain craft-relative movement/brake/held-interaction intent, one-shot interaction callback, keyboard/native buttons/independent pointer sources, Escape/focus/blur/hidden/disabled/unmount release. Published labels and scan timing semantics to match Sarah's PR #76. Standalone themed preview; 364 tests, typecheck/build, size 125.1 kB gzip /150 pass before latest asset-only main merge; final merged head also covered by CI when green.

Browser: keyboard press/release/repeat, Enter/Space buttons, outside text typing, pointer hold/drag-off, Escape/Tab, pause/unmount, dark/light and 390px no overflow. Clean final scan preview has no console errors. PR #69 decision renumbered 006, linked 005, latest room assignment reconciled.

### Missing / I need from someone

V7 owners must mount controls with scene movement/aiming and V2/V4 route feedback; use held intent for scan duration, not the press callback. Real multi-touch, held-input window-hidden transitions, screen reader and integrated 3D flight remain unverified. Kaipo's GLBs are now on main; PWA cache adoption remains Claude's task.

### Heads up for other agents

Use PILOT_CONTROLS for final hints; intent.interact OR HUD scan hold drives local timing with pause/exit clearing both. No scored or network commands invented. Ethan remains merge coordinator. V6/rooms now one Claude Aiden task (1555 handoff); Caleb owns cutscenes. No newly Open task fits my ownership at this snapshot.
