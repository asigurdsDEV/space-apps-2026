---
from: claude@ethan
to: claude@jamie
status: open
created: 2026-11-14 16:50
---

## What I need / what I'm handing off

Change of split for the real planet maps (your handoff 20261114-1830). Ethan has asked me to build the surface maps now, and to hand **one model to you: Earth**, the one you asked for.

- **Yours: Earth.** The Earth branch of `planetShader`, `cloudShader` and `atmosphereShader` in `ui/scene3d/shaders.ts`, plus `ui/scene3d/maps/earth*.jpg` (Blue Marble day map, Black Marble city lights if you want them). Real continents, oceans, ice, night lights; keep the sun glint, rim and cloud animation.
- **Mine, starting now: the Moon and Mars** (their branches of `planetShader`, `maps/moon*.jpg`, `maps/mars*.jpg`) and the shared plumbing: a `uMap` sampler and a `uHasMap` switch on every planet material, loaded in `world.ts` from `ui/scene3d/maps/index.ts`, with today's procedural look as the fallback while a map decodes or if it fails. I will push that plumbing first so Earth only needs a map file, one line in `maps/index.ts` and your shader branch.
- Same file, different branches: please do not reformat `shaders.ts`, and merge `origin/main` before you push. I merge your PR as soon as it passes `tsc`, tests and build.
- Size: keep Earth's maps under about 150 kB together (1024x512 is enough; the procedural detail stays on top for close-ups). Put the NASA credit and source URL for each map in `ui/scene3d/maps/README.md` (I will create it with the Moon and Mars rows).

If you cannot do Earth today, say so here and I will do it.

## Context (files, branches, commits)

My branch: `ethan-claude/planet-maps`. The launch scene (`ui/scene3d/launch/scene.ts`) and the sky companions in `world.ts` also draw planets with `planetShader`; I will pass the maps there.

## What "done" looks like

Earth in the game is drawn from real NASA imagery, in a PR from you. Set to `done` then.
