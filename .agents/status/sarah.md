# Status — Sarah

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Sarah
**Agent:** Claude Code (claude@sarah)
**Branch:**
**Last updated:** 2026-11-14 15:50

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## claude@sarah

**Branch:** sarah-claude/mission-view

### Working on right now
Three fixes from playing the live site (`ui/mission/` only, branch `sarah-claude/live-fixes`): what-if sentence, real-mission match weighting, 'inspired by' card header.

### Files / folders I'm touching (hands off)
- `ui/mission/` (I own it; ask with a handoff before changing it)
- `data/space-weather/` (new subfolder; nothing else in `data/`, which is claude@jamie's)
- `docs/game-design/` and `.agents/decisions/004-game-design.md` (PR #23; I own them, so send changes as a handoff). Not touching `docs/GAME_PLAN.md` (claude@aiden).
- `docs/CHALLENGE_OFFICIAL.md` (PR #20; verbatim official text, don't edit, replace whole sections if the page changes). Not touching `docs/CHALLENGE.md` (claude@jamie) or `docs/NASA_SOURCES.md` (codex@jamie).
- `.agents/status/sarah.md`: only the `## claude@sarah` section

### Just finished
PR #52: no nameless bonus star, real mission match ("Your mission is most like …"), 3D orbit view on the fly screen, anomaly card wording fixes. 318 tests pass. Closed handoffs 1107, 1115, 1210 and my 1340 (Ethan wired it).

Real NASA space weather: `data/space-weather/` (NASA SPDF OMNI, daily max Kp / G-level / Dst / F10.7 / sunspots, 1996-01-01 → 2026-10-29), tests against known storms, fly-screen strip, PR #34. Handoffs to claude@ethan (sim use) and claude@jamie (new subfolder in data/).

Anomaly card + debrief (stars, what-if fixes with Try it, share card) in `ui/mission/`, PR #25 (built on #11). All optional props. tsc, 33 tests and build pass, checked in the browser on desktop and phone. Handoff to claude@ethan with the mount props.

Game design "GO / NO-GO" (decision 004, proposed), PR #23: `docs/game-design/GAME_DESIGN.md` (pitch, loop, features with owners, accuracy rules), `ANOMALY_CARDS.md` (8 real-history cards), `BRAINSTORM.md` (12 concepts scored). Added 8 tasks to BOARD Open. Handoff to all.

`docs/CHALLENGE_OFFICIAL.md`: official challenge text + NASA/CSA resources, word for word, PR #20. Handoff to all so claude@jamie / codex@jamie can link it.

Mission run view + results screen in `ui/mission/`, branch `sarah-claude/mission-view`, PR #11. `<MissionScreen state events onCommand paused speed title>` shows the run view while flying and the graded results when the sim ends. Typecheck, 25 tests and build pass. Checked in the browser at desktop and phone width through a full 365-day run. Dev preview: `npm run dev`, then `/ui/mission/preview/preview.html`.

### Missing / I need from someone
- claude@jamie: add Sarah's Role + Agent to the README Team table in PR #6 (handoff 20261114-1030).
- claude@ethan: mount `<MissionScreen>` from `ui/mission` in `app/` after launch (handoff 20261114-1050), then pass the game-layer props once `decision_required` + `whatIf()` exist (handoff 20261114-1215).
- A human: merge #4, #5, #7 before PR #11. My branch was cut from `ethan-claude/sim-core`, so #11 shows their commits until they merge.

### Heads up for other agents
Branches use `sarah-claude/<short-task>`. `ui/mission/` uses the `body-centered` frame from `sim/README.md`, so no contract changes. All CSS classes are prefixed `.mv` inside `.mv-root` and won't clash with `ui/builder/`.
