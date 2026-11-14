# NASA references and data provenance

Checked against repository source on 2026-11-14. The game bundles measured NASA SPDF OMNI space-weather data, a sourced real-mission table and historical anomaly stories. The engineering catalogs remain team-authored educational approximations.

| Source | What it supports | How to describe its use |
|---|---|---|
| [NASA CubeSat 101](https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf) | Introductory mission-development concepts and process | Educational background for the design activity; catalog owner should identify any specific extracted quantity separately. |
| [NASA CubeSat Launch Initiative resources](https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/cubesat-launch-initiative-resources/) | Discovery page for CubeSat development, specifications and operations references | Link students to the primary documents; linked third-party specifications retain their own terms. |
| [NASA Small Spacecraft State-of-the-Art](https://www.nasa.gov/smallsat-institute/sst-soa/) | Small-spacecraft subsystem technology reference | Background for subsystem categories and trade-offs, not validation of invented part statistics. |
| [NASA Small Spacecraft Systems Virtual Institute](https://www.nasa.gov/smallsat-institute/) | Entry point for small-spacecraft resources | Further reading for students and educators. |

## Catalog provenance rules

The current data owner describes the catalogs as hand-tuned for gameplay and loosely based on NASA references. Treat part masses, prices, power, capacities and scores as **educational approximations** until a row-level source proves otherwise. Do not describe a hand-tuned catalog as downloaded NASA measurements or a real launch quote.

Each Dataset must carry the contract's `source`, `source_url`, `license`, `retrieved_utc` and `units`. For team-authored values, name the team as the value author and identify the NASA reference as conceptual background. A retrieval timestamp records when someone actually retrieved the source, not a publication date or a guess.

If a value is extracted later, record its document edition, page/table, original unit and conversion, plus any gameplay adjustment. Preserve the original citation. Mark synthetic values explicitly; keep SI units internally. Do not assume that every linked image, commercial table or third-party reference has NASA's reuse terms.

## Measured data: NASA SPDF OMNI

- Primary archive: [NASA SPDF low-resolution OMNI](https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/); [OMNI documentation and acknowledgements](https://omniweb.gsfc.nasa.gov/html/ow_data.html).
- Bundled file: `data/space-weather/space-weather.json`; rebuild: `data/space-weather/build.mjs`; date helpers: `data/space-weather/index.ts`. The snapshot contains 11,260 daily rows, 1996-01-01 through 2026-10-29; retrieval timestamp is recorded in its Dataset metadata.
- Transformation: hourly OMNI2 records become daily maximum Kp (scaled from Kp×10), minimum Dst, and daily F10.7 and sunspot values. The builder derives an approximate G-level from Kp and carries missing index values forward. These are team transformations, not an unmodified NASA daily product. See the builder and subfolder README for field positions, units and gap handling.
- Credit NASA/GSFC SPDF OMNIWeb and the contributing index providers: **GFZ Potsdam** (Kp), **WDC Kyoto** (Dst), **Natural Resources Canada** (F10.7), **SILSO** (sunspots). Follow the archive's acknowledgements and provider terms rather than treating every provider as NASA.
- Shipped use: `app/App.tsx` maps mission days to historical dates and lazy-loads the dataset for the operations weather strip. A scenario's `weather_start` overrides a seeded start date. The strip displays the date and real indices.
- Drives play (PR #99, merged): `app/App.tsx` `withCards` gives the sim `weather_start` (the same real date as the strip) and `real_storms`, the mission window's real G3+ storm days from `data/space-weather/storms.json` (194 days, 1996–2026). The geomagnetic-storm card fires on the first real storm day reached, its story names the date and NOAA level and cites SPDF OMNI, and the level scales the drag risk. Random draws never add a storm when the weather is real. Not modelled: everyday F10.7 drag.

## Real missions and historical anomaly stories

`data/real-missions.json` contains a sourced comparison table for the debrief. Each row has a mission, year, body, orbit class, mass, objective, fact and source URL. For example, [NASA's MarCO mission page](https://science.nasa.gov/mission/marco/) supports the deep-space CubeSat relay story. The matching algorithm is our educational comparison, not a NASA assessment or mission reconstruction. Row-level masses and descriptions remain subject to the team's accuracy audit.

`sim/cards.ts` carries each anomaly's historical story and `source_url`; `docs/game-design/ANOMALY_CARDS.md` explains the deck. Sources include NASA, JPL, NOAA and ESA. Historical incidents motivate the choices, while thresholds, probabilities and science penalties are simplified team-authored mechanics. Do not imply that every card is a measured NASA event replay.

## Submission wording

“GO / NO-GO uses historical NASA SPDF OMNI space-weather measurements, sourced real-mission comparisons and anomaly stories to connect spacecraft design choices to real exploration. Team-authored educational catalogs make mass, power, cost and communications trade-offs playable.”

For the present build, add when discussing causality: “Historical weather is displayed alongside the mission; simulated anomaly effects use a separate simplified model.” No runtime NASA API request or API key is required; the bundled dataset loads as a static application asset.

Software and asset credits belong in the submission's complete References list, including React, Vite, three.js, PeerJS and the original flight GLBs documented in `docs/visual-assets/flight.md`. This NASA-use note does not replace those credits.

## Additional references confirmed with the catalog owner

- [Design and Develop Science Missions, March 26, 2025](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf): NASA systems-engineering webinar; page 8 identifies launch, space, ground and user segments. Supports the game's mission-system framing.
- [Goddard Mission Design Lab](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/): collaborative mission concepts and subsystem trade studies, including mass, power and data-rate estimates. Supports role cooperation as an educational design choice.
- [General Mission Analysis Tool catalog entry](https://software.nasa.gov/software/GSC-19468-1): NASA's orbit/mission-analysis software reference. The game does not run GMAT or claim GMAT-validated trajectories.

Catalog owner confirmed these as conceptual references in PR #8; the values remain educational approximations. The owner supplied a legacy CubeSat 101 URL; the PDF link above is the verified NASA-hosted equivalent.
