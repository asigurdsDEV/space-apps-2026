# Walk-in spacecraft (decision 007)

After launch you fly the mission from inside a **full-size working model of your own spacecraft** in the operations room (a "digital twin"; real robotic spacecraft have no inside). Mounted by `app/World.tsx` for the flight phase behind `?world=3d`.

```tsx
import { SpacecraftRoom } from '../ui/interior'
<SpacecraftRoom state={state} send={session.send} paused={paused} speed={speed}
  decision={pendingDecision(state)} decisionBlocked={canAnswer ? undefined : "Sam's call"} enabled={!cutscene} />
```

- **Window:** a thick bolted frame with an inner pane that mirrors a little of the room. Outside, the world you orbit (the orbit's `central_body`) on the real NASA maps with clouds, air on the limb and city lights at night, lit by the Sun where it really is right now (`ui/scene3d/sun`). The ground glides past as you orbit and jumps ahead as mission days pass; stars show only in the black. The window's light on the room follows the daylight outside.
- **Console:** five gauges as displays in bezels (day, science home, storage, data lost, money spent), a desk model of your spacecraft, and the time controls on one printed plate: E on the lit push button = pause/resume (green while time runs, amber while held), E on the rotary switch = next speed (1× → 5× → 20× → 60×). A readout above each says which is which.
- **Modules** on equipment mounts bolted to deck and wall (cabinet, machined top plate, grab rail, cables up to the ceiling tray), each with its real 3D part model (`ui/hangar` `partModel` → claude@ethan's `ui/scene3d/parts`) seated on the plate, a printed name plate and a row of status LEDs: power + battery (left wall), radio + data storage (right), instruments (back wall). The data recorder's display fills with stored data.
- **Light:** warm strips where the walls meet the ceiling, cool light from the window, glow from the displays; soft contact shade is painted under and behind the equipment (no real-time shadows).
- **Anomaly card:** the ceiling beacon and a red light pulse, the room dims, an alarm sound plays once, the LEDs of the card's module flash red with a red wash on the wall behind it, and the card's title + 2–3 choice panels (letter, label, effect) stand in front of it: spacecraft → power, comms → radio, science → instruments, planning → floating mid-room. E on a panel = `resolve_decision`. Pause is disabled until it's answered (time is held anyway).
- Everything is drawn in code: merged geometry per material and shared canvas textures (about 160 draw calls from the door, as before).
- Preview: `npm run dev`, then `/ui/interior/preview.html?scenario=demo|moon|mars&card=spacecraft|comms-resources|science|mission-planning&days=4`.

Pure layout + interactions in `layout.ts` (tested); `control.ts` draws them.

## Handoff: where this stands (claude@aiden, Sat 15:55 PST)

Done and checked in the browser with real E presses: launch → inside the spacecraft → anomaly card answered at its panel (alarm stops, time resumes) → speed cycling → gauges showing storage full and data lost. Mission end → back to mission control debrief uses the code from PR #114 (checked there).

Not done yet, in order of value:
1. **Choices at a module** (spacecraft / comms / science cards) were laid out and unit-tested but not yet seen in the browser; a planning card was.
2. Making `?world=3d` the default (board line "App runs the 3D loop", by Sun 08:00): in `app/World.tsx`, `WORLD_3D` → default true unless `?world=classic`.
3. Space weather strip and the leaderboard are not shown in 3D yet (they are on the 2D screens).
4. Cutscenes "into the spacecraft" / "back to control" are cursor@caleb's (PR #115); add them to `StoryLayer` when merged.

Branch `aiden-claude/interior`, stacked on #114 (on #107). Dev builds: `window.__fps.teleport([x, 0, z], yaw, pitch)` / `.where()` for QA.
