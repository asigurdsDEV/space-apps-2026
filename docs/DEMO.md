# Demo script and rehearsal gates

This is a rehearsal plan, not a claim that every screen or integration is already merged.

## Before presenting

1. Pull merged main. On Node 22+, run `npm ci`, `npm test`, and `npm run build` once the scaffold is merged. Confirm the actual Pages URL loads with no console errors or missing assets.
2. Data + sim owners confirm a known-good baseline from `data/scenarios/demo.json` and one single-choice change that produces a visible issue. Record the actual part IDs in the run sheet below after testing; do not guess them from a catalog name.
3. Rehearse reset, pause, resume, speed and launch. Confirm an invalid design explains its blocking issue and a valid one reaches results.
4. Rehearse online play in two browsers on venue Wi-Fi. Join with the full room ID, choose different roles, verify the guest sees host updates and cannot change another role's choices. Then test four players, a fifth-player rejection, guest exit and host exit.
5. Keep local play ready. Rehearse switching modes explicitly after a failed join; explain that the demo is continuing on one device. Do not promise seamless mission recovery.

## Three-minute sequence

| Time | Action | Narration / evidence |
|---|---|---|
| 0:00–0:20 | Open mission design | “We're making spacecraft trade-offs visible to students.” |
| 0:20–0:50 | Show baseline parts and resource budgets | Point out mass, power, cost and data constraints actually shown by the build. |
| 0:50–1:20 | Apply the rehearsed one-choice change | Ask the audience to predict the effect; show the changed budget and explanation. |
| 1:20–1:45 | Restore or repair the design | Explain the compromise rather than maximizing every resource. |
| 1:45–2:20 | Launch and advance the mission | Show one event and its connection to the design. Use rehearsed speed control. |
| 2:20–2:45 | Show results | Explain why the mission succeeded or failed using the displayed evidence. |
| 2:45–3:00 | Show NASA sources and team roles | Separate educational approximations from original source data. |

Online role collaboration can replace part of the design segment after its rehearsal passes. If it has not passed, demonstrate local play and identify online co-op as work in progress.

## Run sheet to fill from the integrated build

- Build commit / deployed URL: pending merged runnable app.
- Baseline scenario + seed: pending confirmation by data and sim owners.
- Baseline choices / expected result: pending tested fixture.
- One-choice failing variation / expected issue: pending tested fixture.
- Repair / expected result: pending tested fixture.
- Network rehearsal result / local fallback control: pending app integration.

## Quick acceptance checks

- Refresh and reset return to a usable baseline; no stale result/event history.
- A parameter change updates budgets and issues without direct UI state mutation.
- Same configuration and seed produce repeatable results.
- Labels include units; keyboard users can select parts and activate controls.
- Repeated launch / reset / join / leave does not start extra timers or leave ghost players.
- Closing a guest releases their role; closing the host explains the room ended.
- Offline/local mode runs without a broker connection. Do not require runtime NASA downloads.
