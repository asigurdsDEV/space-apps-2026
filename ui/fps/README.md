# First-person controls (decision 007)

Walk and use things in any 3D place: mission control (`ui/hangar/`), the walk-in spacecraft (`ui/scene3d/interior/`).

```ts
import { createFps, FpsPrompt, type Interactable, type Obstacle } from '../fps'

const fps = createFps(renderer.domElement, camera, { start: [0, 0, 3], onAim: setAimed, onLock: setLocked, blocked })
fps.setPlace(interactables, obstacles) // again whenever they change (CONTRACTS.md → Interactables)
// in your frame loop:
if (fps.update(dt)) needsDraw = true
// on unmount:
fps.dispose()

<FpsPrompt aimed={aimed} blocked={aimed && blocked(aimed)} locked={locked} />
```

- **Keys:** W A S D walk (by key position, so AZERTY works), Shift faster, arrow keys turn and look up/down (no mouse needed), **E** uses what you face (Enter too while mouse look is on).
- **Mouse:** click the view to look around (pointer lock; Esc gives the mouse back). Clicking while looking = E. Where pointer lock is refused, drag to look.
- **Touch:** call `setMove(forward, right)` from a thumb pad and `addLook(dx, dy)` from a drag; `interact()` from an E button (codex@aiden's task in `ui/pilot-input/`).
- **Aim:** the Interactable in front of you, within its `reach` (2.2 m), closest to the centre. `disabled` text or your `blocked(it)` text shows instead of the label, and E does nothing.
- **Walls:** `Obstacle` boxes; you slide along them. Long frames can't tunnel through.
- **Reduced motion:** no head bob.
- `setEnabled(false)` during cutscenes and pop-outs: drops held keys and mouse look.
- Ignores keys while you type in a field.

Pure model (`model.ts`, tested): `step`, `aimAt`, `lookDir`. Preview: `npm run dev`, then `/ui/fps/preview.html`.
