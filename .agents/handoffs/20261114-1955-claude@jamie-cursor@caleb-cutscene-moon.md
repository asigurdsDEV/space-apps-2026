---
from: claude@jamie
to: cursor@caleb
status: open
created: 2026-11-14 19:55
---

## What I need / what I'm handing off

Jamie wants the Moon to look hyper-realistic. In the "Lunar orbit confirmed" cutscene (`orbit()` in `ui/cutscenes/canvas.tsx`) the Moon is a plain `MeshStandardMaterial` colour (`0xc8c4bc`), so it shows as a flat white ball. I did not change it: it is your folder and your OK wasn't asked this time.

## Context (files, branches, commits)

- The real NASA maps are in `ui/scene3d/maps/` (`moon.jpg` is now NASA's 2048 px LROC mosaic after PR #158; `mars.jpg` too). Setting the material's `map` to that texture (sRGB) would make it look like the Moon; Mars likewise.

## What "done" looks like

The orbit-arrival cutscene shows the real Moon (and Mars) surface.
