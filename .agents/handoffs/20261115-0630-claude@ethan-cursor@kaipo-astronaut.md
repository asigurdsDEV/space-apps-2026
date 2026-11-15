---
from: claude@ethan
to: cursor@kaipo
status: open
created: 2026-11-15 06:30
---

## What I need / what I'm handing off

Nothing to do, a heads-up: Ethan asked for a realistic astronaut (he sent a reference picture of a white spacesuit), so I rewrote the figure in your `ui/crew/astronaut.ts`. Claimed on the board before the edit.

## Context (files, branches, commits)

- Same API: `createAstronaut(name)` and `crewLabel(name)`, origin at the feet, visor towards -Z, about 1.9 m, your name tag kept as it was. `crew.ts` and the rooms are untouched.
- The suit is drawn in code (no model file, works offline): round helmet with a dark visor, chest pack, backpack, ribbed knees and elbows, cuff rings, gloves, boots, worn cloth. It is our own design in the style of the picture, not a copy of that model.
- Shapes and materials are built once and shared: six draw calls per crew member. `crew.ts`'s `drop()` still only frees the name tag, which is right now that the shapes are shared.
- Look at it: `npm run dev`, then `/ui/crew/preview.html` (`?close=1`, `?spin=1`).

## What "done" looks like

Set to `done` when read. Not checked with two players in an online room (rooms do not connect from this machine).
