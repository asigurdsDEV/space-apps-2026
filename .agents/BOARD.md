# Task board

**How to take a task (full rules: AGENTS.md → "Task workflow"):** pull → pick the top Open task with no tag (P0 before P1 before P2; skip `owner:` tasks that aren't yours) → move it to In progress with your tag and **push that alone** (the lock) → pull again and check only your tag is on it → work on your branch → open a PR → move it to Done with the PR # and **push again** → take the next one.
Format: `- [ ] (size) [priority] task — folder — needs: … — owner: … — [agent@human]`
Game plan (screens, folders, MVP): `docs/GAME_PLAN.md`.

**Current go-ahead:** Aiden authorizes non-overlapping owned/claimed work; claude@ethan is the sole merge coordinator. Pages is deployed through Actions (scaffold live); the app loop remains unmerged. Read AGENTS.md + the newest codex@aiden all-agent go-ahead handoff. Older permission/Pages requests below are answered by this note; technical blockers still require verification.

## Open

### Improvements (added by claude@aiden 12:55, ideas from playing the builder + the game design)
- [ ] (light) [P1] Fast first load on phones: export a lazy-loading `SpaceView` from ui/scene3d (same props, `React.lazy` + Suspense) so three.js isn't in the first download for any screen — ui/scene3d/ — owner: claude@ethan (moved by claude@aiden at Aiden's request: 3D work is Ethan's; handoff lazy-3d)
- [ ] (light) [P1] Bundle-size check in the deploy workflow: fail the build if the first-load JS grows past a set limit — .github/workflows/ — needs: lazy 3D split — owner: claude@aiden
- [ ] (light) [P1] Crash safety for judging: an error boundary around each screen with "Something went wrong, back to the builder" instead of a white page — app/ — owner: claude@ethan
- [ ] (light) [P2] First-time tips: 4 dismissible coach marks on the builder (pick an orbit, watch the bars, fix a red problem, launch), remembered in localStorage, skippable — ui/tutorial/ (new)
- [ ] (medium) [P2] Sound: launch rumble, GO / NO-GO calls, soft UI clicks, with a mute toggle (Web Audio, generated or tiny files), off under reduced motion — ui/audio/ (new)

<!-- The six build tasks below are proposed by claude@ethan (one folder each so nobody collides). Rename or split them if your human disagrees. -->
<!-- Ethan has the most agent usage, so claude@ethan takes the heavy ones (sim core + app loop are claimed below). If a task turns out bigger than your usage allows, hand the hard part to claude@ethan with a handoff instead of dropping it. -->

### P0 — playable solo game on the live link

### P1 — online co-op + teaching
- [ ] (light) [P1] Re-run the four-device multiplayer rehearsal once Host online and Join are on the live site. Fill docs/MULTIPLAYER_TEST.md again (venue wifi, then a phone hotspot if wifi fails) — docs/MULTIPLAYER_TEST.md — needs: app loop merged and Pages serving Start — owner: cursor@kaipo

### P2 — nice-to-haves from the brief

### Game design (decision 004, proposed, see docs/game-design/GAME_DESIGN.md §8)
- [ ] (light) [P0] Daily mission app integration: use dailyMissionForDate + apply descriptor seed before init, refresh at UTC midnight/resume — app/ — owner: claude@ethan — needs: #30 #31 (Start portion complete)
- [ ] (heavy) [P0] Anomaly cards in the sim: `decision_required` event + `resolve_decision` command, seeded draws, effects vocabulary, encode the deck from docs/game-design/ANOMALY_CARDS.md — sim/, shared/, CONTRACTS.md — owner: claude@ethan
- [ ] (medium) [P0] What-if + risk meter helper: `whatIf()` and `successRate()` reruns of the pure sim — sim/analysis.ts — owner: claude@ethan
- [ ] (medium) [P1] Real missions table: ~10–15 real missions with sourced numbers for the debrief match — data/real-missions.json — owner: claude@jamie

## Missing / needed

- Merge/Pages setup requests resolved: all Aiden-listed PRs + #22 are merged; run 43632765419 deployed successfully. Live URL still serves scaffold because app/main.tsx wiring is not merged — app/ owner claude@ethan — [found by codex@aiden]

- Leaderboard PRs #19 + #37 are merged; app/results owner still needs mounting with final scenario ID, Summary, state.params, plus dailySeed only in daily mode and supplied stars — [found by codex@aiden]

- Theme PR #16: builder + briefing adopted (Claude FYI); app wrapper and mission/results/start/lobby adoption still need owner confirmation — [found by codex@aiden]

- Resolved: original First Light catalog/sim mismatch fixed in sim-data #26, now on main; real-data playthrough tests pass. Historical snapshot remains in docs/INTEGRATION_REPORT.md — [found by codex@jamie]

- Network validators/role policy/PeerJS dependency are on main; remaining app wiring and live WebRTC/venue rehearsal are unverified — app/net owners + rehearsal team — [found by codex@jamie]
<!-- anything an agent noticed is missing, broken, or needed by someone else -->
<!-- - thing — who needs it — [found by agent@human] -->
- GitHub Pages not enabled yet (Settings → Pages → Source: GitHub Actions) — deploy in PR #4 needs it — repo owner (Aiden) — [found by claude@aiden]
- Live-site check 11:43: `https://asigurdsdev.github.io/space-apps-2026/` returns 200, but desktop and a 390px phone view both show only "Scaffold is running" with no buttons. Start → results cannot be played until `app/main.tsx` mounts the screens — claude@ethan (app loop) — [found by cursor@caleb]
- ~~Challenge + engine/stack not picked yet~~ resolved 10:07: Space Mission Design Game, TS + Vite + React (decision 002) — [found by claude@ethan]
- ~~Open PRs need a human review + merge~~ resolved 11:28: 21 PRs merged, `main` is c1b8d30 and the site is live — [found by claude@ethan]
- PR #1 (jamie/setup) conflicts with main and is out of date — Jamie — [found by claude@ethan]
- Sarah and Caleb have no agent set up yet (blank status files) — Sarah, Caleb — [found by claude@ethan]
- README Team table: every Role is blank — everyone — [found by claude@ethan]
- BOARD `## Open` is empty; Kaipo and Caleb have nothing to claim — need structured next tasks from repo lead — [found by cursor@kaipo] — handoff `20261114-1029-cursor@kaipo-claude@aiden-open-task-list.md`
- Multiplayer rehearsal 2026-11-14 11:35: live site and localhost still show the scaffold page, so Host/Join never appeared and Run A failed before a room existed — claude@ethan (`app/`) — [found by cursor@kaipo] — PR #27

## In progress
- [ ] (light) [P1] Demo works on bad venue wifi: web app manifest + offline cache of the built site (cache-first for assets, network-first for index.html so new deploys still show), app icon, social preview meta — index.html, public/, vite.config.ts — owner: claude@aiden — [claude@aiden]






- [ ] (light) [P0] Live-site check after merges: play start → results on the Pages link on desktop + phone, add anything broken to Missing — no files — needs: Pages on + PRs merged — [cursor@caleb]
- [ ] (light) [P2] Accessibility pass: keyboard-only + screen reader run through every screen, report + handoffs to owners — docs/A11Y_REPORT.md (source read-only) — [cursor@caleb]
- [ ] (light) [P2] Space Apps submission package: project summary, NASA resources used, AI-use note, demo video/slides plan (coordinate with codex@jamie's PITCH/DEMO) — docs/SUBMISSION.md — [cursor@caleb]



- [ ] (medium) [P1] Sim: richer random events + difficulty knobs the scenario files can set (the easy/normal/hard scenario variants stay with claude@jamie) — sim/ — starts when ethan-claude/sim-data lands — [claude@ethan]
- [ ] (heavy) [P1] Browser end-to-end tests of the assembled game: full solo mission, and two browsers in one co-op room — e2e/ (new); uses playwright-core installed outside the repo, so no package.json change — in progress on branch ethan-claude/app — [claude@ethan]




- [ ] (heavy) Multiplayer rooms + transport: PeerJS/WebRTC host-authoritative co-op for up to 4, room codes, role claim, LocalTransport fallback (decision 002) — net/ — [codex@jamie]

- [ ] App loop + state store, and mounting every screen (Start → Lobby → Briefing → Builder → launch → Mission → Results), solo + same-screen + online — app/ (whole folder, including `app/main.tsx`), branch ethan-claude/app — [claude@ethan]
- [ ] (heavy) [P1] 3D models + launch + 3D fly scene: a real model for every catalog part, a launch sequence, the fly screen in 3D tied to sim time, Moon/Mars scenes, phone performance — ui/scene3d/ (whole folder), branch ethan-claude/scene3d — [claude@ethan]

## Blocked


## Done

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
