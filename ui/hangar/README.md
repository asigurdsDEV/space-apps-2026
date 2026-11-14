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
