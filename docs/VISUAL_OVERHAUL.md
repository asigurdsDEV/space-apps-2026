# Interactive 3D overhaul: spacecraft flight, then a walkable hangar

Aiden's direction, 2026-11-14: **both** an interactive spacecraft flight experience and a walkable mission-control/hangar, **starting with spacecraft flight**. Decision 006 records this extension of decision 003. This is a work breakdown, not a claim that the new mode is implemented.

[Decision 005](../.agents/decisions/005-first-person-story.md) covers guided station walking, story and cutscenes. V6 is the same room task. The newer 1555 handoff records Aiden assigning it to claude@aiden in `ui/hangar/`; do not start a second room implementation or alter Ethan’s existing `ui/scene3d/` claim. Flight training V1–V5/V7 remains independent.

## What exists and what is missing

Inspected on main at `9c68472` (planning claim based on `b10f1fc`).

| Already built | Missing for the requested experience |
|---|---|
| Three.js and its TypeScript types; Vite/React; lazy 3D chunk | A primary game viewport rather than a small scene among tables |
| Procedural 3D spacecraft assembled from the chosen bus, solar, instruments and antenna | Player-controlled spacecraft movement, follow camera and interaction targets |
| Earth/Moon/Mars shaders, atmosphere, stars, lighting, orbit ring and mouse orbit/zoom | Keyboard and touch flight controls, explicit input focus, pause/escape/recenter |
| `SpaceView` in the builder and fly screen, with a WebGL failure message | A compact HUD, objective cues and a complete move → inspect → act → feedback loop |
| Mission design, GO/NO-GO, anomaly decisions, results, stars and sharing | A walkable room with clickable build/briefing/launch stations (second milestone) |

`ui/scene3d/SpaceView.tsx` currently accepts `state.entities`/`state.params`, two view modes, caption and className. Its public API exposes neither a camera nor player movement. Do not reach into `world.ts` or copy it into another module to bypass that API. Ethan owns the integration seam.

`app/App.tsx` still has a null `LaunchView` seam on the inspected revision. Ethan's launch/fly branches contain unfinished work; their branch existence is not evidence that the new experience has shipped.

## First playable slice

Keep the existing mission-design game and add a clearly labeled **Flight training / Explore** experience:

1. Enter a large 3D scene with the player's configured spacecraft, a planet and three visible mission targets.
2. Move the visible spacecraft with keyboard or touch; a chase camera follows it. Camera inspection remains a separate mode.
3. Approach a target, aim an instrument, activate an observation, then visit a communications relay to complete the training route. Show immediate target/scan/transmit feedback.
4. Pause, release input, recenter, return to mission controls, and exit back to the existing game.

This must move the player's craft and complete an interaction loop. Rotating a camera around a stationary model alone does not meet the slice.

The first route is an educational training exercise. Its checkpoint progress is labeled as training progress and does **not** manufacture the existing mission's science, money, stars or leaderboard score. Any scored manual flight requires the sim/contracts owners to define and test new commands and co-op authority first. Existing anomaly decisions still use `resolve_decision` and existing role rules.

### Two clocks

Current scenarios commonly advance the mission in one-day sim steps. Smooth controls/rendering operate in real-time seconds. Do not step the budget/orbit sim once per animation frame or turn movement intent into arbitrary `set_param` commands. Keep local training pose/camera state separate from authoritative `SimState`; an agreed later sim extension can connect maneuver consequences.

## Imports and tools

No new npm dependency is required for the first slice. Reuse the installed `three` package and the existing renderer. These are available building blocks, not instructions to import every addon eagerly:

```ts
import { AnimationMixer, LoadingManager, Raycaster } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FlyControls } from 'three/addons/controls/FlyControls.js'
// Second milestone, for walking in the room:
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
```

| Tool | Purpose | Integration note |
|---|---|---|
| Existing Three.js renderer and `OrbitControls` | Planets, spacecraft, inspect/zoom | Ethan retains these files and the render loop |
| `GLTFLoader` | Load actual `.glb` geometry and materials | Add at the lazy scene/asset seam, with loading/error fallback |
| `AnimationMixer` | Play model animation clips, e.g. panel deployment | Only where an imported model actually has clips |
| `Raycaster` | Select a visible spacecraft part, target or console | Pick targets by stable IDs; provide keyboard/touch equivalents |
| `FlyControls` | Optional free-camera exploration | It is camera navigation, not a flight dynamics simulator or a substitute for controlling the player craft |
| `PointerLockControls` | Later first-person room look/walk | Start from an explicit user gesture; Escape releases it; provide a touch alternative |
| Blender or another glTF-capable model editor | Author or optimize real geometry; export GLB | Authoring tool, not a dependency to ship to the browser |

Compressed-geometry/texture decoders can be added when chosen assets require them. Decoder files then need the same local-path and offline checks as the models. An additional physics engine is a separate decision if landing/docking contact physics becomes part of the game; simple flight training does not require one.

Official references: [Three.js model loading](https://threejs.org/manual/pages/loading-3d-models.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [Raycaster](https://threejs.org/docs/pages/Raycaster.html), [AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html), [FlyControls](https://threejs.org/docs/pages/FlyControls.html), [PointerLockControls](https://threejs.org/docs/pages/PointerLockControls.html).

## Models and asset preparation

Keep Ethan's configurable spacecraft and planet work. The first independently prepared asset pack supplies **scene props and mission targets**, not another competing implementation of every catalog part.

| Flight milestone | Later hangar milestone |
|---|---|
| One relay/inspection prop; a visible observation target; optional optimized planet textures | Room shell, floor/walls, console/desk, spacecraft display stand, doors and navigation markers |
| Existing spacecraft remains built from the selected parts | Reuse the selected craft as a display when Ethan supplies a supported reusable model/export |
| Procedural markers/rings are acceptable real 3D geometry | Simple authored room geometry is enough for the first walkable slice |

Use `.glb` for packaged models with embedded materials/textures where possible. Do not treat a flat image or sprite as a navigable 3D model. Record:

- Source page, author/credit, usage terms, retrieval date and transformations for each imported asset.
- Units (meters), origin/pivot, up axis, forward axis and bounds; adapt once to Ethan's scene conventions rather than changing the sim's SI values.
- Byte size, mesh/triangle count, texture sizes and animation clip names after optimization.
- Stable target IDs and any attachment names that the renderer will consume.

[NASA's 3D resource collection](https://science.nasa.gov/3d-resources/) provides candidate models. For example, [Terra](https://science.nasa.gov/3d-resources/terra/) has a credited GLB download. Terra is a specific real mission: it can be an educational reference/inspection object, but must not silently replace a student's configurable CubeSat. Check the specific asset's credits and [NASA's media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) before redistribution. Candidate links are not downloaded assets or verified game-ready meshes.

### Loading and performance targets

These are proposed acceptance budgets, not measured performance claims:

- One active 3D renderer per active game mode; no duplicate hidden flight renderer.
- Keep the existing initial JavaScript size gate; model bytes load after entering 3D, not as base64 inside the main script.
- Start with approximately 1–2K textures and a small prop pack; aim for no more than 8 MB of required first-flight model/texture downloads, then measure on a real phone before adding detail.
- Aim for at least 30 FPS on the team's tested phone and 60 FPS on a tested laptop, with a low-quality option and reduced motion behavior. Record actual device/browser and frame timings.
- Use a procedural placeholder if an optional GLB fails; preserve a usable mission UI if WebGL is unavailable.
- Resolve public URLs with `import.meta.env.BASE_URL`, e.g. `${import.meta.env.BASE_URL}visual-assets/flight/relay.glb`, so GitHub Pages' `/space-apps-2026/` prefix works.
- The current offline plugin includes built bundle files plus an explicit `publicFiles` list. New public models are not automatically guaranteed to be precached. Hand the selected manifest to Claude Aiden for cache/version changes and verify a complete cached flight after going offline. Avoid making a large optional museum model a mandatory service-worker install download.

## Parallel work packages

Suggested owners are **not active claims**. Finish/release any current task, then use the normal claim push. Nobody edits another agent's status or existing source. Standalone previews and pure interfaces let these packages progress while Ethan continues his current branches.

| ID / suggested owner | Exact independent scope | Deliverable and acceptance | Depends on |
|---|---|---|---|
| **V1 — codex@aiden** | New `ui/pilot-input/` only | Keyboard + touch movement intent, brake/interact, scoped focus, Escape/blur/visibility release; a standalone preview and tests. No renderer, sim or global keyboard takeover. Publish the small local intent type before integration. | This plan; no Ethan source changes |
| **V2 — claude@sarah** | New `ui/flight-hud/` only initially | Compact objective/target/scan/transmit HUD and control hints, taking plain props/callbacks; desktop/touch/keyboard preview. Existing `ui/mission/` adoption is a separate owner change after V7. | V1's intent/actions for final labels; mock plain props can start immediately |
| **V3 — cursor@kaipo** | New `public/visual-assets/flight/`, `art/flight/`, `docs/visual-assets/flight.md` | One optimized prop/target pack, source/credit manifest and measurable size/axis/bounds metadata. No edits to `ui/scene3d/`, existing planets or catalog-part builders. | No source dependency; coordinate with existing venue rehearsal priority |
| **V4 — claude@jamie** | New `data/pilot-training/` only initially | Three educational targets and route rules with stable IDs, objective text, observation/relay feedback; validate the local schema in its own tests/README. No `data/index.ts` edit or scored sim change in this package. | Standalone data draft can start now; reconcile with V1/V2/V7 |
| **V5 — cursor@caleb** | New `docs/qa/flight3d.md`; source read-only | Test matrix for movement, actual target interactions, touch, focus/escape, reduced motion, failed model loads, WebGL fallback, offline and phone performance. Record results as V7 becomes available. | Test plan can start now; execution needs V7 |
| **V6 — claude@aiden, same task as decision 005 rooms** | `ui/hangar/` (new), claimed per 1555 handoff | Guided station walking and task-panel navigation; no duplicate rooms. Aiden’s newer split allows this owner to work in parallel. | Story frame/navigation callbacks; Ethan retains existing scene3d source and branches |
| **V7 — existing owners only** | `ui/scene3d/` + `app/`: claude@ethan; `ui/mission/`: claude@sarah; `pwa/`/config: claude@aiden | Integrate the modules at a checkpoint Ethan chooses. Publish optional compatible API additions, then mount one large flight viewport + HUD; preserve existing build/fly/result callers and co-op rules. Model cache/config changes stay with scaffold owner. | V1/V2/V4 reviewed; V3 optional; contracts agreement before any scored control |

Ethan's current renderer, all catalog-part models, planets, launch sequence and sim work retain their existing claim. V7 is a later integration request, not a demand to stop or rebase his current work. Never change or merge his work-in-progress branches from another agent.

## Integration boundary to agree, not an existing API

V1 can export a renderer-independent local type resembling translation axes, yaw/pitch/roll, brake and interact actions. V2 can consume target ID/label, distance, local scan progress and status callbacks. V4 can supply stable target descriptors. These are candidate module-local APIs until their implementing owners publish the actual exports.

Ethan decides how his scene accepts intent and reports target events. Preserve `<SpaceView state mode />` and its current pure-view contract for existing callers. An opt-in flight/training component or optional callbacks can be additive; changing `SimState`, commands, authority or score meaning goes through the existing decision/CONTRACTS workflow. No `maneuver`, `thrust` or `collect_science` command exists merely because it is named in a design discussion.

### Ready to show the judges

The first slice is complete when a player can enter the large scene, move the spacecraft, identify/approach three targets, perform an observation and relay interaction with visible feedback, pause/recenter/exit, and complete the route on desktop and touch. The scene must use actual 3D geometry and work from the Pages base path; controls must not stick after blur or consume keystrokes intended for a name/text field. Existing solo/co-op mission design, anomaly decisions, scores and saved records must still pass their checks.

The hangar follows that slice. Additional rooms, crowds, multiplayer avatars, precise orbital piloting and high-resolution cinematic assets are later work; they are not prerequisites for the first interactive flight.
