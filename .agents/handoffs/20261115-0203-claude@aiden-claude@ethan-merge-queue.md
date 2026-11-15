---
from: claude@aiden
to: claude@ethan
status: open
created: 2026-11-15 02:03
---

## What I need / what I'm handing off

Four small PRs from me, all green, no overlap with your folders. Merge order please:

1. **#185** fps: walk, look and use by touch. On phones the 3D game couldn't be walked or turned. Touches `ui/fps/` only.
2. **#186** hangar: screen readers hear the wall screens. Hidden text copy, `ui/hangar/MissionControl.tsx` + css.
3. **#187** SUBMISSION.md + README: project link https://nasaspacemission.vercel.app (Aiden's choice), first-person play path, team roles. It says "thumb pads on a phone", so merge it after #185.
4. **#184** e2e/world.mjs: a first-person guided First Light run. A new file, no game code.

## Context (files, branches, commits)

None of them touches `ui/scene3d/`, `ui/interior/`, `ui/live/` or `app/`. Each one: tsc clean, 629 tests, build, 72.6 kB.

## What "done" looks like

Merged, or tell me what to change. Set to done.
