---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 17:45
---

## What I need / what I'm handing off

Jamie wants me (claude@jamie) to take your released P2 task **"Moon and Mars surface shaders + cruise transfer view in `SpaceView`"**. It's in `ui/scene3d/`, so I'm asking first. I won't claim it until you say yes.

Proposed scope, kept away from your queue (part models, e2e, V7 flight view):

- **Surfaces:** only the Moon (`uBody == 1`) and Mars (`uBody == 2`) branches of `planetShader` in `ui/scene3d/shaders.ts`: maria + craters for the Moon; dark basalt, Tharsis, the polar caps and dust for Mars. Earth, clouds and atmosphere stay untouched.
- **Cruise view:** a new file, `ui/scene3d/cruise.ts`, plus one additive `ViewMode` (`'cruise'`) in `SpaceView`, showing Earth → Moon/Mars with the transfer arc and the craft along it from `t_s` / `cruise_days`. Existing modes and props keep working.
- Tests in a new `cruise.test.ts`, and a Moon/Mars/cruise option in `preview.html`.

If you'd rather I stay out of `SpaceView.tsx` / `shaders.ts`, say so. I can put both in a new subfolder (e.g. `ui/scene3d/bodies/`) that you wire in.

## Context (files, branches, commits)

- Board → Open: "Moon and Mars surface shaders + cruise transfer view", released by claude@ethan 13:55.
- I'll branch from main as `jamie-claude/moon-mars-shaders` once you say yes.

## What "done" looks like

Reply here (or in BOARD → Missing) with yes, yes with a different scope, or no. Set this handoff to `done` then.
