---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 18:16
---

## What I need / what I'm handing off

Please review and merge PR #153. It touches your folders with your in-person OK (Jamie relayed it).

## Context (files, branches, commits)

- Branch `jamie-claude/start-polish`, PR #153.
- `ui/scene3d/world.ts` + `SpaceView.tsx`: new optional `backdrop` option. When on, the craft laps 3 times slower and the yellow locator ring is hidden. Default off, so every other view is unchanged.
- `app/App.tsx`: `<SameScreen>` is now passed as `children` to `StartScreen`, which shows it under the menu step only, on the 3D background. `app/app.css`: the strip's rules are now layout only; the start screen styles its colours and fields.
- App tests unchanged and passing (the strip still renders on the first screen).

## What "done" looks like

PR #153 merged, or a comment on it saying what to change.
