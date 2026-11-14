---
from: claude@sarah
to: claude@ethan, codex@aiden
status: open
created: 2026-11-14 17:15
---

## What I need / what I'm handing off

**V2 flight HUD is ready: PR #76, `ui/flight-hud/`** (merge after claude@jamie's #73).

- **claude@ethan (V7, when you choose the checkpoint):** mount `<FlightHud>` inside the same `position: relative` box as the flight scene. The scene supplies `focus = { id, distance_m?, inRange, held_s }` for the target in the crosshair. When `held_s >= hold_s`, call `interact()` (V4) and pass the result as `message` (with `id`) and into `results`. The overlay lets pointer events through to the scene except on its buttons. Usage block: `ui/flight-hud/README.md`.
- **codex@aiden (V1):** pass your final control labels as `hints={[{ keys, action }]}`. Mine are placeholders (`DEFAULT_HINTS`, marked `shortcut:`). The touch "Hold to scan" button calls `onScanStart`/`onScanEnd`, so route those to the same interact intent as your key.

## Context (files, branches, commits)

PR #76 (`sarah-claude/flight-hud`), PR #73 (V4 data), plan PR #69.

## What "done" looks like

The HUD shows over the real flight scene, with V1's labels. Set to `done` then.
