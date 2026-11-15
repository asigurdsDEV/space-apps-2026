# Status — Kaipo

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Kaipo
**Agent:** Cursor
**Branch:** kaipo-cursor/deploy-check
**Last updated:** 2026-11-14 17:38

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## cursor@kaipo

**Branch:** main
**Last updated:** 2026-11-15 12:30

### Working on right now

Desktop acceptance is still the open board line on `docs/qa/first-person.md`. The debug report is filed. Redeploy of https://nasaspacemission.vercel.app is the open handoff `20261115-1230-cursor@kaipo-cursor@kaipo-redeploy.md`.

### Files / folders I'm touching (hands off)

### Just finished

**System debug:** `docs/qa/system-debug-20261115.md`. On this machine at `d7e0851` the suite was 7 failed / 749 passed; five of those still failed alone (time limits in `sim/analysis.test.ts`, `sim/cards.test.ts`, `ui/crew/astronaut.test.ts`, `ui/scene3d/parts/parts.test.ts`). `tsc` failed on a missing `geotiff` install and passed after `npm install`. Eight live chunks on nasaspacemission have Launch anyway and do not have the valley strings; the other 26 chunks were not opened. Handoffs went to claude@ethan, claude@jamie, claude@aiden, claude@sarah, and cursor@kaipo.

**Moon survey crew:** a player on the Apollo 17 valley is taken off the ship, people on the valley see each other, and the host's landing spot freezes once anyone is down.

**Survey crew (on main):** only the host moves the landing spot. Guests press Q to float down to it. Players on the ground see each other, and their suit is taken off the ship until they come back. Decision 012.

**Deployment check (P0):** Pages and Vercel both serve the app at commit `d70c4e8`. Each host's `game-assets.json` lists 45 files and every URL returned HTTP 200 (Pages base `/space-apps-2026/`, Vercel base `/`). Vercel production is deployment `dpl_Cq7xhw4P4aFipP2rTYrt5aegyTmC` at https://kimchispacemission.vercel.app. The Earth shader chunk has `uHasClouds` and the crew chunk has the name tag. `/api/ice` returned 200 with a TURN relay. Cache/gate source was not edited. A second device was not used this pass; the last cross-device join is still the 2026-11-14 note in `docs/MULTIPLAYER_TEST.md`. Kaipo can see other players.

**Crew models:** in a shared room, each other player is a low-poly astronaut with their name above the helmet. Where they stand is a `pose` message (decision 009), relayed by the host. Solo play is unchanged.

**Classic view handoff:** switching from first person no longer replays the launch cutscene after you have already launched; classic screen has **First person** to return. Completes codex@aiden `skipLaunch` with return path and launch-done sync.

**Classic model view:** dragging the orbit view no longer snaps back when the next day starts. The camera is placed once per view mode.

**Room open:** Host and Join download PeerJS while `/api/ice` is in flight, and stop waiting after 4 seconds. A fast TURN mint is still used. A hung mint falls back to PeerJS's own servers.

**Decision 008 and the live site:** PR #116 is on main. https://kimchispacemission.vercel.app was redeployed. `/api/ice` returned 200 with a TURN relay on port 443, and `visual-assets/world/part-rack.glb` is served. GitHub auto-deploy still waits on Aiden approving the Vercel app.

**World props:** `public/visual-assets/world/` has part-rack, console-desk, launch-button, alarm-beacon, time-lever, and gauge-frame (about 22 kB). Floor is y=0. Placement stays with the hall and interior.

**Multiplayer rehearsal:** players on different devices joined a room on https://kimchispacemission.vercel.app without a hotspot (2026-11-14). Fifth player, launch sync, guest leave, and host close pass in `app/coop.test.ts` (17/17). They were not repeated on separate devices.

**Glossary (ui/learn/):** Deep Space Network now says a launch or landing can take the antenna. A reaction-wheel failure no longer always means coarse pointing. Added RTG, solar flux, and coverage, with sources in `ui/learn/README.md`.

**Live WebRTC:** same-computer rooms `LL2KQG` and `V3XD2E` passed. The pre-TURN cross-network try `XFCY3M` timed out. A later different-device join on the Vercel site passed without a hotspot.

**Public play:** https://kimchispacemission.vercel.app serves Host online and Join. `/api/ice` returns Cloudflare TURN, including `turns:turn.cloudflare.com:443`. The key stays in Vercel env, not in git. Four-player cap unchanged.

**Run A-local (4 tabs, localhost):** partial pass — join 4/4, lobby → briefing → builder, Guest-B bus edit synced on host (12U). Not run: 5th player, launch/flight, disconnect. Logged in `docs/MULTIPLAYER_TEST.md`.

V3 flight training GLBs merged to main (PR #75): hurricane, wildfire, and tdrs-relay markers. Glossary tooltip overflow (PR #58) and anomaly-card terms (PR #38) are on main.

### Missing / I need from someone

- Aiden approves the Vercel GitHub app for this repo only. `vercel git connect` cannot see `asigurdsDEV/space-apps-2026` until that approval. Production and Preview already have the TURN env names.

### Heads up for other agents

World prop meshes are in `public/visual-assets/world/`. Cross-device multiplayer join passed on the Vercel site. Glossary provenance is in `ui/learn/README.md`.
