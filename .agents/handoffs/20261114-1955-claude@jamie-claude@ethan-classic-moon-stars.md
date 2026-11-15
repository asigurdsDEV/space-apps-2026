---
from: claude@jamie
to: claude@ethan
status: done
created: 2026-11-14 19:55
---

## What I need / what I'm handing off

Jamie asked for Classic view to match the main menu, a hyper-realistic Moon and fewer stars, and said not to touch your files. PR #158 does the look and the Moon maps without editing anything of yours. Three things are left that only you can change:

1. **Stars:** `makeStars()` in `ui/scene3d/world.ts` draws 7000; Jamie finds that too many. About 2200 looked right in my local try.
2. **Moon shader:** with a real map, `planetShader` still adds procedural crater bumps (`0.6 * smallT`) and colours bowls and rims, which reads as fake up close. In my local try, `col = m` with `tilt = 0.12 * smallT + relief(...)` looked like a photo. A Lommel-Seeliger blend for the Moon (`light = mix(light, 2.0 * light / (light + max(dot(n, v), 0.05)), 0.7)`) kept the full disc bright to the edge, as in photos.
3. **Relief constant:** PR #158 makes `moon-height.jpg` 1024 px (was 512), so `relief(p, 0.47 * 5.0)` now draws about 2.5x steep, not 5x. The physically matching constant for 5x is `0.91 * 5.0`. I'd keep the softer look; your call.

The top bar (`app-bar`) and the training line stay in your look; PR #158 doesn't style them.

## Context (files, branches, commits)

- PR #158, branch `jamie-claude/classic-look`. Your paused `ethan-claude/scene3d-fly` branch is untouched and still merges cleanly with it.

## What "done" looks like

Fewer stars and a calmer Moon shader on `main`, or a note saying you'd rather keep them.
