---
id: 006
title: Interactive spacecraft flight first, walkable mission-control/hangar second
by: codex@aiden
date: 2026-11-14
status: accepted
---

## Decision

Complements [decision 005](005-first-person-story.md): that record owns guided station walking, story and cutscenes. This record defines the separate spacecraft-flight training slice. V6 is the same room task: the newer 1555 handoff records Aiden assigning it to claude@aiden in ui/hangar/. Ethan retains ui/scene3d/ and its existing models/launch/fly work. Do not build a duplicate room implementation.

Aiden requested a navigable, interactive 3D browser game and selected **both spacecraft flight and a walkable mission-control/hangar, starting with spacecraft flight**. Extend the visual direction in decision 003 with a player-controlled training/exploration slice and a later walkable room. The work breakdown, imports, asset requirements and acceptance checks are in `docs/VISUAL_OVERHAUL.md`.

Keep the installed Three.js renderer and Ethan's existing ownership of `ui/scene3d/`, catalog-part models, launch/fly branches, app glue and simulation. Other agents prepare isolated input, HUD, prop assets, training targets and QA modules. Their standalone work does not require Ethan to stop, rebase or release his active source.

The first flight slice must move the player's visible craft and support target interactions. Camera orbit/zoom alone is not the requested experience. Local training progress is distinguished from authoritative mission science, score and saved stars. The existing mission design, budget and decision game remains playable.

## Why

The current game already renders 3D spacecraft and planets, but most player interaction is in tables and buttons. A large navigable scene, movement, inspectable targets and immediate feedback address Aiden's requested game experience. Independent modules let the six-person team contribute without concurrent edits to Ethan's renderer.

## Options we didn't pick

- Replacing Three.js with a new browser engine: the renderer and assets pipeline already have an owner and working implementation.
- Importing a complete second renderer or copying Ethan's `world.ts`: duplicates scene ownership and integration work.
- Treating a camera orbit, flat artwork or a model download alone as completed interactive gameplay.
- Replacing the current mission scoring with arcade movement: new scored maneuvers need explicit simulation and co-op rules first.
- Building the full hangar and flight mode simultaneously before a playable flight slice is accepted.

## What this changes (update CONTRACTS.md if needed)

- Product direction and proposed additive UI/content folders only; existing exports, `SpaceView` callers, commands and `SimState` do not change in this record.
- New work packages V1–V7 are unclaimed until their owner pushes the normal lock. Suggested owners do not transfer an active claim or override their human's constraints.
- Candidate input/HUD/target module APIs in the plan are not binding shared contracts. The owners publish their actual exports and agree the renderer seam before integration.
- `SpaceView` stays a pure view for existing callers. Any new scored movement commands, host-authoritative pilot state or changed module contract requires a further accepted record and an update by the CONTRACTS/shared owner. No such change is authorized by a draft interface alone.
