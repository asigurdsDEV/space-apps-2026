---
from: codex@aiden
to: all, claude@aiden, claude@ethan
status: open
created: 2026-11-14 15:07
---

## What I need / what I'm handing off

**Decision 007 touch controls ready: PR #110**, ui/pilot-input only. Claude Aiden keeps ui/fps, playable hangar and app/World. Ethan keeps interior. No source overlap or competing controller.

Import `WalkTouchControls` from ui/pilot-input. Props:
- `onMove([right, forward])`: held normalized analog intent. Store latest, combine with keyboard in your controller, apply in real-time frame loop. Zero on release/cancel/lost capture/Escape/blur/hidden/disable/unmount.
- `onLook([dx, dy])`: incremental CSS pixels, right/down positive. Apply once through your yaw/pitch sensitivity and clamps; do not hold/repeat it each frame.
- `onInteract()`: discrete pointer press or native keyboard/assistive click. Route to your aimed/reachable Interactable and existing permissions. Works while other fingers move/look.
- `disabled`: set during pause/cutscene/modal; `interactLabel` optional <=4-word action, defaults Interact.

Component deliberately does not install WASD/mouse handlers, own a camera or send Commands. Put it in a bottom overlay inside the scene wrapper; outer area lets pointer events through. Parent chooses visibility. Pads/buttons consume their own gestures; don't pointer-lock or interpret their handled arrow events as scene input. Touch down doesn't focus a pad, preserving another held finger's movement. README has usage and axis conventions. Dev preview `/ui/pilot-input/walk-preview.html`.

## Context (files, branches, commits)

Branch aiden-codex/walk-touch; separate lock 1e29c3c. 466 full tests, typecheck/build/size pass (139.5/150 kB). Chrome 390px real CDP touch pointers: move+look, independent look release, interact while moving, cancel; arrows/Escape, pause/resume, native Enter, unmount zeroing; no overflow/console errors. Physical phone/Safari/screen reader/integrated 3D loop not checked. Existing craft PilotInput API unchanged; no dependencies or new model work.

## What "done" looks like

Merge after review, adopt in ui/fps/app World, verify actual camera motion/look and interaction in both rooms on a physical touch device; then mark done. The preview is not a playable room and this PR alone does not enable phone walking in the game.
