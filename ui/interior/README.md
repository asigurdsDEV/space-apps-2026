# Walk-in spacecraft (decision 007)

After launch you fly the mission from inside a **full-size working model of your own spacecraft** in the operations room (a "digital twin"; real robotic spacecraft have no inside). Mounted by `app/World.tsx` for the flight phase behind `?world=3d`.

```tsx
import { SpacecraftRoom } from '../ui/interior'
<SpacecraftRoom state={state} send={session.send} paused={paused} speed={speed}
  decision={pendingDecision(state)} decisionBlocked={canAnswer ? undefined : "Sam's call"} enabled={!cutscene} />
```

- **Window:** your world outside (colour by the orbit's `central_body`), turning as mission days pass; stars; sunlight.
- **Dashboard:** five gauges (day, science home, storage, data lost, money spent), a small model of your spacecraft, and the time controls: E on the green block = pause/resume, E on the yellow block = next speed (1× → 5× → 20× → 60×).
- **Modules** on pedestals, each with its real 3D part model (`ui/hangar` `partModel` → claude@ethan's `ui/scene3d/parts`) and a status light: power + battery (left wall), radio + data storage (right), instruments (back wall). The data core's screen fills with stored data.
- **Anomaly card:** red alarm light pulses, an alarm sound plays once, the module of the card's console flashes red, and the card's title + 2–3 choice panels (letter, label, effect) stand in front of it: spacecraft → power, comms → radio, science → instruments, planning → floating mid-room. E on a panel = `resolve_decision`. Pause is disabled until it's answered (time is held anyway).
- cursor@kaipo's `alarm-beacon.glb` hangs from the ceiling when it loads.

Pure layout + interactions in `layout.ts` (tested); `control.ts` draws them.

## Handoff: where this stands (claude@aiden, Sat 15:55 PST)

Done and checked in the browser with real E presses: launch → inside the spacecraft → anomaly card answered at its panel (alarm stops, time resumes) → speed cycling → gauges showing storage full and data lost. Mission end → back to mission control debrief uses the code from PR #114 (checked there).

Not done yet, in order of value:
1. **Choices at a module** (spacecraft / comms / science cards) were laid out and unit-tested but not yet seen in the browser; a planning card was.
2. Making `?world=3d` the default (board line "App runs the 3D loop", by Sun 08:00): in `app/World.tsx`, `WORLD_3D` → default true unless `?world=classic`.
3. Space weather strip and the leaderboard are not shown in 3D yet (they are on the 2D screens).
4. Kaipo's `time-lever.glb` could replace the two control blocks.
5. Cutscenes "into the spacecraft" / "back to control" are cursor@caleb's (PR #115); add them to `StoryLayer` when merged.

Branch `aiden-claude/interior`, stacked on #114 (on #107). Dev builds: `window.__fps.teleport([x, 0, z], yaw, pitch)` / `.where()` for QA.
