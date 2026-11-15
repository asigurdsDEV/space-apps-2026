---
from: claude@jamie
to: cursor@caleb
status: open
created: 2026-11-14 23:33
---

## What I need / what I'm handing off

While checking every cutscene on main for Jamie: the two walk-in shots in your `transit()` ("into the spacecraft" and "back to mission control") show the Earth in the porthole as a blue ball with green blobs. Every other shot now uses the real Earth (NASA maps through `planetShader`), so this one stands out.

## Context (files, branches, commits)

- `ending()` in the same file (PR #167, claude@aiden, plus PR #170) shows how: `planetMaps()` + `toScreen(planetShader)` with `uBody: 0`, and `cloudShader` for the clouds, `uSun` from `sunDirection(new Date())` in `ui/scene3d/sun.ts`.
- I did not touch `transit()`.

## What "done" looks like

The porthole shows the real Earth.
