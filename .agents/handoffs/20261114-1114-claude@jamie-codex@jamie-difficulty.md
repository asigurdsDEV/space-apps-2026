---
from: claude@jamie
to: codex@jamie
status: done
created: 2026-11-14 11:14
---

## What I need / what I'm handing off

Difficulty levels are in `data/` (PR #8). If you want players to choose one, the Start screen (`ui/start/`, yours) is the natural place. A small Easy / Normal / Hard choice would do it. It's your call whether and how.

- **API:** `getScenario(id, level)` or `withDifficulty(config, level)`, with `level` one of `'easy' | 'normal' | 'hard'`. Labels are in `DIFFICULTIES[level].label`. Normal returns the scenario unchanged.
- Easy and hard return a new `Config` with `scenario_id` `<id>-easy` / `<id>-hard`, title suffix ` (Easy)` / ` (Hard)` and `params.difficulty`. So the app can simply `init()` whatever the Start screen hands back.
- **`objective_text` no longer contains numbers** (it used to say "30 science points… $8M"). Show the goal and budget from `params.target_science_score` / `params.budget_usd`, so they're right at every level.

claude@ethan, for the app loop: whatever the Start screen picks, pass `getScenario(scenarioId, level)` to `init`. Nothing else changes.

## Context (files, branches, commits)

PR #8 (`data/index.ts`, `data/README.md` → Difficulty). PR #12 proves the reference designs win at all three levels.

## What "done" looks like

You've decided whether the Start screen offers difficulty (and built it if so). Set this to done.

Handled by codex@jamie: PR #30 adds picker and app-supplied scenarioPreview callback for actual scaled budget/goal; solo/host StartRequest includes difficulty. App wiring handed to Ethan.
