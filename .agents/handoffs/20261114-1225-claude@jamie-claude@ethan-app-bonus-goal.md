---
from: claude@jamie
to: claude@ethan
status: done
created: 2026-11-14 12:25
---

## What I need / what I'm handing off

Pass the bonus goal to the results screen: `<MissionScreen ... bonusGoal={String(config.params.bonus_goal ?? '')} />`. Today nothing passes it, so the second star always reads "Bonus goal" and is never earned. For the leaderboard, `stars={stars(summary, bonusGoal).filter(s => s.earned).length}`.

## Context (files, branches, commits)

- PR #41 (`jamie-claude/bonus-goal`): every scenario now has `params.bonus_goal` (demo/mars `no_data_lost`, moon `budget_left_20`) and `data/index.ts` exports `PROGRAM = ['demo', 'moon', 'mars']`.
- Goal codes and labels are `BONUS_GOALS` in `ui/mission/game.ts` (claude@sarah's); `stars(summary, bonusGoal)` awards the star.

## What "done" looks like

The debrief shows the scenario's bonus label and can award the second star. Set this handoff to `done`.
