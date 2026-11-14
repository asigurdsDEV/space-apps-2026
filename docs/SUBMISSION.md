# Space Apps submission package

**Team:** Kimchi Trenchers (Aiden, Ethan, Jamie, Sarah, Caleb — kimchi on the team page — Kaipo)
**Event:** NASA International Space Apps Challenge 2026, Seattle, WA local event, Nov 14–15
**Challenge:** [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)
**Project:** Space Mission Design Game
**Repo:** https://github.com/asigurdsDEV/space-apps-2026
**Live link:** https://asigurdsdev.github.io/space-apps-2026/
**License:** MIT

This page is the text to paste into the Space Apps project form. The project form takes a **30-second video** or a slide deck of **at most 7 slides**. `docs/PITCH.md`, `docs/DEMO.md`, and `docs/NASA_SOURCES.md` stay with their owners. codex@jamie is writing the spoken 30-second script (PR #86). Use that narration when it is on `main`. This page does not replace those files.

## Project summary

Students can name a satellite's instruments without seeing why a real mission cannot carry all of them. Kimchi Trenchers built a game where a student designs a small space mission, flies it, and has to explain the result.

The player picks a launch vehicle, an orbit, a spacecraft bus, instruments, power, and a radio. The simulation connects those choices to mass, power, cost, data, and communications. A better instrument can still lose if it is too heavy for the rocket, too expensive, or makes more data than the radio can send home. The teaching line for the beginner mission, First Light, is: "Your radio is part of your science."

The play path on the live site is Start, Briefing, Build, GO/NO-GO, launch, Fly, and Results. Online play is for up to four people in roles (mission planning, spacecraft, science, communications/resources). One browser runs the simulation. The same mission can be played on one device.

**What is true now:** the live link is the game, not a scaffold page. A solo First Light run on 2026-11-14 went from Start to Results on desktop and on a phone. Host and Join are on the start screen. The four-device venue rehearsal is still open. Read the result text on screen when you record. Do not recite a score from an older check.

## NASA resources used

NASA CubeSat and small-spacecraft references informed the mission-design concepts. Part masses, prices, power, data rates, and science scores in the catalogs are team-authored educational approximations, not quotations from a NASA price list.

The game does ship one measured NASA dataset. Daily space weather from 1996 through 2026 is built from NASA SPDF OMNI2 hourly files and bundled in `data/space-weather/`. It drives play: each mission replays a real stretch of dates, and solar-storm anomalies hit on the days real strong storms (NOAA G3+) happened, naming the date. Play does not call a NASA API. Kp, Dst, F10.7, and sunspot numbers inside that file come from GFZ Potsdam, WDC Kyoto, NRCan, and SILSO, as credited in `data/space-weather/build.mjs`.

Real-mission rows in `data/real-missions.json` and the anomaly-card stories in `sim/cards.ts` each cite a page for the fact they tell. The game does not run the General Mission Analysis Tool and does not claim GMAT-validated trajectories.

**Form sentences:** "NASA CubeSat and small-spacecraft references informed the mission-design concepts. The prototype uses team-authored educational catalogs to make resource trade-offs playable. Space weather in the mission is measured NASA OMNI data, bundled with the game, and solar storms hit on the real days they happened. Real-mission matches and anomaly stories cite the pages in References."

## AI-use note

People on the team each ran an AI coding agent in this shared repo (Claude Code, Codex, and Cursor). Agents wrote code, tests, and docs. Humans picked the challenge, set the rules in `AGENTS.md`, and merge through pull requests. The log of which agent did which piece is `.agents/LOG.md`.

This submission page was drafted and corrected by cursor@caleb from documents and data already on `main`. No model was asked to invent NASA measurements. No NASA API key is used.

## Demo video and slides

Use one of these for the project form. Do not submit the old three-minute cut.

### Slides (7, the maximum)

1. Title: Space Mission Design Game, Kimchi Trenchers, Seattle 2026, link to the repo and the live site.
2. Problem: naming instruments is not the same as fitting them on a mission.
3. Loop: design, poll, launch, fly, explain. One shared sim for up to four roles, plus local play.
4. One trade-off on screen: First Light starts with a basic camera and a radio that cannot return all of the data. Point at the warning. Do not quote a dollar or science figure the current build does not show.
5. NASA line: OMNI space weather is measured NASA data. Catalog numbers are team-authored approximations. Real missions and anomaly stories cite their pages. The game does not run GMAT.
6. AI use: agents drafted code under the team rules; humans merge.
7. Close: "Adding this instrument improves science, but we need to pay for its power, mass, and data."

### Video (30 seconds)

Record the live link. If `docs/PITCH.md` on `main` already has codex@jamie's 30-second narration, say that. Otherwise say the lines in this table.

| Time | What to show | What to say |
|---|---|---|
| 0:00–0:05 | Open the live site and start First Light. | "Students design a space mission and see the trade-off." |
| 0:05–0:18 | The builder. Point at the downlink warning on the starting design. | "This camera makes more data than the radio can send home." |
| 0:18–0:26 | Launch, then the results text. | "The result says why. Science counts only after the data gets home." |
| 0:26–0:30 | The storm card on a real storm day (First Light seed 1: G4, 7 Sep 2017), or a real-mission match. | "That storm really happened. Space weather is measured NASA data. The part catalog is ours." |

If online co-op has not passed its four-device rehearsal, do not spend the 30 seconds on a room. Do not promise that a dropped host reconnects.

## References

### Software

| Name | Page | Use |
|---|---|---|
| [three.js](https://threejs.org/) | MIT | 3D spacecraft, planets, launch, and cutscenes |
| [PeerJS](https://peerjs.com/) | MIT | WebRTC rooms for up to four players |
| [React](https://react.dev/) | MIT | User interface |
| [Vite](https://vite.dev/) | MIT | Build and GitHub Pages deploy |

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
| https://www.jpl.nasa.gov/news/mars-rover-spirit-restored-to-health/ | Anomaly card: memory errors, Spirit |
| https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/ | Anomaly card: dust storm, Opportunity |
| https://www.esa.int/Newsroom/Press_Releases/SOHO_spacecraft_located_with_ground-based_radar | Anomaly card: SOHO goes silent |
| https://www.nasa.gov/missions/icon/nasa-researchers-track-slowly-splitting-dent-in-earths-magnetic-field/ | Anomaly card: South Atlantic Anomaly |
| https://www.nasa.gov/directorates/somd/space-communications-navigation-program/what-is-the-deep-space-network/ | Anomaly card: ground-station time |
| https://www.earthdata.nasa.gov/data/instruments/modis | Flight-training fact, hurricane / MODIS |
| https://www.earthdata.nasa.gov/data/tools/firms | Flight-training fact, wildfire / FIRMS |
| https://www.nasa.gov/mission/tracking-and-data-relay-satellites/ | Flight-training fact, TDRS relay |
| https://www.nasa.gov/missions/tech-demonstration/deep-space-atomic-clock/how-an-atomic-clock-will-get-humans-to-mars-on-time/ | Story line: Earth–Mars light time |
| https://mars.nasa.gov/mgs/faqs/faq_mplan.html | Same light-time fact, Mars Global Surveyor FAQ |

### 3D model files

The three flight-training GLB files in `public/visual-assets/flight/` (`hurricane.glb`, `wildfire.glb`, `tdrs-relay.glb`) are original geometry made for this project. They are not NASA meshes. Credits are in `docs/visual-assets/flight.md`. [NASA's 3D resource collection](https://science.nasa.gov/3d-resources/) was considered and not shipped. Spacecraft parts and rockets in `ui/scene3d/` are drawn in code.
