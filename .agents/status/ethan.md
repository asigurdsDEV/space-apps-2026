# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/app-loop
**Last updated:** 2026-11-15 04:59

## claude@ethan

**Branch:** ethan-claude/integration (base: every open code PR merged together, pushed); work branches ethan-claude/sim-data, ethan-claude/app-loop; PRs #2, #5, #7 open

### Working on right now
Nothing claimed. The full browser regression passed on `main` at 0f64dee (solo 15/15, world 1/1, co-op 24/24; `docs/qa/browser-regression.md`, third run). Pad towers (claude@jamie, PR #182) and the launch-to-room cut (claude@aiden, PR #180) are done and on `main`. I still merge every PR that passes `tsc`, tests and build.

Open under my name: the launch cutscene is about 20 s (decision 005 says 10 s at most). Waiting on cursor@kaipo: redeploy `main` to Vercel (handoff 20261115-0450).

Released to Open (ask me first, the folder is mine): fly scene tied to sim time (unfinished on `ethan-claude/scene3d-fly`).

### Files / folders I'm touching (hands off)
- `ui/scene3d/` (whole folder, taken over from claude@aiden); right now `ui/scene3d/flight/` (new) is being built; `shaders.ts`, `maps/`, `world.ts` (planet relief)
- `ui/share/` (PR #18), `e2e/` (new). `ui/spacecraft/` is released (superseded by decision 003).
- `app/` (whole folder), including `app/main.tsx` on my branch (it is stacked on the scaffold, PR #4)
- `sim/` (PR #7). Want a rule or number changed? Send me a handoff.
- `shared/` (PR #5) and `.agents/CONTRACTS.md` + `.agents/decisions/001-module-contracts.md` (PR #2)
- Plus my usual shared-file edits: this section, my BOARD.md lines, append-only LOG.md lines, my own handoffs

### Just finished
- **Pass 4, second half** (PRs #197, #198, #199, on `main`; each reviewed once on Opus):
  - Climb (`ui/scene3d/launch/fx.ts`, `scene.ts`): the ground is built in kilometres (beach, shelf water, lagoons, marsh, crawlerway), with cloud fields and a haze band at max-Q; pad close-ups and space shots unchanged. Known: far buildings still read as white boxes from the air; booster separation still uses the orbit view.
  - Spacecraft room (`ui/interior/`): flat rack ceiling, stand-off corners with strip lights, deck seat tracks, a hatchway opposite the window with a painted view of the next module. Known: the section is 8 m by 3.4 m, not square.
  - Sound (`ui/audio/`): `radio-in`, `radio-out`, `join`, `alarm` one-shots; the alarm plays once per alarm with the anomaly cutscene. Menu settings in `app/WorldMenu.tsx`: Fullscreen, Volume (`getVolume`/`setVolume` in `ui/audio/audio.ts`), Mouse sensitivity (`mouseSensitivity`/`setMouseSensitivity` in `ui/fps/controller.ts`). One `playSound` line was added in `app/StoryLayer.tsx` and a few `ui/` folders. Known: no GO chime per console in the 3D hall; the results menu opens with a click on its own.
- **Live Earth screen** (PR #196, on `main`; data layer, screen, two reviews): new folder `ui/live/` (read `ui/live/README.md` for every feed, its terms, cache rule and accuracy limit). Entry: "Live Earth" in the Mission menu (`app/WorldMenu.tsx`) and beside "Survey the planet" in Classic (`app/App.tsx`). New dependency `satellite.js` (MIT), lazy. Run `npm install` after pulling. Known: the feeds are not yet listed in `docs/NASA_SOURCES.md`; the online (crew) path was not run; the picture is 2048 px wide; no refetch while the screen stays open.
- **Pass 4, first half** (PRs #192 to #195, on `main`; each built on Fable and reviewed once on Opus):
  - `ui/scene3d/`: aurora ovals during a G3+ storm (`SpaceView` now also reads `state.metrics`), a thin sunset band, 300 real bright stars with a test, a faint Milky Way. Known: the storm card covers the Earth while the aurora is on, so players may rarely see it; showing G1 and G2 needs `ui/mission/MissionView.tsx` (claude@sarah's).
  - `sim/cards.ts`: card `debris-pass`, Earth orbit and buses with a thruster only, so starting designs draw the same cards as before. Known: option A (dodge, 1 day) is almost always right; one non-default seed changed outcome.
  - `app/World.tsx`: on the first alarm the launch stays up until the alarm cutscene starts. Known: co-op guests not run in a browser.
  - `ui/crew/`: new astronaut, same exports and rig, 7 draw calls and about 26,000 triangles each. Known: no shoulder flag; a ragged edge at the shoulder up close; very bright on the survey ground (`ui/probe/ProbeExplorer.tsx` has no tone mapping).
- **Realism pass 3** (PRs #189, #190, #191, on `main`; each built, then reviewed twice by separate helpers):
  - Lift-off (`ui/scene3d/launch/fx.ts`, `scene.ts`): a white-hot flame column per propellant, dense lit exhaust and steam billows, hazy horizon and a calm inlet. Space shots match the earlier build to within 1/255. Known: the flame is whiter and narrower than Ethan's photo; clouds are smooth, not cauliflower-grained; no fire visible in the trench at ignition (needs pad geometry in `site.ts`).
  - Spacecraft room (`ui/interior/`): arched ceiling with ring frames, stand-off corners, racks with relief, a console on two pedestals; cursor@kaipo's hatch is a round gold lid at the same place; alarm lights hold steady under reduced motion. Known: 213,000 triangles from the door (95,000 before), measured on one Mac only.
  - Sound (`ui/audio/places.ts`, `engine.ts`, `ambience.ts`; one hook each in `LaunchView.tsx`, `MissionControl.tsx`, `SpacecraftRoom.tsx`): synthesised launch roar per propellant and size, near silence in space, room beds, a short caution tone. Obeys the mute toggle. Ethan listened to rendered clips and approved. Known: checked in Chrome only; the old `playSound('launch')` call in `app/World.tsx` is removed.
- **Upright Earth** (PR #188, on `main`): the Sun direction is now per scene in `ui/scene3d/world.ts`; in Earth scenes it sits at the real declination, so the pole is straight up (measured 0.00 degrees lean on three dates) and the lit side is still true. Moon and Mars views are byte-identical. Known: about 56% of the disc is lit in November; the Moon is above the default frame from late September to late March; the cruise-view Earth still leans.
- **Earth on the real clock** (PR #179, on `main`): `SPIN_S.earth` in `ui/scene3d/world.ts` is one real day, so the lit side of the Earth in `SpaceView` stays true after the view opens. Moon and Mars keep their time-lapse.
- **Realism pass 2** (PRs #176, #177, #178, on `main`, Ethan's seven screenshots; each piece built and then reviewed by a separate helper in a browser):
  - Launch (`ui/scene3d/launch/`, three rules in `app/app.css`): the Classic view fills the window under the top bar; the space shots have one Earth sphere with coastline, shallows, cloud cells and a soft limb; fairing halves hinge open and fall behind; spacecraft and stage coast apart at deploy; plumes rebuilt, vacuum plume is a wide faint fan; payload stack rebuilt (`payload.ts`: forward dome, attach fitting, rideshare dispenser with 20 satellites, fairing walls with blankets, upper-stage engine with powerhead).
  - Spacecraft room (`ui/interior/`): equipment mounts, console, ceiling fixture, lighting, bigger Earth window (`WINDOW` is now 5.6 x 1.8 at y 2). cursor@kaipo's gold floor hatch (`HATCH`, `onProbe`) is kept as it was.
  - Earth (`ui/scene3d/sun.ts`, `world.ts`): `SpaceView` opens with the side that really has daylight lit, with the axis tilt for the date; new optional `date` prop; `earthOrientation` is tested.
  - Merged with PRs #171 to #175; `main` passes 627 tests, build, first load 72.5 kB; the 3D walk at 1290 x 690 runs to the spacecraft room with no errors.
  - Known gaps: the player's craft rides with its wings deployed (no stowed mode in `craft.ts`); Earth is soft close to the cabin window (1024 px maps); about one dark second between launch and spacecraft room (`app/World.tsx`); the vacuum plume is a shell, not a volume; plume confetti from Ethan's screenshot never reproduced in headless Chrome, so that fix is unconfirmed.
- **Fewer stars, calmer Moon** (PR #163, on `main`, claude@jamie's handoff 1955): 2200 stars; the mapped Moon is the LRO photo with a trace of small craters and a bright limb on the sunlit side. Relief constant left at the softer look. The Pages deploy is green again (a 50-mission sim test now has a 20 s limit).
- **Realistic redesign** (PRs #159 to #162, on `main`): hologram stations with part menus and the craft floating dead centre in the hall (`ui/hangar/`, card ids still `rack:<slot>:<part>`, `STAND` is now the room centre, `RACK_NAMES` became `STATION_NAMES`), walking head motion (`ui/fps/controller.ts`), operations-room cutscene set (`ui/cutscenes/room.ts`, `screens.ts`), coastal launch site with water, birds and a flag (`ui/scene3d/launch/`), start-menu look for every panel (`ui/theme/theme.css`). Merged PR #156 (guided campaign) with them; `main` passes 605 tests. Known gaps: no touch walking in the hall (never mounted, as before), phone overlays crowd the hologram menus, two cutscenes (into spacecraft, back to control) still show the old hall.
- **Realism pass** (PRs #151, #154, #155, on `main`): station-module interior, smooth planet spin, realistic satellite exteriors (orbit view 141 → 88 draw calls), astronaut walk and float animation. `e2e/` updated for claude@jamie's four-step start menu (#152). `main` passes 569 tests.
- **Realistic astronaut for the crew** (PR #150, on `main`): detailed spacesuit in `ui/crew/astronaut.ts`, same API, six draw calls each. Merged PRs #148 and #150; `main` passes 553 tests.
- **3D text fits + short NO-GO reasons** (PR #147, on `main`): `brief()` in `ui/gonogo/model.ts`, desk screens, alarm title and choice cards, 4-word option labels. Merged PRs #144 to #147; `main` passes 552 tests.
- **Real NASA cloud map on the Earth** (PR #143, on `main`): `maps/earth-clouds.jpg`, read by `cloudShader` in every view of the Earth. `main` passes 542 tests.
- **Stable frame rate + realistic Earth** (PR #141, on `main`): steady resolution in my three scenes, launch warm-up (worst frame 128 ms → 28 ms), better clouds, air and coast, real planet in the spacecraft room's window. Merged PRs #135 to #141; `main` passes 540 tests.
- **Flight training from the 3D game** (PR #132, on `main`). Merged PRs #127, #128, #130, #132: 522 tests, build, 3D path and all 15 classic browser cases pass.
- **Flight training (V7)** on `main`: `FlightView` (PR #125) and the Flight training button on the mission screen (PR #126). **Rockets fully rendered** (PR #123). `main` passes 519 tests; `e2e/solo.mjs` passes all 15 cases.
- **Browser end-to-end tests + app review fixes** on `main` (PR #117). Merged PRs #105 to #117 together: 493 tests, build passes, solo browser test plays demo, Moon and Mars to the results at every difficulty.
- **Planets:** merged claude@jamie's real NASA maps (PR #102) and added real-elevation relief for the Moon and Mars plus maps on the sky companions (PR #104). Merged PRs #99 to #104; `main` passes 461 tests.
- **Realism, all on `main`:** real rockets (PR #98), real spacecraft parts (PR #97), the real sky (PR #96: Moon, Earth from the Moon, Phobos, Deimos). claude@jamie has the real NASA surface maps (`shaders.ts`, `maps/`), handoff 20261114-1830 answered yes. claude@aiden has the storm-card task (handoff 2030, "take it").
- **Sim audit fixes** (PR #92, on `main`): solar power scales with the orbit's `solar_flux_factor`; off-orbit imagers lose uncovered ground. Merged PRs #85 to #92; `main` passes 446 tests.
- **Launch cutscene** on `main` (PR #83), played after every launch; checked in a browser. Merged 17 PRs (#65 to #83); `main` passes 419 tests.
- **Lazy 3D** (PR #51): first-load script 959 kB → 352 kB. Answers to every handoff addressed to me: `20261114-1235-claude@ethan-all-answers.md`. PR #50 is held (conflict in `data/`, claude@jamie).
- **Merged 21 PRs into `main`** (c1b8d30, tested: 178/178 tests, build and Pages deploy pass). Held #6 and #25. See handoff `20261114-1129-claude@ethan-all-main-is-live.md`. I am the merge coordinator: tell me when a PR is ready.
- **Sim reads the real catalogs** (PR #26, merged).
- **Save / share / compare** (PR #18, `ui/share/`): `<SharePanel state send />`, share link in the URL hash, saved designs, compare table. 114 tests pass merged with sim-data, shared-types, the builder and the playthrough test.
- **Role keys fixed** (claude@aiden's handoff): `ROLE_PARAM_KEYS` now lists `bus`, `solar`, `battery` for spacecraft and `comms`, `ground_stations` for comms-resources. Pushed to PR #5 (`shared/net.ts`) and PR #2 (CONTRACTS.md). Re-merge `origin/ethan-claude/shared-types` to get it.
- **SVG spacecraft drawing**: built and reviewed, then superseded by the 3D view (decision 003). No PR; branch `ethan-claude/spacecraft` is kept as a possible no-WebGL fallback.
- Rehearsed merging all open PRs and asked claude@aiden who merges (handoff 20261114-1100).
- Earlier: sim core (PR #7), multiplayer shapes (PR #5), contracts (PR #2).

### Missing / I need from someone
- claude@jamie: fix the README conflict on #6. claude@sarah: tell me when #25 is ready.
- claude@sarah: keep `num` and `formatMetric` exported from `ui/mission/format.ts` (`ui/share` imports them).
- Ethan's Role for the README Team table.

### Heads up for other agents
- **Ethan takes the heavy tasks.** If your task is too big for your usage, write a handoff to claude@ethan with the hard part and I'll take it. Open tasks on the board are tagged (light) / (medium) / (heavy).
- To build against the sim that reads the real catalogs: `git merge origin/ethan-claude/sim-data`, then read `sim/README.md`. It is still under review, so numbers may move.
- **Roster: "kimchi" on the official team page = Caleb** (confirmed by Ethan). See handoff `20261114-1009-claude@ethan-all-roster.md`.
- Building data, sim or ui? Code against `.agents/CONTRACTS.md` v0.1 (PR #2). The sim core must stay pure: no I/O, no global random, and it never mutates its input state. The UI only sends Commands.
- Adding new optional fields or event types is fine; just add the row. Renames and removals need a decision record.
- Branches use `ethan-claude/<short-task>`.
