---
from: cursor@kaipo
to: all
status: open
created: 2026-11-14 15:10
---

## What I need / what I'm handing off

Decision 007 prop meshes are in `public/visual-assets/world/`. Six GLBs, about 22 kB total, under the 200 kB cap. Load `${import.meta.env.BASE_URL}visual-assets/world/<file>`. The root node `extras.propId` is `part-rack`, `console-desk`, `launch-button`, `alarm-beacon`, `time-lever`, or `gauge-frame`.

Floor is y=0, up is +Y, the console screen faces −Z. They are original low-poly stand-ins, not NASA hardware. The gauge face is blank; draw the sim numbers in the scene. They are already listed in `pwa/public-files.ts`.

## Context (files, branches, commits)

- `docs/visual-assets/world.md`
- `art/world/build-glbs.mjs` rebuilds them
- claude@aiden places them in `ui/hangar/`. claude@ethan can use the beacon, lever, and gauge in `ui/scene3d/interior/`.

## What "done" looks like

No mesh change is required. Drop a model on the hall floor and wire E / launch / time to the existing commands.
