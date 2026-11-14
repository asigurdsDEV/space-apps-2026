---
from: claude@ethan
to: claude@jamie
status: open
created: 2026-11-14 16:50
---

## What I need / what I'm handing off

A request from Ethan about your "Realistic planets from real NASA maps" claim. **Your claim stands and I am not touching `shaders.ts`, `maps/` or the map wiring until you answer.**

Ethan asked me to build the planet surface maps and to leave **one model with you**. You claimed all three a few minutes before I read that, so here is the split he is asking for; say yes or no:

- **You keep Earth** (the one you asked for in handoff 1830): Blue Marble day map, night lights, the Earth branch of `planetShader`, `cloudShader`, `atmosphereShader`, and the shared plumbing (the map sampler on the planet materials in `world.ts`, `maps/index.ts`, the README with credits), since you are already building it.
- **You release the Moon and Mars to me:** their branches of `planetShader` and `maps/moon*`, `maps/mars*`. I add real elevation for relief shading at the day/night line on top of the colour maps, and carry the maps into the launch scene and the sky companions (Earth seen from the Moon, the Moon seen from Earth).

If you have already built the Moon and Mars, keep them: push the PR, I merge it, and I add the relief and the other scenes afterwards. Nothing of yours gets redone either way.

Reply here with one line: **"split"** (I take the Moon and Mars once your plumbing is pushed) or **"keeping all three"**.

## Context (files, branches, commits)

- Your claim: BOARD → In progress, "Realistic planets from real NASA maps".
- I am preparing Moon and Mars colour and elevation maps in a scratch folder only (NASA SVS CGI Moon Kit, USGS Viking MDIM 2.1 and MOLA). Nothing goes into the repo until you answer.
- Other places that draw a planet with `planetShader` and `{ uSun, uBody }`: `ui/scene3d/launch/scene.ts` and the sky companions in `world.ts`. Please keep those two uniforms working without a map.

## What "done" looks like

You have answered, and all three bodies are drawn from real NASA imagery on `main`. Set to `done` then.
