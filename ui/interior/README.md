# Walk-in spacecraft (decision 007)

After launch you fly the mission from inside a **full-size working model of your own spacecraft** in the operations room (a "digital twin"; real robotic spacecraft have no inside). Mounted by `app/World.tsx` for the flight phase behind `?world=3d`.

```tsx
import { SpacecraftRoom } from '../ui/interior'
<SpacecraftRoom state={state} send={session.send} paused={paused} speed={speed}
  decision={pendingDecision(state)} decisionBlocked={canAnswer ? undefined : "Sam's call"} enabled={!cutscene} />
```

- **Shape:** a space-station module. The cross-section (`section()` in `layout.ts`, tested) has a cove at the deck, a straight wall where the player's wall is, a chamfered stand-off corner and a flat ceiling at `CEILING`; a thin frame runs round it in the seam between racks every metre. All four faces are racks and panels: the ceiling has doors, air grilles and strapped bags, the deck has metre panels with latches, four seat tracks and low blue handrails. The room keeps its 8 x 6 m floor (the window and console need the width), so the section is wider than a real module's.
- **Hatchway:** opposite the window, a rounded-square opening in a thick blue-grey frame with a dark seal (`HATCHWAY`), and through it a short stretch of the next module, painted bright (it is not lit by the cabin). You cannot walk through: the end wall's obstacle is unchanged.
- **Window:** a thick bolted frame with an inner pane that mirrors a little of the room. Outside, the world you orbit (the orbit's `central_body`) on the real NASA maps with clouds, air on the limb and city lights at night, lit by the Sun where it really is right now (`ui/scene3d/sun`). The ground comes in over the far limb and slides under you, about one orbit every three minutes at 1× (faster by the square root of the speed, stopped while paused); stars show only in the black. The window's light on the room follows the daylight outside.
- **Racks:** built in relief, not painted: locker doors with pull handles on a dark backing, a recessed service bay with a rimmed port and plugged-in cables, a control panel, a round port cover, fabric stowage bags under straps. Four kinds of rack (plus overhead lockers and low drawers for the end walls) are built once and stood along the walls; blue handrails stand off every other frame, and cables drop from the stand-off trays into the racks. A laptop sits on an arm over the left end of the console.
- **Console:** a desk blade on two turned oval pedestals (the deck runs on under it) with a grab bar along its front, five gauges as displays in bezels (day, science home, storage, data lost, money spent), keys in rimmed wells, a desk model of your spacecraft, and the time controls on one printed plate: E on the lit push button = pause/resume (green while time runs, amber while held), E on the rotary switch = next speed (1× → 5× → 20× → 60×). A readout above each says which is which.
- **Modules** on turned columns bolted to the deck (machined table with a ring for the part, a tilted name pod with status LEDs, an umbilical into the rack behind), each with its real 3D part model (`ui/hangar` `partModel` → claude@ethan's `ui/scene3d/parts`): power + battery (left wall), radio + data storage (right), instruments (back wall, either side of the hatch). The data recorder's display fills with stored data.
- **Survey hatch** (cursor@kaipo): a round gold hatch in a bolted steel collar in the deck at `HATCH`; E on it surveys the ground on Earth missions and opens the Apollo 17 terrain on Moon missions.
- **Light:** flat, bright and a little cool: a strip light in every bay of the stand-off corners (an air diffuser in every other bay, a cable tray below), cool light from the window, glow from the displays, and the window's daylight pooled on the control shelf and the deck in front of it (it follows the Sun outside); soft contact shade is painted under the equipment, on the racks behind each mount, and baked into the rack fronts (no real-time shadows).
- **Anomaly card:** the ceiling beacon and a red light pulse (they hold steady under reduced motion), the room dims, an alarm sound plays once, the LEDs of the card's module flash red with a red wash on the wall behind it, and the card's title + 2–3 choice panels (letter, label, effect) stand in front of it: spacecraft → power, comms → radio, science → instruments, planning → floating mid-room. A is on your left as you face the module. E on a panel = `resolve_decision`. Pause is disabled until it's answered (time is held anyway).
- Everything is drawn in code: merged geometry per material (rack fronts, bags and ducts share one vertex-coloured mesh) and shared canvas textures (about 156 draw calls from the door, as before; about 229,000 triangles).
- Preview: `npm run dev`, then `/ui/interior/preview.html?scenario=demo|moon|mars&card=spacecraft|comms-resources|science|mission-planning&days=4&instruments=camera-basic,magnetometer&probe&crew`.

Pure layout + interactions in `layout.ts` (tested); `control.ts` draws them.

## Handoff: where this stands (claude@aiden, Sat 15:55 PST)

Done and checked in the browser with real E presses: launch → inside the spacecraft → anomaly card answered at its panel (alarm stops, time resumes) → speed cycling → gauges showing storage full and data lost. Mission end → back to mission control debrief uses the code from PR #114 (checked there).

Not done yet, in order of value:
1. **Choices at a module** (spacecraft / comms / science cards) were laid out and unit-tested but not yet seen in the browser; a planning card was.
2. Making `?world=3d` the default (board line "App runs the 3D loop", by Sun 08:00): in `app/World.tsx`, `WORLD_3D` → default true unless `?world=classic`.
3. Space weather strip and the leaderboard are not shown in 3D yet (they are on the 2D screens).
4. Cutscenes "into the spacecraft" / "back to control" are cursor@caleb's (PR #115); add them to `StoryLayer` when merged.

Branch `aiden-claude/interior`, stacked on #114 (on #107). Dev builds: `window.__fps.teleport([x, 0, z], yaw, pitch)` / `.where()` for QA.
