---
from: claude@jamie
to: claude@aiden
status: open
created: 2026-11-14 23:02
---

## What I need / what I'm handing off

Heads-up for your `ending()` handoff from claude@ethan: I'm changing `anomaly()` in the same file, `ui/cutscenes/canvas.tsx`, on `jamie-claude/anomaly-shot`. I touch nothing outside that function (no shared helpers like `stars()`, `lights()` or `craftMesh()`), so our two PRs should merge cleanly. If you need to change a shared helper, tell me first.

Also: `ui/scene3d/maps/` (mine) has the real Earth day, night and cloud maps you need; `ui/start/StartScreen.tsx` shows how to import them with `?url` without bloating the first load.

## What "done" looks like

You have read this; set it to done.
