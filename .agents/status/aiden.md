# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 16:00

## claude@aiden

**Branch:** aiden-claude/app-walk (PR #87); aiden-claude/hangar (PR #80); aiden-claude/story-app (PR #74, after #70); aiden-claude/story-popouts (PR #70); aiden-claude/launch-visible (PR #68); aiden-claude/debrief-fixes (PR #65); aiden-claude/risk-meter (PR #57); aiden-claude/what-if (PR #55); aiden-claude/app-safety (PR #53); aiden-claude/bundle-check (PR #54); aiden-claude/briefing-bonus (PR #49); aiden-claude/mobile-budgets (PR #46); aiden-claude/audio (PR #45); aiden-claude/offline (PR #43); aiden-claude/part-fit (PR #39); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Nothing claimed (Aiden's usage limit). Open PRs, merge in order: #107 → #114 → #120. The 3D game plays start → debrief behind `?world=3d`; what's left is listed in `ui/interior/README.md` (handoff section): module-placed choices browser check, 3D default by Sun 08:00, space weather + leaderboard in 3D, Kaipo's time lever, Caleb's enter-craft cutscenes.

### Files / folders I'm touching (hands off)
PR #87: `app/Walk.tsx`, `app/Walk.test.tsx`, the `<Walk>` / `<WalkTo>` lines in `app/App.tsx`, the walk block in `app/app.css`. Otherwise none outside my open PRs #65 (`sim/analysis.ts`, one argument in `app/App.tsx` Flight) #68 (`ui/builder/builder.css`) #70 (`ui/story/`) and #80 (`ui/hangar/`), #74 (`app/StoryLayer.tsx`, `<StoryLayer>` lines + `online`/clock hold in `app/App.tsx`).

### Just finished
Added Submission readiness to the board (record demo, submit, code freeze Sun 18:00, launch 20 s vs 10 s). Checked the walk + cutscenes on the live site at 375 px, keyboard and screen-reader structure: no change needed.
Offline cache covers every file in public/, incl. cursor@kaipo's flight models (PR #93). Add a file to `public/` → add it to `pwa/public-files.ts` (a test tells you). Not checked: an offline reload in a browser.
3D scenes inside the cutscene frame (cursor@caleb's handoff 1340, branch aiden-claude/cutscene-scenes): arrival, orbit, anomaly, ending in `app/StoryLayer.tsx`. Seen in the game: arrival, anomaly, ending (loss). Not seen in the game: Moon/Mars orbit, ending (success).
Walk between stations (PR #87): `ui/hangar` behind every screen, each screen a panel over the hall; no WebGL = today's screens. Not checked: co-op in two browsers, a real phone, a screen reader.
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

**Branch:** main (completion coordination); aiden-codex/desktop-polish (PR #135)
**Last updated:** 2026-11-14 16:24

### Working on right now
First-person desktop polish complete in PR #135. No new source work claimed. Ethan remains merge coordinator; merged #132 training is now integrated inside the new menu with shared clock hold. Claude branches/section untouched.

### Files / folders I'm touching (hands off)
PR #135 app/World + WorldMenu, StoryLayer, additive App skipLaunch prop/test, app.css; ui/fps input + room-loop/tests; hangar/interior control loop changes; docs/qa/desktop-world.md. Released for integration on merge. Did not create app/World.test.tsx (Ethan #132 owns that file), edit scene3d, other owners' branches, or docs/CHALLENGE 2.md.

### Just finished
One Menu/Escape dialog and noninteractive radio subtitle; #133 live replies preserved in that same radio. Both rooms suspend callbacks under menus/cutscenes/hidden tabs. Cabin does not rebuild unchanged craft each sim tick. Input release/focus/pointer cancellation and final bob frame fixed. Classic switch skips an already-watched launch. 3D scores saved with separate Daily keys. Full first-person regular 26/0 stars and Daily 25/0 runs; planning/radio/power module choices answered. Production default3D, menu, Classic/no-WebGL checks pass. 532 tests/typecheck/build pass, 146.3/150 kB. Local sample 60 FPS, renderer mean1.41ms; 4x CPU sample p95 interval17.9ms. Full limits in report.

### Missing / I need from someone
Ethan: review/merge ready #135; the newly merged #132 conflict is resolved and training is preserved inside WorldMenu. Running/manual-pause return tested. Physical low-end laptop/GPU, native pointer-locked Escape and cross-device co-op remain checks for the team. Actual 3D weather/leaderboard display is separate; persistence is fixed. Vercel auto-link still needs the account-owner action.

### Heads up for other agents
#124 is now merged; its defaults/preloading/resolution/culling/gauge fixes are preserved. #133 was integrated normally, maintaining Sarah's source and theme. No dependencies, model assets, sim/shared changes or mobile work. Sol remains suitable.
