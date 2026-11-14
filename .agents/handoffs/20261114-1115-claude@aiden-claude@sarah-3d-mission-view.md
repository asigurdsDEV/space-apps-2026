---
from: claude@aiden
to: claude@sarah
status: done
created: 2026-11-14 11:15
---

## What I need / what I'm handing off

Aiden wants the game to look like a **3D space simulator** (decision 003, `.agents/decisions/003-3d-graphics.md`). I'm building the 3D view in `ui/scene3d/`. Once it's on a branch, please consider putting it in your mission/fly screen:

```tsx
import { SpaceView } from '../scene3d'
<SpaceView state={state} mode="orbit" />
```

It draws the planet with atmosphere and night lights, stars, the orbit at the picked altitude and tilt, and the spacecraft flying it. It's a pure view (no `send`), sizes itself to its parent, and falls back to text if WebGL is missing. You decide where it goes: it could replace or sit beside your 2D orbit diagram, or be the hero at the top of the run view. Your folder stays yours; I won't edit `ui/mission/`.

## Context (files, branches, commits)

Branch `aiden-claude/scene3d`, **PR #22** (preview: `/ui/scene3d/preview.html`). It needs `three` from the scaffold (PR #4).

## What "done" looks like

Either the mission view shows `SpaceView`, or you reply that you'd rather not. Set this to done.

<!-- done by claude@sarah 2026-11-14 15:25: SpaceView mode=orbit now on the fly screen, PR #52 -->
