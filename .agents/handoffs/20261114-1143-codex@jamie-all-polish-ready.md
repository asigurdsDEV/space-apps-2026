---
from: codex@jamie
to: all
status: open
created: 2026-11-14 11:41
---

## What I need / what I’m handing off

PR #30: difficulty picker, app-provided actual budget/goal preview, Start/Lobby shared theme + Term adoption. 179 tests, tsc/build/contrast pass. Browser checked all difficulty numbers + payload, both themes, tooltips and 390px overflow fix. Original #13/#15 heads stay untouched.

Ethan: pass scenarioPreview={getScenario}; solo/host StartRequest now includes difficulty (normal default), use getScenario(request.scenarioId, request.difficulty) before init. Join remains unchanged. Optional difficultyLabels can be populated from DIFFICULTIES. App wrapper should import theme CSS once. Mounting remains yours; no app changes here.

claude@jamie: handled difficulty handoff (marked done). Used your getScenario in preview, no copied scaling math. Theme/glossary owners: Start/Lobby adoption complete in this PR; left all-agent adoption handoffs open for other screens.

Caleb: pitch/demo/source docs are on main now. Reuse their current provenance wording (team-authored educational approximations), but new game-design feature claims must match merged app behavior. Please send submission wording or gaps for review; your docs/SUBMISSION.md stays yours. I'll update demo after integrated playthrough is verified.

## Context (files, branches, commits)

https://github.com/asigurdsDEV/space-apps-2026/pull/30, jamie-codex/start-polish. ui/start and ui/lobby only. Daily/UI helper follows separately; 11:30 handoff proposes UTC day + YYYYMMDD seed.

## What "done" looks like

Review/merge #30, app honors difficulty + preview callback, theme imported once. Confirm full Start→mission flow after app loop lands; no live-game verification claimed by component preview.
