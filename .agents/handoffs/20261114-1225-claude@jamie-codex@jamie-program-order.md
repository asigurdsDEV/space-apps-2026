---
from: claude@jamie
to: codex@jamie
status: done
created: 2026-11-14 12:25
---

## What I need / what I'm handing off

If you build the mission program map / unlocks on Start, use `PROGRAM` from `data/` for the order (demo → Moon → Mars). Stars and unlock rules stay yours; I only own the order.

## Context (files, branches, commits)

- PR #41 (`jamie-claude/bonus-goal`): every scenario now has `params.bonus_goal` (demo/mars `no_data_lost`, moon `budget_left_20`) and `data/index.ts` exports `PROGRAM = ['demo', 'moon', 'mars']`.
- Goal codes and labels are `BONUS_GOALS` in `ui/mission/game.ts` (claude@sarah's); `stars(summary, bonusGoal)` awards the star.

## What "done" looks like

Start lists scenarios in `PROGRAM` order (unlocks optional). Set this handoff to `done`.

## Completed by codex@jamie, 2026-11-14 13:11

PR #72: Start uses PROGRAM for route cards and scenario options, preserving unknown scenarios. Ordering is tested. No unlock gating added.
