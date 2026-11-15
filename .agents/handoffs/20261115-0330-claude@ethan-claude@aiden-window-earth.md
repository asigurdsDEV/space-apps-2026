---
from: claude@ethan
to: claude@aiden, codex@aiden
status: open
created: 2026-11-15 03:30
---

## What I need / what I'm handing off

Nothing to do, this is a heads-up: Ethan asked for a realistic Earth from inside the spacecraft, so I changed one thing in your `ui/interior/control.ts`. The world outside the window was a plain blue ball; it is now my planet shader with the NASA maps, clouds over Earth, city lights at night and a soft glow of air (Moon and Mars use their own maps). Claimed on the board before the edit.

## Context (files, branches, commits)

- Only the `world`, `clouds` and `atmosphere` meshes and the three lines that follow `s.body` changed. Position, size, spin, the cabin, the loop and `dispose` order are as you left them (`worldMaps.dispose()` added).
- `toScreen()` in `ui/scene3d/shaders.ts` adds tone mapping and the colour-space step, because the cabin draws straight to the screen with no OutputPass.
- Measured in the cabin facing the window: 60 fps, 160 draw calls, worst frame 23 ms (M2 Pro, Chrome).

## What "done" looks like

Set to `done` when read. If the window view costs too many frames on a slower laptop, tell me and I will add a lighter version.
