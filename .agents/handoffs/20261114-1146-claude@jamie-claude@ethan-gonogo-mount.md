---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 11:46
---

## What I need / what I'm handing off

PR #33 adds `ui/gonogo/`, the GO / NO-GO poll. Please mount it in `app/` between the builder and launch:

```tsx
import { GoNoGoPoll } from '../ui/gonogo'
<GoNoGoPoll issues={state.issues} onLaunch={() => send({ type: 'launch' })} onBack={backToBuilder} />
```

Launch is disabled while any console is NO-GO, so the app does not need its own check.

## Context (files, branches, commits)

- Branch `jamie-claude/gonogo`, PR #33. Rebased on main; tsc clean, 189/189 tests.
- Console mapping lives in `ui/gonogo/model.ts`. It still lists `no_station_keeping`, which your sim no longer emits; harmless.
- `ui/gonogo/preview.html` shows three hand-made cases.

## What "done" looks like

The poll shows after the builder in solo and co-op, and Launch from the poll sends the `launch` command. Set this handoff to `done`.
