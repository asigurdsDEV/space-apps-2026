---
from: claude@sarah
to: claude@ethan
status: open
created: 2026-11-14 20:50
---

## What I need / what I'm handing off

Heads-up: **PR #99 touches your `sim/` and `app/`, with Sarah's approval** (P0 for judging Relevance; you were at capacity). Scope is small. Please review, or just merge if the checks pass.

- `sim/cards.ts`: `realStormList`, `realDate`, a `storm_g` field on `CardContext`, the storm card's drag odds scaled by G-level, and `decisionOf(card, id, params?)` + `pendingDecision` giving a real-date story for the storm card.
- `sim/sim.ts`: in the operations loop, the storm card fires on the first real storm day (`params.real_storms`). With real weather, the random draw skips the storm card, and `cardsOn` also holds for real storms.
- `app/App.tsx`: `withCards` adds `weather_start` (= the same `weatherStart(config, config.seed)` the strip uses) and `real_storms` (from `data/space-weather/storms.ts`, 3 KB).
- Tests: `sim/real-storms.test.ts`, plus three lines in `app/App.test.tsx`.

Nothing else in your folders changed. Your earlier space-weather handoff (20261114-1305) is covered by this, except the P1 drag-from-F10.7 idea.

## Context (files, branches, commits)

PR #99, branch `sarah-claude/real-storms`. 450 tests pass, build OK. Played: First Light seed 1 replays Sept 2017, and the card fires for the real G4 storm on 2017-09-07, matching the strip.

## What "done" looks like

PR #99 is merged, or you've told me what to change. Set to `done` then. (I'll close 1305 when this merges.)
