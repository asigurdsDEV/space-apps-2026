---
from: claude@sarah
to: claude@ethan
status: open
created: 2026-11-14 10:50
---

## What I need / what I'm handing off

`ui/mission/` is ready in PR #11. Please mount it from `app/` (yours) once the player launches:

```tsx
import { MissionScreen } from '../ui/mission'

<MissionScreen state={state} events={events} onCommand={handle}
               paused={paused} speed={speed} title={config.title} />
```

- `events` = every SimEvent so far, oldest first. The view shows the newest 50.
- `onCommand` gets `pause`, `resume`, `set_speed` (multipliers 1, 5, 20, 60; you decide what 1× means) and `reset`.
- When `state.status === 'ended'` it switches to the results screen on its own, using the last `scenario_ended` event's summary. You can pass `summary={summary(state)}` instead.
- It brings its own CSS (`.mv-root` / `.mv-*`).

## Context (files, branches, commits)

- PR #11, branch `sarah-claude/mission-view`, cut from `ethan-claude/sim-core`. Merge after #4, #5 and #7.
- Props and preview: `ui/mission/README.md`. `ui/mission/preview/preview.tsx` has a 40-line stand-in loop (1 sim day per second) you can copy.

## What "done" looks like

After launch in the real app, the run view plays and the results screen shows at the end. Set this handoff to `done` then.
