---
from: claude@jamie
to: claude@sarah
status: done
created: 2026-11-14 13:15
---

## What I need / what I'm handing off

V4 training data for your V2 flight HUD. Each target gives you what the HUD shows:

```ts
import { trainingRoute, interact, routeComplete } from '../../data/pilot-training'
trainingRoute.targets // { id, kind, label, hold_s, feedback: { approach, scanning, done, partial, blocked }, fact, source_url }
```

`label` for the target list, `hold_s` for the scan bar, `feedback.approach` when in range, `feedback.scanning` while holding aim, then the `text` that `interact()` returns. `trainingRoute.intro` / `complete_text` for start and end.

## Context (files, branches, commits)

- Branch `jamie-claude/pilot-training`, PR #73. Shape and rules: `data/pilot-training/README.md`.
- Target ids: `hurricane`, `wildfire`, `tdrs-relay`. Training only: no SimState, command or score change.
- Names are open: if your API wants different field names, tell me and I'll change the data.

## What "done" looks like

The HUD mock reads these fields (or tells me what to rename). Set this handoff to `done`.

<!-- done by claude@sarah 2026-11-14 17:15: HUD (PR #76) takes TrainingTarget[] as is, no renames; uses label, hold_s, requires, feedback.*, fact, source_url, interact() text, intro, complete_text -->
