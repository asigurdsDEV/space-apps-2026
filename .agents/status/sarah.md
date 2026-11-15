# Status — Sarah

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Sarah
**Agent:** Claude Code (claude@sarah)
**Branch:**
**Last updated:** 2026-11-15 01:00

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## claude@sarah

**Branch:** sarah-claude/mission-view

### Working on right now
Nothing claimed.

### Files / folders I'm touching (hands off)
- `ui/mission/` (I own it; ask with a handoff before changing it)
- `ui/flight-hud/` (new, V2)
- `data/space-weather/` (new subfolder; nothing else in `data/`, which is claude@jamie's)
- `docs/game-design/` and `.agents/decisions/004-game-design.md` (PR #23; I own them, so send changes as a handoff). Not touching `docs/GAME_PLAN.md` (claude@aiden).
- `docs/CHALLENGE_OFFICIAL.md` (PR #20; verbatim official text, don't edit, replace whole sections if the page changes). Not touching `docs/CHALLENGE.md` (claude@jamie) or `docs/NASA_SOURCES.md` (codex@jamie).
- `.agents/status/sarah.md`: only the `## claude@sarah` section

### Just finished
PR #129 merged: Krillion-style restyle (theme tokens + arcade layer, VT323) and word diet (Start 350→210, Briefing 385→113, Builder 1,394→790). Live on GitHub Pages; Vercel needs redeploy/Git connect.

PR #121 words for the walls (decision 007): walls.ts + tests, CAPCOM ≤ 90; option labels to claude@ethan; adoption note to claude@aiden.

PR #112: HUD fly view + hero results (fly 307 → ~126 words), UX spec `docs/game-design/UX_DECLUTTER.md`, 5 declutter tasks to owners.

Rubric pass PR #105: Falcon 9 TLI>TMI, 3U ≤ 4 kg, buses name computer/ADCS, build times + deadlines (behind_schedule live, all reference designs still win), Sandbox scenario, README game-first header. 467 tests.

PR #100: submission, pitch, demo, NASA_SOURCES and app README now say real NASA storms drive play (PR #99 merged), demo shot = real G4 storm 7 Sep 2017 on First Light seed 1.

Real NASA storms drive play, PR #99 (Sarah approved, in claude@ethan's sim/app): storm card fires on real OMNI G3+ days with the real date; First Light replays Sept 2017 → real G4 storm on 2017-09-07. 450 tests. Handoff to claude@ethan.

NASA data check (Sarah asked): OMNI matches NASA raw files exactly (400 days + fresh 2003 file identical); 6 real-mission masses match NSSDC (LRO flag withdrawn); 34/34 source links valid. Found OMNI is only displayed, not used in play → P0 board task. Applied codex@aiden's source-audit fixes to cards/story docs (PR #85); Spirit in-game URL → claude@ethan.

Accuracy + requirements + awards audit, `docs/game-design/ACCURACY_AUDIT.md` (PR #85): 1 physics error (solar at Mars), 3 data issues, 1 visible 3D bug, 5 brief gaps, submission breaks the 30-s demo rule and says we use no NASA data. 13 tasks with owners on BOARD, handoff to all. Plus Team priorities card on the debrief.

Checked main after claude@ethan's merge batch (#66 #71 #73 #76 #78 + V6/story): 405 tests, build ok. Story script now live in `ui/story/model.ts` LINES (PR), Mars delay line sourced.

PR #76 updated for V1 (#78): HUD hints match V1 keys, accessible start/stop scan toggle (`scanHeld`).

V2 flight HUD, `ui/flight-hud/`, PR #76 (on claude@jamie's V4 #73): pure overlay, real route preview, 368 tests, desktop + phone checked. Handoffs to claude@ethan (V7 mount) and codex@aiden (V1 hints).

Story script `docs/game-design/STORY.md` (decision 005): CAPCOM lines for every `ui/story` LineId + `BEAT_FACT` glossary pop-outs, drop-in block. Handoff to claude@aiden.

Played the live site start → results: GO/NO-GO, launch, 3D fly view, real weather, 2 anomaly cards, what-if fixes, real-mission match, share card all work. PR #66 fixes 3 wording/match issues found there. Closed handoffs 1305, 1540, 1525 (all on screen now).

PR #52: no nameless bonus star, real mission match ("Your mission is most like …"), 3D orbit view on the fly screen, anomaly card wording fixes. 318 tests pass. Closed handoffs 1107, 1115, 1210 and my 1340 (Ethan wired it).

Real NASA space weather: `data/space-weather/` (NASA SPDF OMNI, daily max Kp / G-level / Dst / F10.7 / sunspots, 1996-01-01 → 2026-10-29), tests against known storms, fly-screen strip, PR #34. Handoffs to claude@ethan (sim use) and claude@jamie (new subfolder in data/).

Anomaly card + debrief (stars, what-if fixes with Try it, share card) in `ui/mission/`, PR #25 (built on #11). All optional props. tsc, 33 tests and build pass, checked in the browser on desktop and phone. Handoff to claude@ethan with the mount props.

Game design "GO / NO-GO" (decision 004, proposed), PR #23: `docs/game-design/GAME_DESIGN.md` (pitch, loop, features with owners, accuracy rules), `ANOMALY_CARDS.md` (8 real-history cards), `BRAINSTORM.md` (12 concepts scored). Added 8 tasks to BOARD Open. Handoff to all.

`docs/CHALLENGE_OFFICIAL.md`: official challenge text + NASA/CSA resources, word for word, PR #20. Handoff to all so claude@jamie / codex@jamie can link it.

Mission run view + results screen in `ui/mission/`, branch `sarah-claude/mission-view`, PR #11. `<MissionScreen state events onCommand paused speed title>` shows the run view while flying and the graded results when the sim ends. Typecheck, 25 tests and build pass. Checked in the browser at desktop and phone width through a full 365-day run. Dev preview: `npm run dev`, then `/ui/mission/preview/preview.html`.

### Missing / I need from someone
- claude@jamie: add Sarah's Role + Agent to the README Team table in PR #6 (handoff 20261114-1030).
- claude@ethan: merge PR #66 when you get to it (passes tsc, tests, build).
- A human: merge #4, #5, #7 before PR #11. My branch was cut from `ethan-claude/sim-core`, so #11 shows their commits until they merge.

### Heads up for other agents
Branches use `sarah-claude/<short-task>`. `ui/mission/` uses the `body-centered` frame from `sim/README.md`, so no contract changes. All CSS classes are prefixed `.mv` inside `.mv-root` and won't clash with `ui/builder/`.
