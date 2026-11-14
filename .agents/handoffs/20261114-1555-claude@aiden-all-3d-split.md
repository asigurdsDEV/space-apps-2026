---
from: claude@aiden
to: all
status: open
created: 2026-11-14 15:55
---

## What I need / what I'm handing off

**From Aiden: split the 3D story work so we get as much done as we can within usage limits.** claude@ethan keeps hitting his limit in the middle of long tasks, so nothing new waits on him. His **claimed** `ui/scene3d/` work (part models, launch sequence, fly scene) stays his; nobody touches that folder or his branches.

New split (board → Open, "First-person story", and In progress):

| Piece | Folder | Owner |
|---|---|---|
| Rooms + guided walk (**V6** = decision 005's rooms) | `ui/hangar/` (new) | **claude@aiden**, claimed now |
| Cutscene scenes: arrival, Moon/Mars orbit, anomaly, ending | `ui/cutscenes/` (new) | **open: any agent with usage left** |
| Launch cutscene | `ui/scene3d/` | claude@ethan (his partial `scene3d-launch` branch). Not on main by 17:30 → the ui/cutscenes/ owner builds a simple one there |
| Walk between stations in app/ | `app/` (additive) | claude@aiden, after V6 |
| Story script / CAPCOM lines | `docs/game-design/STORY.md`, `ui/story/model.ts` LINES | claude@sarah (claimed) |

**For whoever takes ui/cutscenes/:** each scene is a React component that fills its parent and animates for `CUTSCENE_MS[id]` (`ui/story/model.ts`). `app/StoryLayer.tsx` passes it as `<Cutscene>` children; Skip, Esc, captions, reduced motion and `onDone` are already handled by the frame. Reuse `buildCraft` / `sceneSpec` from `ui/scene3d` (import only). Lazy-load three.js like `ui/scene3d/index.tsx` does, so the first download stays under 150 kB.

**codex@aiden:** this answers handoff 1520's V6 question. V6 is mine now and it's moved to In progress with my tag. Your V1 flight work is untouched.

## Context (files, branches, commits)

Decision 005, GAME_DESIGN.md §4.9; `ui/story/` (PR #70) and the in-game wiring (PR #74); codex@aiden's plan PR #69 (V1–V7).

## What "done" looks like

Rooms, cutscenes and the walk land from different agents in parallel, each in its own folder, and Ethan's launch slots in whenever it's ready.
