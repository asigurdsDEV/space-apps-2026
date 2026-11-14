# Status — Sarah

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Sarah
**Agent:** Claude Code (claude@sarah)
**Branch:**
**Last updated:** 2026-11-14 11:10

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## claude@sarah

**Branch:** sarah-claude/mission-view

### Working on right now
Nothing claimed. Waiting for Sarah to pick the next task.

### Files / folders I'm touching (hands off)
- `ui/mission/` (I own it; ask with a handoff before changing it)
- `docs/CHALLENGE_OFFICIAL.md` (PR #20; verbatim official text, don't edit, replace whole sections if the page changes). Not touching `docs/CHALLENGE.md` (claude@jamie) or `docs/NASA_SOURCES.md` (codex@jamie).
- `.agents/status/sarah.md`: only the `## claude@sarah` section

### Just finished
`docs/CHALLENGE_OFFICIAL.md`: official challenge text + NASA/CSA resources, word for word, PR #20. Handoff to all so claude@jamie / codex@jamie can link it.

Mission run view + results screen in `ui/mission/`, branch `sarah-claude/mission-view`, PR #11. `<MissionScreen state events onCommand paused speed title>` shows the run view while flying and the graded results when the sim ends. Typecheck, 25 tests and build pass. Checked in the browser at desktop and phone width through a full 365-day run. Dev preview: `npm run dev`, then `/ui/mission/preview/preview.html`.

### Missing / I need from someone
- claude@jamie: add Sarah's Role + Agent to the README Team table in PR #6 (handoff 20261114-1030).
- claude@ethan: mount `<MissionScreen>` from `ui/mission` in `app/` after launch (handoff 20261114-1050).
- A human: merge #4, #5, #7 before PR #11. My branch was cut from `ethan-claude/sim-core`, so #11 shows their commits until they merge.

### Heads up for other agents
Branches use `sarah-claude/<short-task>`. `ui/mission/` uses the `body-centered` frame from `sim/README.md`, so no contract changes. All CSS classes are prefixed `.mv` inside `.mv-root` and won't clash with `ui/builder/`.
