# Integration audit — 2026-11-14

Auditor: codex@jamie. Read-only snapshots of owner branches assembled in `/tmp/jamie-integration-check`; no edits to their claimed source files. This is a snapshot report, not the latest state of every remote branch.

## Snapshot

| Module | Branch | Commit |
|---|---|---|
| Scaffold | aiden-claude/scaffold | 1a4ba13 |
| Shared types / network contract | ethan-claude/shared-types | 81dceca |
| Sim | ethan-claude/sim-core | a09915a |
| Catalogs / scenario | jamie-claude/parts-catalogs | 05aa29c |
| Builder | aiden-claude/builder | 58042b7 |
| Networking | jamie-codex/transport-demo | PR #9 working revision including concrete room factories |

Each module folder was overlaid on the scaffold snapshot. Node 22.13.1, npm 10.9.2. This checks compatibility of file contents; it does not prove the Git merge order is conflict-free.

## Results

- `npm ci` from scaffold lockfile: passed.
- Combined module tests: **58 passed across 8 files**, including **22 net tests**. These mostly use module fixtures and do not prove real catalogs work with sim.
- Initial build found a self-reference inference error in my room initializer; fixed with an explicit HostRoom annotation.
- `peerjs` dependency is missing from the scaffold. Online factory imports cannot typecheck until it is added. Aiden was asked to add it in a handoff; I have not edited his package files.
- Adding `peerjs` in the isolated copy made `npm run build` pass. This does not update the repo lockfile. The build still mounts the scaffold placeholder, so build success does not establish a working UI or online session.
- Two additional catalog-to-sim probes: **both failed**. The suggested winning design cannot launch. See below.
- No live WebRTC, venue Wi-Fi or end-to-end browser rehearsal yet. No app store or mission UI snapshot was included because those owners are still building them.

## Catalog / sim incompatibilities (Ethan adapting sim)

Calling `init(getScenario('demo')!, getDatasets())` against real data reports:

- `unknown_part`: cubesat-6u is not found as a bus. Data dataset id is `spacecraft-buses`; sim expects `buses`.
- `missing_power_system`: data scenario selects `solar` and `battery`; sim expects `power_system`.
- `missing_comms_system`: data scenario uses `comms`; sim expects `comms_system`.
- `orbit_unreachable`: rideshare + sso is rejected due to differing launcher/orbit capacity field schemas.
- `science_goal` evaluates to 0 although data scenario carries `target_science_score: 30`.
- `objective_mismatch`: real instrument objective schema is not recognized by the sim's current matching logic.

Applying bus=cubesat-12u, instruments=camera-basic,ir-spectrometer, solar=solar-deployable-large, comms=x-band-transmitter still leaves four blocking issues: unknown bus, missing power, missing comms and unreachable orbit. The catalog-owner “winning” design is not yet a tested integrated win. Demo docs label it a candidate pending the sim adapter.

## Reproduction

In a temporary combined checkout with the snapshot above:

```ts
import { getScenario, getDatasets } from './data'
import { init, step } from './sim'
const baseline = init(getScenario('demo')!, getDatasets())
console.log(baseline.params, baseline.issues, baseline.metrics)
const commands = Object.entries({
  bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer',
  solar: 'solar-deployable-large', comms: 'x-band-transmitter',
}).map(([key, value]) => ({ type: 'set_param' as const, payload: { key, value } }))
const design = step(baseline, commands, 0).state
// Must have no error issues after the adapter is ready:
console.log(design.issues)
const result = step(design, [{ type: 'launch', payload: {} }], 1)
// Must leave design phase after a valid launch:
console.log(result.state.metrics.phase)
```

## Owners / next verification

Ethan owns sim adaptation and app wiring; claude@jamie owns data provenance and known-good design. After their alignment, rerun actual-data probes and finish a mission before freezing the pitch. The builder and shared role parameter ownership must agree on any solar/battery/comms aliases. Aiden owns dependency / scaffold updates. codex@jamie owns net alignment and audit follow-up. Pages and PR merge order remain team setup blockers.
