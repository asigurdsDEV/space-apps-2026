# Real hardware behind the 3D part models

Every catalog row (`data/catalogs/`) is drawn as a named piece of NASA flight hardware. This file lists, per row,
the hardware, the numbers the model uses, and where they come from. The same table lives in code as
`REFERENCES` in `references.ts`; `parts.test.ts` checks that every catalog row is in both, with the same URL.

How to read the tables:

- **Sourced** numbers were read on the cited page on 2026-11-14. The code keeps them in `references.ts`.
- **est.** means the number was estimated from NASA drawings or photos, or recalled and not re-checked. It is not quoted from the cited page.
- **Game rule** means the number comes from the catalog row, not from the hardware (see "Scaling rules").
- Blanket colours (gold, silver, black) follow NASA illustrations of each spacecraft. They were not checked panel by panel.

Everything is built in code (three.js geometry and canvas textures). No model or texture files were downloaded.

## Scaling rules (game rules)

The catalog rows are hand-tuned for gameplay, so a row's mass or power rarely equals the real hardware's. The models
keep the real shape and scale it to the catalog number:

| Rule | Where | Check against real hardware |
|---|---|---|
| Box bus size = real bus size x cbrt(catalog dry mass / real dry mass) | `busSize` in `model.ts` | MAVEN: 809 kg real, 800 kg catalog, so 0.996 x |
| Wing area = real wing area x (catalog watts / real watts at Earth) | `wingShape` in `layout.ts` | MRO: 6,000 W real and catalog, so 1 x |
| Deck instrument footprint = 0.15 m x cbrt(mass in kg) | `instrumentSize` in `layout.ts` | ATMS 75 kg gives 0.63 m (est. real about 0.7 x 0.6 m); OTES 6.27 kg gives 0.28 m (real 0.375 x 0.289 m) |
| Telescope tube = 0.11 m x cbrt(mass in kg) | `index.ts` | 150 kg gives 0.58 m, around GALEX's 0.5 m mirror |
| MMRTG size x cbrt(catalog mass / 45 kg) | `buildRtg` in `power.ts` | catalog is 45 kg, so 1 x |
| A wing taller than its bus, a dish wider than 2 bus lengths, SHARAD longer than 3 and NISAR wider than 2.6 are drawn smaller | `layout.ts`, `comms.ts`, `index.ts` | marked `shortcut:` in the code |

Small radios (UHF board, S-band patch, MarCO reflectarray) and the 18650 battery pack are drawn at their real size on every bus.

## Buses

| Catalog id | Real hardware | Numbers and features used | Source |
|---|---|---|---|
| `cubesat-3u` | 3U CubeSat structure, CubeSat Design Specification rev. 14.1 | 100 x 100 x 340.5 mm; four rails 8.5 mm wide standing 6.5 mm past each end; deployment switches and separation springs on the rail feet; side panels with access port and connector; one frame rib per unit. No thruster (catalog delta-v is 0). Sizes est. (recalled from the specification, the PDF text was not re-read). | https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf |
| `cubesat-6u` | MarCO 6U CubeSat bus (Mars Cube One) | Standard 6U 100 x 226.3 x 366 mm (est., specification); MarCO's stowed size is 36.6 x 24.3 x 11.8 cm (sourced). Two white radiators and a star tracker baffle on the cold face (sourced: "two radiators", "star tracker"; placement est.). MarCO's eight cold-gas thrusters are not drawn because the catalog row has delta-v 0. | https://www.jpl.nasa.gov/news/press_kits/insight/launch/appendix/mars-cube-one/ |
| `cubesat-12u` | CAPSTONE 12U CubeSat bus | Standard 12U 226.3 x 226.3 x 366 mm (est., specification; CAPSTONE itself is listed as 34 x 34 x 61 cm). Eight hydrazine thrusters, two in each of four open ports (sourced). | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2022-070A |
| `smallsat` | GRAIL orbiter bus (Ebb and Flow) | 1.09 m high, 0.95 m wide, 0.76 m deep, 201 kg dry (sourced), scaled to the catalog's 120 kg (0.84 x). One main engine inside the separation ring, eight small attitude thrusters in four pods, a star tracker, two low-gain antennas, mirror-tile radiators (counts and placement est.). | https://www.jpl.nasa.gov/news/press_kits/graiLaunch.pdf |
| `medium-bus` | MAVEN orbiter bus | Cube 2.3 x 2.3 m and 2 m high, 809 kg dry (sourced). Six main engines in a ring on the aft face, thruster pods on the edges, two star trackers, sun sensors, two low-gain antennas (est.). | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2013-063A |
| `flagship-bus` | Mars Reconnaissance Orbiter bus | 6.5 m tall with its 3 m dish, 1,031 kg dry (est., recalled from the press kit); body box 2.5 x 3.2 x 2.5 m (est. from that), scaled to the catalog's 3,000 kg (1.43 x). Six 170 N orbit-insertion engines, six 22 N trim engines, eight small thrusters, two star trackers, louvered radiators, gold blankets (engine counts est., recalled). | https://www.jpl.nasa.gov/news/press_kits/mro-arrival.pdf |

Main engines sit on the lower anti-Sun face on every box bus, as on MAVEN (engines opposite the Sun-pointing antenna), so the nadir deck stays free for instruments.

## Power

| Catalog id | Real hardware | Numbers and features used | Source |
|---|---|---|---|
| `solar-body-panels` | Body-mounted triple-junction cells on CubeSat faces | One cell panel per 10 cm unit between the rails, on four sides; "CubeSats ... typically use fixed body-mounted solar cells", cell efficiency about 30% (sourced). Cell layout per panel est. | https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/ |
| `solar-deployable-small` | MarCO deployable solar panels | Two panels of 30 x 30 cm, 35 W near Earth (sourced); scaled to 30 W. Each folds in three on spring hinges (est. from JPL images). | https://www.jpl.nasa.gov/news/press_kits/insight/launch/appendix/mars-cube-one/ |
| `solar-deployable-large` | LunaH-Map gimballed solar wings | 90 W on two wings (sourced); scaled to 80 W. Three 20 x 30 cm panels per wing on a drive (est. from NASA images). | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2022-156J |
| `solar-array-medium` | MAVEN gull-wing solar arrays | Four panels in two gull wings, 12 m2, 11.43 m tip to tip (sourced, with the NASA mission page). Outer panels bent back 20 degrees (est., recalled). 12 m2 is taken as 3,600 W at Earth using MRO's 300 W per m2; scaled to the catalog's 1,000 W. Yoke and drive at the root, hinges, hold-down points. | https://www.nasa.gov/wp-content/uploads/2015/03/maven_presskit_final2.pdf |
| `solar-array-large` | MRO solar arrays | Each wing 5.35 x 2.53 m; 20 m2 and about 6,000 W at Earth for the pair (sourced): same as the catalog. Two panels per wing (est.), yoke and drive, hinges, hold-down points, harness. | https://www.jpl.nasa.gov/news/press_kits/mro-arrival.pdf |
| `rtg` | Multi-Mission Radioisotope Thermoelectric Generator (MMRTG) | 64 cm across the fin tips, 66 cm long, 45 kg, about 110 W at launch (sourced): same as the catalog. Eight fins, cooling tubes on the fins (est., seen on flight units); core diameter 26 cm est. Boom length is a game rule. | https://science.nasa.gov/wp-content/uploads/2024/02/mmrtg-factsheet-updated-5-18-20-1.pdf |
| `battery-small` | Four-cell 18650 lithium-ion CubeSat pack | 18650 cells are 18 x 65 mm (sourced); about 10 Wh each (from the table's 3,350 mAh cell), so four cells for 40 Wh. Drawn real size on a 9 cm board. | https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/ |
| `battery-medium` | One eight-cell 43 Ah lithium-ion rover battery | Perseverance and Curiosity carry two lithium-ion batteries of about 43 amp-hours each, 26.5 kg the pair (sourced). Eight cells in series at about 28 V is about 1.2 kWh (est.): the catalog's 1,200 Wh. Cells between end plates with tie rods and bus bars (est.). Box size follows the catalog mass (game rule). | https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/spacecraft/power/ |
| `battery-large` | Bank of the same eight-cell batteries | 6,000 Wh / 1.2 kWh = five modules side by side. Box size follows the catalog mass (game rule). | https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/spacecraft/power/ |

## Radios and antennas

| Catalog id | Real hardware | Numbers and features used | Source |
|---|---|---|---|
| `uhf-radio` | CubeSat UHF deployable tape antenna | Tape antenna board 10 x 10 x 0.7 cm (sourced, ISISPACE row of table 9-2); four tapes of 17 cm, a quarter wave at 437 MHz (physics), sprung out of corner housings. | https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/ |
| `s-band-patch` | S-band patch antenna | Single patch 7 x 7 cm (sourced, table 9-2); copper patch with cut corners on a ceramic tile, coax connector. | https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/ |
| `x-band-transmitter` | MarCO Iris radio and flat X-band reflectarray | Flat-panel X-band high-gain antenna and "softball-size" Iris radio (sourced); Iris is 10.1 x 10.1 x 5.6 cm (sourced, state of the art report table 9-3). Panel 59.7 x 33.5 cm in three leaves, leaning back, lit by a small patch feed on a fold-out arm (est., recalled from JPL papers and images). | https://www.jpl.nasa.gov/news/press_kits/insight/launch/appendix/mars-cube-one/ |
| `high-gain-dish` | LRO Ka-band high-gain antenna | Dish 75 cm across, 40 W Ka-band transmitter, on two gimbals (sourced). Subreflector, ribs and mast est. | https://ipnpr.jpl.nasa.gov/progress_report/42-211/211A.pdf |
| `deep-space-transponder` | Mars Odyssey high-gain antenna | Dish 1.3 m across; medium-gain horn 7.1 cm wide poking through the dish; small deep space transponders; amplifiers on the back of the dish (sourced, with NASA's PDS and NSSDCA pages). Low-gain antenna on top est. | https://www.jpl.nasa.gov/news/press_kits/odysseylaunch.pdf |
| `mars-hga` | MRO high-gain antenna | Dish 3 m across, 100 W X-band travelling-wave tube amplifier (sourced). Amplifiers on the back of the dish, gold blanket, two-axis gimbal, subreflector on three struts (est.). | https://www.jpl.nasa.gov/news/press_kits/mro-arrival.pdf |

## Instruments

| Catalog id | Real hardware | Numbers and features used | Source |
|---|---|---|---|
| `camera-basic` | MarCO wide-field colour camera | A colour camera on a CubeSat with a 138 degree field of view (sourced). Board camera, lens barrel and baffle shape est. | https://www.jpl.nasa.gov/news/press_kits/insight/launch/appendix/mars-cube-one/ |
| `magnetometer` | MAVEN fluxgate magnetometer (MAG) | Two fluxgate sensors kept away from the spacecraft (on MAVEN, at the wing tips). Here they ride a hinged boom; boom length 1.6 x the bus is a game rule; sensors a few cm across (est.). | https://www.nasa.gov/wp-content/uploads/2015/03/maven_presskit_final2.pdf |
| `radiation-detector` | Cosmic Ray Telescope for the Effects of Radiation (CRaTER), LRO | A telescope that measures cosmic rays behind tissue-equivalent plastic (sourced); six silicon detectors in three pairs, one end to the sky and one to the ground (sourced, NASA LRO overview paper); electronics box beside it (est.). | https://science.nasa.gov/mission/lro/science-and-data/ |
| `ir-spectrometer` | OSIRIS-REx Thermal Emission Spectrometer (OTES) | 37.5 x 28.9 x 52.2 cm, 6.27 kg, 15.2 cm Cassegrain telescope (sourced). Secondary mirror on a spider, sunshade, radiator plate est. | https://pds.nasa.gov/data/pds4/test-data/registry/orex.otes/document/otes_inst_paper.pdf |
| `microwave-sounder` | Advanced Technology Microwave Sounder (ATMS) | 22 channels, cross-track scanning with two receiving antennas, one for the channels below 60 GHz and one for those above; 75 kg (sourced via NASA's JPSS pages). Two tilted reflectors on one shaft in shrouds; box 70 x 60 x 40 cm est. | https://www.earthdata.nasa.gov/data/instruments/atms |
| `laser-altimeter` | Lunar Orbiter Laser Altimeter (LOLA), LRO | One laser split into five beams, 28 pulses per second, receiver telescope 14 cm across, 9.6 kg (sourced, with NASA's LOLA optics paper). Infrared laser, so no visible glow. Layout of beam expander, five fibre-fed detectors and radiator est. | https://science.nasa.gov/wp-content/uploads/2024/01/lola-fact-sheet.pdf |
| `multispectral-imager` | Operational Land Imager (OLI), Landsat 8 | Push-broom imager with a four-mirror telescope, nine bands, more than 7,000 detectors per band across a 185 km swath (sourced). Slot-shaped Earth-view baffle, solar-calibration port with door, detector radiator: shapes est. | https://science.nasa.gov/mission/landsat/oli/ |
| `subsurface-radar` | Shallow Radar (SHARAD), MRO | 10 m antenna made of two 5 m foldable tubes, 15 to 25 MHz (sourced). Fold joints est. Catalog mass 15 kg is taken as SHARAD's (est.). | https://science.nasa.gov/mission/mars-reconnaissance-orbiter/science-instruments/ |
| `weather-imager` | Advanced Baseline Imager (ABI), GOES-R series | 16 spectral bands (sourced). Scan mirror under a sunshield, white radiator: shapes est. | https://www.earthdata.nasa.gov/data/instruments/abi |
| `uv-telescope` | GALEX ultraviolet telescope | 50 cm modified Ritchey-Chretien telescope; the whole satellite is 1 m wide and 2.5 m high (sourced). Tube 58 cm across and 1.5 m long, aperture door, secondary on a spider est. | https://www.jpl.nasa.gov/news/press_kits/galex.pdf |
| `synthetic-aperture-radar` | NISAR radar reflector and boom | 12 m gold-plated wire mesh reflector shaped like a snare drum, on a 9 m boom with four hinges, lit by a feed on the instrument structure (sourced). Ring truss with 24 bays, feed 2 m long est. | https://science.nasa.gov/mission/nisar/about-the-satellite/ |
