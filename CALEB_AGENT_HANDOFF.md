# Caleb agent handoff — walkable Apollo 17 terrain

Cursor agent `cursor@kaipo` built a first-person walk on real SLDEM2015 elevation for Taurus-Littrow. The Moon walk was left as tuned once it looked right. Earth survey still uses NASADEM; only its hover height and vertical stretch were eased so deserts sit closer and look less mountainous. The orbital Moon globe and Mars are unchanged.

## How to try it

Local dev (already used here): `npx vite --port 5180 --strictPort`, then open:

http://localhost:5180/ui/terrain/preview.html

In a Moon mission: **Survey the planet** still shows the orbit view. **Walk Taurus-Littrow** (or Q) opens the ground. **Back to orbit** or Q returns to that orbit view. Earth Q still floats over NASADEM. Mars still has no walk.

Controls: W A S D, Shift run, click to mouse-look, arrows look. The eye stays 1.7 m above the DEM. Slopes steeper than 38° stop you. A fence keeps you on the mesh.

## Approach (what was reused)

- Earth survey (`ui/probe/`) floats above a NASADEM grid. The Moon walk does not reuse that mesh. After the Moon looked right, only the Earth hover (14 m to 8 m over the highest ground) and the vertical stretch (6×/3×/1.6× to 2×/1.8×/1.25×) were eased. Deserts were the 6× case.
- The Moon globe (`ui/scene3d/maps/moon-height.jpg`, `shaders.ts`) only tilts normals on a sphere from a 1024 px LOLA image. It is still the orbit view.
- Walking uses the existing first-person controller (`ui/fps/`). It was not modified. After each step the camera height is the sampled DEM plus the controller’s eye height and head bob.
- `ui/terrain/grid.ts` and `ui/terrain/mesh.ts` do not mention the Moon, so a Mars crop can call the same helpers later.

## NASA data

Elevation, primary: SLDEM2015 (LRO LOLA + Kaguya Terrain Camera), 512 pixels per degree, about 59 m at the equator, 60°S–60°N.

- Product page: https://pgda.gsfc.nasa.gov/products/54
- Tile that contains Apollo 17 (0–30°N, 0–45°E), 1.4 GB raw float32, **not downloaded in full and not in git**:
  https://imbrium.mit.edu/DATA/SLDEM2015/TILES/FLOAT_IMG/SLDEM2015_512_00N_30N_000_045_FLOAT.IMG
- Label (read and followed): `.../SLDEM2015_512_00N_30N_000_045_FLOAT.LBL`
  - 15360 lines × 23040 samples, 92160 bytes per line, little-endian IEEE float
  - values are kilometres relative to a 1737.4 km sphere
  - row 0 is north; latitude 30 and longitude 0 lie on the outer edges of the tile

Imagery: LROC WAC global mosaic from the USGS Moon WMS layer `LROC_WAC` (WMS 1.3.0, EPSG:4326 bbox order south,west,north,east), same bounds as the height crop, 768×768 JPEG.

https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map

LROC NAC is not included. The USGS layer list used here has no NAC mosaic for this box. NAC frames are separate high-resolution photos.

GDAL is not installed on this machine. The Python script range-requests 256 rows (about 24 MB) and does not need GDAL.

## Crop that was written

`python scripts/terrain/prepare_apollo17.py`

Outputs (committed-size, safe for git):

| File | What |
|---|---|
| `public/terrain/moon/apollo17/height.f32` | 256×256 float32 metres, row 0 north, 262144 bytes |
| `public/terrain/moon/apollo17/color.jpg` | LROC WAC, same bounds, about 32 KB |
| `public/terrain/moon/apollo17/meta.json` | bounds, stats, source URLs |

Bounds: south 19.941406°N to north 20.441406°N, west 30.521484°E to east 31.021484°E. About 15 km by 15 km. Site 20.19080°N, 30.77168°E is inside it.

Heights in this crop: about −2935 m to −677 m relative to the 1737.4 km sphere. The landing site samples near −2627 m. That is valley floor below the reference sphere, with the massifs higher. It is not a flat plane.

`pwa/public-files.ts` lists the three files so the offline cache test stays in sync.

## Code

| File | Role |
|---|---|
| `scripts/terrain/prepare_apollo17.py` | Range-read SLDEM, fill voids, write float32 metres and the WAC JPEG |
| `ui/terrain/grid.ts` | Metres on the Moon’s radius, local x east / z north, bilinear sample, walk fence, meta check |
| `ui/terrain/mesh.ts` | Indexed triangle mesh, real metre heights (no stretch), UVs, upward normals |
| `ui/terrain/LunarExplorer.tsx` | Three.js scene, FPS walk, eye on the surface, 38° climb limit |
| `ui/terrain/lunar.css` | Layout |
| `ui/terrain/preview.html` | Standalone page |
| `ui/terrain/grid.test.ts` | Asset exists, site is inside the box, valley elevation is negative and above the minimum |
| `ui/terrain/mesh.test.ts` | Normals point up and heights are copied in metres |
| `ui/terrain/README.md` | Short note |
| `app/Training.tsx` | Moon-only entry. Earth drop path unchanged |

Triangle winding was wrong on the first mesh (normals pointed down, so the surface was culled and the view was black). `mesh.ts` now winds the faces so normals point up. `mesh.test.ts` locks that in.

## Checked

- `npx vitest run ui/terrain/grid.test.ts ui/terrain/mesh.test.ts app/Training.test.tsx tests/offline-public.test.mjs` — passed (terrain tests re-run after the normal fix).
- Browser at the preview URL: the valley surface is visible, sunlit, and sloped. Holding W moved the readout from 20.191° to 20.190° and the elevation from −2627 m to −2628 m, so the eye is following the DEM.
- `npm install` was required first. `node_modules` had been incomplete (`tsc` / `vite` missing). Install reported an EPERM cleanup on a leftover rolldown file and still finished.

## Not done (priority if you continue)

1. Pushed to `main` because Kaipo asked. The Moon mesh and lighting were not retuned after that.
2. Walk from the in-game Moon mission (not only the preview) and confirm **Back to orbit** returns to the globe. The button is wired in `Training.tsx`; it was not clicked through a full Moon campaign in the browser.
3. LROC NAC detail for a smaller patch, if a mosaic or a single frame with known bounds is chosen. Do not download a global NAC set into the browser or into git.
4. Lunar hop / lower gravity. Walk speed is still the shared FPS controller (about 3.2 m/s). It was left alone on purpose.
5. Steeper massif faces only block above 38°. You do not slide. A true collision mesh would be a later pass.
6. The WAC photo is ~100 m/pixel and dark. The mesh is the 59 m DEM. Close up, the photo looks soft. A brighter grade or a higher-resolution WAC export would help; do not replace the DEM with noise.
7. Mars: new crop script, new `public/terrain/mars/<site>/`, and a branch in `Training.tsx` like the Moon button. Reuse `grid.ts` and `mesh.ts`.
8. `npm run build` was not run after `npm install`. Run it before a PR. The earlier failure was missing `tsc`, not this terrain.

## Files to open first

1. `ui/terrain/LunarExplorer.tsx` — scene, walk, lighting
2. `ui/terrain/mesh.ts` — the mesh and the normal winding
3. `public/terrain/moon/apollo17/meta.json` — bounds and sources
4. `scripts/terrain/prepare_apollo17.py` — how to rebuild the crop
5. `app/Training.tsx` — `onMoon` / `LunarExplorer` only; leave the Earth `drop` path alone
