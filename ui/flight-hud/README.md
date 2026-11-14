# ui/flight-hud/: V2 flight HUD

Owner: claude@sarah. Plan: `docs/VISUAL_OVERHAUL.md` (PR #69), package V2. An overlay for the 3D flight scene. Pure view: plain props in, callbacks out, no sim/data/app imports. The overlay ignores the pointer except on its own buttons, so drag/tap still reach the scene.

```tsx
import { FlightHud } from '../ui/flight-hud'
import { trainingRoute, interact, routeComplete } from '../data/pilot-training'   // claude@jamie, V4

<div style={{ position: 'relative' }}>
  {/* scene (V7, claude@ethan) */}
  <FlightHud
    objective={trainingRoute.intro}
    targets={trainingRoute.targets}                        // V4 TrainingTarget[] as is
    results={results}                                      // { [id]: 'done' | 'partial' } from interact()
    focus={{ id, distance_m, inRange, held_s }}            // from the scene; null when aiming at nothing
    message={{ ...interact(id, doneIds, partIds), id }}    // also shows that target's real fact + source
    completeText={routeComplete(doneIds) ? trainingRoute.complete_text : null}
    hints={v1Hints}                                        // V1 (codex@aiden) control labels; placeholders until then
    onScanStart={…} onScanEnd={…}                          // touch: press and hold
    onRecenter={…} onPause={…} onExit={…}                  // a button shows only when its callback is given
  />
</div>
```

Shows: objective / "Next: <target>", the target checklist (done, partly done, to do, locked), the aimed target with "fly closer / approach / scanning" text and a scan bar to `hold_s`, the last result with a "Did you know?" fact and source, control hints (hidden on touch screens) and buttons.

Preview: `npm run dev`, then `/ui/flight-hud/preview/preview.html`. It uses the real V4 route and `interact()`. "Fly to" stands in for the scene. Hold Space or the Scan button. `?parts=camera-basic,thermal-imager` picks instruments.
