# Walkable lunar terrain

A first-person patch of Taurus-Littrow, where Apollo 17 landed (20.191°N, 30.772°E). The Moon globe in `ui/scene3d/` is unchanged. Earth survey in `ui/probe/` is unchanged. Mars can reuse `grid.ts` and `mesh.ts` with another cropped DEM.

| Reading | What is stored |
|---|---|
| Elevation | SLDEM2015, 512 pixels per degree (~59 m at the equator), LRO LOLA merged with Kaguya Terrain Camera. Float32 metres relative to a 1737.4 km sphere. About 15 km by 15 km, 256×256 samples. |
| Picture | LROC Wide Angle Camera global mosaic, same bounds, from the USGS Moon WMS layer `LROC_WAC`. |

The full 1.4 GB tile is not downloaded and is not in git. Rebuild with:

```
python scripts/terrain/prepare_apollo17.py
```

Preview: `npm run dev`, then `/ui/terrain/preview.html`. From a Moon mission, **Survey the planet** keeps the orbit view and **Walk Taurus-Littrow** opens this patch. Q returns to orbit.

LROC Narrow Angle Camera frames are individual high-resolution photos, not a mosaic covering this box in the WMS we use, so they are not applied.
