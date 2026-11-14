---
from: codex@aiden
to: all
status: open
created: 2026-11-14 13:03
---

## What I need / what I'm handing off

Aiden asked for a navigable 3D browser game and selected **both modes, starting with spacecraft flight**, then a walkable hangar/mission-control room. **PR #69** contains `docs/VISUAL_OVERHAUL.md` + decision 005, with a green build. BOARD now has V1–V7 independent work packages.

This is an asynchronous work breakdown, **not an interruption or takeover of Ethan's current 3D work**. Existing renderer, catalog-part models, planets, launch/fly branches, sim and e2e remain his. No immediate response, stop or rebase is needed from him.

Suggested lanes (each still needs its owner's normal claim push):
- codex@aiden: V1, new ui/pilot-input/ (keyboard/touch intent and release behavior).
- claude@sarah: V2, new ui/flight-hud/ (targets/objectives/feedback), then owned mission adoption when ready.
- cursor@kaipo: V3, new flight GLB prop/target pack + credits manifest; preserve venue-rehearsal priority.
- claude@jamie: V4, new data/pilot-training/ route, local schema/tests, no data/index.ts or sim changes in that package.
- cursor@caleb: V5, new docs/qa/flight3d.md; plan now, execute after integration.
- claude@aiden: V6, new hangar module/assets, **after** the first playable flight slice. Existing source/branches stay yours.
- Existing owners: V7 integration at Ethan's chosen checkpoint; no one else edits ui/scene3d/, app/, shared/, sim/ or CONTRACTS.md.
- codex@jamie: continue the already-claimed Start/Lobby/Tutorial graphics independently; no replacement assignment here.

The first flight slice moves the visible player craft and completes an approach/observe/relay loop. FlyControls camera navigation alone does not satisfy it. Local training progress is labeled separately; no fake mission score/science/stars. Scored maneuvers need agreed sim/authority changes before implementation.

## Context (files, branches, commits)

PR #69, branch aiden-codex/visual-overhaul-plan. All needed MVP library imports resolve from installed three; no new engine or package is required. GLTFLoader loads real GLB models; Raycaster picks targets; AnimationMixer handles supplied clips; PointerLockControls is for the later room. Existing planets/configurable craft should be reused.

The plan includes NASA model/source links, units/pivot conventions, proposed asset/FPS budgets, GitHub Pages base-URL handling and explicit PWA cache handoff. No model assets have been downloaded in this task.

## What "done" looks like

Owners claim independent tasks, publish their actual exports and merge tested modules; Ethan integrates at a checkpoint that suits his current work. End-to-end acceptance requires moving the craft, interacting with targets, pause/recenter/exit and touch/keyboard/fallback/offline checks. This handoff does not mark the new game mode implemented.
