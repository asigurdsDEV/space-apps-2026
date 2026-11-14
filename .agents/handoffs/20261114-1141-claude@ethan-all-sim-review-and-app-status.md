---
from: claude@ethan
to: all
status: open
created: 2026-11-14 11:41
---

## What I need / what I'm handing off

Two things: what changed in the sim after its review (already on `main`), and where the app is.

### App: being assembled now

`app/main.tsx` on `main` is still the scaffold placeholder, which is why the live site and cursor@kaipo's rehearsal show "Scaffold is running". I am assembling the real app on branch `ethan-claude/app`: Start → Lobby → Briefing → Builder → launch → Mission → Results, with every screen on `main` mounted, plus browser end-to-end tests in `e2e/` (solo, and two browsers in one room over real WebRTC). I will post here when it is on `main` and live.

### Sim: what changed after review (on `main` since 11:28)

23 review findings, 20 fixed. What you may notice:

- **Random failures are off unless a scenario sets `random_failures: true`.** With them on and seed 42, every launchable demo design died on day 193.
- **A failed mission scores at most 69 (grade C).** A spacecraft lost after it already reached the science goal ends as `success`, so `success` no longer means the full mission length was flown.
- **Data worth the most science per GB is sent first**, so adding an instrument never lowers total science. Numbers for downlink-limited designs with several instruments went up.
- **The issue code `no_station_keeping` is gone.**
- `set_param` refuses NaN, null and objects with a `warning` event. Commands sent after `launch` in the same step are refused.
- Blocking messages now name a fix (which launchers reach the orbit, the biggest cost line, the cheapest capable bus).

### What I need from each owner

- **claude@jamie (data/):**
  1. Time is not a real trade-off yet: no time rule can fire in the demo. The sim already reads `build_months` on bus, instrument, power and comms rows and `deadline_months` on the scenario. Add them if you want time to matter.
  2. If a scenario should have random failures, set `random_failures: true` and do not use seed 42.
  3. `data/README.md` says science is "scaled by the fraction of data returned"; the sim now sends the most valuable data first. Check `data/data.test.ts` budget math for multi-instrument, downlink-limited designs.
  4. Your id-clash note (orbit `mars` vs body `mars`): noted, I will add a warning from `init`.
- **codex@jamie (net/):**
  1. `HostRoom` has no way to give a role up (`claim_role` with null). `app/` rebuilds the room as a workaround; a `releaseRole(from)` would remove it.
  2. `HostRoom.authorize` refuses a player with no role, but the contract lets anyone send commands for an unclaimed role. `app/` calls `canSend` itself for now.
  3. `app/` shows a 6-character room code and uses the PeerJS id `smdg-<code>`. Your README says the code is the full PeerJS id. Say if that is a problem for you.
  4. Host `state` messages now leave out unchanged catalog entities and send only new events, to stay under the 16 kB message limit. I will record this in CONTRACTS.md.
  5. Difficulty: `app/` will pass `request.difficulty` to `getScenario` before `init`. Daily mission: your proposal (UTC day, seed YYYYMMDD, normal difficulty, scenario from the sorted ids) is fine with me.
- **claude@aiden (ui/builder/) and claude@sarah (ui/mission/):** drop any special handling of `no_station_keeping`. Sarah: check results text that assumes `success` means the full mission was flown.
- **claude@sarah:** your PR #25 passes with `main` (186 tests, build). The sim side of decision 004 (`decision_required`, `resolve_decision`, what-if in `sim/analysis.ts`) is mine and comes after the app is live.

### Merges

PRs #25, #27 and #28 merge cleanly together onto `main`: `tsc` clean, 186 of 186 tests, build passes. They are waiting on Ethan's go-ahead, which I need for each push to `main`.

## Context (files, branches, commits)

- Sim review fixes: commits `90d90a5`, `401972d` (in PR #26, on `main`). Rules are in `sim/README.md`.
- App: branch `ethan-claude/app` (in progress). 3D: branch `ethan-claude/scene3d` (in progress).

## What "done" looks like

Each owner has read their part. Any agent can set this to done once the app is live.
