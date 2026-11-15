# Space Apps submission package

**Team:** Kimchi Trenchers (Aiden, Ethan, Jamie, Sarah, Caleb — kimchi on the team page — Kaipo)
**Event:** NASA International Space Apps Challenge 2026, Seattle, WA local event, Nov 14–15
**Challenge:** [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)
**Project:** First Flight
**Repo:** https://github.com/asigurdsDEV/space-apps-2026
**Live link:** https://nasaspacemission.vercel.app (mirror without the online-play relay: https://asigurdsdev.github.io/space-apps-2026/)
**License:** MIT

This page is the text to paste into the Space Apps project form. The project form takes a **30-second video** or a slide deck of **at most 7 slides**. Spoken words are the narration in `docs/PITCH.md`. Shot timing is in `docs/DEMO.md`. Those files stay with their owners. This page does not replace them.

## Paste into the form

| Field | What to paste |
|---|---|
| Project name | First Flight |
| Team | Kimchi Trenchers |
| Challenge | Space Mission Design Game |
| Project link | https://nasaspacemission.vercel.app |
| Repository | https://github.com/asigurdsDEV/space-apps-2026 |
| Description | The Project summary below |
| NASA data | The Form sentences in NASA resources used |
| Demo | A 30-second video, or the 7 slides below. Video URL: not recorded yet. Paste it here after the recording task fills `docs/DEMO.md`. Do not submit the old three-minute cut. |
| AI use | The AI-use note below |
| References | Every row in References below |

A person on the team still has to press Submit. This page cannot file the form.

**Project link check, 2026-11-15 02:05 (claude@aiden):** https://nasaspacemission.vercel.app is Aiden's Vercel project. It serves the same build as `main` and deploys every push, and `/api/ice` returns the Cloudflare TURN relay for online play across networks. The guided First Light was played first-person from the mission board to "Moon Mapper unlocked" with no page errors (`e2e/world.mjs`, on the dev build of the same code).

**Project link check, 2026-11-14 14:56:** https://asigurdsdev.github.io/space-apps-2026/ opens the game. The page title is Space Mission Design Game. The start screen shows First Light, Moon Mapper, and Red Planet Radar, plus Play solo, Host online, and Join a room. It is not a scaffold page. Sandbox is not on that screen. This check used a fresh browser tab, not a private window. The page is static, so a private window shows the same start screen.

## Project summary

Students can name a satellite's instruments without seeing why a real mission cannot carry all of them. Kimchi Trenchers built a game where a student designs a small space mission, flies it, and has to explain the result.

The player picks a launch vehicle, an orbit, a spacecraft bus, instruments, power, and a radio. The simulation connects those choices to mass, power, cost, data, and communications. A better instrument can still lose if it is too heavy for the rocket, too expensive, or makes more data than the radio can send home. The teaching line for the beginner mission, First Light, is: "Your radio is part of your science."

The game opens on a mission board: a guided campaign from Earth (First Light) to the Moon and Mars, plus free play, the daily mission and online rooms. A mission is played in first person. You walk mission control and fit parts at hologram stations, check the four GO/NO-GO consoles, and launch. Then you fly from inside the spacecraft, answer alarms at its panels, and come back to the debrief. It plays with keyboard and mouse, or with thumb pads on a phone. Classic view in the menu keeps the original 2D screens (Briefing, Build, GO/NO-GO, Fly, Results). Online play is for up to four people in roles (mission planning, spacecraft, science, communications/resources). One browser runs the simulation. The same mission can be played on one device.

**What is true now:** the live link is the game, not a scaffold page. A solo First Light run on 2026-11-14 went from Start to Results on desktop and on a phone. Host and Join are on the start screen. Earth, the Moon, and Mars use the public-domain maps in References. The four-device venue rehearsal is still open. Sandbox mode and part build-times (PR #105) are merged and live. Read the result text on screen when you record. Do not recite a score from an older check.

## NASA resources used

NASA CubeSat and small-spacecraft references informed the mission-design concepts. Part masses, prices, power, data rates, and science scores in the catalogs are team-authored educational approximations, not quotations from a NASA price list.

The game does ship one measured NASA dataset. Daily space weather from 1996 through 2026 is built from NASA SPDF OMNI2 hourly files and bundled in `data/space-weather/`. It drives play: each mission replays a real stretch of dates, and solar-storm anomalies hit on the days real strong storms (NOAA G3+) happened, naming the date. Play does not call a NASA API. Kp, Dst, F10.7, and sunspot numbers inside that file come from GFZ Potsdam, WDC Kyoto, NRCan, and SILSO, as credited in `data/space-weather/build.mjs`.

Real-mission rows in `data/real-missions.json` and the anomaly-card stories in `sim/cards.ts` each cite a page for the fact they tell. The game does not run the General Mission Analysis Tool and does not claim GMAT-validated trajectories.

**Form sentences:** "NASA CubeSat and small-spacecraft references informed the mission-design concepts. The prototype uses team-authored educational catalogs to make resource trade-offs playable. Space weather in the mission is measured NASA OMNI data, bundled with the game, and solar storms hit on the real days they happened. Earth, the Moon, and Mars are drawn from public-domain NASA and USGS maps, including LRO LOLA and MGS MOLA elevation. Real-mission matches and anomaly stories cite the pages in References."

## AI-use note

People on the team each ran an AI coding agent in this shared repo (Claude Code, Codex, and Cursor). Agents wrote code, tests, and docs. Humans picked the challenge, set the rules in `AGENTS.md`, and merge through pull requests. The log of which agent did which piece is `.agents/LOG.md`.

This submission page was drafted and corrected by cursor@caleb from documents and data already on `main`. No model was asked to invent NASA measurements. No NASA API key is used.

## Demo video and slides

Use one of these for the project form. Do not submit the old three-minute cut.

### Slides (7, the maximum)

1. Title: First Flight, Kimchi Trenchers, Seattle 2026, link to the repo and the live site.
2. Problem: naming instruments is not the same as fitting them on a mission.
3. Loop: design, poll, launch, fly, explain. One shared sim for up to four roles, plus local play.
4. One trade-off on screen: First Light starts with a basic camera and a radio that cannot return all of the data. Point at the warning. Do not quote a dollar or science figure the current build does not show.
5. NASA line: OMNI space weather is measured NASA data. Catalog numbers are team-authored approximations. Real missions and anomaly stories cite their pages. The game does not run GMAT.
6. AI use: agents drafted code under the team rules; humans merge.
7. Close: "Adding this instrument improves science, but we need to pay for its power, mass, and data."

### Video (30 seconds)

Record the live link. Say the narration in `docs/PITCH.md`. The table is only the picture order.

| Time | What to show | On-screen point |
|---|---|---|
| 0:00–0:05 | Open the live site and start First Light. | The start screen is the game. |
| 0:05–0:18 | The builder. Point at the downlink warning on the starting design. | The camera makes more data than the radio can send home. |
| 0:18–0:26 | Launch, then the results text. | The result says why. Science counts only after the data gets home. |
| 0:26–0:30 | The storm card on a real storm day (First Light, Normal, seed 1: G4, 7 Sep 2017), or a real-mission match. | That storm really happened. |

If online co-op has not passed its four-device rehearsal, do not spend the 30 seconds on a room. Do not promise that a dropped host reconnects.

## References

### Software

| Name | Page | Use |
|---|---|---|
| [three.js](https://threejs.org/) | MIT | 3D spacecraft, planets, launch, and cutscenes |
| [PeerJS](https://peerjs.com/) | MIT | WebRTC rooms for up to four players |
| [React](https://react.dev/) | MIT | User interface |
| [Vite](https://vite.dev/) | MIT | Build and GitHub Pages deploy |
| [Cloudflare TURN relay](https://nasaspacemission.vercel.app/api/ice) | team host on Vercel | Cross-network rooms. The GitHub Pages build still uses direct PeerJS. |

### Measured space weather

The series in `data/space-weather/` was built from NASA files. The index providers below are the ones named in that file's credit. Play reads the bundled file. It does not contact these sites.

| Source | Page |
|---|---|
| NASA GSFC Space Physics Data Facility, OMNI2 hourly files | https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/ |
| OMNIWeb | https://omniweb.gsfc.nasa.gov/ |
| Kp, GFZ Potsdam | https://kp.gfz.de/en/ |
| Dst, World Data Center for Geomagnetism, Kyoto | https://wdc.kugi.kyoto-u.ac.jp/dstdir/ |
| 10.7 cm solar flux, Natural Resources Canada | https://www.spaceweather.gc.ca/forecast-prevision/solar-solaire/solarflux/sx-en.php |
| Sunspot number, SILSO (Royal Observatory of Belgium) | https://www.sidc.be/SILSO/ |

### NASA and agency pages cited by the catalogs, missions, cards, and training route

| Page | Where the game cites it |
|---|---|
| https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf | Beginner CubeSat background. Also the current host for the CubeSat 101 PDF. |
| https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf | `source_url` on the bus, power, and comms catalogs |
| https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/cubesat-launch-initiative-resources/ | Pointer to primary CubeSat documents |
| https://www.nasa.gov/smallsat-institute/sst-soa/ | Background for subsystem categories |
| https://www.nasa.gov/smallsat-institute/ | Further reading |
| https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf | Launch, space, ground, and user segments. `source_url` on the launch-vehicle catalog |
| https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/ | Why a team trades mass, power, and data together. `source_url` on the instrument catalog |
| https://software.nasa.gov/software/GSC-19468-1 | GMAT, cited only. The game does not run it. `source_url` on the orbit catalog |
| https://nssdc.gsfc.nasa.gov/ | Master catalog home for the real-mission table |
| https://ntrs.nasa.gov/api/citations/20180005634/downloads/20180005634.pdf | IceCube |
| https://terra.nasa.gov/about | Terra |
| https://www.nesdis.noaa.gov/GOES-R-Spacecraft | GOES-16 |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1998-001A | Lunar Prospector |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2009-031A | Lunar Reconnaissance Orbiter |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2013-047A | LADEE |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2011-046A | GRAIL |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2022-070A | CAPSTONE |
| https://science.nasa.gov/mission/maven/ | MAVEN |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2005-029A | Mars Reconnaissance Orbiter |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2001-013A | 2001 Mars Odyssey |
| https://science.nasa.gov/mission/marco/ | MarCO |
| https://science.nasa.gov/mission/kepler/ | Anomaly card: reaction wheel, Kepler |
| https://science.nasa.gov/mission/galileo/ | Anomaly card: high-gain antenna, Galileo |
| https://repository.library.noaa.gov/view/noaa/53091 | Anomaly card: solar storm |
| https://science.nasa.gov/mission/mer-spirit/ | Anomaly card: memory errors, Spirit |
| https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/ | Anomaly card: dust storm, Opportunity |
| https://www.esa.int/Newsroom/Press_Releases/SOHO_spacecraft_located_with_ground-based_radar | Anomaly card: SOHO goes silent |
| https://www.nasa.gov/missions/icon/nasa-researchers-track-slowly-splitting-dent-in-earths-magnetic-field/ | Anomaly card: South Atlantic Anomaly |
| https://www.nasa.gov/directorates/somd/space-communications-navigation-program/what-is-the-deep-space-network/ | Anomaly card: ground-station time |
| https://www.earthdata.nasa.gov/data/instruments/modis | Flight-training fact, hurricane / MODIS |
| https://www.earthdata.nasa.gov/data/tools/firms | Flight-training fact, wildfire / FIRMS |
| https://www.nasa.gov/mission/tracking-and-data-relay-satellites/ | Flight-training fact, TDRS relay |
| https://www.nasa.gov/missions/tech-demonstration/deep-space-atomic-clock/how-an-atomic-clock-will-get-humans-to-mars-on-time/ | Story line: Earth–Mars light time |
| https://mars.nasa.gov/mgs/faqs/faq_mplan.html | Same light-time fact, Mars Global Surveyor FAQ |

### Planet maps

The pixels in the game are small copies of these public-domain maps, imported inside the 3D code. Credits and the file that was resized are in `ui/scene3d/maps/README.md`. Relief is drawn steeper than the real ground so craters and canyons read from orbit.

| Map | Page |
|---|---|
| Earth day, NASA Visible Earth, Blue Marble | https://visibleearth.nasa.gov/images/57752 |
| Earth day file that was resized | https://commons.wikimedia.org/wiki/File:Land_shallow_topo_2048.jpg |
| Earth night, NASA Earth Observatory, Black Marble 2012 | https://earthobservatory.nasa.gov/features/NightLights |
| Earth night file that was resized | https://commons.wikimedia.org/wiki/File:The_earth_at_night.jpg |
| Moon color, NASA SVS CGI Moon Kit, LRO LROC | https://svs.gsfc.nasa.gov/4720 |
| Moon elevation, same kit, LRO LOLA | https://svs.gsfc.nasa.gov/4720 |
| Mars color, USGS / NASA Viking MDIM 2.1 | https://astrogeology.usgs.gov/search/map/mars_viking_mdim21_clrmosaic_global_232m |
| Mars color file that was resized | https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg |
| Mars elevation, USGS / NASA MGS MOLA DEM | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m |

### Spacecraft shapes and rockets

Spacecraft parts and rockets are drawn in code. They are not downloaded meshes. The pages those shapes were checked against are listed in `ui/scene3d/parts/REFERENCES.md` and `ui/scene3d/launch/REFERENCES.md`, and again here so the form has every URL.

| Page | Used for |
|---|---|
| https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf | 3U rail size |
| https://www.jpl.nasa.gov/news/press_kits/insight/launch/appendix/mars-cube-one/ | MarCO bus, panels, radio, camera |
| https://www.jpl.nasa.gov/news/press_kits/graiLaunch.pdf | GRAIL bus |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2013-063A | MAVEN bus |
| https://www.jpl.nasa.gov/news/press_kits/mro-arrival.pdf | MRO bus, arrays, high-gain antenna |
| https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/ | Body-mounted cells and 18650 cells |
| https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2022-156J | LunaH-Map wings |
| https://www.nasa.gov/wp-content/uploads/2015/03/maven_presskit_final2.pdf | MAVEN arrays and magnetometer |
| https://science.nasa.gov/wp-content/uploads/2024/02/mmrtg-factsheet-updated-5-18-20-1.pdf | MMRTG |
| https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/spacecraft/power/ | Rover lithium-ion battery |
| https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/ | UHF tape antenna and S-band patch |
| https://ipnpr.jpl.nasa.gov/progress_report/42-211/211A.pdf | LRO Ka-band dish |
| https://www.jpl.nasa.gov/news/press_kits/odysseylaunch.pdf | Mars Odyssey dish |
| https://science.nasa.gov/mission/lro/science-and-data/ | CRaTER |
| https://pds.nasa.gov/data/pds4/test-data/registry/orex.otes/document/otes_inst_paper.pdf | OTES |
| https://www.earthdata.nasa.gov/data/instruments/atms | ATMS |
| https://science.nasa.gov/wp-content/uploads/2024/01/lola-fact-sheet.pdf | LOLA |
| https://science.nasa.gov/mission/landsat/oli/ | OLI |
| https://science.nasa.gov/mission/mars-reconnaissance-orbiter/science-instruments/ | SHARAD |
| https://www.earthdata.nasa.gov/data/instruments/abi | ABI |
| https://www.jpl.nasa.gov/news/press_kits/galex.pdf | GALEX |
| https://science.nasa.gov/mission/nisar/about-the-satellite/ | NISAR |
| https://www.spacex.com/vehicles/falcon-9/ | Falcon 9 shape |
| https://www.space.com/18962-spacex-falcon-9.html | Falcon 9 size cross-check |
| https://science.nasa.gov/mission/dart/ | Falcon 9 / DART |
| https://science.nasa.gov/mission/tess/ | TESS page. It does not name the rocket. |
| https://science.nasa.gov/mission/swot/ | SWOT page. It does not name the rocket. |
| https://science.nasa.gov/mission/pace/ | PACE page. It does not name the rocket. |
| https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/ | Rideshare / CSLI |
| https://www.spacex.com/vehicles/falcon-heavy/ | Falcon Heavy shape |
| https://science.nasa.gov/mission/psyche/ | Psyche |
| https://science.nasa.gov/blogs/psyche/2023/10 | Psyche launch blog |
| https://spaceflightnow.com/2023/10/13/falcon-heavy-launches-nasas-psyche-asteroid-probe/ | Falcon Heavy center core |
| https://rocketlabcorp.com/launch/electron/ | Electron |
| https://www.nasa.gov/press-release/capstone-launches-to-test-new-orbit-for-nasa-s-artemis-moon-missions | CAPSTONE launch |
| https://rocketlabcorp.com/updates/rocket-lab-prepares-to-launch-capstone-mission-to-the-moon-for-nasa/ | Electron height |
| https://science.nasa.gov/blogs/icon/2018/11/07/stargazer-aircraft-airborne-with-pegasus-xl-icon-satellite | Pegasus XL |
| https://www.ulalaunch.com/rockets/vulcan-centaur | Vulcan Centaur |
| https://www.nasaspaceflight.com/2024/01/vulcan-flight-one-preps/ | Vulcan height |
| https://science.nasa.gov/resource/atlas-v-401-rocket/ | Atlas V 401 |
| https://www.ulalaunch.com/rockets/atlas-v | Atlas V |
| https://www.ulalaunch.com/missions/2018/08/12/united-launch-alliance-successfully-launches-nasa-s-parker-solar-probe-spacecraft | Parker Solar Probe launch |
| https://science.nasa.gov/blogs/parker-solar-probe/2018/04/26/parker-solar-probes-launch-vehicle-rises-at-space-launch-complex-37 | Delta IV Heavy on the pad |
| https://www.ulalaunch.com/rockets/delta-iv | Delta IV |
| https://www.nasa.gov/reference/space-launch-system/ | SLS |
| https://www.nasa.gov/reference/space-launch-system-launch-vehicle-stage-adapter-lvsa | SLS stage adapter |
| https://www.nasa.gov/reference/space-launch-system-interim-cryogenic-propulsion-stage-icps/ | SLS ICPS |
| https://www.nasa.gov/sites/default/files/atoms/files/orionfacilities_factsheet_2018.pdf | Orion launch abort system |
| https://www.nasa.gov/humans-in-space/orion-spacecraft/orion-fact-sheets/ | Orion fact-sheet index |

### 3D model files

The three flight-training GLB files in `public/visual-assets/flight/` (`hurricane.glb`, `wildfire.glb`, `tdrs-relay.glb`) are original geometry made for this project. They are not NASA meshes. Credits are in `docs/visual-assets/flight.md`. [NASA's 3D resource collection](https://science.nasa.gov/3d-resources/) was considered and not shipped. Spacecraft parts and rockets in `ui/scene3d/` are drawn in code.
