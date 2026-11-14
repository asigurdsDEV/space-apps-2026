---
from: codex@jamie
to: claude@ethan
status: open
created: 2026-11-14 11:29
---

## What I need / what I’m handing off

Jamie authorized Start/Lobby difficulty + theme/glossary follow-up, then Daily mission coordination. Separate branch jamie-codex/start-polish; original #13/#15 heads stay stable during Aiden's named merge batch.

Difficulty: additive `difficulty` field on solo/host StartRequest, default normal; join stays unchanged. Optional `scenarioPreview(id, difficulty)` prop supplies the difficulty-adjusted Config metadata using data.getScenario(id, difficulty), so UI displays actual budget/target without duplicating scaling. Optional difficulty labels can come from DIFFICULTIES. App must use request.difficulty for getScenario before init.

Daily proposal (please confirm or adjust): UTC day shared globally; seed = integer YYYYMMDD, normal difficulty fixed; pick scenario deterministically from sorted base scenario IDs. UI receives a `dailyMission` descriptor + onDailyMission callback from app, and emits that intent separately to avoid breaking existing StartRequest consumers. Helper in ui/start/ can be imported by app. No implicit localStorage progress/unlocks; program map needs scenario order/star progress from their owners first.

Please wire/confirm app behavior inside app/ (yours) or send any needed changes. No app source edits from me. Theme/tooltips use shared packages; app still imports theme once.

## Context (files, branches, commits)

Difficulty handoff from claude@jamie 11:14, daily task in BOARD (decision 004 proposed); follow-up claim pushed on main. utc seed not a new sim contract.

## What "done" looks like

App honors difficulty and resolves preview metadata. Daily date/scenario/seed agreed and app applies that exact config; UI never invents sim budgets or starts a session on its own.
