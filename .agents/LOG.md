# Activity log

Append only. One line per meaningful action. Newest at the bottom.
`YYYY-MM-DD HH:MM | agent@human | task | what you did`

2026-11-13 21:45 | claude@aiden | setup | created repo scaffolding and agent coordination files
2026-11-14 09:35 | claude@aiden | setup | added docs/AGENT_SETUP.md (copy-paste prompts for every teammate's agents), multi-agent-per-person rule
2026-11-14 09:40 | claude@aiden | setup | agent online
2026-11-14 09:36 | codex@aiden | setup | agent online
2026-11-14 09:56 | claude@jamie | setup | agent online
2026-11-14 09:54 | claude@ethan | setup | agent online
2026-11-14 09:56 | claude@ethan | contracts | claimed task: define module contracts (CONTRACTS.md + decision 001)
2026-11-14 10:02 | claude@ethan | contracts | wrote CONTRACTS.md v0.1 + decision 001, opened PR #2 (ethan-claude/contracts)
2026-11-14 09:59 | claude@aiden | setup | agent online
2026-11-14 10:03 | claude@ethan | stack | claimed task: choose engine/stack (decision 002)
2026-11-14 10:00 | claude@jamie | challenge-readme | claimed Pick challenge + fill in README
2026-11-14 10:01 | cursor@kaipo | setup | agent online
2026-11-14 10:05 | claude@ethan | stack | released engine/stack claim (Aiden is setting it up); no files written
2026-11-14 10:05 | claude@aiden | handoff | sent challenge (Space Mission Design Game) to claude@jamie
2026-11-14 10:06 | claude@aiden | stack | claimed task: choose engine/stack (decision 002)
2026-11-14 10:07 | claude@aiden | stack | wrote decision 002 (TS + Vite + React, static), opened PR #3 (aiden-claude/stack); added scaffold + shared-types tasks to board
2026-11-14 10:07 | claude@aiden | scaffold | claimed task: scaffold Vite + TS + React + Pages deploy
2026-11-14 10:09 | claude@ethan | roster | handoff to all: "kimchi" on team page = Caleb (confirmed by Ethan)
2026-11-14 10:10 | claude@aiden | scaffold | Vite + TS + React + Vitest + Pages workflow; build/test/dev verified; opened PR #4 (aiden-claude/scaffold)
2026-11-14 10:12 | claude@ethan | shared-types | claimed task: turn CONTRACTS.md shapes into TS types in shared/
2026-11-14 10:14 | claude@ethan | shared-types | wrote shared/types.ts (+ index, type check test), verified in PR #4 scaffold (tsc, vitest, build), opened PR #5 (ethan-claude/shared-types)
2026-11-14 10:14 | claude@ethan | contracts | PR #2 updated: stack line, mission design mapping, SimState.params + rng_state
2026-11-14 10:14 | claude@ethan | setup | handoff to all: setup checklist per person; added 6 proposed build tasks to BOARD Open; filled Ethan's README row
2026-11-14 10:07 | claude@jamie | challenge-readme | wrote docs/CHALLENGE.md + README Challenge section (Space Mission Design Game) on jamie-claude/challenge-readme; handoff to all
2026-11-14 10:12 | claude@jamie | roster | read claude@ethan's roster handoff (kimchi = Caleb), set it done; noted in CHALLENGE.md
2026-11-14 10:16 | claude@ethan | sim-core | claimed tasks: sim core (sim/) and app loop + state store (app/); tagged open tasks light/medium/heavy
2026-11-14 10:16 | claude@jamie | challenge-readme | opened PR #6 (jamie-claude/challenge-readme): docs/CHALLENGE.md + README Challenge section
2026-11-14 10:19 | codex@jamie | setup | agent online
2026-11-14 10:19 | claude@aiden | stack | Aiden chose online co-op: decision 002 (PR #3) now host-authoritative WebRTC via PeerJS + same-screen fallback, net/ folder; tsconfig in PR #4; board task + handoff to claude@ethan; closed claude@jamie's challenge handoff
2026-11-14 10:20 | claude@jamie | parts-catalogs | claimed task: parts catalogs + first scenario (data/)
2026-11-14 10:00 | claude@sarah | setup | agent online
2026-11-14 10:21 | codex@jamie | transport-demo | claimed net/ + pitch/demo/source docs; coordinating with claude@jamie and claude@ethan
2026-11-14 10:22 | claude@aiden | multiplayer | mistakenly replaced codex@jamie's claim on multiplayer rooms + transport; reverted, codex@jamie keeps it, claude@aiden not working on it
2026-11-14 10:23 | claude@aiden | builder | claimed task: mission builder screen (ui/builder/)
2026-11-14 10:30 | claude@sarah | role | Sarah's role: Frontend / UI (mission run + results); handoff to claude@jamie to add it to README in PR #6
2026-11-14 10:35 | claude@sarah | mission-view | claimed task: mission run view + results screen (ui/mission/)
2026-11-14 10:26 | claude@jamie | parts-catalogs | 6 catalogs + demo scenario + loader + 11 tests (tsc/test/build pass on #4+#5+#8); opened PR #8; handoffs to claude@ethan (columns) + codex@jamie (demo designs, sources)
2026-11-14 10:26 | claude@jamie | challenge-readme | PR #6: Sarah's Team row (claude@sarah handoff done), online co-op note
2026-11-14 10:25 | codex@aiden | mission-run | claimed ui/mission/run/; left results screen open for Sarah; builder stays claude@aiden
2026-11-14 10:26 | codex@aiden | coordination | previous claim attempt did not push: Sarah won ui/mission/ lock; no code written; requesting split by handoff
2026-11-14 10:26 | codex@aiden | handoff | asked claude@sarah to consider run/results split; her ui/mission/ claim remains authoritative
2026-11-14 10:27 | claude@ethan | sim-core | wrote sim/ (design checks, launch, cruise, operations, scoring) + fixtures + README; tsc, 19 tests, build pass; opened PR #7 (ethan-claude/sim-core)
2026-11-14 10:27 | claude@ethan | contracts | PR #2 + #5: launch command, phase_changed event, SimState.issues; multiplayer shapes (Player, Role, NetMessage, canSend) for decision 002; merged stack branch into #2
2026-11-14 10:27 | claude@ethan | handoff | to all: how to build against sim + net shapes, catalog columns for data/; set handoffs from claude@aiden and codex@jamie to done
2026-11-14 10:28 | claude@ethan | sim-core | catalogs (PR #8) and sim (PR #7) use different columns; told claude@jamie to keep theirs, sim will adapt
2026-11-14 10:28 | claude@aiden | builder | mission builder screen done: ui/builder/ (pure view, live budget bars, issues, launch), opened PR #10; handoffs to claude@jamie (catalog ids) + claude@ethan (param keys, mount)
2026-11-14 10:27 | codex@jamie | transport-demo | implemented transport + lobby authority; 16 tests and strict TS pass; docs drafted; network integration remains; claimed read-only integration audit
2026-11-14 10:29 | cursor@kaipo | board | Open empty; handoff to claude@aiden for structured task list + Missing line on BOARD
2026-11-14 10:50 | claude@sarah | mission-view | built ui/mission (run view + results, orbit diagram, log, controls, preview page, tests); tsc + 25 tests + build pass; opened PR #11 (sarah-claude/mission-view); handoff to claude@ethan to mount it in app/
2026-11-14 10:52 | claude@sarah | mission-view | replied to codex@aiden's split request: declined, both screens already in PR #11; set its handoff done
2026-11-14 10:32 | claude@jamie | parts-catalogs | PR #8: terse display units for builder; handoff to claude@aiden (bus id + solar/battery slots); aiden's ids handoff done
2026-11-14 10:32 | claude@aiden | game-plan | claimed: game plan + full task list on BOARD + claim/done workflow rules; peerjs for PR #4
2026-11-14 10:33 | claude@jamie | cleanup | closed stale PR #1 (jamie/setup) at Jamie's request; superseded by main + PR #6
2026-11-14 10:34 | claude@ethan | integration | pushed ethan-claude/integration (PRs #4 #5 #7 #8 #9 #10 #11 merged: no conflicts, tsc clean, 62 tests pass); starting sim-data, app-loop, net validator in parallel subagents
2026-11-14 10:34 | codex@jamie | transport-audit | PR #9 concrete shared Room API + 22 net tests; combined 58 module tests pass/build with temp peerjs; 2 actual-data probes fail; report and handoffs published
2026-11-14 10:35 | claude@aiden | game-plan | done: 18 P0/P1/P2 tasks on BOARD Open, docs/GAME_PLAN.md, AGENTS.md Task workflow (claim push/lock check/done push/next), setup prompts; peerjs in PR #4; handoffs to all, codex@jamie + cursor@kaipo done
2026-11-14 10:36 | claude@aiden | builder-align | claimed: [P0] align builder with sim + data
2026-11-14 10:38 | claude@jamie | playthrough-test | claimed: [P0] Headless playthrough test (tests/)
2026-11-14 10:40 | claude@jamie | playthrough-test | tests/playthrough.test.ts in draft PR #12: runs on integration, 2/4 red on known sim/data schema gap; handoffs to claude@ethan (sim-data) + claude@aiden (tsconfig include)
2026-11-14 10:41 | codex@jamie | start-screen | claimed: [P0] Start screen, ui/start/ only; app wiring via handoff
2026-11-14 10:42 | claude@aiden | builder-align | done: builder reads state.entities + data/ param keys, 7 bars; verified on real sim+data; PR #10 updated; handoff to claude@ethan (3 sim mismatches)
2026-11-14 10:44 | claude@aiden | briefing | claimed: [P0] Briefing screen (ui/briefing/)
2026-11-14 10:45 | codex@jamie | start-screen | done: Start screen, PR #13; tests/build/browser verified; app mounting handoff
2026-11-14 10:44 | codex@aiden | progress | checked PR/status progress; closed obsolete mission split after Sarah completed #11; Aiden selected shared theme next
2026-11-14 10:45 | codex@jamie | lobby | claimed: [P1] Lobby screen, ui/lobby/ only; pure props/callbacks
2026-11-14 10:45 | claude@ethan | board | claimed lobby (in app/), spacecraft drawing, save/share/compare, sim events + difficulty knobs, browser e2e tests; offered claude@jamie help with scenarios (handoff)
2026-11-14 10:46 | claude@ethan | board | correction to my 10:46 line: lobby is codex@jamie's (claimed first), not mine; my claims are spacecraft drawing, save/share/compare, sim events + difficulty knobs, browser e2e tests
2026-11-14 10:46 | claude@aiden | briefing | done: [P0] Briefing screen, PR #14; handoff to claude@ethan to show it between Start and builder
2026-11-14 10:45 | codex@aiden | shared-theme | claimed: [P0] Shared look, ui/theme/ only; adoption via handoffs
2026-11-14 10:49 | codex@jamie | lobby | done: Lobby screen, PR #15; tsc/build + 10 combined tests + browser host/guest/mobile checks; app handoff
2026-11-14 10:55 | claude@aiden | handoffs | tsconfig now type-checks tests/ (PR #4, for claude@jamie's playthrough test); closed builder-ids handoff (already done in PR #10)
2026-11-14 10:56 | claude@aiden | role-aware-builder | claimed: [P1] Role-aware builder (ui/builder/)
2026-11-14 10:46 | cursor@kaipo | board | claimed [P1] Glossary (ui/learn/) + [P2] README How to play; theme left for codex@aiden, briefing claude@aiden
2026-11-14 10:53 | codex@aiden | shared-theme | done: Shared look, PR #16; contrast checks + desktop/phone browser preview pass; adoption handoff to owners
2026-11-14 11:00 | claude@aiden | role-aware-builder | done: [P1] Role-aware builder, PR #10 updated (badges, locks, last changed by, launch by mission planning); handoff to claude@ethan (ROLE_PARAM_KEYS vs data keys, pass players/me)
2026-11-14 11:03 | claude@aiden | theme-adoption | started: shared theme tokens in ui/builder + ui/briefing (codex@aiden handoff, PR #16)
2026-11-14 11:10 | claude@aiden | theme-adoption | done: builder (PR #10) + briefing (PR #14) use shared --game-* tokens; both stack on PR #16; GAME_PLAN merge order updated; reply handoff to codex@aiden
2026-11-14 10:53 | cursor@caleb | setup | agent online
2026-11-14 11:00 | claude@ethan | merge | rehearsed merging all 15 open PRs (order in handoff): no conflicts, tsc + build pass, 86/88 tests (2 wait on sim-data); asked claude@aiden who merges
2026-11-14 11:00 | codex@aiden | leaderboard | claimed: [P2] Local leaderboard, ui/leaderboard/ only; results adoption via Sarah handoff
2026-11-14 11:01 | claude@jamie | playthrough-test | done: PR #12 ready; 4/4 green on ethan-claude/sim-data, 92/92 suite, tsc clean
2026-11-14 11:15 | claude@aiden | 3d-direction | Aiden: game should be a good-looking 3D simulator. Decision 003 (three.js, ui/scene3d/, SpaceView); new P2 board task; handoffs to claude@ethan (SVG spacecraft task superseded) + claude@sarah (mount in mission view)
2026-11-14 11:16 | claude@aiden | scene3d | claimed: [P2] 3D space view (ui/scene3d/ + builder hero)
2026-11-14 11:02 | cursor@caleb | board | claimed: [P0] live-site check; [P2] a11y report + submission docs
2026-11-14 11:02 | claude@jamie | scenarios | claimed: [P1] More scenarios (data/scenarios/)
2026-11-14 11:05 | cursor@kaipo | glossary | Term tooltip + glossary.ts in ui/learn/; tests 3/3; PR #17; handoff to all to adopt <Term>
2026-11-14 11:07 | claude@ethan | share | done: [P2] Save / share / compare, PR #18 (ui/share/); 114 tests pass merged with sim-data + shared-types + builder + playthrough test; handoff to claude@sarah (keep format.ts exports)
2026-11-14 11:07 | claude@ethan | role-keys | ROLE_PARAM_KEYS now uses data/ keys (solar, battery, comms): pushed to PR #5 and PR #2, as claude@aiden asked; passing players/me to the builder comes with the app loop
2026-11-14 11:07 | claude@ethan | spacecraft | released: SVG spacecraft drawing superseded by 3D (decision 003); no PR, branch ethan-claude/spacecraft kept as a fallback; closed my scenarios offer (claude@jamie has it)
2026-11-14 11:05 | claude@sarah | official-brief | claimed: docs/CHALLENGE_OFFICIAL.md (official brief + NASA resources, verbatim)
2026-11-14 11:07 | codex@aiden | leaderboard | done: Local leaderboard, PR #19; 10 tests + harness build + browser persistence/phone checks pass; mounting handoff published
2026-11-14 11:10 | claude@sarah | official-brief | added docs/CHALLENGE_OFFICIAL.md (official brief + NASA/CSA resources, verbatim), opened PR #20; handoff to all
2026-11-14 11:07 | cursor@caleb | live-site | blocked: Pages URL 404, Pages API 404, main has no app; playthrough waiting on Pages + merges
2026-11-14 11:10 | claude@jamie | scenarios | done: Moon + Mars scenarios in PR #8, proven winnable by PR #12 (98/99 on sim-data; sim orbit-list test needs update, handoff to claude@ethan)
2026-11-14 11:12 | cursor@kaipo | how-to-play | README How to play + Kaipo role; Pages link noted as not live yet; PR #21
2026-11-14 11:11 | claude@jamie | difficulty | claimed: [P1] Difficulty levels (data/)
2026-11-14 11:12 | codex@aiden | unblock-team | claimed: Aiden-authorized task permissions, merge coordinator designation, planned Pages enablement; coordination only
2026-11-14 11:14 | claude@jamie | difficulty | done: easy/normal/hard in PR #8, all 9 combos winnable (PR #12, 106/107 on sim-data); handoff to codex@jamie (Start screen picker)
2026-11-14 11:20 | claude@sarah | game-design | claimed: game design doc (docs/game-design/) + decision 004 (proposed)
2026-11-14 11:16 | codex@aiden | unblock-team | done: Aiden task go-ahead + all-owner nudges; claude@ethan designated sole reviewed/green merge coordinator; Pages workflow enabled (deployment pending)
2026-11-14 11:45 | claude@aiden | scene3d | done: [P2] 3D space view, PR #22 (SpaceView: planet/clouds/atmosphere/stars/orbit/craft from parts); builder close-up in PR #10; three in PR #4; merge order adds #22 before #10
2026-11-14 11:47 | claude@aiden | handoffs | closed claude@ethan merge-order (answered by codex@aiden: Ethan merges); new stack for Ethan: #16 → #22 → #10 and #14 (see GAME_PLAN merge order)
2026-11-14 11:45 | claude@sarah | game-design | game design GO / NO-GO in PR #23 (docs/game-design/, decision 004 proposed); 8 tasks added to BOARD Open; handoff to all
2026-11-14 11:19 | cursor@kaipo | multiplayer-rehearsal | claimed [P1] Multiplayer rehearsal (docs/MULTIPLAYER_TEST.md)
2026-11-14 11:22 | cursor@kaipo | multiplayer-rehearsal | script + fallback call in docs/MULTIPLAYER_TEST.md, PR #24; live 4-device results still empty
2026-11-14 11:50 | claude@aiden | 3d-handover | Aiden: Ethan's Fable builds the 3D models + rest of the 3D (heavy part). Handed ui/scene3d/ (PR #22) to claude@ethan; board P1 task owner claude@ethan; decision 003 + GAME_PLAN owners updated; handoff 3d-build-on-fable
2026-11-14 11:50 | claude@sarah | cards-debrief | claimed: anomaly card UI + debrief stars/what-if/share card (ui/mission/)
2026-11-14 11:23 | claude@jamie | challenge-readme | PR #6: linked docs/CHALLENGE_OFFICIAL.md (my part of claude@sarah's official-brief handoff to all)
2026-11-14 11:25 | claude@jamie | gonogo | claimed: [P0] GO / NO-GO poll, solo (ui/gonogo/)
2026-11-14 11:26 | codex@aiden | merge-batch | claimed: Aiden explicitly requested named PR batch + existing Pages deploy; temporary merge lead; #22 required before #10, #6 README conflict
2026-11-14 11:55 | claude@aiden | card-sources | claimed: [P1] Anomaly card sources (ANOMALY_CARDS.md source lines only)
2026-11-14 11:27 | codex@aiden | merge-batch | published temporary takeover from Ethan for Aiden-requested batch; Pages workflow source unchanged; rehearsing current heads
2026-11-14 12:15 | claude@sarah | cards-debrief | anomaly card + debrief stars/what-if/share card in ui/mission, PR #25; tsc + 33 tests + build pass, checked desktop + phone; handoff to claude@ethan with mount props
2026-11-14 11:28 | codex@jamie | start-polish | claimed: difficulty + shared theme/glossary adoption in ui/start and ui/lobby; original PR heads stable during merge batch
2026-11-14 11:29 | claude@ethan | merge | done: 21 PRs on main (c1b8d30) by one fast-forward push of the rehearsed merge; tsc clean, 178/178 tests, build + Pages deploy pass, live URL returns 200 (placeholder page until app/ lands); held #6 (README conflict) and #25 (new, untested); handoff to all
2026-11-14 11:29 | claude@ethan | sim-data | PR #26 merged: sim reads the real data/ catalogs; catalog test no longer pins row counts so data/ can grow
2026-11-14 11:33 | claude@ethan | scene3d | claimed: [P1] 3D models + launch + 3D fly scene (ui/scene3d/, whole folder), branch ethan-claude/scene3d; took over from claude@aiden
2026-11-14 12:10 | claude@aiden | card-sources | done: [P1] Anomaly card sources, PR #28 into #23 (official sources for 8 cards + MCO line, stories checked); handoff to claude@sarah with 3 wording notes
2026-11-14 12:14 | claude@aiden | card-sources | #23 merged before PR #28, so retargeted #28 to main (clean); handoff + board updated
2026-11-14 11:40 | cursor@kaipo | multiplayer-rehearsal | done: first attempt failed, PR #27. Live site and localhost are still the scaffold (no Host/Join). Run B not started. Venue re-run and glossary terms added to Open, owner cursor@kaipo. Handoff to claude@ethan.
2026-11-14 12:18 | claude@aiden | glossary-terms | started: glossary tooltips in ui/briefing + ui/builder (cursor@kaipo handoff 1102)
2026-11-14 11:37 | codex@aiden | merge-batch | done: all 14 requested PRs + #22 merged; resolved #6 README, 178 tests/build pass, Pages run 43632765419 success; live scaffold verified; Ethan resumes coordinator
2026-11-14 11:41 | claude@ethan | app | started: assembling the real app on main's screens (branch ethan-claude/app) + browser e2e tests in e2e/; sim review fixes summarised with requests per owner in handoff 20261114-1141 (to all)
2026-11-14 11:41 | claude@ethan | merge | PRs #25, #27, #28 rehearsed together on main: tsc clean, 186/186 tests, build passes; waiting on Ethan's go-ahead to push
2026-11-14 12:25 | claude@aiden | glossary-terms | done: glossary in briefing + builder, PR #29; handoff to cursor@kaipo (unique Term ids via useId)
2026-11-14 11:41 | codex@jamie | start-polish | done: difficulty + theme/glossary adoption, PR #30; 179 tests + tsc/build/contrast + desktop/phone browser checks pass
2026-11-14 11:42 | codex@jamie | daily-mission | claimed: Start UI/helper only; Ethan accepted UTC day + YYYYMMDD seed + normal + sorted IDs; app stays his
2026-11-14 11:47 | claude@ethan | merge | done: PRs #25, #27, #28 on main (b57df67), Ethan's go-ahead; tsc clean, 186/186 tests, build + Pages deploy pass
2026-11-14 12:35 | claude@aiden | budget-bars | claimed: [P0] builder budget bars match the reviewed sim (probe on real data: Bus capacity bar missing, science bar 10 vs sim forecast 1.7 on demo)
2026-11-14 11:43 | cursor@caleb | live-site | ran P0 check: Pages 200 but scaffold only on desktop and phone; start to results blocked on app loop
2026-11-14 12:45 | claude@aiden | budget-bars | done: builder bars match reviewed sim, PR #32 (after #29); ethan's no_station_keeping ask: builder never handled it, nothing to drop
2026-11-14 12:40 | claude@sarah | space-weather | claimed: real NASA OMNI space weather dataset (data/space-weather/ new subfolder) + fly-screen strip + design spec
2026-11-14 11:43 | codex@aiden | daily-records | claimed: daily-seeded leaderboard + supplied stars, ui/leaderboard/ only; app assembly remains Ethan
2026-11-14 11:46 | claude@jamie | gonogo | done: GO / NO-GO poll in PR #33 (ui/gonogo/), tsc clean, 189/189 tests; handoff to claude@ethan to mount it in app/
2026-11-14 11:46 | codex@jamie | daily-mission | done: Start daily helper/UI, PR #31 after #30; 191 tests + tsc/build/browser pass; app integration task stays Ethan-owned; net clarification handoff
2026-11-14 11:50 | cursor@kaipo | glossary-cards | claimed: [P2] anomaly-card glossary terms (ui/learn/). Rehearsal re-run stays Open: live site still has no Host/Join.
2026-11-14 12:55 | claude@aiden | board | added 7 improvement tasks to Open (console lights, part compatibility, lazy 3D + size check, crash safety, offline/PWA, first-time tips, sound)
2026-11-14 13:05 | claude@sarah | space-weather | real NASA OMNI space weather (data/space-weather, 1996–2026) + fly-screen strip + preview storm card on real storm days, PR #34; tests verify known storms; handoffs to claude@ethan (sim) + claude@jamie (subfolder)
2026-11-14 12:56 | claude@aiden | console-lights | claimed: [P1] Builder console lights (ui/builder/)
2026-11-14 11:52 | claude@jamie | hard-mode | claimed: make Hard winnable with random failures on; fix Normal row in data README
2026-11-14 11:52 | claude@ethan | scene3d | paused the 3D build until about 16:20 so the app assembly (the playable game) finishes first; partial work pushed to ethan-claude/scene3d-launch and -fly; ui/scene3d/ stays claimed
2026-11-14 13:05 | claude@aiden | console-lights | done: builder console lights, PR #35 (merge after #29, #32, #33)
2026-11-14 11:58 | claude@ethan | merge | done: PRs #29, #30, #31, #32, #33, #34, #35 on main (07b6c1f); tsc clean, 201/201 tests, build passes; Ethan gave standing approval to merge PRs that pass those three checks, so tell me when yours is ready
2026-11-14 12:00 | claude@jamie | hard-mode | done: PR #36, demo seed 42 -> 1, Normal failures off, failures-on Hard test; tsc clean, 189/189; handoff to claude@ethan (sim/README seed note)
2026-11-14 12:00 | claude@ethan | merge | done: PRs #36, #37 on main (bec90dc); tsc clean, 214/214 tests, build passes
2026-11-14 13:08 | claude@aiden | part-fit | claimed: [P1] Builder part compatibility (ui/builder/)
2026-11-14 11:55 | cursor@kaipo | glossary-cards | done: anomaly-card glossary terms merged, PR #38. Six ids in ui/learn/. Term tooltip ids are unique. Rehearsal re-run still Open.
2026-11-14 13:20 | claude@aiden | part-fit | done: builder part compatibility badges, PR #39 (after #35)
2026-11-14 11:55 | claude@ethan | merge | done: PRs #39 on main (8fb9e4c); tsc clean, 218 passed (218), build passes
2026-11-14 11:56 | codex@aiden | daily-records | done: PR #37 merged; daily seed isolation + matching stars, 20 owned tests; actual main 216 tests/build pass; app/results integration handoff
2026-11-14 12:10 | claude@jamie | bonus-goal | claimed: [P1] bonus star goal per scenario + program order (data/scenarios/)
2026-11-14 13:25 | claude@aiden | board | Aiden: 3D visual work goes to Ethan. Moved lazy-3D task to claude@ethan (handoff lazy-3d); split off bundle-size CI check (mine, after the split)
2026-11-14 13:27 | claude@aiden | offline | claimed: [P1] Demo works on bad venue wifi (index.html, vite.config.ts, public/, pwa/)
2026-11-14 12:25 | claude@jamie | bonus-goal | done: PR #41, bonus_goal per scenario + PROGRAM order; tsc clean, 222/222; handoffs to claude@ethan, claude@aiden, codex@jamie
2026-11-14 11:59 | codex@jamie | builder-tips | claimed: First-time tips, ui/tutorial only; mounting via owner handoff
2026-11-14 12:05 | claude@ethan | app | done: the real game is on main and live (PR #42, plus #40 docs): Start → Lobby → Briefing → Builder → launch → Mission → Results; 294/294 tests, build passes, first three screens checked in a browser on the production build; e2e tests still running; handoff to all (kaipo rehearsal + caleb live check unblocked)
2026-11-14 13:45 | claude@aiden | offline | done: offline mode + icon + link meta, PR #43 (tested offline in the browser); npm run preview base path fixed
2026-11-14 12:05 | codex@jamie | builder-tips | done: First-time builder tips component, PR #44; 299 tests + tsc/build/browser persistence/phone checks pass; mounting handed off
2026-11-14 13:50 | claude@aiden | audio | claimed: [P2] Sound (ui/audio/ new + builder click)
2026-11-14 12:07 | codex@aiden | completion-check | main 294 tests/build pass; live solo Start to Results verified (expected loss, 26 points); owner handoffs for remaining integration/rehearsal/submission, no source edits or new claim
2026-11-14 14:05 | claude@aiden | audio | done: sound effects + mute toggle, PR #45; handoff to all (app toggle + launch, gonogo calls, results)
2026-11-14 14:10 | claude@aiden | board | main chunk is 959 kB / 264 kB gz with the app in (three.js not split yet); note to claude@ethan (bundle size + tab icon vs PR #43)
2026-11-14 12:40 | claude@jamie | real-missions | claimed: [P1] real missions table (data/real-missions.json) for the debrief match
2026-11-14 11:56 | cursor@caleb | submission | done: Space Apps submission package, PR #40
2026-11-14 14:20 | claude@aiden | playtest | played main start → results (won A 94, lost F 26, no console errors); 7 findings posted to Open with owners + handoff to all; claimed the builder phone-panel fix
2026-11-14 12:13 | codex@jamie | net-lifecycle | claimed: multiplayer disconnect/rejoin reliability, existing PeerTransport internals + tests/docs; no app mounting dependency
2026-11-14 12:18 | claude@ethan | merge | done: PRs #41, #43, #44, #45 + app follow-up (difficulty picker, daily mission, GO / NO-GO, stars, space weather wired) on main (bb6a932); tsc clean, 310/310 tests, build passes
2026-11-14 13:40 | claude@sarah | game-design | handoff to claude@ethan: wire decision 004 no-sim pieces first (GO/NO-GO poll, space-weather strip, stars/share) in app/; offered to do it
2026-11-14 14:35 | claude@aiden | mobile-budgets | done: compact phone budgets panel, PR #46 (playtest finding)
2026-11-14 12:25 | claude@ethan | app | done: PR #47 on main (builder tips, sound toggle, launch sound mounted); small requests per owner in handoff 20261114-1225 (to all); 3D build and e2e tests paused until about 16:20 (usage limit), merges continue
2026-11-14 14:42 | claude@aiden | briefing-bonus | started: bonus star on the briefing (claude@jamie handoff 1225)
2026-11-14 12:28 | claude@ethan | merge | done: PRs #46 #48 on main (0f04a69); tsc clean, 316 passed (316), build passes
2026-11-14 12:18 | codex@jamie | net-lifecycle | done: multiplayer disconnect/rejoin reliability, PR #48; 316 tests + tsc/build; existing app sessions covered, no mounting needed
2026-11-14 14:50 | claude@aiden | briefing-bonus | done: briefing names the bonus star, PR #49; claude@jamie handoff 1225 set done
2026-11-14 13:05 | claude@jamie | real-missions | done: PR #50, 12 sourced real missions + realMissions export; tsc clean, 308/308; handoff to claude@sarah for the debrief match helper
2026-11-14 14:55 | claude@aiden | offer | offered claude@ethan to take 2 app/ tasks (scroll to top, crash safety); noted GO/NO-GO mount already done in 24247ed
2026-11-14 15:00 | claude@sarah | debrief-polish | claimed: bonus star fix, real mission match, 3D orbit view on fly screen (ui/mission/), card wording (ANOMALY_CARDS.md)
2026-11-14 15:00 | claude@aiden | takeover | Aiden: take over Ethan's tasks without overriding (Ethan at limit). Claimed scroll-to-top, crash safety, lazy 3D (index.ts only); moved Ethan's finished GO/NO-GO + daily lines to Done (24247ed)
2026-11-14 12:35 | claude@ethan | merge | done: PRs #49, #51 on main (8bfbd90); 316/316 tests, build passes; #50 HELD (conflict in data/README.md + data/index.ts, claude@jamie to merge main into it); lazy 3D cut first-load script from 959 kB to 352 kB; answers to all open handoffs in 20261114-1235 (to all); accepted claude@aiden taking scroll-to-top + error boundary in app/
2026-11-14 15:03 | claude@aiden | takeover | withdrew lazy-3D takeover: claude@ethan finished it in 10ae68e (959 → 352 kB), moved to Done in his name; claimed my bundle-size check (now unblocked)
2026-11-14 15:25 | claude@sarah | debrief-polish | done: PR #52 (no nameless bonus star, real mission match, 3D orbit view on fly screen, card wording); 318 tests; closed handoffs 1107/1115/1210/1340; handoff to claude@ethan for realMissions prop
2026-11-14 12:40 | claude@ethan | scene3d | restarted the 3D build (parts, launch, fly scene) from the saved partial branches; pushes work in progress often to ethan-claude/scene3d-*; may be cut off by the usage limit and continue after about 16:20
2026-11-14 12:26 | codex@aiden | daily-regression | claimed: browser regression for Daily/stars/saved records, evidence in docs/qa/daily-records.md; no app/Claude/Ethan source edits
2026-11-14 15:20 | claude@aiden | takeover | done: scroll-to-top + crash safety (PR #53, from claude@ethan's tasks), bundle-size check (PR #54); offer handoff closed
2026-11-14 15:25 | claude@aiden | what-if | claimed (from claude@ethan's tasks, Aiden's call): [P0] What-if + risk meter helper, new sim/analysis.ts only
2026-11-14 15:40 | claude@aiden | what-if | done: sim/analysis.ts whatIf + successRate, PR #55 (from claude@ethan's tasks); handoff to claude@sarah + claude@ethan
2026-11-14 12:35 | claude@ethan | merge | done: PRs #52 #53 #54 #55 #56 on main (ddfb083); tsc clean, 331 passed (331), build passes; HELD (conflict): #50
2026-11-14 15:45 | claude@aiden | risk-meter | claimed: [P1] builder risk meter (ui/builder/ + one prop in app/ Design)
2026-11-14 12:26 | cursor@caleb | live-site | done: start to results on Pages, desktop and 390px phone; First Light Normal starting design F 26 pts; phone screens open scrolled down
2026-11-14 16:00 | claude@aiden | risk-meter | done: builder risk meter, PR #57 (Hard: 0% starting design, 95% winning design; hidden on Easy/Normal)
2026-11-14 12:40 | cursor@kaipo | learn-tooltip-overflow | claimed: [P1] hide glossary tips until shown + keep wide tips inside viewport (ui/learn/)
2026-11-14 12:45 | cursor@kaipo | learn-tooltip-overflow | done: PR #58; builder at 1024px no horizontal overflow; playtest finding #7
2026-11-14 12:33 | codex@aiden | daily-regression | done: PR #56, live Daily/regular isolation + reload/best-design/star retention pass; 316 tests/build; readiness handoff closed, no source edits
2026-11-14 13:15 | claude@jamie | real-missions | merged origin/main into PR #50 (kept PROGRAM + realMissions); MERGEABLE, tsc clean, 345/345 — ready for claude@ethan to merge
2026-11-14 13:20 | claude@jamie | gonogo-sound | claimed: GO / NO-GO poll sounds (ui/gonogo/), per claude@aiden sound handoff
2026-11-14 12:40 | cursor@caleb | a11y | done: accessibility pass, PR #59; handoff to codex@jamie for the builder tour dialog
2026-11-14 13:35 | claude@aiden | debrief-fixes | claimed: app/ calls whatIf() at mission end → results fixes + Try it (taken over from claude@ethan, Aiden OK)
2026-11-14 13:35 | claude@jamie | gonogo-sound | done: PR #61, go / no-go sounds per console call (ui/gonogo/); tsc clean, 332/332, checked in browser preview
2026-11-14 12:45 | cursor@caleb | live-site | re-check: phone briefing and builder open at scrollY 0 after a scrolled start page
2026-11-14 13:00 | claude@ethan | sim-cards | done: [P0] anomaly cards, PR #60 on main (8 cards, decision events, own seeded stream, co-op ownership, app wiring), played in a browser; PR #63 wires what-if fixes + real mission match on the debrief (claude@aiden: this overlaps the line you claimed, please review instead of redoing); also merged #50, #57, #59, #61; 360/360 tests; handoff to all 20261114-1300
2026-11-14 12:48 | codex@jamie | mission-entry | claimed: Start name fix + mission artwork/program route, lobby visuals, tutorial keyboard handling; user requested substantial independent polish, owned UI folders only
2026-11-14 13:50 | claude@jamie | card-counts | claimed: anomaly_cards per difficulty in DIFFICULTIES + win-with-cards test
2026-11-14 15:50 | claude@sarah | live-fixes | played the live site start→results (poll, 2 cards, fixes, real match, share all work); claimed 3 fixes in ui/mission/
2026-11-14 13:55 | claude@aiden | debrief-fixes | done: PR #65, debrief fixes from whatIf() with real cards/seed + player's card answers, Try it; 361 tests, played 26 → 37 fix; what-if handoff done
2026-11-14 16:05 | claude@sarah | live-fixes | done: PR #66 (what-if sentence, real-mission size match, inspired-by header), 361 tests; live site start→results verified; closed handoffs 1215/1305/1525/1540
2026-11-14 14:15 | claude@jamie | card-counts | done: PR #67, anomaly_cards per difficulty in DIFFICULTIES; Moon Normal was unwinnable with 2 cards (fixed reference); tsc clean, 369/369; handoff to claude@ethan
2026-11-14 14:10 | claude@aiden | debrief-fixes | PR #65 rescoped: claude@ethan wired the debrief in 36712f7, so I kept his code and the PR only adds the player's card answers to the reruns (choicesOf); 362 tests, played
2026-11-14 14:20 | claude@aiden | launch-visible | claimed: builder side panel taller than a 768px screen hides Launch; ui/builder/ only
2026-11-14 14:35 | claude@aiden | launch-visible | done: PR #68, desktop builder panel capped at screen height with sticky Launch; 1024x768 + phone checked
2026-11-14 12:57 | codex@aiden | visual-overhaul | claimed V0: flight-first + later walkable hangar work packages, imports/assets plan; no Ethan/Claude source edits
2026-11-14 14:50 | claude@aiden | first-person-story | decision 005 (Aiden: first-person story, walk the tasks, cutscenes, pop-outs), GAME_DESIGN §4.9, 5 board tasks, handoff to all
2026-11-14 14:52 | claude@aiden | story-popouts | claimed: ui/story/ pop-outs, CAPCOM dialogue, cutscene frame, storyBeat
2026-11-14 13:03 | codex@aiden | visual-overhaul | done V0, PR #69 green build; added V1–V7 independent flight-first/hangar breakouts and sourced import/GLB plan; no Ethan/Claude production edits
2026-11-14 15:10 | claude@aiden | story-popouts | done: PR #70 ui/story (beats, CAPCOM, facts, task panel, cutscene frame); 367 tests, preview checked desktop+phone; handoff updated
2026-11-14 13:15 | cursor@kaipo | flight-assets | claimed: V3 flight prop/target GLB pack (public/visual-assets/flight, art/flight, docs/visual-assets/flight.md)
2026-11-14 13:18 | cursor@kaipo | flight-assets | GLBs for hurricane, wildfire, tdrs-relay; manifest + docs; GLTFLoader parse ok; test flight-assets
2026-11-14 13:20 | cursor@kaipo | flight-assets | done: V3 flight asset pack, PR #75
2026-11-14 13:22 | cursor@kaipo | flight-assets | moved the GLB check to tests/flight-assets.test.mjs so tsc does not need Node types
2026-11-14 13:24 | cursor@kaipo | flight-assets | merged PR #75 to main (929fb77) after the typecheck fix
2026-11-14 13:25 | cursor@kaipo | multiplayer-rehearsal | claimed: re-run four-device rehearsal (docs/MULTIPLAYER_TEST.md)
2026-11-14 13:32 | cursor@kaipo | multiplayer-rehearsal | preflight pass on live Pages + localhost; Run A/B pending four devices; flight-assets handoff done; merged main into rehearsal branch
2026-11-14 16:20 | claude@sarah | story | claimed: story script docs/game-design/STORY.md (V2 HUD waits on PR #69 + V1)
2026-11-14 15:20 | claude@aiden | story-app | claimed: wire ui/story into app/ (CAPCOM + cutscenes, plain backgrounds), Aiden: "wire it now"; handoff to codex@aiden about decision-number clash + V6 overlap
2026-11-14 13:10 | claude@jamie | pilot-training | claimed V4: data/pilot-training/ three training targets + observation/relay rules + tests; no data/index.ts or sim change
2026-11-14 16:35 | claude@sarah | story | done: docs/game-design/STORY.md (CAPCOM lines per LineId + BEAT_FACT pop-outs), PR open; handoff to claude@aiden to paste into ui/story; V2 HUD waits on PR #69 + V1
2026-11-14 13:10 | cursor@caleb | flight3d-qa | claimed: V5 3D interaction QA, test plan in docs/qa/flight3d.md
2026-11-14 13:11 | codex@jamie | mission-entry | done: PR #72, mission SVG art/PROGRAM route, remembered/default name, lobby consoles and modal tutorial; 363 tests/build, 129.5 kB gzip, desktop/phone/keyboard verified; checked new tasks, all Open scopes assigned, no delegation
2026-11-14 13:15 | claude@jamie | pilot-training | done V4: PR #73 data/pilot-training (3 targets, interact/routeComplete, sourced facts), 364 tests; handoffs to claude@sarah (V2) and claude@ethan (V7)
2026-11-14 15:45 | claude@aiden | story-app | done: PR #74 (after #70), story in the game: CAPCOM + cutscenes, clock held in solo; full game played with beats logged; 370 tests
2026-11-14 16:50 | claude@sarah | flight-hud | claimed V2: ui/flight-hud/ (props + preview on claude@jamie's V4 data); V1 labels as a prop
2026-11-14 13:15 | codex@aiden | pilot-input | claimed V1 ui/pilot-input only; Astra design review; own PR69 decision-number fix and V6 hold
2026-11-14 17:15 | claude@sarah | flight-hud | done V2: ui/flight-hud PR #76 (on V4 #73), 368 tests, desktop+phone checked; closed claude@jamie handoff 1315; handoff to claude@ethan (V7) + codex@aiden (V1 hints)
2026-11-14 13:19 | cursor@caleb | flight3d-qa | done: V5 test plan, PR #77; cases not run until V7
2026-11-14 15:55 | claude@aiden | split-3d | Aiden: split the 3D story work so nothing waits on claude@ethan's usage; rooms → V6 (ui/hangar/), cutscenes → ui/cutscenes/ (open), launch stays Ethan's with a 17:30 fallback, app/ walk → claude@aiden; claimed V6
2026-11-14 13:23 | cursor@caleb | cutscenes | claimed: 3D cutscene scenes in ui/cutscenes/ (arrival, orbit, anomaly, ending)
2026-11-14 13:25 | codex@aiden | pilot-input | done V1 PR #78: keyboard/pointer + held scan intent, 364 tests/build/size/browser checks; PR69 decision006 + latest room split reconciled; adoption handoff published
2026-11-14 16:25 | claude@aiden | hangar | done V6: PR #80 ui/hangar walkable mission control (6 stations, guided walk, craft on stand), 365 tests, preview desktop+phone
2026-11-14 17:40 | claude@sarah | flight-hud | PR #76 aligned with V1 #78: hints = V1 keys (Space brake, hold E scan), keyboard/AT scan toggle; 370 tests
2026-11-14 13:33 | claude@jamie | handoffs | closed two stale handoffs to me (ethan keep-your-columns, sarah space-weather-folder)
2026-11-14 13:40 | claude@jamie | pilot-training | PR #73 merged by claude@ethan; main 405/405, tsc + build clean
2026-11-14 18:05 | claude@sarah | story-lines | claimed: replace placeholder LINES in ui/story/model.ts with STORY.md script (LINES block only, per its comment); main checked after Ethan's merge: 405 tests, build ok
2026-11-14 13:40 | cursor@caleb | cutscenes | done: arrival, orbit, anomaly, ending in ui/cutscenes, PR #81; mount handoff to claude@aiden
2026-11-14 18:20 | claude@sarah | story-lines | done: ui/story LINES = STORY.md script (≤120 chars, Mars delay sourced), PR open, 405 tests; closed my handoff 1635 to claude@aiden
2026-11-14 13:55 | claude@ethan | merge | done: PRs #65 to #74, #76 to #78, #80 to #83 on main (ccf2cc0); tsc clean, 419/419 tests, build passes; #74 conflict in app/App.tsx resolved keeping both sides
2026-11-14 13:55 | claude@ethan | launch | done: launch cutscene, PR #83 on main (LaunchView in ui/scene3d, played after every launch, clock held, checked in a browser); about 20 s, say if it must be 10 s
2026-11-14 13:55 | claude@ethan | plan | read decision 005 + 3D split + VISUAL_OVERHAUL; my work is now split into small tasks (handoff 20261114-1355 to all); released fly-scene-by-sim-time and Moon/Mars shaders to Open; next: 3D part models PR
2026-11-14 14:05 | claude@ethan | parts | done: 3D part models, PR on main with #84 (a75ea46): a model for every catalog row, buildCraft unchanged for hangar/cutscenes/builder; 437+ tests, build passes, checked in a browser
2026-11-14 14:10 | claude@ethan | realism | claimed: realistic rockets (ui/scene3d/launch/) and realistic spacecraft parts (ui/scene3d/parts/), modelled on real NASA hardware with sources, Ethan's request; public signatures unchanged
2026-11-14 18:40 | claude@aiden | app-walk | claimed: walk between stations (ui/hangar behind the screens, each screen a panel over the hall), branch aiden-claude/app-walk; touches app/Walk.tsx (new) + a few lines in app/App.tsx, app/app.css
2026-11-14 13:49 | claude@jamie | moon-mars-shaders | asked claude@ethan to take released P2 Moon/Mars shaders + cruise view (handoff); not claimed
2026-11-14 18:45 | claude@sarah | audit | claimed: accuracy audit report + team priorities (ui/mission); added 13 audit/awards tasks to BOARD Open with owners (submission 30-s video, science fixes, data fixes, 3D bug, sandbox, schedule, coverage, sources)
2026-11-14 14:15 | claude@ethan | realism | started two subagents: realistic rockets (branch ethan-claude/real-rockets) and realistic spacecraft parts (ethan-claude/real-parts); handoff to claude@jamie (optional rows for atlas-v, delta-iv-heavy, falcon-heavy)
2026-11-14 14:20 | claude@ethan | moon-mars-shaders | yes to claude@jamie taking the Moon/Mars shaders + cruise view in ui/scene3d/ (reply and scope in handoff 20261114-1745); also saw two P0 lines for me on the board: solar power falls with distance (sim/design.ts, needs data column) and the white-bus 3D bug in LEO/SSO
2026-11-14 14:20 | codex@jamie | demo-story | claimed P0: 30-second demo script and accurate NASA data story in PITCH/DEMO/NASA_SOURCES; own docs only
2026-11-14 13:53 | claude@jamie | moon-mars-shaders | claimed (yes from claude@ethan 14:20): Moon/Mars shader branches + new cruise view in ui/scene3d/
2026-11-14 13:52 | codex@aiden | readiness-next | GitHub: zero open PRs, main deploy green; verified remaining room/cutscene/flight/cache wiring; offered isolated V7 UI assembly pending Ethan API/scope; no code claim
2026-11-14 19:20 | claude@sarah | audit | done: PR #85 accuracy/requirements/awards audit + Team priorities card (439 tests); handoff to all with per-owner tasks
2026-11-14 13:55 | codex@jamie | demo-story | done: PR #86, 30-second shots/63-word narration, First Light setup, NASA OMNI/mission/card provenance; 35 tests pass; Caleb/Claude Jamie notified, recording remains
2026-11-14 19:20 | claude@aiden | app-walk | done: PR #87, ui/hangar behind every screen (app/Walk.tsx), walk on each screen change, screens as panels over the hall, plain screens with no WebGL; full solo game played desktop + phone; 438 tests, build, 136.6 kB first load
2026-11-14 14:30 | claude@ethan | white-bus | checked the P0 3D bug (medium/flagship bus white in LEO/SSO): does not reproduce on main since the new part models (PR #84); flagship LEO, medium LEO and medium SSO look right in a browser; no code change; claude@aiden please re-check on the live site
2026-11-14 13:57 | codex@aiden | source-audit | claimed: cited-link/claim review; docs/qa/sources.md + sources.json only, source read-only
2026-11-14 13:54 | cursor@caleb | submission | claimed: P0 submission-page fixes in docs/SUBMISSION.md
2026-11-14 14:40 | claude@ethan | merge | merged PRs #85 (audit + team priorities), #86 (demo story docs), #87 (walk between stations) into main; together: tsc clean, 440 tests, build passes, start screen loads; BOARD.md conflict on #87 kept both sides
2026-11-14 13:59 | cursor@caleb | submission | done: submission page matches the judging form, PR #88
2026-11-14 14:00 | claude@jamie | moon-mars-shaders | done: PR #89 (Moon/Mars landmarks in shaders, additive cruise view), 441 tests, desktop+phone checked; note to claude@ethan in handoff 1745
2026-11-14 19:50 | claude@aiden | cutscene-scenes | done: cursor@caleb's handoff 1340, ui/cutscenes scenes passed into the story frame in app/StoryLayer.tsx (launch stays ui/scene3d's); arrival, anomaly, ending seen in the game; 440 tests, 137.3 kB first load
2026-11-14 14:55 | claude@ethan | merge | merged PRs #88 (submission page) and #89 (Moon/Mars surfaces + cruise view) into main; together: tsc clean, 444 tests, build passes; checked Moon orbit, Mars orbit and both cruise views in a browser
2026-11-14 14:02 | codex@aiden | source-audit | done: PR #90, 37 GETs/38 strings/43 refs; claim gaps + conflicting GRAIL mass handed to owners; no source edits
2026-11-14 15:00 | claude@ethan | merge | merged PR #90 (source audit docs) into main; tsc clean, 444 tests, build passes; open PRs: none
2026-11-14 15:05 | claude@ethan | sim-sun-coverage | claimed: solar power scales with orbit solar_flux_factor (defaults to 1 until the data column lands) and orbit coverage for imagers, sim/design.ts, branch ethan-claude/sim-sun-coverage
2026-11-14 15:20 | claude@ethan | sim-sun-coverage | done: PR #92 on main (solar power x orbit solar_flux_factor, default 1; off-orbit imagers x coverage_fraction; orbitScienceFactor exported); also merged PR #91 (3D scenes in the cutscene frame); together tsc clean, 446 tests, build passes; handoff to claude@jamie (data column) and claude@aiden (builder badge)
2026-11-14 14:07 | claude@jamie | real-planet-maps | asked claude@ethan: inline NASA maps for Earth/Moon/Mars + Earth shaders (Jamie's request); not claimed
2026-11-14 15:25 | claude@ethan | flight-view | claimed V7 (ui/scene3d/ + app/ part): V7a ui/scene3d/flight/ FlightView (branch ethan-claude/flight-view), then V7b mount in app/ behind a Flight training button; local training only, no sim commands or score
2026-11-14 20:05 | claude@aiden | offline-public | claimed: service worker caches everything in public/ (cursor@kaipo's flight models are not cached today), pwa/ + vite.config.ts, branch aiden-claude/offline-public
2026-11-14 20:20 | claude@aiden | offline-public | done: PR #93, service worker caches all six public/ files (flight GLBs + manifest), test fails when a public file is not listed; 447 tests, build; offline reload in a browser not checked
2026-11-14 15:30 | claude@ethan | card-counts | claimed: app reads the anomaly card count from data DIFFICULTIES (claude@jamie's handoff 1415), one line in app/App.tsx, branch ethan-claude/card-counts
2026-11-14 15:40 | claude@ethan | merge | merged PRs #93 (offline cache covers public/) and #94 (card count from data DIFFICULTIES, claude@jamie's handoff 1415 set done) into main; together tsc clean, 447 tests, build passes
2026-11-14 19:45 | claude@sarah | nasa-data | verified NASA data: OMNI matches NASA raw files (400 days + fresh 2003 byte-identical), 6 real-mission masses match NSSDC, 34/34 source links valid; withdrew LRO flag; found OMNI only displayed, not used in play → new P0 board task
2026-11-14 20:00 | claude@sarah | nasa-data | applied codex@aiden source-audit items for me (Spirit/SOHO mission histories, Curiosity storm source, MGS FAQ dropped) on PR #85; handoff to claude@ethan for in-game Spirit URL
2026-11-14 15:50 | claude@ethan | real-planet-maps | answered claude@jamie's handoff 1830: yes to inline NASA maps (ui/scene3d/maps/) and yes to claude@jamie taking the Earth/cloud/atmosphere shaders; split written in the handoff. Claimed for myself: rest of the sky in world.ts (Moon from Earth orbit, Earth from lunar orbit, Phobos + Deimos, axial tilts), branch ethan-claude/real-sky
2026-11-14 15:55 | claude@ethan | merge | merged PR #95 (NASA data verification + source fixes) into main; also swapped the Spirit card's source_url in sim/cards.ts to NASA's Spirit mission history (claude@sarah's handoff 2000, set done); tsc clean, 447 tests, build passes
2026-11-14 20:30 | claude@aiden | storm-card | offered to take the P0 NASA-data-drives-play sim/app part from claude@ethan (handoff 2030); not claimed, waiting for his answer
2026-11-14 20:40 | claude@aiden | live-check | played the live Pages site (ae29027+) start → debrief, desktop: hall walk at every station, 3D arrival/anomaly/ending scenes in the frame, 2 anomaly cards answered, service worker registered, no console errors; phone and co-op not checked
2026-11-14 16:00 | claude@ethan | storm-card | answered claude@aiden's handoff 2030: take it (sim/cards.ts + tests and the weather lines in app/App.tsx are claude@aiden's for the storm-card task)
2026-11-14 20:15 | claude@sarah | real-storms | claimed P0: storm card on real OMNI storm days; touches claude@ethan's sim/cards.ts, sim/sim.ts (storm scheduling only), app/App.tsx (withCards only) with Sarah's approval
2026-11-14 16:35 | claude@ethan | realism | done and merged: PR #98 real rockets (ui/scene3d/launch/), PR #97 real spacecraft parts + no nozzle on 3U/6U (ui/scene3d/parts/), PR #96 real sky (Moon, Earth from the Moon, Phobos, Deimos in world.ts + sky.ts); together tsc clean, 458 tests, build passes; launch scene and sky checked in a browser after the merge
2026-11-14 16:40 | claude@ethan | storm-card | correction to my 16:00 answer: claude@sarah holds the board claim for the real-storms task (sim/cards.ts, sim/sim.ts storm scheduling, app withCards), fine by me; claude@aiden please do not start the same task, ask claude@sarah for a piece instead
2026-11-14 20:50 | claude@sarah | real-storms | done: PR #99 real NASA storms drive play (storm card on real OMNI G3+ days, real date story; Sarah-approved in claude@ethan's sim/app); 450 tests; played real G4 2017-09-07; handoff to claude@ethan
2026-11-14 16:50 | claude@ethan | merge | merged PR #99 (real NASA storms drive the storm card, claude@sarah) into main after review; tsc clean, 461 tests, build passes; handoff 2050 set done
2026-11-14 14:20 | codex@aiden | offline-qa | claimed: browser offline cache verification, docs/qa/offline-cache.md only; production source read-only
2026-11-14 14:23 | claude@jamie | real-planet-maps | claimed (yes from claude@ethan): inline NASA maps + all planet/cloud/atmosphere shaders; world.ts material lines only
2026-11-14 16:50 | claude@ethan | rocket-render | claimed (Ethan's request): rockets fully rendered with surface detail, shadows and effects, ui/scene3d/launch/, branch ethan-claude/rocket-render. Planet maps: claude@jamie's claim stands; Ethan asks for a split (claude@jamie keeps Earth, releases Moon + Mars to me), asked in handoff 1650, nothing of theirs touched
2026-11-14 21:05 | claude@sarah | real-storms-docs | claimed: weather lines in SUBMISSION/PITCH/DEMO/NASA_SOURCES/app README → real NASA storms drive play, added to PR #99 (Sarah asked)
2026-11-14 21:20 | claude@sarah | nasa-docs | PR #100: submission/pitch/demo/NASA_SOURCES/app README say real NASA storms drive play (PR #99 merged); closed my handoffs 1305 + 2050; handoff to caleb/jamie-codex/ethan
2026-11-14 17:10 | claude@ethan | planet-maps | waiting on claude@jamie's answer to handoff 1650 (split: they keep Earth, I take Moon + Mars); prepared Moon and Mars colour + elevation maps from NASA SVS and USGS in a scratch folder, sources and an east/west mirroring note added to the handoff; nothing of theirs touched. Rocket rendering pass running on ethan-claude/rocket-render
2026-11-14 14:36 | claude@jamie | real-planet-maps | done: PR #102 real NASA maps for Earth/Moon/Mars (199 kB inline, lazy chunk), shaders + fallback; 458 tests; desktop+phone checked; notes for claude@ethan in handoff 1830
2026-11-14 14:36 | codex@aiden | offline-qa | done: PR #101; Start/public assets offline pass, local first-use lazy imports fail; online control pass, PWA owner handoff, no production edits
2026-11-14 17:30 | claude@ethan | merge | merged PRs #100 (docs: real storms), #101 (offline QA evidence), #102 (claude@jamie: real NASA maps for Earth, Moon, Mars) into main; together tsc clean, 461 tests, build passes; Earth, Moon and Mars checked in a browser, none mirrored. Claimed planet relief from real elevation (LOLA, MOLA) + maps on the sky companions, branch ethan-claude/planet-relief; handoff 1650 closed as overtaken
2026-11-14 20:50 | claude@aiden | board | added Submission readiness: record demo (human + codex@jamie), submit (cursor@caleb), code freeze Sun 18:00 (claude@ethan), launch 20 s vs 10 s (claude@ethan); claimed walk + cutscenes phone/reduced-motion/screen-reader pass. Storm card left to claude@sarah per claude@ethan's correction
2026-11-14 21:05 | claude@aiden | walk-a11y | done, no code change: live site at 375 px fits, hall inert/aria-hidden, cutscene Skip focused + Escape works, reduced motion verified by code; leftovers noted on the board; real phone + screen reader not checked
2026-11-14 21:40 | claude@sarah | rubric-pass | claimed: audit data fixes taken over from claude@jamie (unclaimed since 18:45) + README game-first header; removed stale P0 real-storms line (merged #99)
2026-11-14 14:45 | cursor@kaipo | cloudflare-turn | pulled UI/model overhaul (e2f149c); Cloudflare TURN stays in app/room.ts + api/ice.js; live /api/ice returns turns:443; merging onto main
2026-11-14 17:55 | claude@ethan | merge | merged PR #104 (Moon + Mars relief from real LOLA/MOLA elevation, maps on the sky companions) and PR #103 (cursor@kaipo: Cloudflare TURN relay via /api/ice on Vercel; BOARD.md conflict kept both sides; no secret in the repo); together tsc clean, 461 tests, build passes; Moon, Mars and Earth orbit views checked in a browser. Asked cursor@kaipo for a decision record, since decision 002 says no backend
2026-11-14 14:46 | codex@jamie | audit-takeover | Jamie authorized takeover after Claude limit; verified data findings still on main, found Sarah active rubric-pass claim, requested exact remaining sunlight/Mars scope before overlapping edits
2026-11-14 22:20 | claude@sarah | rubric-pass | done: PR #105 (data fixes taken over from claude@jamie, build times + deadlines, Sandbox, README header), 467 tests; new task schedule bar → claude@aiden; handoff to jamie/aiden/codex@jamie/caleb
2026-11-14 14:55 | cursor@kaipo | glossary | claimed: DSN wording plus rtg, solar-flux, coverage in ui/learn/; rehearsal doc will record what live WebRTC has proved
2026-11-14 14:53 | cursor@kaipo | glossary | DSN, reaction wheel, rtg, solar-flux, coverage; provenance in ui/learn/README.md; MULTIPLAYER_TEST.md records same-computer WebRTC pass and the pre-TURN cross-network fail
2026-11-14 14:55 | cursor@kaipo | glossary | done: PR #106
2026-11-14 14:55 | cursor@caleb | submit | claimed: P0 fill the judging form from docs/SUBMISSION.md
2026-11-14 15:00 | claude@aiden | 3d-game | decision 007 (first-person 3D game, 2D screens retired to fallback, Aiden's request) + Interactables contract + board section with one task per owner + handoff to all; claimed ui/fps/, playable mission control, app/World.tsx
2026-11-14 22:40 | claude@jamie | sunlight-column | claimed: solar_flux_factor in orbits.json (Ethan handoff 1520); codex@jamie has no branch for it
2026-11-14 15:01 | codex@aiden | walk-touch | claimed: decision 007 walking touch controls in ui/pilot-input only; no FPS/app overlap
2026-11-14 15:35 | claude@aiden | fps | done: PR #107 ui/fps first-person controller (WASD, arrows/mouse look, E, walls, prompt, touch hooks), 468 tests, +0 kB first load. FYI claude@sarah: sim/cards.test.ts failed once in a full run, passed the next 3
2026-11-14 15:02 | codex@jamie | sunlight-fix | claimed: user-authorized takeover of Claude Jamie sunlight column and reference balance; Sarah other audit fixes remain PR #105
2026-11-14 23:05 | claude@jamie | sunlight-column | done: PR #108 (solar_flux_factor, Mars starts with large solar array); 461 tests, 467 merged with #105; closes handoff 1520; codex@jamie: sunlight is covered, no need for Sarah to release orbits.json
2026-11-14 22:40 | claude@sarah | hud | claimed: fly + results declutter/fun pass (ui/mission/); measured words per screen: start 350, briefing 385, builder 1,394 (6,119 px), poll 171, fly 307
2026-11-14 15:05 | codex@jamie | sunlight-fix | scope add: Mars starting solar array must grow to preserve launchability and anomaly-card fixture; data/scenarios/mars.json only, Sarah PR105 complete
2026-11-14 15:07 | codex@jamie | sunlight-fix | done: PR #109 adopts concurrent #108 and tests with #105; 471 tests and build pass; regression guards sunlight and Mars launchability
2026-11-14 15:10 | cursor@kaipo | multiplayer-rehearsal | cross-device join on the Vercel site passed (Kaipo); hotspot not needed; fifth player, launch, and disconnect not re-scored
2026-11-14 15:10 | cursor@kaipo | world-props | six mission-control GLBs in public/visual-assets/world (~22 kB), listed in pwa/public-files.ts
2026-11-14 15:07 | codex@aiden | walk-touch | done: PR #110, 466 tests/build/size pass; browser multi-touch/key/lifecycle preview verified; FPS/app adoption handed to owners
2026-11-14 23:05 | claude@sarah | hud | done: PR #112 HUD fly view + hero results (fly 307→~126 words), UX spec with word budgets; 5 tasks to aiden/codex@jamie/jamie; handoff
2026-11-14 15:10 | codex@aiden | desktop-priority | Aiden prioritizes computer gameplay; no further mobile work; optional completed touch PR #110 must not delay desktop integration
