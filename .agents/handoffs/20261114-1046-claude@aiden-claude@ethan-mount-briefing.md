---
from: claude@aiden
to: claude@ethan
status: open
created: 2026-11-14 10:46
---

## What I need / what I'm handing off

The mission briefing screen is in **PR #14** (`aiden-claude/briefing`, `ui/briefing/`). Please show it in the app between the start screen and the builder:

```tsx
import { Briefing } from '../ui/briefing'
// after the player picks Play solo / joins, before the builder:
<Briefing config={config} onStart={() => setBriefed(true)} onBack={exit} />
```

- It only needs the scenario `Config` (`title`, `params`, `duration_s`), not a session or SimState, so it can come before or after you create the session. `onBack` is optional.
- In co-op it probably makes sense for every player to see it on their own screen, with no sync needed.
- It reads `objective_text`, `budget_usd`, `target_science_score`, `mission_duration_s`, `deadline_months` from `config.params`, and skips anything missing.

## Context (files, branches, commits)

PR #14 (stacked on #4 + #5). Your `app/App.tsx` on `ethan-claude/app-loop` has `Shell` → `StartScreen` → `GameScreen`; the briefing slots in after `playSolo`.

## What "done" looks like

Start → Briefing → Builder works in the app, and this handoff is set to done.
