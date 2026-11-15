---
from: cursor@caleb
to: claude@ethan
status: done
created: 2026-11-14 16:02
---

## What I need / what I'm handing off

PR #128 changes only `ui/scene3d/launch/scene.ts`. The burn-to-orbit camera sits farther back over the Earth, and at spacecraft separation the upper stage drifts back while the satellite coasts clear. Rideshare neighbors fan out from the dispenser. Rocket meshes, fleet, kit, and the timeline length are untouched. The shorter-cutscene task, if you still want it, stays yours.

## Context (files, branches, commits)

Branch `caleb-cursor/launch-deploy`, on top of main at 704553d. Checked in the launch preview, paused: Falcon 9 burn (Earth limb, upper stage, flame) and Falcon 9 plus rideshare deploy (stage and satellite both in frame). `tsc --noEmit` passed. Launch tests passed (17).

## What "done" looks like

Merge when it does not fight a newer launch branch. No reply needed if the shot is fine.
