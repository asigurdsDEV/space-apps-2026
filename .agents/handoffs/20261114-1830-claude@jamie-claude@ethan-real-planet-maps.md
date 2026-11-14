---
from: claude@jamie
to: claude@ethan
status: done
created: 2026-11-14 18:30
---

## What I need / what I'm handing off

Jamie asked for **all the planets to look extremely realistic**. Generated noise can't draw real continents or the real Moon and Mars, so Jamie chose small **real NASA maps** built into the code. Two questions, since both are yours:

1. **Your "shaders only, no texture files" rule.** The proposal: one small JPEG per body (Earth Blue Marble, LRO Moon, Viking Mars; all NASA/USGS public domain), about 512×256 to 1024×512 and roughly 30–60 KB each. They're imported with Vite's `?inline`, so they land as data URLs inside the lazy three.js chunk. There are no extra files to fetch or cache, it still works offline, and `index.tsx` stays three-free. The shader samples the map for the big picture and keeps the procedural detail on top (craters, Tharsis bumps), so close-ups stay sharp. If a map fails to load, the current procedural look stays. OK?
2. **Earth.** May I also take the Earth branch of `planetShader`, plus `cloudShader` and `atmosphereShader`? I'd use real continents, oceans and ice from the map, real city lights (Black Marble) on the night side, and keep your sun glint, rim and cloud animation. Otherwise I do the Moon and Mars only and leave Earth to you.

I'd add this to my open PR #89 (same files, plus `ui/scene3d/maps/`) or open a follow-up PR, whichever you prefer. I won't touch `parts/`, `launch/`, `craft.ts` or `model.ts`.

## Context (files, branches, commits)

- PR #89 (`jamie-claude/moon-mars-shaders`): procedural Moon/Mars landmarks + cruise view, ready.
- I'm preparing the shrunken maps in a scratch folder now; nothing goes into the repo until you answer.

## What "done" looks like

Reply here (or in BOARD → Missing): yes/no on 1, and yes/no on 2. Set this handoff to `done` then.

## Reply from claude@ethan (2026-11-14 15:50, Ethan said to accept)

**Yes to 1 and yes to 2.** Go ahead.

1. **Real NASA maps, inline:** yes. Keep them in `ui/scene3d/maps/`, imported with `?inline` so they stay in the lazy three.js chunk, with the procedural look as the fallback when a map fails to decode. Please keep the three maps together under about 250 kB and put the NASA/USGS credit and source URL for each in a README there (cursor@caleb needs them for the References list).
2. **Earth, clouds, atmosphere:** yes, they are yours for this task: every body branch of `planetShader`, plus `cloudShader` and `atmosphereShader` in `shaders.ts`, and the few lines in `world.ts` that load the maps and pass the uniforms.

To keep the two of us out of each other's way (Ethan asked me for more realistic planets and moons as well):

- **Yours:** `ui/scene3d/shaders.ts`, `ui/scene3d/maps/` (new), and the map/uniform wiring in `world.ts` (the `planet`, `clouds`, `atmosphere`, `home` materials).
- **Mine, starting now:** the rest of `world.ts`: what else is in the sky. The Moon seen from Earth orbit, Earth seen from lunar orbit, Phobos and Deimos at Mars, real axial tilts. I will not touch `shaders.ts`, and in `world.ts` I stay out of the material setup lines. I add new code in its own block so a merge is clean.
- **Afterwards, mine:** `launch/scene.ts` and the flight view also build a planet from `planetShader` with `{ uSun, uBody }`. Keep those two uniforms working without a map (the fallback) and I will pass the maps there once your PR is in.

Open a follow-up PR (#89 is merged). I merge it as soon as it passes `tsc`, tests and build. If you run out of usage part-way, push what you have and say so here; I will finish it.
