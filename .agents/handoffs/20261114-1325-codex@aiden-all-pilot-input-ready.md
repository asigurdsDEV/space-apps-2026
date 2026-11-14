---
from: codex@aiden
to: all
status: open
created: 2026-11-14 13:25
---

## What I need / what I'm handing off

V1 is ready in PR #78, ui/pilot-input/ only. Ethan remains renderer/integration/merge owner; no interruption of current scene work requested. Sarah's V2 #76 and Jamie's V4 #73 can use the final input API. Kaipo's three GLBs are on main; Caleb has QA plan #77 and now owns cutscenes; Claude Aiden owns V6 rooms.

- `<PilotInput onIntent onInteract disabled />`; import types and PILOT_CONTROLS from ui/pilot-input. README is the exact API.
- Plain intent: forward/right/up each -1|0|1 (craft-relative), brake boolean, interact boolean. Store latest intent for a real-time renderer; do not step the day-based budget sim on each callback.
- W/S forward/back, A/D left/right, R/F up/down, Space brake, E interact; Escape releases. HUD hints: `PILOT_CONTROLS.map(({key,label}) => ({keys:key,action:label}))`, plus Escape/release.
- **V2 held scan:** intent.interact stays true during E/button holds. OR this with a separate HUD onScanStart/onScanEnd held source. Count real seconds only while the same eligible target is in range; after V4 hold_s, invoke route interact. Reset elapsed on release/target loss and clear both sources on pause/exit. `onInteract` is a press-edge feedback/discrete-action callback, NOT scan completion. Provide an explicit accessible scan action as an alternative to hold gestures.
- Parent disables controls while paused/modal/cutscene. Input clears on Escape, focus leaving pad, window blur, document hidden, disable and unmount. World orientation, aiming, recenter, physics, authoritative scoring and final mount stay with existing owners.

## Context (files, branches, commits)

https://github.com/asigurdsDEV/space-apps-2026/pull/78 — aiden-codex/pilot-input. Separate lock a50c55d. 364 tests/build pass, first-load size 125.1/150 kB; final asset-only main merge covered by PR CI. Browser keyboard/native-button/pointer drag-off, focus/Escape/Tab, pause/unmount, text isolation, dark/light/390px verified. Final scan preview no console errors. Physical multi-touch, window-hidden while actively holding, screen reader and integrated spacecraft run NOT verified.

Astra supplied read-only design review at Aiden's request. No new npm dependencies or modifications in another owner's production source.
PR #69 is corrected to decision 006 and acknowledges 005 + the latest 1555 room split; own overlap handoff is closed.

## What "done" looks like

Owners review/merge and wire V1/V2/V4 into actual spacecraft flight at their chosen checkpoint, then execute V5 checks. This kit alone is not a playable 3D flight mode. Mark this note done after integration and acceptance, not just merging it.
