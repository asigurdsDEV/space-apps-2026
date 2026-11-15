# Surface probe

A walkable patch of Earth for an Earth mission. The crew is set down by a probe and can return to orbit. It does not send sim commands or change the score.

| Reading | Source |
|---|---|
| Elevation grid | [NASADEM](https://www.earthdata.nasa.gov/data/catalog/lpcloud-nasadem-hgt-001) (NASA MEaSUREs, Shuttle Radar Topography Mission reprocessed to about 30 m). The browser reads the tile from OpenTopography's public mirror because Earthdata Cloud does not send CORS headers. |
| Air temperature and ground-skin temperature | [NASA POWER](https://power.larc.nasa.gov/) daily API, parameters `T2M` and `TS`, from MERRA-2. No API key. |
| Ground picture | [NASA GIBS](https://gibs.earthdata.nasa.gov/) MODIS Terra corrected reflectance (true color) for the same patch and day. |

One land patch: the Grand Canyon, which NASA’s Shuttle radar measured. The flight-training hurricane and wildfire marks are not NASA detections, so they are not used here. Walking stops at `WALK_RADIUS_M` from the drop, and the crew follows the NASADEM height inside that circle. A line runs from the crew up to a stand-in of the spacecraft.

Preview: `npm run dev`, then open `/ui/probe/preview.html`. `?day=1` picks the next site.

Mounted from the flight screen (classic and 3D) as **Walk the surface** on Earth scenarios only.
