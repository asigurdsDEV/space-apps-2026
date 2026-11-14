---
from: claude@aiden
to: claude@ethan
status: open
created: 2026-11-14 11:50
---

## What I need / what I'm handing off

**From Aiden: please use your Fable to build the 3D models and the rest of the game's 3D. It's the heaviest part of the game, so it should run on your strongest setup.**

So **`ui/scene3d/` is now yours.** I'm releasing it and won't edit it again. It's on the board as "(heavy) [P1] 3D models + launch + 3D fly scene", owner claude@ethan. If your Fable session runs as its own agent, give it its own `## agent@ethan` section in your status file and tag the board line with it.

### What's already there (PR #22, branch `aiden-claude/scene3d`)

- `SpaceView.tsx`: `<SpaceView state mode="spacecraft" | "orbit" showCaption className />`, a pure view over `state.params` + `state.entities`. It handles the WebGL fallback text, reduced motion, touch scroll on phones, and only renders while on screen.
- `model.ts` (tested): picked parts → `SceneSpec` (bus size, power type, wing span, antenna, instrument shapes, body, altitude, inclination), plus the squashed orbit radius, captions and the screen-reader description.
- `craft.ts`: the spacecraft built from **primitives** (boxes, cylinders, a lathe dish, canvas cell and foil textures). This is the part most worth replacing with real models.
- `world.ts`: renderer, ACES tone mapping and bloom, starfield, Sun sprite, the planet group (Earth/Moon/Mars), orbit ring, craft placement (zenith up, wings to the Sun), shadow check, OrbitControls.
- `shaders.ts`: procedural planet, clouds and atmosphere. No texture files.
- Preview: `npm run dev`, then `/ui/scene3d/preview.html`, with part pickers and a mode toggle.

### Suggested scope (Aiden: "the 3D models and everything")

1. **Real 3D models for every catalog part** (data/ PR #8): 6 buses, 6 power systems, 5 comms systems, 10 instruments, and the launch vehicles. Build them in code or as small glTF files (`GLTFLoader` is in `three/addons`, so no new dependency). Credit any model you didn't make.
2. **Launch sequence** between Build and Fly: the picked launch vehicle on the pad, lift-off, staging, fairing separation, then reaching orbit.
3. **3D fly screen tied to the sim:** the craft's position from `state.t_s`, ground-station contact cones and a downlink beam during passes, eclipse, and visuals for claude@sarah's anomaly cards. She owns `ui/mission/` and mounts `SpaceView` there, so agree with her on the props.
4. **Moon and Mars scenes:** Earth in the sky from lunar orbit, and a transfer arc.
5. Optional: real NASA textures (Blue Marble), if the download size is OK.
6. **Phone performance:** keep 60 fps on a mid-range phone, and lower pixel ratio or turn off bloom if needed.

### Please keep

- **`SpaceView`'s props stable:** only add new ones. The builder (PR #10) mounts `<SpaceView state mode="spacecraft" className="mb-hero" />`, and Sarah's mission view will mount `mode="orbit"`.
- **Pure views:** the sim stays the only rulebook, and the 3D only shows what `SimState` says.
- **Dependencies:** `package.json` is still mine (scaffold, PR #4). Send me a handoff if you need a new one and I'll add it.

## Context (files, branches, commits)

- Decision 003 (`.agents/decisions/003-3d-graphics.md`), updated: `ui/scene3d/` owner is claude@ethan.
- You're the merge coordinator, so the simplest path is to merge #16 → #22 → #10 first, then build on `main` in your own branch (`ethan-<tool>/3d-...`). Or stack on `aiden-claude/scene3d`. Please don't push to my branches.
- Merge order with #22 is in docs/GAME_PLAN.md.

## What "done" looks like

The board task is claimed by your Fable agent. Every part has a recognizable 3D model, there's a launch sequence, and the fly screen shows the mission in 3D tied to sim time, running smoothly on a phone. Set this handoff to done once you've taken over `ui/scene3d/`.
