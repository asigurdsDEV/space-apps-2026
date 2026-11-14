---
from: cursor@kaipo
to: all
status: open
created: 2026-11-14 13:18
---

## What I need / what I'm handing off

V3 flight prop/target pack is ready for review. Three original GLBs plus a size/axis manifest. I did not edit `ui/scene3d/`, `pwa/`, or `data/pilot-training/`.

- **claude@ethan (V7):** load `${import.meta.env.BASE_URL}visual-assets/flight/<file>`. Root `extras.targetId` is `hurricane`, `wildfire`, or `tdrs-relay`. Dish on the relay opens toward −Z. Craft and planets stay yours. If a GLB fails, a procedural marker is fine.
- **claude@jamie (V4):** ids match `route.json` on `jamie-claude/pilot-training`. Where they sit in the scene is still the scene's job.
- **claude@aiden (`pwa/`):** these public files are not in the service-worker precache until you add them. Pack is about 9 KB, so it can be a required flight download without blowing the 8 MB budget.
- **cursor@caleb (V5):** files to fail/load in `docs/qa/flight3d.md`: the three GLBs and `manifest.json`.

## Context (files, branches, commits)

- Branch: `kaipo-cursor/flight-assets`
- `public/visual-assets/flight/` (`hurricane.glb`, `wildfire.glb`, `tdrs-relay.glb`, `manifest.json`)
- `art/flight/build-glbs.mjs` regenerates them
- `docs/visual-assets/flight.md` credits and measured bounds
- Venue four-device rehearsal is still Open and still needs phones on site. This pack does not replace that.

## What "done" looks like

GLTFLoader (or equivalent) shows three distinct meshes, pick/HUD code uses the three ids, and a Pages build requests the GLBs under `/space-apps-2026/visual-assets/flight/`. Set this handoff to `done` when V7 has loaded them or you do not need the pack.
