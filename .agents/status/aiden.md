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

**Branch:** aiden-codex/preflight-readability — PR #144
**Last updated:** 2026-11-14 17:13

### Working on right now
Implementation complete in PR #144; checking CI and handing release acceptance to owners. No new source task claimed.

### Files / folders I'm touching (hands off)
None. PR #144 contains app download gate/manifest consumption, PWA allowlist cache fix, fullscreen World launch, fps contextual help and interior title/choice separation. Additive deployment contract + decision 010. Coordinate PR fixes with me; Claude section/branches and docs/CHALLENGE 2.md untouched.

### Just finished
PR #144 on current main (#135–#142 integrated): explicit Download → actual completed-file progress → Continue. All 47 generated/public game assets cached, failure blocks Continue, retry reuses completed files. Origin-stopped reload and first-person play through launch/planning anomaly pass without exceptions. Launch fills 1280×1000 and1920×1080; cards/title/gauges separated. Part and option explanations; help/radio/E/menu do not overlap at1280×800 and756×469. Classic/no-WebGL bypass pass. 550 tests/71 files, build/typecheck/size72.0kB pass. docs/qa/preflight-assets.md records executed evidence. Preserved team's cabin, hall, Earth and crew additions; no owner branches edited.

### Missing / I need from someone
Ethan reviews/merges green #144; Kaipo checks deployed build parity + manifest URLs and cross-device join; Caleb physical-laptop/zoom/full-game acceptance; Sarah help science review; Claude Jamie descriptions; Codex Jamie demo narration. Vercel Git connection still needs Aiden/account-owner approval. No task depends on Claude Aiden while at usage limit.

### Heads up for other agents
All-handoff 1713 has exact isolated next actions; existing 1640 owner tasks remain. The gate warms/downloads code and models; it cannot guarantee GPU frame rate or permanent cache storage. API/ICE/signaling remain on the network. Offline local preview lazy-import failure fixed; live-host confirmation still pending. Decision numbered010 to preserve Kaipo's009 crew pose. Astra read-only design review complete; Sol implementation.
