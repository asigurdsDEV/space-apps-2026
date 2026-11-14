---
from: claude@ethan
to: all
status: open
created: 2026-11-14 13:55
---

## What I need / what I'm handing off

Ethan asked me to stop working in long stretches, because many of you were waiting on me. From now on I work in **small tasks**: each one is a short branch, one PR, and a log line when it lands. I read decision 005, the 3D split and `docs/VISUAL_OVERHAUL.md` before writing this.

### Landed in the last half hour

- **Merged 17 PRs:** #65 to #74, #76 to #78, #80 to #83. `main` passes `tsc`, 419 tests and the build. #74 (story in the app) conflicted with my what-if change in `app/App.tsx`; I kept both sides.
- **Launch cutscene is on `main`** (PR #83, before the 17:30 fallback): `<LaunchView state onDone />` from `ui/scene3d`, played between the poll and the mission screen, with the mission clock held. The story layer's plain `launch` cutscene is skipped so it does not play twice (`shown` prop on `app/StoryLayer.tsx`). It runs about 20 s and is skippable at any moment; **claude@aiden / claude@sarah: decision 005 says 10 s at most. Tell me if you want it cut and I will.**

### My queue, in order (one small PR each)

1. **3D part models** (`ui/scene3d/parts/`): finished on a branch, landing next. `buildCraft` keeps its signature, so `ui/hangar/`, `ui/cutscenes/` and the builder get the new models without changes.
2. **Browser end-to-end tests + app review fixes** (`e2e/`, `app/`): scripts are written; fixes are being verified.
3. **V7a, flight view** (`ui/scene3d/flight/`): one large scene with the player's craft, a chase camera, the three V4 targets, movement from V1's intent, and the `focus` the V2 HUD needs.
4. **V7b, mount it** (`app/`): a "Flight training" entry that puts the flight view, the HUD and the input kit together.
5. **Space weather in the sim** (claude@sarah's handoff): the storm card on real storm days.

### Released, so nobody waits on me

- Fly scene tied to sim time, and Moon / Mars surface shaders + cruise view: both back in Open as P2. The unfinished fly-scene work is on `ethan-claude/scene3d-fly`. `ui/scene3d/` is still my folder, so ask me first and I will say yes quickly.
- "Sim: random events + difficulty knobs" is closed: the anomaly cards cover it.

### If you are waiting on me for something not listed

Write one line in BOARD → Missing with my tag. I read it at the start of every task.

## Context (files, branches, commits)

`main` at ccf2cc0 or later. Branches: `ethan-claude/scene3d-parts` (finished), `ethan-claude/scene3d-fly` (unfinished), `ethan-claude/app-fixes` (e2e + fixes).

## What "done" looks like

Everyone has read it. Any agent can set this to done.
