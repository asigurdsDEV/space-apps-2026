# Space Apps submission package

**Team:** Kimchi Trenchers (Aiden, Ethan, Jamie, Sarah, Caleb — kimchi on the team page — Kaipo)
**Event:** NASA International Space Apps Challenge 2026, Seattle, WA local event, Nov 14–15
**Challenge:** [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)
**Project:** Space Mission Design Game
**Repo:** https://github.com/asigurdsDEV/space-apps-2026
**Live link:** https://asigurdsdev.github.io/space-apps-2026/
**License:** MIT

This page is the text to paste into the Space Apps project form. It follows `docs/PITCH.md`, `docs/DEMO.md`, and `docs/NASA_SOURCES.md`. Those files stay the source for the spoken pitch, the rehearsal gates, and catalog provenance. Do not describe a feature as playable on the live link until `docs/DEMO.md` says that rehearsal passed.

## Project summary

Students can name a satellite's instruments without seeing why a real mission cannot carry all of them. Kimchi Trenchers built a game where a student designs a small space mission, flies it, and has to explain the result.

The player picks a launch vehicle, an orbit, a spacecraft bus, instruments, power, and a radio. The simulation connects those choices to mass, power, cost, data, and communications. A better instrument can still lose if it is too heavy for the rocket, too expensive, or makes more data than the radio can send home. The teaching line for the beginner mission, First Light, is: "Your radio is part of your science."

The intended play path is Start, then Briefing, Build, Fly, and Results. Online play is for up to four people in roles (mission planning, spacecraft, science, communications/resources). One browser runs the simulation. If the venue network fails, the same mission can be played on one device.

**What is true at the time of this draft:** the catalogs, simulator, screens, and GitHub Pages deploy are in the repo, and the live URL returns the site. The page still shows the scaffold ("Scaffold is running") because the app loop that mounts Start through Results is not merged yet. Record the demo video after that loop is on the live link and the run sheet in `docs/DEMO.md` is filled in. Until then, show the local build (`npm ci`, `npm run dev`) or say the integrated play-through is in progress.

## NASA resources used

NASA CubeSat and small-spacecraft references informed the mission-design concepts. The prototype uses team-authored educational catalogs to make resource trade-offs playable. It does not download a measured NASA dataset, call a NASA API, or run the General Mission Analysis Tool.

| Resource | How we used it |
|---|---|
| [NASA CubeSat 101](https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf) | Background for a beginner CubeSat mission. Part numbers in the game are not quotations from this PDF. |
| [CubeSat Launch Initiative resources](https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/cubesat-launch-initiative-resources/) | Pointer for students to primary CubeSat documents. |
| [Small Spacecraft State-of-the-Art](https://www.nasa.gov/smallsat-institute/sst-soa/) | Background for subsystem categories (power, comms, bus), not validation of our part statistics. |
| [Small Spacecraft Systems Virtual Institute](https://www.nasa.gov/smallsat-institute/) | Further reading. |
| [Design and Develop Science Missions (2025 PDF)](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf) | Framing: launch, space, ground, and user segments. |
| [Goddard Mission Design Lab](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/) | Why a small team trades mass, power, and data together. |
| [General Mission Analysis Tool](https://software.nasa.gov/software/GSC-19468-1) | Cited as NASA's orbit tool. The game does not run GMAT and does not claim GMAT-validated trajectories. |

The challenge page also lists Concept Maturity Levels, NASA Mission Viz, the Webb "build it yourself" telescope game, a 2023 VR challenge, and CSA classroom games. We did not integrate those products. Catalog masses, prices, power, data rates, and science scores are hand-tuned for play and marked as educational approximations in `data/README.md` and `docs/NASA_SOURCES.md`.

**Form sentence (agreed wording from `docs/NASA_SOURCES.md`):** "NASA CubeSat and small-spacecraft references informed the mission-design concepts. The prototype uses team-authored educational catalogs to make resource trade-offs playable."

## AI-use note

People on the team each ran an AI coding agent in this shared repo (Claude Code, Codex, and Cursor). Agents wrote code, tests, and docs. Humans picked the challenge, set the rules in `AGENTS.md`, and merge through pull requests. The log of which agent did which piece is `.agents/LOG.md`.

This submission page was drafted by cursor@caleb from documents already on `main` (`docs/PITCH.md`, `docs/DEMO.md`, `docs/NASA_SOURCES.md`, `docs/CHALLENGE.md`, `data/README.md`, `data/scenarios/demo.json`). No model was asked to invent NASA measurements. No NASA API key is used.

## Demo video and slides plan

Coordinate the spoken words with `docs/PITCH.md` (60 seconds) and the clicks with `docs/DEMO.md` (three minutes). codex@jamie owns those files. This plan does not change them.

### Slides (backup if the live demo fails)

1. Title: Space Mission Design Game, Kimchi Trenchers, Seattle 2026, link to the repo.
2. Problem: naming instruments is not the same as fitting them on a mission (pitch, first two sentences).
3. Loop: design, fly, explain. One shared sim for up to four roles, plus local play.
4. One trade-off, labeled as a catalog example until the integrated sim confirms it: First Light starts on a 6U CubeSat with a basic camera and an S-band radio that cannot return enough data. A larger bus, a second instrument, more solar, and an X-band radio is the catalog owner's candidate win. Say the dollar and science figures only after `docs/DEMO.md` run sheet is filled.
5. NASA line: references informed the concepts; catalogs are team-authored approximations.
6. AI use: agents drafted code under the team rules; humans merge.
7. Close: "Adding this instrument improves science, but we need to pay for its power, mass, and data."

### Video (about three minutes)

Record only after the app loop is deployed and these `docs/DEMO.md` checks pass: Pages URL loads the real Start screen, an invalid design explains why it cannot launch, a valid design reaches Results, and the same seed repeats.

| Time | What to show | What to say |
|---|---|---|
| 0:00–0:20 | Open the mission | "We're making spacecraft trade-offs visible to students." |
| 0:20–0:50 | Baseline parts and the budget bars | Point at mass, power, cost, and data actually on screen. |
| 0:50–1:20 | One rehearsed change | Ask the room to predict it, then show the new bar and the explanation. |
| 1:20–1:45 | Repair the design | The point is the compromise, not maxing every bar. |
| 1:45–2:20 | Launch and advance | One event tied to the design. Use pause and speed. |
| 2:20–2:45 | Results | Why it succeeded or failed, from the text on screen. |
| 2:45–3:00 | Sources and roles | Educational approximations, not a flight design. |

If online co-op has not passed its rehearsal, show local play and call co-op in progress. Do not promise that a dropped host reconnects. Do not require a live NASA download in the video.

### Before anyone hits record

Copy the run sheet from `docs/DEMO.md` and fill the "pending" lines from a tested build: commit, URL, scenario, seed, baseline result, one failing change, and the repair. First Light in `data/scenarios/demo.json` is the beginner Earth mission (one year, $8M, science goal 30). Use that file's seed (1 on `main` as of this update; it is no longer 42). Treat the winning part list in `docs/DEMO.md` as the catalog owner's candidate until the sim owners confirm the score on that build.
