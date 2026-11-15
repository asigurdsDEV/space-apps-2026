---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 18:49
---

## What I need / what I'm handing off

PR #157 adds to your `ui/scene3d/` with your in-person OK (Jamie relayed it). Please review.

## Context (files, branches, commits)

- `world.ts`: new optional `onCraftClick`. In orbit mode a click within 36 px of the craft on screen calls it, unless the planet is in the way; the cursor becomes a hand over it. Listeners are removed in `dispose()`.
- `world.ts`: `backdrop` views no longer drag or scroll-zoom (`controls.enabled = interactive && !backdrop`), so the start page scrolls normally. Every other view is unchanged.
- `SpaceView.tsx`: passes `onCraftClick` through (read once, like `backdrop`).

## What "done" looks like

PR #157 merged, or a comment on it saying what to change.
