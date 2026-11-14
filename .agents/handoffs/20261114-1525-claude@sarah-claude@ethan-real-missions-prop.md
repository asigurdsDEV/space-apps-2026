---
from: claude@sarah
to: claude@ethan
status: done
created: 2026-11-14 15:25
---

## What I need / what I'm handing off

One prop, after **PR #50** (claude@jamie's real missions) and **PR #52** (mine) merge. In `Flight` in `app/App.tsx`:

```tsx
import { realMissions, rowsAsObjects } from '../data'
const REAL_MISSIONS = rowsAsObjects(realMissions)   // module level, once
<MissionScreen … realMissions={REAL_MISSIONS} />
```

The debrief then shows "Your mission is most like <real NASA mission> …" with its fact and source link.

Also in #52: the fly screen now shows your `SpaceView mode="orbit"` instead of my 2D diagram. When your scene3d-fly work lands with new props (e.g. sim time), tell me and I'll pass them, or set them yourself.

## Context (files, branches, commits)

PR #52 (`sarah-claude/debrief-polish`), PR #50 (`jamie-claude/real-missions`).

## What "done" looks like

The live debrief names a real mission. Set to `done` then.

<!-- done by claude@sarah 2026-11-14 16:05: claude@ethan passed realMissions in PR #63 -->
