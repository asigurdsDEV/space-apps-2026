# ui/scene3d/maps/: real NASA surface maps

Owner: claude@jamie (agreed with claude@ethan, handoff 20261114-1830).

Four small global maps that make Earth, the Moon and Mars look like themselves. Each one is equirectangular (longitude −180° → 180° left to right, 0° in the middle, north at the top). They're imported with Vite's `?inline`, so they ship inside the lazy three.js chunk as data URLs: there are no extra files to fetch, and they work offline. They total 199 kB, under Ethan's 250 kB budget.

| file | size | what | source (all public domain) |
|---|---|---|---|
| `earth-day.jpg` | 1024×512, 86 kB | Earth's land, oceans and ice, cloud-free | NASA Visible Earth, *Blue Marble: Land Surface, Shallow Water, and Shaded Topography* (NASA GSFC, 2002). <https://visibleearth.nasa.gov/images/57752> · copy used: <https://commons.wikimedia.org/wiki/File:Land_shallow_topo_2048.jpg> |
| `earth-night.jpg` | 512×256, 13 kB | City lights on the night side | NASA Earth Observatory, *Earth at Night* (Black Marble 2012, Suomi NPP VIIRS). <https://earthobservatory.nasa.gov/features/NightLights> · copy used: <https://commons.wikimedia.org/wiki/File:The_earth_at_night.jpg> |
| `moon.jpg` | 768×384, 40 kB | The Moon's real maria, highlands and ray craters | NASA Scientific Visualization Studio, *CGI Moon Kit* (LRO LROC WAC color mosaic). <https://svs.gsfc.nasa.gov/4720> |
| `mars.jpg` | 768×384, 60 kB | Mars's real dark/bright regions, Hellas, polar caps | USGS Astrogeology / NASA, *Mars Viking MDIM 2.1 Colorized Global Mosaic*. <https://astrogeology.usgs.gov/search/map/mars_viking_mdim21_clrmosaic_global_232m> · copy used: <https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg> |

Credit line for the References list: *Planet maps: NASA Visible Earth (Blue Marble), NASA Earth Observatory (Black Marble), NASA SVS / LRO LROC (Moon), USGS Astrogeology / NASA Viking (Mars).*

## How they're used

`planetMaps()` in `index.ts` loads them into shared uniforms per body (`uMap`, `uHasMap`, `uNight`, `uHasNight`). `planetShader` reads the map for the big picture (continents, maria, Mars markings) and keeps the procedural detail on top (crater and volcano bumps, fine noise), so close-ups stay sharp.

**Fallback:** a material without these uniforms, or with a map that failed to decode, has `uHasMap` = 0 and draws today's procedural look. `launch/` and the flight view still work with just `{ uSun, uBody }`.

## Rebuild

From the larger copies above, with macOS `sips`: `sips -Z 1024 -s format jpeg -s formatOptions 60` (Earth day), `-Z 512 … 55` (night), `-Z 768 … 50` (Moon, Mars).
