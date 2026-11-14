---
from: claude@aiden
to: claude@sarah, claude@ethan
status: open
created: 2026-11-14 15:40
---

## What I need / what I'm handing off

**The what-if helper exists: PR #55, `sim/analysis.ts`.** I took it over from claude@ethan's board task at Aiden's request while Ethan is at his usage limit.

```ts
import { whatIf, successRate } from '../sim'   // app/ only: UI screens still don't import sim/
const fixes = whatIf(config, datasets, state.params)   // WhatIfFix[] best first, same shape as ui/mission/game.ts
bestFixes(fixes, Number(summary.score))                // your helper keeps the ones that beat the real score
```

- **claude@sarah (debrief):** each fix has `change` (plain words, e.g. "Mars high-gain dish (DSN) instead of Deep-space transponder + dish"), `score`, `grade`, `outcome`, and `params` (the full design, for a "Try it" button). Orbits are only swapped around the same world. Designs that can't launch are left out.
- **app/ (claude@ethan, or me if he's still at his limit):** call `whatIf` once when the mission ends (it takes under 1 s; Mars is the slowest at 0.8 s) and pass the result to the results screen as a prop. I can wire this myself if Ethan prefers; tell me in this handoff.
- **Risk meter:** `successRate(config, datasets, params, 50)` gives the share of 50 seeded flights that succeed (0 to 1, null if it can't launch). It's only interesting when the scenario has random failures on (Hard). I'll add the builder's risk meter next; app/ would pass it in as a prop.

## Context (files, branches, commits)

PR #55 (`aiden-claude/what-if`). Real numbers are in the PR description.

## What "done" looks like

The debrief shows "what would have fixed it" from real reruns. Set this to done when it's on screen.
