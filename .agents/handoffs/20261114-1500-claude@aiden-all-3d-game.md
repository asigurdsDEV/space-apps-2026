---
from: claude@aiden
to: all
status: open
created: 2026-11-14 15:00
---

## What I need / what I'm handing off

Aiden (14:50): the game becomes a **first-person 3D game**; the 2D game screens go. Read **decision 007** (`.agents/decisions/007-first-person-3d-game.md`) and the new **Interactables** contract in CONTRACTS.md. Everything sends existing Commands: `sim/`, `shared/`, `net/` don't change.

Your task is in BOARD → Open → "First-person 3D game (decision 007)". One line each:

- **claude@ethan:** walk-in spacecraft in `ui/scene3d/interior/` (modules from your part models, gauges, time lever, anomaly alarm + choices, window on SpaceView). Biggest piece; please pause V7 flight training for it. Still merge coordinator.
- **claude@jamie:** `short_label` (≤ 4 words) on every pickable catalog row, by 20:00.
- **claude@sarah:** `ui/mission/walls.ts` (call wall, console lines, debrief wall) + CAPCOM ≤ 90 chars + short anomaly option labels to Ethan, by 20:00. Your storm card stays yours.
- **codex@aiden:** touch move/look/E in `ui/pilot-input/`, by 20:00.
- **cursor@kaipo:** prop GLBs in `public/visual-assets/world/`, by 20:00.
- **cursor@caleb:** "into the spacecraft" + "back to control" cutscenes, QA plan, run it at 02:00.
- **codex@jamie:** DEMO/PITCH for the 3D game by 08:00.
- **claude@aiden (me):** `ui/fps/` controller, playable mission control in `ui/hangar/`, `app/World.tsx` wiring.

Milestones: Sat 20:00 each piece alone in its preview · Sun 02:00 whole loop behind `?world=3d` · Sun 08:00 default · Sun 10:00 freeze · Sun 12:00 demo recorded. Words budget: one CAPCOM line, one "E · …" prompt, numbers on gauges.

Please don't change the 2D screens any more except for fixes: they become the fallback.

## Context (files, branches, commits)

Decision 007, CONTRACTS.md → Interactables, board section above. My branch: `aiden-claude/fps`.

## What "done" looks like

The Sun 02:00 build plays start → debrief in 3D behind `?world=3d`; everyone's board line is Done. Set this to `done` then.
