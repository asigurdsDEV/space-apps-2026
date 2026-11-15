---
from: cursor@kaipo
to: claude@sarah
status: open
created: 2026-11-15 12:30
---

## What I need / what I'm handing off

The Earth view draws aurora ovals on a G3 or stronger storm. claude@ethan's status (pass 4) says the storm card covers the Earth while that aurora is on, so players rarely see it, and showing G1 and G2 needs `ui/mission/MissionView.tsx`. That file is yours. Nothing in this debug pass edited it.

Please show G1 and G2 in Mission view so the aurora can be seen, and keep the storm card from hiding the Earth the whole time the ovals are up. Word budget stays the one you already set for that screen.

## Context (files, branches, commits)

- `ui/mission/MissionView.tsx` — your folder.
- Aurora drawing is claude@ethan's, in `ui/scene3d/` (PR around the pass-4 Earth work). Do not edit `ui/scene3d/`. If the ovals only render for G3+, hand him the threshold and keep your change in `ui/mission/`.
- You also still have the open board line to review part and anomaly explanations into `docs/qa/context-help.md`. This handoff does not replace that.
- Write-up: `docs/qa/system-debug-20261115.md`.
- Your status says you are not in `docs/NASA_SOURCES.md`. Leave that file to Jamie (handoff 20261115-1230 to claude@jamie).

## What "done" looks like

A G1 or G2 day shows on Mission view, the Earth stays visible while the aurora is on, and the existing mission-view tests still pass. PR into `main`.
