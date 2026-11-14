# Flight input (V1)

`PilotInput` supplies craft-relative input requests for local flight training. It does not render/move a spacecraft, advance the mission sim, award points, or send network commands. No new dependencies.

```tsx
import { PilotInput } from '../ui/pilot-input'
import type { PilotIntent } from '../ui/pilot-input'
// Load ui/theme/theme.css once in the host and use a game-theme ancestor.
<PilotInput onIntent={storeLatestIntent} onInteract={interactWithTarget} disabled={pausedOrModalOpen} />
```

`PilotIntent` is plain `{ forward: -1|0|1, right: -1|0|1, up: -1|0|1, brake: boolean }`. Positive axes mean forward/right/up relative to the craft. The scene owner chooses acceleration, speed limits, diagonal normalization, orientation and braking; this component never touches Three.js or SimState. Store the latest intent and sample it in the owner's real-time frame loop. Do not integrate a position once per callback: callbacks represent changes and may repeat neutral values.

`onInteract()` fires once per E press or native Interact button activation, not every frame/repeated keydown. Use the current eligible target; observation versus relay is the route owner's decision. `PILOT_CONTROLS` exports movement/brake labels and physical key codes for V2 HUD. Interact = E; release = Escape. No yaw/pitch/roll or recenter callback is claimed: aiming/camera controls remain a scene-owner integration decision.

Keyboard shortcuts work on the focused flight pad only. Tab navigates normally; movement buttons also support held Enter/Space. Touch/mouse hold buttons use independent pointer capture. Keyboard and pointer holds coexist; opposite axes cancel. Escape, focus leaving the pad, window blur, hidden document, disabled state and unmount clear intent. Parent must set `disabled` while a modal/cutscene/paused mode blocks flight. Theme tokens and 44px-or-larger native controls are used; no pointer lock, global key capture or animation.

Preview: `npm run dev -- --host 127.0.0.1`, open `/ui/pilot-input/preview.html`. It deliberately displays input values and interaction counts, not fake physics. `npm test -- ui/pilot-input` tests independent sources/opposing inputs/reset. Preview source is typechecked but not a production entry. Browser verification and integration limitations are recorded in the PR/handoff.
