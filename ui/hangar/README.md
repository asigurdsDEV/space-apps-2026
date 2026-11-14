# Mission control you walk through (decision 005, board V6)

One long control hall in three.js with six stations in mission order: **mission call wall → assembly bay → flight consoles → launch pad window → operations room → debrief room**. Your designed spacecraft stands in the assembly bay. Built from primitives and canvas textures in code: no model files, no network, works offline.

```tsx
import { Hangar, stationFor } from '../ui/hangar'

<Hangar
  station={stationFor(screen)}       // 'briefing' → wall, 'design' → bay, 'poll' → consoles, 'flight' → ops, 'results' → debrief
  onSelect={(id) => …}               // optional: tapped a station, Next / Back, Enter / → / ←. Leave out and the walk follows `station` only
  onArrive={(id) => …}               // optional: the camera got there
  state={state}                      // optional: puts the designed spacecraft on the stand (ui/scene3d's buildCraft, read-only)
  title={config.title}               // optional: shown on the mission call wall
/>
```

- **Guided walk:** changing `station` walks the camera there (eased, a small step bob, 0.7 to 2.4 s). Under reduced motion it cuts straight there with no bob.
- **Controls:** tap a station in 3D, the **Back / Next station** buttons (44 px), or keyboard on the focused hall: Enter / → next, ← back, **W A S D** to look around.
- **Screen readers:** the hall is a labelled `application`; the caption announces "Assembly bay · Build the spacecraft" on arrival.
- **Phones:** wider field of view on tall screens; renders only while walking or looking (no constant 60 fps loop); pixel ratio capped at 2.
- **No WebGL:** a plain backdrop with the same caption and buttons.
- **Bundle:** `index.tsx` lazy-loads the hall, so three.js stays out of the first download.

Pure model (`model.ts`, tested): `STATIONS`, `stationFor`, `nextStation` / `prevStation`, `walkMs`, `walkPose`.

Preview: `npm run dev`, then `/ui/hangar/preview.html`. Next up (board, claude@aiden): app/ walks between stations as the screens change, with each screen popping out as a panel over the hall.

## Mission control you play in (decision 007)

`<MissionControl state send players me title debrief enabled onFailed />` (lazy, from `index.tsx`): the first-person room the app shows in the design phase and the debrief (`app/World.tsx`, behind `?world=3d`). Walk with W A S D, look with the mouse or arrow keys, **E** on what you face (`ui/fps/`).

- **Call wall:** mission name + budget, science goal, length. That is the whole briefing.
- **Racks** (orbit, rocket, bus, power, battery, instruments, radio): one plate per part with its price; E fits it with the same `set_param` the 2D builder sends (instruments toggle). The fitted part has a green frame. Labels use data's `short_label` when it lands, else the name without brackets (≤ 4 words).
- **Gauges** on the back wall: the builder's budget bars. **Desks:** the four GO / NO-GO consoles, each with its first reason. **Launch button:** `launch`, blocked with "A console says NO-GO".
- **Debrief:** the wall shows the grade and the best single change; E at the stand tries it, E at the launch button designs again.
- Co-op: parts and launch owned by another player's role say "<name>'s call" and do nothing.

Layout and interactions are pure and tested (`layout.ts`); `control.ts` draws them.
