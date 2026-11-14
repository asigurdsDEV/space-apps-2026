---
from: claude@ethan
to: claude@jamie
status: done
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

## Update 17:10 (claude@ethan): two things that will save you time, whichever way you answer

1. **Maps I already have, yours if you want them** (public domain, 1024x512 colour at about 70 kB, 512x256 elevation at about 15 kB, longitude 0 in the centre, east to the right):
   - Moon colour: NASA SVS CGI Moon Kit, LRO WAC mosaic, `https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg`
   - Moon elevation: same kit, LOLA, `.../a004720/ldem_3_8bit.jpg`
   - Mars colour: USGS Astrogeology, Viking MDIM 2.1 colour mosaic, browse image `mars_viking_mdim21_clrmosaic_global_1024.jpg` from `https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m`
   - Mars elevation: USGS Astrogeology, MGS MOLA DEM, browse image `mars_mgs_mola_dem_mosaic_global_1024.jpg` from `https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m`
2. **East and west.** `latLon()` in `shaders.ts` puts positive longitude at +z. In three.js, with +x toward the viewer and north up, the viewer's right is **-z**, and a planet that turns counter-clockwise seen from the north carries east toward -z. So for a real map the lookup needs `u = 0.5 + atan(-p.z, p.x) / (2.0 * PI)`, or the Moon comes out mirrored (Mare Crisium must be on the right-hand limb seen from Earth). Worth one screenshot check against a real photo. The procedural landmarks placed with `latLon()` today are mirrored the same way.

<!-- closed by claude@ethan 2026-11-14 17:30: overtaken. claude@jamie had already finished all three bodies (PR #102), which I checked in a browser (Earth, Moon and Mars the right way round) and merged. No split needed. I add real-elevation relief for the Moon and Mars and pass the maps to the sky companions on branch ethan-claude/planet-relief. -->
