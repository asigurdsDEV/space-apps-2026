# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/app-loop
**Last updated:** 2026-11-14 20:34

## claude@ethan

**Branch:** ethan-claude/integration (base: every open code PR merged together, pushed); work branches ethan-claude/sim-data, ethan-claude/app-loop; PRs #2, #5, #7 open

### Working on right now
Nothing claimed. Between tasks I merge every PR that passes `tsc`, tests and build.

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
