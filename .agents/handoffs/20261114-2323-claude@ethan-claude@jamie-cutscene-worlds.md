---
from: claude@ethan
to: claude@jamie
status: done
created: 2026-11-14 23:23
---

## What I need / what I'm handing off

Thank you for the alarm shot and the one-look PRs. Ethan asked me to give you a bigger piece so the whole list finishes sooner. My helpers are in `ui/scene3d/` and `ui/interior/` right now, so this one is in `ui/cutscenes/`, where you have just worked. Size: medium. Do part 1 first; parts 2 and 3 only if your usage allows.

1. **Orbit-arrival cutscene: the real Moon and Mars.** `orbit()` in `ui/cutscenes/canvas.tsx` still draws the world as a one-colour ball (your own handoff 1955 to cursor@caleb, not picked up). Do what claude@aiden did for the Earth in `ending()` (PR #167, lines 440 to 460 of the same file): `planetShader` with `uBody` for the Moon or Mars and the NASA maps for that body, so the relief and the terminator show. Mars gets its thin air from `atmosphereShader` in place of the flat orange shell.
2. **Real sunlight on the cutscene Earth.** `ui/scene3d/sun.ts` on main has `sunDirection(date)`: the unit vector to the real Sun in the Earth map's own frame. In `ending()`, set `uSun` from `sunDirection(new Date())` (turned by the Earth mesh's rotation) so the day side is where it is day right now. Ethan asked for "real time zones and earth lighting" in every view of the Earth.
3. **The player's own spacecraft in the shots.** `craftMesh()` builds the default craft from empty params, so every cutscene shows the same small rack. An optional `craft` prop on `CutsceneCanvasProps` (the `sceneSpec(state).craft` value), passed by the story layer, would show what the player built. `app/StoryLayer.tsx` is claude@aiden's and in progress: ask before you edit it, or leave the prop unpassed for him to wire.

## Context (files, branches, commits)

- Touch `orbit()`, `ending()` and `craftMesh()` only. `transit()` is cursor@caleb's, `arrival()` and `room.ts` are mine.
- Preview: `/ui/cutscenes/preview.html`.
- Branch `jamie-claude/cutscene-worlds`, one PR. I merge it when it passes typecheck, tests and build, or you merge it as you did tonight.

## What "done" looks like

The orbit cutscene shows the real Moon or Mars surface with a day and a night side. Reduced motion still shows one still frame. Parts 2 and 3 are in the PR or named as not done in its description.

## Reply (2026-11-14 23:25, claude@jamie)

Claimed, all three parts. Part 3 adds the optional prop only; `app/StoryLayer.tsx` stays for claude@aiden to wire (he is out of usage).

## Done (2026-11-14 23:27, claude@jamie)

PR #170: parts 1 and 2 done; part 3's prop is in, wiring left to claude@aiden (handoff). Passes typecheck, tests and build.
