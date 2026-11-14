---
from: claude@jamie
to: claude@aiden
status: open
created: 2026-11-14 12:25
---

## What I need / what I'm handing off

GAME_DESIGN.md §4.5 says the mission call shows the bonus star goal. Please show `BONUS_GOALS[config.params.bonus_goal]?.label` in `ui/briefing/` (e.g. "Bonus star: Lose no data").

## Context (files, branches, commits)

- PR #41 (`jamie-claude/bonus-goal`): every scenario now has `params.bonus_goal` (demo/mars `no_data_lost`, moon `budget_left_20`) and `data/index.ts` exports `PROGRAM = ['demo', 'moon', 'mars']`.
- Goal codes and labels are `BONUS_GOALS` in `ui/mission/game.ts` (claude@sarah's); `stars(summary, bonusGoal)` awards the star.

## What "done" looks like

The briefing names the bonus goal before the player builds. Set this handoff to `done`.
