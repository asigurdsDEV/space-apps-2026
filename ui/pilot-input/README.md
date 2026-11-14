# Flight input (V1)

`PilotInput` supplies craft-relative input requests for local flight training. It does not render/move a spacecraft, advance the mission sim, award points, or send network commands. No new dependencies.

```tsx
import { PilotInput } from '../ui/pilot-input'
import type { PilotIntent } from '../ui/pilot-input'
// Load ui/theme/theme.css once in the host and use a game-theme ancestor.
<PilotInput onIntent={storeLatestIntent} onInteract={interactWithTarget} disabled={pausedOrModalOpen} />
```

`PilotIntent` is plain `{ forward: -1|0|1, right: -1|0|1, up: -1|0|1, brake: boolean, interact: boolean }`. Positive axes mean forward/right/up relative to the craft. The scene owner chooses acceleration, speed limits, diagonal normalization, orientation and braking; this component never touches Three.js or SimState. Store the latest intent and sample it in the owner's real-time frame loop. Do not integrate a position once per callback: callbacks represent changes and may repeat neutral values.

`onInteract()` is the press edge for immediate actions/feedback, not every frame/repeated keydown. For V2/V4 hold-to-scan, accumulate real seconds only while `intent.interact` is true and the same eligible target stays in range; invoke the route interaction only after its `hold_s`. Do not complete a scan on the press edge. Combine HUD `onScanStart`/`onScanEnd` as a separate held source (logical OR with V1 held state), clearing both on pause/exit. Keyboard E, held Enter/Space on the Interact button and pointer holds all publish held state. Assistive click activation supplies the discrete callback; the host should offer an accessible explicit scan action as well as hold gestures.

`PILOT_CONTROLS` exports all eight labels and physical key codes for V2 HUD (`map(({key,label}) => ({keys:key,action:label}))`); add Escape / release separately. No yaw/pitch/roll or recenter callback is claimed: aiming/camera controls remain a scene-owner integration decision.

Keyboard shortcuts work on the focused flight pad only. Tab navigates normally; movement buttons also support held Enter/Space. Touch/mouse hold buttons use independent pointer capture. Keyboard and pointer holds coexist; opposite axes cancel. Escape, focus leaving the pad, window blur, hidden document, disabled state and unmount clear intent. Parent must set `disabled` while a modal/cutscene/paused mode blocks flight. Theme tokens and 44px-or-larger native controls are used; no pointer lock, global key capture or animation.

Preview: `npm run dev -- --host 127.0.0.1`, open `/ui/pilot-input/preview.html`. It deliberately displays input values and interaction counts, not fake physics. `npm test -- ui/pilot-input` tests independent sources/opposing inputs/reset. Preview source is typechecked but not a production entry. Browser verification and integration limitations are recorded in the PR/handoff.

## Walking touch controls (decision 007)

`WalkTouchControls` is separate from the craft `PilotInput`; it does not install WASD/mouse-look handlers or move a camera. Preview: `/ui/pilot-input/walk-preview.html` under the dev server.

```tsx
<WalkTouchControls
  disabled={paused || cutsceneOpen}
  onMove={move => { heldMove.current = move }}
  onLook={delta => turnCamera(delta)}
  onInteract={() => useFocusedInteractable()}
/>
```

- `onMove([right, forward])`: held analog intent, each axis -1…1, total magnitude ≤ 1. Up on the pad means positive forward. Store latest and apply in the controller's real-time loop; zero on release/cancel/lost capture, Escape, window blur, hidden page, disable or unmount. Do not turn it into sim Commands.
- `onLook([dx, dy])`: incremental CSS pixels, right/down positive. Convert to camera yaw/pitch using the controller's sensitivity and pitch limits; apply **once per callback**, not repeatedly each frame. Look and move use separate captured pointer IDs, supporting simultaneous fingers. A second finger on one pad is ignored.
- `onInteract()`: one discrete action on pointer press, keyboard Enter/Space or assistive activation. Parent uses the focused Interactable, reach and role permissions. Optional `interactLabel` defaults to `Interact`; keep it ≤ 4 words. No interaction when disabled.
- Both pads are focusable with arrow-key equivalents. Keep native button semantics and normal Tab navigation; controller keyboard shortcuts should ignore events handled by these pads. Do not focus pads on pointer-down: touching Look or Interact must not release another finger's movement.
- Place inside the scene wrapper as a bottom overlay. Outer controls let pointer events through; pads/button consume their own gestures. Parent chooses when to show it (touch/coarse pointer or user preference), disables during modals, and combines touch and keyboard movement in `ui/fps/`.

No new dependencies. Camera collision, aiming, reduced-motion scene behavior, co-op authorization and app mount remain with the controller/place owners. Physical multi-touch and integrated room testing remain required.
