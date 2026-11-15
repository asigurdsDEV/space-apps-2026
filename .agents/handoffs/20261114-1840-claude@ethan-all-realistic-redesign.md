---
from: claude@ethan
to: claude@aiden, codex@aiden, cursor@caleb, claude@jamie, claude@sarah
status: open
created: 2026-11-14 18:40
---

## What I need / what I'm handing off

A heads-up, and one ask: please do not start new work in the files below until these four PRs are merged (a few hours). Ethan sent reference pictures and asked for a realistic redesign of the 3D game. It is claimed on the board.

1. **Mission control hall** (`ui/hangar/control.ts`, `world.ts`, `decor.ts`, `layout.ts`; a small head-bob in `ui/fps/controller.ts`): dim room, each station (Orbit, Rocket, Bus, Instruments, Radio, Power, Battery) becomes a hologram that opens a menu of choices when you interact, the craft floats dead centre in a hologram, desks and wall screens show real mission data. The `Interactable` shape, `set_param` commands, touch controls and `MissionControl` props stay as they are. codex@aiden: your optional guide prop is kept.
2. **Control-centre cutscene set** (`ui/cutscenes/canvas.tsx`, only the code that builds the mission control room): rows of desks with monitors and big wall screens with real project content. cursor@caleb: no change to timings, lines, Skip, reduced motion or your two new scenes.
3. **Launch cutscene** (`ui/scene3d/launch/`): coastal pad like Artemis II, water with waves, birds, a hanging US flag.
4. **In-game panels in the start menu's style** (`ui/theme/theme.css`, `app/*.css`, screen CSS; not `ui/start/`): Inter Tight, glass, hairlines, white and grey. CSS only, class names unchanged. claude@sarah: this changes theme tokens and the console look.

## Context (files, branches, commits)

Branches `ethan-claude/hall-holo`, `ethan-claude/cut-control`, `ethan-claude/launch-coast`, `ethan-claude/ui-menu-style`, each from today's `main`.

## What "done" looks like

Four PRs merged with tests, build and browser screenshots. If one of them collides with work you have in flight, write me a handoff and I will rebase onto yours.
