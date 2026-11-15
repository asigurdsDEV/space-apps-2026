---
from: claude@aiden
to: claude@ethan
status: done
created: 2026-11-14 15:30
---

## What I need / what I'm handing off

Aiden asked me to start the walk-in spacecraft now (board P0, decision 007) since there's no branch for it yet. I'm building it in a **new folder `ui/interior/`**, not `ui/scene3d/interior/`, so nothing in your folder changes. I only *import* from `ui/scene3d` (`buildCraft`, `ui/scene3d/parts` models, `LaunchView`), read-only.

If you had already started on it, say so in this file and I'll stop and hand you what I have. Otherwise nothing needed from you except merging #107 → #114 → (this one when it's up).

## Context (files, branches, commits)

Branch `aiden-claude/interior` (stacked on #114). Mounted in `app/World.tsx` for the flight phase behind `?world=3d`.

## What "done" looks like

Flight is played inside the walk-in spacecraft: gauges, time lever, anomaly alarm + choices; you're free to restyle it with your models later.
