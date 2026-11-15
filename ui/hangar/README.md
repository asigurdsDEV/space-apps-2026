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

- **Video wall** (front, three screens): the **mission call** (name, what it asks for, budget, science goal, length, the poll at a glance; after the flight, the grade), the **ground track** of the chosen orbit over the real map of the body it circles (`ui/scene3d/maps`; `wall.ts` works the track out from the orbit's tilt and period and the body's day), and the **margins** (the builder's budget bars). **Side walls:** the design (every slot, what is fitted, what it costs) and the flight plan (build, launch day, cruise, science, the odds). Every screen is drawn from the sim's state by `screens.ts` and painted again only when its own numbers change.
- **Operator desks** (`decor.ts`): one long curved desk in front of the video wall and four shorter ones down each side, with monitors, keyboards, phones, swivel chairs and a teal light strip. The four big monitors on the front desk are the **GO / NO-GO consoles**; every small monitor shows one readout of the design (a slot, a budget, the track, the odds) from one shared canvas. Desks and chairs block the player (`obstacles`).
- **Hologram stations** (orbit, rocket, bus, instruments, radio, power, battery): one low emitter pedestal per slot on a horseshoe around the craft, never on the centre line. Above each turns the fitted part as a hologram (its real model from `ui/scene3d/parts`, the rocket from the launch fleet, the orbit as a globe and ring) under the slot's and the part's name. **E** opens the station's menu: glass cards on an arc around you, one per part the sim offers (name, two key numbers, price, the fitted one marked). E on a card fits it with the same `set_param` the 2D builder sends and closes the menu; instruments toggle and the menu stays open. One menu at a time; it closes when you press E on the emitter again or walk 3.6 m away. Cards answer E only once the menu has opened, so a double press never picks one by accident. Card ids are still `rack:<slot>:<part>`; stations are `station:<slot>`.
- **The spacecraft** floats dead centre, 2.3 m up in the beam of a round floor emitter, turning slowly (still under reduced motion). It is the live model of the player's choices.
- **Light:** a dim hall: dark wood walls with their light painted in, dark carpet with a lighter walkway and plaza, a black ceiling with small downlights. The glow comes from the holograms, the screens and teal edge lights; five point lights, no shadows. The room itself (surfaces, trim, all desks) is eleven draw calls. The holograms turn, so the room draws every frame (only on change under reduced motion).
- **Launch button:** `launch`, blocked with "A console says NO-GO".
- **Debrief:** the wall shows the grade and the best single change; E at the spacecraft tries it, E at the launch button designs again.
- Co-op: menu cards and launch owned by another player's role say "<name>'s call" and do nothing.

Layout and interactions are pure and tested (`layout.ts`, `wall.ts`); `decor.ts` builds the hall, `screens.ts` paints its screens, `control.ts` puts them together.
