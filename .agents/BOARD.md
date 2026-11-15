# Task board

**How to take a task (full rules: AGENTS.md → "Task workflow"):** pull → pick the top Open task with no tag (P0 before P1 before P2; skip `owner:` tasks that aren't yours) → move it to In progress with your tag and **push that alone** (the lock) → pull again and check only your tag is on it → work on your branch → open a PR → move it to Done with the PR # and **push again** → take the next one.
Format: `- [ ] (size) [priority] task — folder — needs: … — owner: … — [agent@human]`
Game plan (screens, folders, MVP): `docs/GAME_PLAN.md`.

**Current go-ahead:** Aiden authorizes non-overlapping owned/claimed work; claude@ethan is the sole merge coordinator. Pages is deployed through Actions (scaffold live); the app loop remains unmerged. Read AGENTS.md + the newest codex@aiden all-agent go-ahead handoff. Older permission/Pages requests below are answered by this note; technical blockers still require verification.

## Open


- [ ] (light) [P1] Investigate first-use offline lazy scene import failure in local production preview (Start/GLBs cached, Builder error boundary); compare Pages headers before asserting live impact — pwa/ + config owner: claude@aiden — needs: reproduction in docs/qa/offline-cache.md PR #101; no source claim transferred

- [ ] (medium) [P2] Fly scene tied to sim time (craft position from `t_s`, ground stations, downlink beam, part highlight) — ui/scene3d/ — released by claude@ethan 13:55 so it does not block anyone; unfinished work is on branch `ethan-claude/scene3d-fly`. Ask claude@ethan before taking it (the folder is his)

### Interactive 3D overhaul (Aiden: both modes, spacecraft flight first; plan PR #69)
These are new work packages, not active claims. Suggested owners claim only their isolated scope with the normal lock push. Ethan keeps ui/scene3d/, part models, launch/fly branches, app/sim/shared/e2e. No immediate change or response is needed from him; V7 is a later integration checkpoint. Existing Start/Lobby/Tutorial graphics remain codex@jamie's current task.




### First-person story (decision 005, Aiden 14:45: walk through the mission tasks, cutscenes, pop-outs; GAME_DESIGN.md §4.9)
<!-- Split 15:50 at Aiden's request ("split it so we get as much done as we can within usage limits"): nothing here waits on claude@ethan. His claimed ui/scene3d/ work (part models, launch sequence, fly scene) stays his. New folders, so nobody collides. -->
- [x] (light) [P1] → The 3D rooms + guided walk are now **V6** (`ui/hangar/`, claude@aiden, Done, PR #80): same thing as decision 005's rooms, so one task

### Playtest 14:15 (claude@aiden played main start → results; details in handoff 20261114-1420 playtest)

### Improvements (added by claude@aiden 12:55, ideas from playing the builder + the game design)

<!-- The six build tasks below are proposed by claude@ethan (one folder each so nobody collides). Rename or split them if your human disagrees. -->
<!-- Ethan has the most agent usage, so claude@ethan takes the heavy ones (sim core + app loop are claimed below). If a task turns out bigger than your usage allows, hand the hard part to claude@ethan with a handoff instead of dropping it. -->

### P0 — playable solo game on the live link

### P1 — online co-op + teaching

### P2 — nice-to-haves from the brief

### Game design (decision 004, proposed, see docs/game-design/GAME_DESIGN.md §8)

### First-person 3D game (decision 007, Aiden 14:50: "get rid of the 2D game design"; contract: CONTRACTS.md → Interactables)
Milestones: **Sat 20:00** each piece works alone in its own preview · **Sun 02:00** whole loop start → debrief in the app behind `?world=3d` · **Sun 08:00** 3D is the default, 2D only the no-WebGL / screen-reader fallback · **Sun 10:00** code freeze · **Sun 12:00** demo recorded. Words budget: one CAPCOM line + one "E · …" prompt + numbers on gauges; labels ≤ 4 words.
- [x] (heavy) [P0] First-person controller: WASD walk, mouse look with pointer lock, E on the Interactable you face within reach, one-line prompt, box collisions, Shift faster, reduced motion; tests + preview — ui/fps/ (new) — by Sat 20:00 — owner: claude@aiden — [claude@aiden] — in PR #107: preview /ui/fps/preview.html; touch hooks `setMove` / `addLook` / `interact` ready for codex@aiden
- [x] (heavy) [P0] Mission control you play in: call wall (title + 3 numbers), assembly-bay part racks (E fits a part via `set_param`), bay gauges, four GO / NO-GO desks with one line each, launch button, debrief wall + "try the fix" — ui/hangar/ — needs: ui/fps, claude@jamie short labels, claude@sarah wall lines (stand-ins until then) — by Sun 02:00 — owner: claude@aiden — [claude@aiden] — in PR #114 (on #107): played start → debrief with real keys behind `?world=3d`; leaderboard not in the 3D debrief yet
- [ ] (medium) [P0] App runs the 3D loop by sim phase (`app/World.tsx`): mission control in design, the walk-in spacecraft in flight, debrief at the end; story pop-outs + cutscenes kept; `?world=3d` first, default by Sun 08:00, "Classic view" link to the 2D screens — app/ — owner: claude@aiden — [claude@aiden] — in PR #114: design + debrief in 3D, flight stays 2D until the walk-in spacecraft lands; still behind `?world=3d`, default flip by Sun 08:00 is a separate step
- [ ] (light) [P1] Demo script + pitch rewritten for the 3D game (walk, fit parts, launch, fix an anomaly inside the spacecraft, debrief) — docs/DEMO.md, docs/PITCH.md — by Sun 08:00 — owner: codex@jamie

### Submission readiness (added by claude@aiden 20:50 after playing the live site start → debrief; deadline Sun 15 Nov 23:59)
- [ ] (light) [P0] **Record the 30-second demo** on the live site and fill "Recording evidence" in docs/DEMO.md (take length, build commit, link). Live site plays clean start → debrief as of ae29027 — docs/DEMO.md — owner: a human (Aiden or team) with codex@jamie (DEMO.md)
- ~~[ ] (light) [P1] **Code freeze** Sun 15 Nov 18:00: after that only fixes for things that break the demo path, so the recorded video matches the live site — merge coordinator: claude@ethan~~ superseded by the 10:00 line below (claude@aiden)
- [ ] (light) [P1] **Code freeze** Sun 15 Nov 10:00 (moved from 18:00: Aiden wants it done by about 13:00): after that only fixes for things that break the demo path, so the recorded video matches the live site — merge coordinator: claude@ethan
- [ ] (light) [P1] **Launch cutscene is ~20 s**, decision 005 says cutscenes ≤ 10 s (Skip exists). Shorten it or record the exception in decision 005 — ui/scene3d/ — owner: claude@ethan

### Accuracy audit + awards push (claude@sarah 18:45, Sarah's request; full report: docs/game-design/ACCURACY_AUDIT.md)
- [ ] (light) [P1] **Schedule bar in the builder** (brief: show Time clearly): the sim gives `schedule_months` / `deadline_months` now that parts have build times (PR #105); today time only shows as an error — ui/builder/ — owner: claude@aiden

### UX declutter + fun (Sarah's ask 22:40; spec with word budgets: docs/game-design/UX_DECLUTTER.md)
- [ ] (heavy) [P0] **Builder: cards instead of spreadsheet tables** (1,394 words, 8 screens tall → ≤ 250 words, no page scroll): one slot per tab (Orbit → Rocket → Bus → Instruments → Power → Battery → Radio), part cards with 2 key stat chips, pinned resource bars with ghost deltas on hover/tap, full table behind "Compare all ⓘ", one-line issues + ⓘ — ui/builder/ — owner: claude@aiden
- [ ] (light) [P1] **Briefing:** 3 fact chips + bonus chip, "How to win" as 3 icon rows ≤ 8 words, glossary wall → tap-to-learn chips (385 → ≤ 90 words) — ui/briefing/ — owner: claude@aiden
- [ ] (light) [P2] **CAPCOM pop-outs auto-dismiss** after ~6 s unless hovered/focused; on results it covers the leaderboard card — ui/story/ — owner: claude@aiden

## Missing / needed
- Vercel site kimchispacemission.vercel.app does not update on push (still old bundle after PR #129); needs claude@aiden to approve the Vercel GitHub app or cursor@kaipo to redeploy — [found by claude@sarah]

- Desktop QA #118 on #114 head 1804d2b: design→flight→3D debrief→Try the fix works, but no personal best saved. Claude World owner follow-up before 3D default. Native Escape/hardware and full 3D interior remain unverified; smaller prompt/focus observations in report — [found by codex@aiden] **Resolved in PR #135:** saved 3D regular/Daily records and played first-person flight/module choices; physical hardware/native pointer-lock Escape still unverified.
- 5 duplicate handoff files ending in " 2.md" (identical copies, e.g. `20261114-2305-claude@sarah-all-ux-declutter 2.md`) were committed in fad54ba; safe to `git rm` them — claude@aiden (committer) — [found by claude@sarah]

- Jamie reached Claude usage limit; codex@jamie takes over Jamie follow-ups. Sarah fixes are PR #105; Claude Jamie sunlight is PR #108; Codex regression/integration checks are PR #109. Merge coordinator Ethan has the handoff — [found by codex@jamie]

- Offline QA PR #101: local preview fresh-cache offline Builder fails on lazy Hangar/canvas/SpaceView imports; online control succeeds. All six public files pass offline. Root cause and Pages impact unconfirmed; PWA owner claude@aiden follow-up — [found by codex@aiden]


- Source audit PR #90: catalog references are background for exact game values; reconcile conflicting GRAIL launch masses and add GOES launch-year evidence. LRO 1,846 kg is supported by the cited NSSDCA source. Story citations are done (PR #85). Glossary provenance is in ui/learn/README.md (DSN, reaction wheel, RTG, solar flux, coverage). Data rows stay with claude@sarah / codex@jamie — [found by codex@aiden, glossary updated by cursor@kaipo]

- Updated after 8c0f3cb snapshot: rooms, non-launch cutscene mounting and all public-file precache landed (#87/#91/#93). Ethan has claimed both V7a scene + V7b app mount; earlier optional Codex assembly offer is withdrawn to avoid duplicate ownership. V7/device acceptance remains with owners; separate offline preview finding in PR #101 — [found by codex@aiden]


- V1 input kit PR #78, V2 HUD #76, V3 assets #75 and V4 route #73 are available; V7 still must connect real craft movement/aiming, held target scans and scene feedback. V5 #77 is a test plan, not executed flight QA. V6 rooms now belong to Claude Aiden per 1555 split. Scored maneuvers still require agreed sim/CONTRACTS work — [found by codex@aiden]

- Supersedes the 12:07 check: difficulty, Daily, GO/NO-GO, stars/weather/tips/sound and lazy 3D are integrated. Focused Daily/regular record regression passes on de0d869 (PR #56 report, 316 tests/build). The old completion handoff is historical for those integrations; venue rehearsal, full phone/a11y, final demo/submission and newer app-safety validation remain separate — [found by codex@aiden]

- Resolved: builder tips are mounted in the app. PR #72 adds modal focus, Escape, Tab containment and replay; verified in the assembled builder — [found by codex@jamie]

- Resolved 12:07: Pages serves the real game (PR #42); codex@aiden completed live solo Start → Results (First Light Normal, starting design, 60×, science_shortfall, 26 points). Older scaffold/Pages permission blockers below are historical; Caleb and Kaipo can resume their checks — [found by codex@aiden]

- Resolved: leaderboard #19/#37 props are now integrated. Live Daily 100 points/3 stars survives two reloads plus independent regular 69/0 and lower Daily 69/0; saved score, stars and original design remain paired. Evidence: PR #56, daily-regression-verified handoff — [found by codex@aiden]

- Theme PR #16 is imported by app; builder/briefing use tokens. app currently pins Start/Lobby/Mission dark because those screens retain local palettes. Full light-theme adoption remains with screen owners; no blocker to the current dark game — [found by codex@aiden]

- Resolved: original First Light catalog/sim mismatch fixed in sim-data #26, now on main; real-data playthrough tests pass. Historical snapshot remains in docs/INTEGRATION_REPORT.md — [found by codex@jamie]

- Live WebRTC join works on one computer and across devices on kimchispacemission.vercel.app (docs/MULTIPLAYER_TEST.md, 2026-11-14). Fifth player, launch sync, guest leave, and host close pass in app/coop.test.ts; those four were not repeated on separate devices — [found by codex@jamie, updated by cursor@kaipo]
<!-- anything an agent noticed is missing, broken, or needed by someone else -->
<!-- - thing — who needs it — [found by agent@human] -->
- GitHub Pages not enabled yet (Settings → Pages → Source: GitHub Actions) — deploy in PR #4 needs it — repo owner (Aiden) — [found by claude@aiden]
- ~~Live-site phone screens opened mid-page~~ resolved 12:45: after scrolling the start page to the bottom, briefing and builder on a 390px view both open at scrollY 0 (h1 on screen). https://asigurdsdev.github.io/space-apps-2026/ — [found by cursor@caleb]
- V5 flight checks are not run. Fill the result column in docs/qa/flight3d.md (PR #77) when V7 is on a build — cursor@caleb — [found by cursor@caleb]
- ~~Challenge + engine/stack not picked yet~~ resolved 10:07: Space Mission Design Game, TS + Vite + React (decision 002) — [found by claude@ethan]
- ~~Open PRs need a human review + merge~~ resolved 11:28: 21 PRs merged, `main` is c1b8d30 and the site is live — [found by claude@ethan]
- PR #1 (jamie/setup) conflicts with main and is out of date — Jamie — [found by claude@ethan]
- Sarah and Caleb have no agent set up yet (blank status files) — Sarah, Caleb — [found by claude@ethan]
- README Team table: every Role is blank — everyone — [found by claude@ethan]
- BOARD `## Open` is empty; Kaipo and Caleb have nothing to claim — need structured next tasks from repo lead — [found by cursor@kaipo] — handoff `20261114-1029-cursor@kaipo-claude@aiden-open-task-list.md`
- Multiplayer rehearsal 2026-11-14 11:35: live site and localhost still show the scaffold page, so Host/Join never appeared and Run A failed before a room existed — claude@ethan (`app/`) — [found by cursor@kaipo] — PR #27

## In progress
- [ ] (medium) [P1] **Start: mission cards** instead of the dropdown (art + one line + budget/goal chips), difficulty as a segmented control, helper sentences cut (350 → ≤ 120 words); fixes the repeated (Easy)/(Hard) list — ui/start/ — owner: codex@jamie — [codex@jamie]
- [ ] (medium) [P1] **Stable frame rate in the 3D scenes I own:** measure, then fix the space view, spacecraft parts, launch cutscene and flight training (pixel-ratio cap, no per-frame allocation, stop rendering when hidden, lighter shadows); builds on codex@aiden's PR #135, does not touch ui/fps, ui/hangar, ui/interior — ui/scene3d/, app/Training.tsx — owner: claude@ethan — [claude@ethan] — branch ethan-claude/scene3d-perf
- [ ] (light) [P2] **More NASA rockets** (claude@ethan handoff 1415): `atlas-v`, `delta-iv-heavy`, `falcon-heavy` rows with sourced numbers, plus one checked NASA mission in every launch vehicle description — data/catalogs/launch-vehicles.json — [claude@jamie]
- [ ] (medium) [P1] Cutscenes "into the walk-in spacecraft" (after launch) and "back to mission control" (after the ending), ≤ 10 s, Skip + reduced motion as now; QA plan for the 3D loop, run on the Sun 02:00 build — ui/cutscenes/, docs/qa/ — owner: cursor@caleb — [cursor@caleb] — scenes and plan in PR #115 (`EnterCraftScene` 8 s, `ReturnControlScene` 6 s, `docs/qa/first-person.md`). The Sunday 02:00 run is not done. Mount handoff to claude@aiden.
- [ ] (light) [P1] **Walk + cutscenes on a phone and with reduced motion / a screen reader:** hall and panels at 375 px, reduced motion cuts straight to each station, screen reader hears the screens not the hall, cutscene Skip/Escape works — app/Walk.tsx, app/StoryLayer.tsx, app/app.css — owner: claude@aiden — [claude@aiden]












- [ ] (heavy) Multiplayer rooms + transport: PeerJS/WebRTC host-authoritative co-op for up to 4, room codes, role claim, LocalTransport fallback (decision 002) — net/ — [codex@jamie]


## Blocked


## Done
- [x] (light) [P1] Show each console's **priority** on the GO / NO-GO poll so co-op players negotiate before launch (GAME_DESIGN §4.7) — ui/gonogo/ — owner: claude@jamie — [claude@jamie] — in PR #136: priority chip per console, one line + ⓘ, 41/78/68 words (≤ 80)
- [x] (light) [P1] **GO / NO-GO:** one short line per console + ⓘ for the rest, plus each console's priority chip (171 → ≤ 80 words) — ui/gonogo/ — owner: claude@jamie — [claude@jamie] — in PR #136: priority chip per console, one line + ⓘ, 41/78/68 words (≤ 80)
- [x] (light) [P1] Preserve personal-best saving in the 3D debrief before default flip: World bypasses LocalLeaderboard, so completed score/design/stars are not stored; reuse existing save helper, preserve daily/regular separation — app/World.tsx — owner: claude@aiden — needs: desktop evidence PR #118; no Codex source claim — completed by codex@aiden at Aiden request in PR #135; regular 26 and Daily 25 retained separately
- [x] (medium) [P0] Finish desktop first-person performance + menu polish, authorized by Aiden after Claude limit: build on #124 without editing Claude branches; single game menu, clear radio/prompt layout, suspend covered rooms, reliable input recovery and played checks — app/World.tsx + WorldMenu/tests + StoryLayer/tests + app.css; ui/fps/; ui/hangar/{control,MissionControl}.tsx/ts; ui/interior/{control,SpacecraftRoom}.tsx/ts; docs/qa/desktop-world.md — [codex@aiden]; scope add: app/App.tsx + App.test.tsx skipLaunch prop only (no V7 edits) — in PR #135: single menu/radio, covered-room suspension, stable craft geometry, input/Classic handoff and saved records; #133 + newly merged #132 integrated; training menu/pause return verified; 532 tests/build pass, 146.3/150 kB
- [x] (light) [P1] Flight training reachable from the 3D first-person game (Ethan's request) — app/World.tsx, app/World.test.tsx, app/app.css — [claude@ethan] — in PR #132: a Flight training button in the 3D game's top bar while the mission flies (hidden during the launch, a cutscene, an anomaly card and the debrief), opening the same `app/Training.tsx`; the bar wraps to a second row. Played in a browser from 3D mission control to the training and back. codex@aiden: it is one block in the bar, move it into your menu as you like.
- [x] (light) [P0] `short_label` (≤ 4 words) for every catalog row the player picks (orbits, launch vehicles, buses, solar, battery, instruments, comms, ground stations) + a test for the length — data/catalogs/ — by Sat 20:00 — owner: claude@jamie — [claude@jamie] — in PR #130: 43 rows, ≤ 3 words each so "Fit <label>" ≤ 4; test in data.test.ts; 520 tests. No ground-station catalog exists yet
- [x] (light) Launch into orbit and the satellite deploy read clearly — ui/scene3d/launch/scene.ts — [cursor@caleb] — in PR #128: the burn shot holds the upper stage over the Earth limb; the stage drifts back and the satellite coasts clear, with the camera above the gap. Timeline length is unchanged. Rocket meshes stay as in PR #123.
- [x] (medium) [P2] **Arrival cutscene as a realistic Mission Control room** (Jamie's request): first-person walk into a room modeled on NASA's Flight Control Room (tiered console rows with monitors, front display wall, ceiling lights), instead of blocks; adds to PR #127 — ui/cutscenes/canvas.tsx `arrival()` only (cursor@caleb agreed in person) — [claude@jamie] — in PR #127: 503 tests, build OK, browser-checked desktop + 375 px
- [x] (heavy) [P1] V7 flight training integration — ui/scene3d/flight/ + app/ — [claude@ethan] — in PR #125 (`FlightView`: the player's craft over the real-map planet, chase camera, V4 targets, takes V1 `PilotIntent`, gives V2 `focus`) and PR #126 (a **Flight training** button on the mission screen opens it with `<FlightHud>` + `<PilotInput>`; practice only, no sim commands, solo clock held). Not done: pause, recenter, free-look (QA cases F3, F7); online room and a real phone not checked. cursor@caleb: `docs/qa/flight3d.md` can be run now.
- [x] (medium) [P1] Rockets fully rendered (Ethan's request) — ui/scene3d/launch/ — [claude@ethan] — in PR #123: seams, weld rings, ribs, fasteners, foam grain, frost and flags on every vehicle (bump + roughness maps), detailed engines with one jet each, sun shadows, pad vapour, tower and flame trench; the launch backdrop uses the real Earth map. No logos or NASA insignia. Everything is from memory: `ui/scene3d/launch/REFERENCES.md` → by eye.
- [x] (light) [P2] **Arrival cutscene screens look like mission control** (Jamie's request): the 6 flat screens get drawn content (ground track, telemetry, clock, status, Earth feed, GO/NO-GO); timing, Skip, reduced motion unchanged — ui/cutscenes/canvas.tsx `arrival()` only (cursor@caleb said yes in person, handoff 2320) — [claude@jamie] — in PR #127: 503 tests, build OK, browser-checked desktop + 375 px
- [x] (heavy) [P1] Browser end-to-end tests of the assembled game — e2e/ — [claude@ethan] — in PR #117 with the app review fixes: `solo.mjs` plays every scenario at every difficulty from Start to results (all 15 cases pass on main, Sandbox included), `coop.mjs` plays an online room and one-screen play. **Online cases not verified today:** the guest's join timed out on this machine, also on older commits where it passed earlier, so it looks like the network here. How to run: `e2e/README.md`.
- [x] (heavy) [P0] Walk-in spacecraft (digital twin in the ops room): each part you picked as a module on the walls (from `buildCraft`), gauges from `state.metrics` (battery, storage, science, money, day), time lever (`pause` / `resume` / `set_speed`), anomaly = alarm + the affected module flashes + 2–3 choice Interactables (`resolve_decision`), window showing the real craft in space (SpaceView). Exposes `interactables` + `obstacles` per the contract; preview — ui/interior/ (new; moved out of ui/scene3d so claude@ethan's folder is untouched) — by Sun 02:00 — owner: claude@ethan (suggest V7 flight training waits until after this) — [claude@aiden] taken at Aiden's request 15:30 (not started by claude@ethan; handoff 1530) — in PR #120 (on #114 → #107): flown with real E presses (launch → cabin → planning card answered → speed 60×); module-placed choices unit-tested only; next steps in ui/interior/README.md
- [x] (light) [P1] Independent desktop acceptance of published first-person mission control (#107/#114): keyboard/mouse, interaction reach/permissions, Escape recovery and design-to-debrief evidence — docs/qa/desktop-world.md (new); owner source read-only, separate from Caleb first-person plan — [codex@aiden] — in PR #118: pinned #114 1804d2b desktop loop + Try the fix pass; record persistence missing; 477 tests/build/size pass after one timing retry
- [x] (light) [P0] **Submit:** judging form text in docs/SUBMISSION.md — [cursor@caleb] — in PR #111: paste sheet, planet-map and hardware references, Spirit URL matches the card, live link opens the game. Video URL is still empty (recording task). A person still presses Submit. Six world props are project-original (`docs/visual-assets/world.md`); that one sentence is not in the PR.
- [x] (medium) [P1] Prop models for the 3D game: part rack, console desk, launch button, alarm beacon, time lever, gauge frame — public/visual-assets/world/ — [cursor@kaipo] — six original GLBs, about 22 kB, floor at y=0, propId on the root; listed in pwa/public-files.ts. Scene placement stays with claude@aiden and claude@ethan.
- [x] (light) [P1] Re-run the four-device multiplayer rehearsal once Host online and Join are on the live site. Fill docs/MULTIPLAYER_TEST.md again — docs/MULTIPLAYER_TEST.md — [cursor@kaipo] — cross-device join on the Vercel site passed 2026-11-14 (no hotspot). Fifth player, launch sync, and disconnect were not re-scored.
- [x] (medium) [P1] Touch controls for walking: left-thumb move pad, drag to look, E button; gives `{ move: [x, y], look: [dx, dy] }` + interact — ui/pilot-input/ — by Sat 20:00 — owner: codex@aiden — [codex@aiden] — in PR #110: independent analog move + drag-look + press interact, preview/tests; FPS/app adoption and physical phone acceptance remain
- [x] (light) [P0] Sunlight audit takeover, authorized by Jamie after Claude limit; supersedes Claude Jamie sunlight claim below. Scope: orbits.json, data.test.ts, playthrough.test.ts, data/README.md — [codex@jamie] — in PR #109: adopted #108, verified with #105, 471 tests/build pass
- [x] (light) [P0] **Sunlight column:** `solar_flux_factor` in data/catalogs/orbits.json (Earth/Moon 1, Mars 0.43, handoff 1520 from claude@ethan); Mars reference design must still win — data/catalogs/orbits.json — [claude@jamie] — in PR #108: Mars now starts with the large solar array (medium gives 266 W of the 450 W needed); 461 tests, 467 with PR #105 merged
- [x] (light) [P2] Glossary: Deep Space Network priority "such as a launch or landing" (card source says launches); add terms rtg, solar-flux, coverage — ui/learn/ — owner: cursor@kaipo — [cursor@kaipo] — in PR #106: DSN says launch or landing; reaction wheel no longer treats every failure as coarse pointing; provenance in ui/learn/README.md
- [x] (medium) [P1] Planet relief from real elevation (Ethan's request) — ui/scene3d/shaders.ts, maps/, world.ts — [claude@ethan] — in PR #104, on top of claude@jamie's maps (PR #102): LOLA (Moon) and MOLA (Mars) elevation shade real crater walls, basins, Olympus Mons, Tharsis and Valles Marineris at the day/night line (drawn 5x steeper, said in maps/README.md); Earth seen from the Moon and the Moon seen from Earth use the NASA maps. Sources in `ui/scene3d/maps/README.md` (cursor@caleb: two new rows for the References list).
- [x] (light) [P1] **Walk + cutscenes on a phone and with reduced motion / a screen reader:** hall and panels at 375 px, reduced motion cuts straight to each station, screen reader hears the screens not the hall, cutscene Skip/Escape works — app/Walk.tsx, app/StoryLayer.tsx, app/app.css — owner: claude@aiden — [claude@aiden] — checked on the live site, no change needed: 375 px panel fits (no sideways scroll), hall inert + aria-hidden, Skip focused on open (44 px) and Escape skips; reduced motion by code (walk wait 0, hall cuts, cutscene shows its still). Small leftovers: phone CAPCOM overlaps the panel top 14 px for ≤ 9 s; during a walk (≤ 2.4 s) the hidden panel is still tabbable. Not checked: a real phone, a real screen reader
- [x] (medium) [P1] Cloudflare TURN relay for cross-network rooms — api/ice.js, app/room.ts, vercel.json — [cursor@kaipo] — live at https://kimchispacemission.vercel.app (`/api/ice` returns turns:443). GitHub Pages keeps the direct PeerJS path. Four-player cap unchanged.
- [x] (light) [P1] Browser verification of merged offline public-asset cache: fresh install, offline reload, lazy scenes and all flight GLBs; evidence only — docs/qa/offline-cache.md (new), source read-only — [codex@aiden] — in PR #101: Start reload + all six public files pass with origin stopped; local preview first-use offline lazy imports fail, online control passes; Pages not reproduced
- [x] (medium) [P1] Realistic rockets (Ethan's request) — ui/scene3d/launch/ — [claude@ethan] — in PR #98: Falcon 9, rideshare Falcon 9, Electron, Pegasus XL, Vulcan Centaur, SLS Block 1 modelled on the real rockets at real size; Atlas V 401, Delta IV Heavy and Falcon Heavy are modelled too and wait for catalog rows (`atlas-v`, `delta-iv-heavy`, `falcon-heavy`, handoff 20261114-1415 to claude@jamie). Sources: `ui/scene3d/launch/REFERENCES.md`.
- [x] (medium) [P1] Realistic spacecraft parts (Ethan's request) — ui/scene3d/parts/ — [claude@ethan] — in PR #97: every bus, power, radio and instrument model patterned on named NASA hardware (MarCO, CAPSTONE, GRAIL, MAVEN, MRO, MMRTG, LRO, NISAR, ...). Sources and which numbers are estimates: `ui/scene3d/parts/REFERENCES.md`.
- [x] (light) [P2] No rocket nozzle on buses with `propulsion_delta_v_ms: 0` (3U, 6U) — ui/scene3d/parts/ — [claude@ethan] — in PR #97, with a test.
- [x] (medium) [P1] More of the real sky (Ethan's request) — ui/scene3d/world.ts, sky.ts — [claude@ethan] — in PR #96: the Moon from Earth orbit, Earth from lunar orbit (fixed over the near side), Phobos and Deimos at Mars, all at real size, distance and pace (NASA fact sheets). Axial tilt not changed: the scene's Sun already stands 20° north of the equator, close to Earth's and Mars's summer tilt.
- [x] (light) [P1] Offline cache covers everything in public/ (the flight models from cursor@kaipo's V3 pack are not cached today), so flight training works on bad venue wifi — pwa/, vite.config.ts — owner: claude@aiden — [claude@aiden] — in PR #93: `pwa/public-files.ts` lists all six public files, a test fails when one is missed; not checked with an offline reload in a browser
- [x] (light) [P0] **Science fix: solar power falls with distance from the Sun** — sim/design.ts — [claude@ethan] — in PR #92: solar power × orbit `solar_flux_factor` (optional column, default 1, RTG unaffected). It takes effect when claude@jamie's data column lands.
- [x] (light) [P1] **Orbit coverage** — sim/design.ts — [claude@ethan] — in PR #92: an imager off its `best_orbit` earns half its science × the orbit's `coverage_fraction`. `orbitScienceFactor` is exported from `sim` for the builder badge.

- [x] (light) [P1] **Source link check:** every `source_url` in data/, docs/game-design/, ui/learn resolves (HTTP 200) and says what we claim; list failures — docs/qa/sources.md (new) — owner: codex@aiden — [codex@aiden] — in PR #90: 37 links checked (34 HTTP200, 3 HTTP403 readable via web), 1 template; complete evidence + owner findings
- [x] (medium) [P1] Walk between stations instead of switching screens: mount the V6 rooms behind the screens, walk on each screen change, task panels pop out at each station (falls back to today's screens with no WebGL) — app/ — needs: V6 — owner: claude@aiden (split from claude@ethan at Aiden's request 15:50) — [claude@aiden] — in PR #87: hall behind every screen (`app/Walk.tsx`), walk on each screen change incl. the pad during launch, screens as panels; plain screens with no WebGL; full solo game played desktop + phone
- [x] (light) [P0] **Submission fixes for judging rules** — docs/SUBMISSION.md — [cursor@caleb] — in PR #88: 30-second video or 7 slides, OMNI called measured data, live site is the game, full references list. URL checks stay with codex@aiden.
- [x] (light) [P0] **30-second demo script + NASA data story** in PITCH/DEMO/NASA_SOURCES: real space weather drives storms, real missions on the debrief, real anomaly stories; audit report §Awards has the beat list — docs/PITCH.md, docs/DEMO.md, docs/NASA_SOURCES.md — owner: codex@jamie — [codex@jamie] — in PR #86: timed shots, 63-word narration, real NASA provenance and display-only weather boundary; 35 focused tests pass

- [x] (medium) Accuracy + requirements + awards audit (docs/game-design/ACCURACY_AUDIT.md) and Team priorities card on the debrief (ui/mission/) — [claude@sarah] — in PR #85; findings are the 13 tasks under Open → "Accuracy audit + awards push"
- [x] (light) [P1] 3D part models — ui/scene3d/parts/, craft.ts, model.ts — [claude@ethan] — PR #84 on `main`: a model for every catalog row, `buildCraft` unchanged; 437 tests; checked in the builder in a browser
- [x] (medium) [P1] Launch cutscene — ui/scene3d/launch/, app/ — [claude@ethan] — PR #83 on `main`: `<LaunchView state onDone />` (pad, lift-off, staging, fairing, burn to orbit; a model per launch vehicle; captions, Pause, Skip, reduced motion), played after every launch with the mission clock held; checked in a browser. About 20 s, longer than decision 005's 10 s: say if it should be cut
- [x] (medium) [P1] Sim: random events + difficulty knobs — sim/ — [claude@ethan] — covered by the anomaly cards (PR #60) and `anomaly_cards` per difficulty (claude@jamie, PR #67); closed
- [x] (light) Story script in the game: ui/story `LINES` = STORY.md (≤120 chars), Mars delay sourced — ui/story/model.ts (LINES only), docs/game-design/STORY.md — [claude@sarah] — PR (see log), ready to merge: 405 tests, build ok
- [x] (heavy) [P1] Cutscene scenes in 3D: arrival, Moon/Mars orbit, anomaly alarm, ending — ui/cutscenes/ — [cursor@caleb] — in PR #81. Launch stays with claude@ethan. Scenes are not mounted yet: handoff to claude@aiden for `<Cutscene>` children in app/StoryLayer.tsx.
- [x] (heavy) [P1] V6 Walkable mission control = decision 005's rooms — ui/hangar/ (new) — [claude@aiden] (split from claude@ethan at Aiden's request) — in PR #80: six stations in one hall (wall, bay with your spacecraft, consoles, pad window, ops, debrief), guided walk, tap/buttons/keys, WASD look, lazy, render on demand; walked in the preview desktop + phone. Next: app/ walk task
- [x] (medium) [P1] V1 Flight input kit: focused keyboard + touch movement intent, brake/interact, Escape/blur release; isolated preview + tests — ui/pilot-input/ (new) — needs: plan PR #69 — owner: codex@aiden — [codex@aiden] — in PR #78: 364 tests/build/size pass; focused keyboard + independent pointer holds, held scan intent + press edge, cleanup, preview; V7 adoption remains

- [x] (light) [P1] V5 3D interaction QA: movement/target loop, touch/focus/Escape, loading/WebGL fallback, offline and measured phone FPS — docs/qa/flight3d.md (new); source read-only — [cursor@caleb] — in PR #77: test plan only. Result column is still "not run" until V7 is on a build you can open.
- [x] (medium) [P1] V2 Flight HUD: objectives/checklist, aimed-target scan bar + V4 feedback, result + real fact/source, hints prop for V1, hold-to-scan/recenter/pause/exit; preview on V4 data — ui/flight-hud/ — [claude@sarah] — in PR #76 (merge after #73); V7 mounts it (handoff to claude@ethan)
- [x] (medium) [P1] Story in the game now (decision 005): CAPCOM pop-outs on briefing/builder/poll/flight + cutscenes (arrival, launch, Moon/Mars orbit, anomaly, ending), clock held in solo — app/StoryLayer.tsx + app/App.tsx (additive), ui/story/ — [claude@aiden] (part of Ethan's app/ walk task, at Aiden's request) — in PR #74 (after #70): whole game played with every beat logged; phone pop-out moved to the top
- [x] (medium) [P1] V3 Flight prop/target asset pack: actual optimized GLB geometry + credited sources/axes/size manifest; reuse Ethan's craft/planets — public/visual-assets/flight/, art/flight/, docs/visual-assets/flight.md (new) — [cursor@kaipo] — in PR #75: hurricane, wildfire, tdrs-relay GLBs (9 KB), manifest + credits; scene mount and service-worker cache still with Ethan and Aiden. Venue rehearsal stays Open.
- [x] (medium) [P1] V4 Training route: 3 target descriptors, observation/relay rules and educational feedback, local schema + tests; no score/command changes — data/pilot-training/ (new) — needs: plan PR #69; coordinate V1/V2/V7 interfaces — owner: claude@jamie — [claude@jamie] — in PR #73: hurricane / wildfire / tdrs-relay descriptors, interact() → done|partial|blocked, routeComplete(); local only, no sim/score change
- [x] (light) [P1] Start: empty name silently blocks Start (placeholder looks filled) and the name is forgotten after Main menu; prefill or default it, and remember it — ui/start/ — owner: codex@jamie — expanded by Jamie: mission-entry graphics/program route, lobby consoles, tutorial keyboard polish — [codex@jamie] — in PR #72: default/remembered name, PROGRAM route + SVG mission art, lobby console art, native modal tour; 363 tests/build, desktop/phone and keyboard checked

- [x] (light) [P1] Story script: CAPCOM lines for every ui/story LineId + a glossary pop-out per beat, drop-in TS block — docs/game-design/STORY.md — [claude@sarah] — docs PR (see log); claude@aiden pastes it into ui/story (handoff)
- [x] (medium) [P1] Story pop-outs (decision 005) — ui/story/ (new) — [claude@aiden] — in PR #70: storyBeat(screen, events, scenarioId), CapcomPopout, FactPopout (glossary), TaskPanel, Cutscene frame (Skip/Esc, captions, still under reduced motion, ≤10 s); placeholder lines for claude@sarah's STORY.md; not mounted yet (app/ task)
- [x] (light) [P1] V0 visual-overhaul work breakdown and import/asset plan — docs/VISUAL_OVERHAUL.md (new), .agents/decisions/006-interactive-3d.md (new); existing source read-only; flight first then walkable hangar, per Aiden — [codex@aiden] — in PR #69 (green build): product decision, 7 owner-scoped breakouts, verified Three.js imports, GLB/provenance/performance/offline requirements; no production source edits

- [x] (light) [P1] Builder: Launch button off-screen on 768 px-tall laptops — ui/builder/ — [claude@aiden] — in PR #68: desktop side panel capped at screen height, scrolls inside, Launch sticks to its bottom; checked 1024×768 at every scroll position + phone unchanged
- [x] (light) [P1] Anomaly card count per difficulty in `DIFFICULTIES` (claude@ethan anomaly-cards ask), and prove reference designs still win with cards on — data/index.ts, data/README.md, tests/playthrough.test.ts — [claude@jamie] — in PR #67: easy 1 / normal 2 / hard 3 as data; every reference win wins with its cards (tested); Moon was unwinnable on Normal with 2 cards, reference now adds camera + magnetometer; app reads the count (handoff to claude@ethan)

- [x] (light) [P1] Live playtest fixes: what-if sentence, real-mission size match (CubeSat no longer = Terra), 'Inspired by' card header — ui/mission/ — [claude@sarah] — in PR #66, ready to merge (tsc, 361 tests, build pass)
- [x] (light) [P0] What-if reruns replay the player's anomaly-card answers — sim/analysis.ts (+1 argument in app/ Flight) — [claude@aiden] — in PR #65: `choicesOf(events)` → `whatIf(…, choices)`; claude@ethan wired the debrief fixes + Try it himself in 36712f7 meanwhile, kept as is
- [x] (heavy) [P0] Anomaly cards in the sim — sim/, shared/, app/, CONTRACTS.md — [claude@ethan] — PR #60 on `main`: 8 cards, `decision_required` / `resolve_decision` / `decision_resolved`, own seeded stream, co-op console ownership; played in a browser (2 cards, results show them); what-if + real mission match wired in PR #63
- [x] (light) [P2] GO / NO-GO poll sounds: `playSound` go / no-go as each console calls (claude@aiden handoff sound) — ui/gonogo/ — [claude@jamie] — in PR #61: one sound per console call, one for Skip / reduced motion; checked in the browser preview

- [x] (light) [P2] Accessibility pass — docs/A11Y_REPORT.md — [cursor@caleb] — in PR #59: keyboard and accessibility-tree pass of the live game; handoff to codex@jamie for the builder tour dialog. Not an NVDA/VoiceOver run.
- [x] (light) [P1] Daily/stars/personal-best regression: assembled-game persistence and regular-vs-daily isolation; report evidence only — docs/qa/daily-records.md (new); ui/leaderboard/ read-only — [codex@aiden] — PR #56 merged (ddfb083): live Daily 100/3 stars retained through two reloads, regular 69/0 and lower Daily 69/0; saved winning design kept; 316 tests/build pass

- [x] (light) [P1] Hidden glossary tooltips push past the right edge and add a horizontal scrollbar (builder budgets at 1024 px) — ui/learn/ — [cursor@kaipo] — in PR #58: tips use `display: none` until hover/focus; right-edge anchor when wide
- [x] (light) [P1] Builder risk meter — ui/builder/ + app/useChance.ts — [claude@aiden] — in PR #57: "Chance of success" from 20 background test flights on Hard (0% starting design, 95% winning design), hidden on Easy/Normal
- [x] (light) [P0] Live-site check — Pages link, desktop + phone — [cursor@caleb] — 12:26: solo First Light Normal, starting design, 60×, reached results (F, 26 pts) on desktop and a 390px phone. Mid-page scroll was still on that deploy; PR #53 claims the fix.
- [x] (medium) [P0] What-if + risk meter helper — sim/analysis.ts — [claude@aiden] (taken over from claude@ethan at Aiden's request) — in PR #55: whatIf() (one-change reruns, same-body orbits, WhatIfFix shape) + successRate() (seed reruns); <1 s per scenario; handoff to claude@sarah + claude@ethan for the debrief wiring
- [x] (light) [P0] Scroll to top on every screen change — app/ — [claude@aiden] (taken over from claude@ethan at Aiden's request) — in PR #53: useScrollToTop at every screen switch; checked briefing/builder/poll/flight open at the top
- [x] (light) [P1] Crash safety for judging — app/ — [claude@aiden] (taken over from claude@ethan) — in PR #53: ErrorBoundary + crash screen (Back to the builder / Main menu); crash-tested in the browser
- [x] (light) [P1] Bundle-size check in the deploy workflow — scripts/, .github/workflows/ — [claude@aiden] — in PR #54: `npm run size`, first load 117 kB gzipped, limit 150 kB
- [x] (light) Debrief polish: no nameless bonus star (playtest P2), real NASA mission match, 3D `SpaceView` orbit view on the fly screen, anomaly card wording (38 of 49 / SOHO 30 yrs / DSN launches) — ui/mission/, docs/game-design/ — [claude@sarah] — in PR #52; match needs #50 + app/ to pass `realMissions` (handoff to claude@ethan)
- [x] (light) [P1] Start: scenario menu repeated Easy/Hard — app/ — [claude@ethan] — fixed on `main`: app passes only the three base scenarios, the Difficulty menu picks the level
- [x] (light) [P1] Fast first load on phones: export a lazy-loading `SpaceView` from ui/scene3d (same props, `React.lazy` + Suspense) so three.js isn't in the first download for any screen — ui/scene3d/ — owner: claude@ethan (moved by claude@aiden at Aiden's request: 3D work is Ethan's; handoff lazy-3d) — [claude@ethan] — done in 10ae68e (main chunk 959 kB → 352 kB); claude@aiden's 15:00 takeover of this line withdrawn, Ethan had just finished it
- [x] (light) [P0] Put the GO / NO-GO poll (#33) between the builder's Launch and the mission — app/ — owner: claude@ethan — [claude@ethan] — done in 24247ed (Launch opens GoNoGoPoll); moved to Done by claude@aiden
- [x] (light) [P0] Daily mission app integration: use dailyMissionForDate + apply descriptor seed before init, refresh at UTC midnight/resume — app/ — owner: claude@ethan — needs: #30 #31 (Start portion complete) — [claude@ethan] — done in 24247ed (dailyMissionForDate, UTC midnight refresh); moved to Done by claude@aiden
- [x] (medium) [P1] Real missions table: ~10–15 real missions with sourced numbers for the debrief match — data/real-missions.json — owner: claude@jamie — [claude@jamie] — in PR #50: 12 missions (Earth 3, Moon 5, Mars 4), launch mass + year each from a cited NASA/NOAA page, tested no-URL-no-row; match helper handed to claude@sarah

- [x] (medium) [P1] Multiplayer disconnect/rejoin reliability: expire stale channels, settle failed joins, preserve broadcast ordering during disconnects; regression tests against existing app transport — net/ — [codex@jamie] — PR #48 merged; existing app transport, no mounting needed; 316 tests + build pass

- [x] (light) [P1] Builder on phones: compact budgets panel — ui/builder/ — [claude@aiden] — in PR #46: folded panel is 24% of the screen (was ~50%), console lights + "Show budgets · n to fix" + Launch always visible; desktop unchanged
- [x] (light) [P2] Space Apps submission package — docs/SUBMISSION.md — [cursor@caleb] — in PR #40; summary, NASA wording from NASA_SOURCES, AI-use note, video/slides plan; handoff to codex@jamie to confirm First Light before recording
- [x] (medium) [P2] Sound — ui/audio/ — [claude@aiden] — in PR #45: generated click / GO / NO-GO / launch rumble / success / failure, `<SoundToggle>` (remembered, muted by default under reduced motion), builder clicks wired; handoff to all for app (toggle + launch), gonogo, results
- [x] (light) [P2] First-time tips: 4 dismissible coach marks on the builder (pick an orbit, watch the bars, fix a red problem, launch), remembered in localStorage, skippable — ui/tutorial/ (new) — [codex@jamie] — in PR #44; owner mount pending

- [x] (light) [P1] Demo works on bad venue wifi — index.html, public/, pwa/, vite.config.ts — [claude@aiden] — in PR #43: build-time service worker (assets cache-first, page network-first with 4 s timeout), manifest + icon, link-preview meta; tested offline (server stopped, page still loads); also fixes `npm run preview` base path
- [x] (heavy) [P0] App loop + every screen mounted — app/, shared/net.ts — [claude@ethan] — PR #42 on `main`: the live site is the real game (Start → Lobby → Briefing → Builder → launch → Mission → Results; solo, one screen, online). 294 tests pass; Start, Briefing and Builder checked in a browser on the production build. Full-mission and two-browser end-to-end tests are still running; fixes follow in a second PR
- [x] (light) [P1] Bonus star goal per scenario (`bonus_goal` param) + mission program order — data/scenarios/ — owner: claude@jamie — [claude@jamie] — in PR #41: demo/mars `no_data_lost`, moon `budget_left_20`, `PROGRAM` = demo → moon → mars; each reference win earns its bonus on Normal (tested); wiring handed to app/briefing/start owners
- [x] (light) [P1] Daily leaderboard records + stars — ui/leaderboard/ — [codex@aiden] — PR #37 merged; legacy-compatible optional dailySeed/stars, 20 leaderboard tests; merged main has 216 passing tests + clean build; app/results adoption handed off.
- [x] (medium) [P1] Builder part compatibility — ui/builder/ — [claude@aiden] — in PR #39 (after #35): "Needs a SmallSat bus or bigger" (dimmed) and best-orbit badges from the sim's own rules (bus_too_small, off_best_orbit); checked on real demo data
- [x] (light) [P2] Glossary terms the anomaly cards use: reaction wheel, high-gain antenna, drag, safe mode, South Atlantic Anomaly, Deep Space Network — ui/learn/ — [cursor@kaipo] — merged in PR #38 (`aeccf8b`). Tooltip ids are unique per use. Rehearsal re-run stays Open until Host/Join is on the live site.
- [x] (light) [P0] Hard difficulty winnable with random failures on (seed 42 kills every demo design on day 193); Normal row says failures on but sim default is off — data/index.ts, data/README.md, tests/playthrough.test.ts — [claude@jamie] — in PR #36: demo seed 42 → 1, Normal failures off, new failures-on Hard test

- [x] (light) [P1] Builder console lights — ui/builder/ — [claude@aiden] — in PR #35 (merge order #29 → #32 → #33 → #35): GO / GO · n concerns / NO-GO · n per console from `poll(state.issues)`, your console outlined in co-op
- [x] (medium) Real NASA space weather (OMNI 1996–2026): Dataset + build script + tests, fly-screen strip, sim spec — data/space-weather/, ui/mission/ — [claude@sarah] — in PR #34 (after #25); sim use (weather_start, storm card on real storm days, F10.7 drag) handed to claude@ethan
- [x] (light) [P0] Daily mission Start UI/helper: UTC YYYYMMDD seed, sorted IDs, Normal; separate callback — ui/start/ — [codex@jamie] — in PR #31 (after #30); app seed application still pending

- [x] (light) [P0] Builder budget bars match the reviewed sim — ui/builder/ — [claude@aiden] — in PR #32 (after #29): Bus capacity back, Science from `science_expected` (demo 1.7/30, was 10/30), new Battery-vs-eclipse bar; checked on real sim + data for demo/Moon/Mars
- [x] (medium) [P0] GO / NO-GO poll, solo: 4 consoles vote from `state.issues`, Launch unlocks on all GO — ui/gonogo/ (new) — needs: builder — [claude@jamie] — in PR #33; app/ mounts it between builder and launch (handoff to claude@ethan)

- [x] (medium) [P0] Start/Lobby follow-up: difficulty picker + shared theme/glossary adoption — ui/start/, ui/lobby/ only — needs: #8 #13 #15 #16 #17 — [codex@jamie] — in PR #30; app must honor difficulty/preview callback

- [x] (light) [P1] Anomaly card sources — docs/game-design/ANOMALY_CARDS.md (source lines only) — [claude@aiden] — in PR #28 (into main; #23 already merged): official NASA/JPL/ESA/NOAA/STScI page for all 8 cards + MCO line, each story checked; 3 wording notes for claude@sarah (handoff card-sources)
- [x] (light) [P1] Multiplayer rehearsal: 4 devices on venue wifi + a phone hotspot, write results + fallback call in docs/MULTIPLAYER_TEST.md — docs/MULTIPLAYER_TEST.md — [cursor@kaipo] — script in PR #24 (merged); first attempt in PR #27: fail, live site and localhost are still the scaffold, no Host/Join. Venue re-run is a new Open task (owner: cursor@kaipo) once the app loop is live.
- [x] Aiden-requested merge batch + existing Pages deploy — [codex@aiden] — all 14 listed PRs + required #22 confirmed merged; Ethan landed the integration set, Codex resolved/merged #6 (4b8feef) preserving README; 178 tests + build pass, deploy run 43632765419 success; scaffold live, app loop still needed.

- [x] [P0] Merge ready PRs — merge coordination — [claude@ethan] — 21 PRs on `main` (c1b8d30) by one fast-forward push of the rehearsed merge: #2 #3 #4 #5 #7 #8 #9 #10 #11 #12 #13 #14 #15 #16 #18 #19 #20 #22 #23 #24 #26; tsc clean, 178/178 tests, build + Pages deploy pass, https://asigurdsdev.github.io/space-apps-2026/ returns 200. Held: #6 (README conflict, claude@jamie), #25 (opened after the rehearsal, claude@sarah)
- [x] (medium) [P0] Anomaly card UI on the fly screen + what-if / stars / share card on the debrief — ui/mission/ — [claude@sarah] — in PR #25 (after #11); lights up when sim emits `decision_required` + `whatIf()` lands (claude@ethan)
- [x] (medium) Game design doc "GO / NO-GO": docs/game-design/ + decision 004 (proposed) — [claude@sarah] — in PR #23
- [x] (heavy) [P2] 3D space view (decision 003) — ui/scene3d/ + ui/builder/ — [claude@aiden] — in PR #22 (`<SpaceView state mode="spacecraft"|"orbit">`: planet, clouds, atmosphere, stars, Sun, orbit, craft from the picked parts) + builder close-up in PR #10; mission view uses it if claude@sarah agrees (handoff)
- [x] Team go-ahead + merge delegation + Pages setup — [codex@aiden] — on main: AGENTS.md authorization, all-agent nudge, merge-owner handoff; Pages workflow enabled, deployment pending.

- [x] (light) [P1] Difficulty levels — data/ — [claude@jamie] — easy/normal/hard via `getScenario(id, level)`, every scenario winnable at every level; in PR #8 (+ proof in #12); no deadline knob until parts have build_months; Start-screen picker is codex@jamie's call (handoff)
- [x] (medium) [P1] More scenarios — data/scenarios/ — [claude@jamie] — Moon Mapper + Red Planet Radar (demo is the beginner Earth one), proven winnable in the real sim; data in PR #8, proof in PR #12; sim/sim.test.ts orbit list needs updating (handoff to claude@ethan)
- [x] (light) [P2] README "How to play" + live link — README.md — [cursor@kaipo] — in PR #21; Kaipo Team row filled; Challenge section left for PR #6
- [x] (light) Official challenge brief + NASA resources, verbatim — docs/CHALLENGE_OFFICIAL.md — [claude@sarah] — in PR #20
- [x] (light) [P2] Local leaderboard: best score + design per scenario in localStorage, shown on results — ui/leaderboard/ — [codex@aiden] — in PR #19; 10 tests + harness build + browser persistence/phone checks pass; results mounting handed off

- [x] (medium) [P2] Save / share / compare designs — ui/share/ — [claude@ethan] — in PR #18: `<SharePanel state send />` + `designFromHash`; 114 tests pass merged with sim-data; app/ mounts it next
- [x] (medium) [P2] Spacecraft drawing: SVG — ui/spacecraft/ — [claude@ethan] — superseded by the 3D view (decision 003), no PR; the finished, reviewed component stays on branch `ethan-claude/spacecraft` if anyone wants a no-WebGL fallback
- [x] (light) [P1] Glossary + tooltips — ui/learn/ — [cursor@kaipo] — in PR #17; `<Term id="...">` + glossary.ts; screen owners adopt via handoff 20261114-1102
- [x] (light) [P0] Headless playthrough test — tests/ — [claude@jamie] — in PR #12; 4/4 green on ethan-claude/sim-data (starting design loses, reference wins); merge after #7 + sim-data, #8
- [x] (medium) [P1] Role-aware builder — ui/builder/ — [claude@aiden] — in PR #10: role badge per section, other roles locked, "last changed by", launch only by mission planning; needs claude@ethan to fix ROLE_PARAM_KEYS (solar/battery/comms) + pass players/me (handoff role-keys)
- [x] (light) [P0] Shared look: theme tokens + base styles (colors, type, buttons, panels, light/dark) so every screen looks like one game; then handoff to screen owners to adopt — ui/theme/ — [codex@aiden] — in PR #16; dark/light contrast checks and desktop/phone preview pass; adoption handoff to screen/app owners

- [x] (medium) [P1] Lobby screen: room code + copy button, player list, claim/release role buttons, host starts the mission — ui/lobby/ — needs: #9 (net), `useGame()` players/me — [codex@jamie] — in PR #15; app mounting/navigation pending

- [x] (light) [P0] Briefing screen — ui/briefing/ — [claude@aiden] — in PR #14; app/ still has to show it between Start and the builder (handoff to claude@ethan)
- [x] (medium) [P0] Start screen: game title, pick scenario, Solo / Host online / Join with code buttons — ui/start/ — needs: `useGame()` from app/ (build against props until then) — [codex@jamie] — in PR #13; app mounting pending
- [x] Mission split coordination closed — [codex@aiden] — Sarah completed both views in PR #11; her folder ownership preserved.

- [x] (medium) [P0] Align builder with sim + data — ui/builder/ — [claude@aiden] — in PR #10: parts from state.entities, data/ param keys, 7 bars; checked against the real sim + data (bus section waits on claude@ethan's sim-data catalog ids)
- [x] Game plan + full task list on BOARD Open + claim/done workflow rules — docs/GAME_PLAN.md, BOARD.md Open, AGENTS.md "Task workflow", docs/AGENT_SETUP.md — [claude@aiden] — on main (coordination files); peerjs added to PR #4
- [x] Integration audit across pending PR branches; report build/test failures to owners — docs/INTEGRATION_REPORT.md (source read-only) — [codex@jamie] — snapshot report in PR #9; 58 module tests pass, 2 real-data probes fail; follow-up after sim adapter
- [x] (heavy) Mission run view + results screen: draws `SimState`, shows events and the end summary — ui/mission/ — [claude@sarah] — in PR #11 (merge after #4, #5, #7); app/ still has to mount `<MissionScreen>` (handoff to claude@ethan)
- [x] (medium) Mission builder screen: pick parts, live budget bars, sends `set_param` — ui/builder/ — [claude@aiden] — in PR #10 (stacked on #4 + #5); app loop still has to mount it
- [x] Parts catalogs + first scenario — data/ — [claude@jamie] — 6 catalogs + demo scenario + loader + 11 tests; in PR #8 (needs #4, #5 first)
- [x] Sim core: `init` / `step` / `summary` with mass, power, cost, data and schedule budgets + success/failure rules, Vitest tests — sim/ — [claude@ethan] — in PR #7 (19 tests pass); usage notes in sim/README.md and handoff 20261114-1027
- [x] (light) Pitch + demo script + NASA data sources list — docs/ (not CHALLENGE.md, that's claude@jamie's) — [codex@jamie] — docs drafted; integrated demo rehearsal still pending

- [x] Pick challenge + fill in README — docs/CHALLENGE.md, README.md — [claude@jamie] — Space Mission Design Game; in PR #6
- [x] Turn CONTRACTS.md shapes into TS types — shared/ — [claude@ethan] — in PR #5; typecheck + test + build pass inside the PR #4 scaffold
- [x] Scaffold Vite + TS + React project + GitHub Pages deploy workflow — package.json, vite.config.ts, tsconfig.json, index.html, app/, .github/workflows/ — [claude@aiden] — in PR #4; needs Pages turned on (Settings → Pages → Source: GitHub Actions)
- [x] Choose engine/stack, write decision record — .agents/decisions/002-stack.md — [claude@aiden] — TS + Vite + React, static, no backend; in PR #3
- [x] Define module contracts (sim core ↔ UI ↔ data) — .agents/CONTRACTS.md — [claude@ethan] — v0.1 in PR #2, stack-neutral until stack is picked
