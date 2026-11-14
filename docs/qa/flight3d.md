# Flight training 3D — interaction test plan

Written by `cursor@caleb`, 2026-11-14, for board task V5.

This file is the test plan. The flight slice is not in the game yet, so none of the cases below have been run. Fill the result column when V7 is on a build you can open. Do not treat a pass here as permission to change `ui/scene3d/`, `app/`, `sim/`, or `CONTRACTS.md`. Those stay with their owners.

Acceptance text comes from `docs/VISUAL_OVERHAUL.md` on branch `aiden-codex/visual-overhaul-plan` (PR #69). That plan is not on `main` yet. If the merged plan changes a rule, update the matching row before recording a result.

## What a pass is

A player can enter one large 3D scene that shows their configured spacecraft, a planet, and three visible targets. They move the spacecraft with keyboard or touch. A chase camera follows the craft. Looking around is a separate mode from flying the craft. They approach a target, aim an instrument, take an observation, then visit a communications relay. Each of those steps shows feedback immediately. They can pause, release input, recenter, return to the mission controls, and leave back to the existing game. The same route works on a laptop and on a phone. Assets load from the GitHub Pages base path. After leaving the scene, a normal solo mission still scores the way it did before.

Rotating a camera around a spacecraft that never moves does not pass.

## What stays out of this plan

- The walkable hangar (V6). Do not run room, pointer-lock, or station-click cases until that slice exists.
- Scored flight. Training progress must not write science, money, stars, or a leaderboard score. There is no `maneuver`, `thrust`, or `collect_science` command to test.
- Authoring models, the input kit, the HUD, or the training data. V1–V4 own those. This plan only checks the integrated scene.

## Baseline on main, before V7

Inspected `ui/scene3d/SpaceView.tsx` and `ui/scene3d/world.ts` on `main` at `5ddc9aa`. This is the current view, not the flight slice.

- `SpaceView` takes `state`, `mode` (`spacecraft` or `orbit`), `showCaption`, and `className`. It has no camera prop and no movement prop.
- The canvas is `role="img"`. Fine pointer gets “Drag to look around · scroll to zoom”. Coarse pointer turns OrbitControls off and restores `touch-action: auto`.
- `prefers-reduced-motion: reduce` turns off auto-rotate.
- No WebGL sets a visible fallback: the scene description plus “The 3D view needs WebGL, which is turned off in this browser.”
- The 3D code loads behind `Suspense` with `aria-busy="true"`. Planets and the craft are drawn in code. There is no flight GLB pack and no training route.

Record new results against a build that contains V7, and name that revision in the log. Do not copy this baseline into the result column as a pass.

## How to run it

1. Use a build where V1, V2, and V4 are integrated (V3 if the scene loads GLB props). Write the commit and the live URL at the top of the results log.
2. Laptop: keyboard and mouse, and a second pass with the browser window narrowed to 390×844 if you cannot use a phone.
3. Phone: a real device on the Pages URL. Record the phone model, OS, and browser. A desktop device-metrics override can check layout. It cannot check touch or frame rate.
4. For each case, do the steps, write Pass or Fail, and one sentence of what you saw. A Fail names the screen and the revision. Do not file a fix in someone else’s folder; hand it to that owner.
5. Leave the results log in this file. Do not invent a second report.

## Cases

| ID | Check | Steps | Pass when | Result |
|---|---|---|---|---|
| F1 | Enter | From the existing game, open Flight training / Explore. | One large scene shows the craft built from the current design, a planet, and three targets. The mission tables are not the main view. | not run |
| F2 | Move, keyboard | Focus the flight view, not a text field. Hold the move keys, then release. | The craft moves while the key is held and stops when it is released. The chase camera follows the craft. | not run |
| F3 | Look is separate | Use the look / inspect control, then go back to flight. | You can look around without that being the only way to play. Returning to flight still moves the craft, not just the camera. | not run |
| F4 | Observe | Fly to the observation target, aim, and activate the observation. | The target is identifiable before you arrive. Feedback shows that the observation started and finished. | not run |
| F5 | Relay | Fly to the communications relay and complete the handoff the HUD describes. | Feedback shows the relay step finished. The route can be completed after F4. | not run |
| F6 | Third target | Visit the remaining target the route lists. | All three targets from the training data can be found and finished. Training progress is labeled as training. | not run |
| F7 | Pause and recenter | Pause, then recenter. | Motion stops while paused. Recenter puts the chase camera back behind the craft. Unpause moves the craft again. | not run |
| F8 | Exit | Leave the flight scene. | You are back in the existing game. The design you had before entry is unchanged. | not run |
| F9 | Keys do not stick | While moving, click outside the canvas, switch tabs, and come back. Also press Escape. | The craft does not keep moving. Escape leaves flight focus or pauses. A later keypress in a text field types a letter. | not run |
| F10 | Text fields | On the start screen, type a name. In the builder, type a design name. If flight can be open beside a field, focus that field and type. | Flight keys do not eat letters meant for the field. | not run |
| F11 | Touch | On a phone, move, brake, and interact using the on-screen controls. Lift your finger. | The craft follows the touch control and stops when you lift. You can complete F4 and F5 by touch. | not run |
| F12 | Reduced motion | Turn on “reduce motion” in the OS, reload, and enter flight. | The scene does not auto-spin or play a long camera move. You can still move, observe, relay, and exit. | not run |
| F13 | Loading | Enter flight with the network throttled. Reload once. | A busy state shows until the scene is ready. The first page script does not contain the model bytes. A failed optional GLB shows a stand-in mesh, and the route can still be finished. | not run |
| F14 | Pages path | Open the game at `https://asigurdsdev.github.io/space-apps-2026/` and enter flight. | Model and texture requests succeed under `/space-apps-2026/`. None 404 at the site root. | not run |
| F15 | No WebGL | Open the game in a browser with WebGL disabled, or block the WebGL context. | The mission screens still work: start, build, launch, and results. The flight entry explains that 3D is unavailable instead of a blank canvas. | not run |
| F16 | Offline | Load flight once online and let assets finish. Turn the network off. Reload. Enter flight again. | The cached scene still opens and F2 still moves the craft. If a model request fails offline, record the missing URL and hand it to the cache owner (`claude@aiden`, `pwa/`). | not run |
| F17 | Scores untouched | Note science, stars, and the saved record. Finish the training route. Play one normal solo mission afterward, or return without flying the mission. | Training did not add science, money, stars, or a leaderboard row. The solo mission still shows its own result. | not run |
| F18 | One renderer | Enter flight, leave it, open the builder 3D view, then enter flight again. | Only one 3D view is running. Leaving flight does not leave a second hidden canvas animating. | not run |

## Frame rate

Measure on the build you name in the log, after the scene is idle and again while flying the route. Record the actual numbers. The plan’s aims are at least 30 FPS on the tested phone and 60 FPS on the tested laptop. Those numbers are targets, not a result, until this table is filled.

Use the browser’s frame meter or a short `requestAnimationFrame` sample of at least 10 seconds. Write the device, browser, viewport, quality setting, and whether reduced motion was on.

| Device | Browser | Viewport | Quality | What you did | FPS | Result |
|---|---|---|---|---|---|---|
| | | | | idle in the flight scene | | not run |
| | | | | flying the route | | not run |
| laptop | | | | idle | | not run |
| laptop | | | | flying the route | | not run |

Also note the transfer size of the flight models and textures (aim: no more than 8 MB for the required first-flight download) and the largest texture (aim: about 1–2K). A miss here is a note for V3 and the integrator, not a failed mission score.

## Results log

| Date | Revision or live script | Who | Cases run | Outcome |
|---|---|---|---|---|
| 2026-11-14 | `main` `5ddc9aa`, plan only | cursor@caleb | none — V7 is not integrated | test plan written; no flight result |

## Limits

- This document does not certify the current builder or fly-screen `SpaceView`. Those views are orbit and zoom.
- Phone frame rate, real touch, and offline cache can only be filled on a device. A desktop viewport check is not a substitute.
- If V7 lands without a low-quality option, write “no quality control” in the FPS table instead of skipping the row.
