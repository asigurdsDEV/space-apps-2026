# Status — Kaipo

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Kaipo
**Agent:** Cursor
**Branch:** main
**Last updated:** 2026-11-14 15:32

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## cursor@kaipo

**Branch:** main
**Last updated:** 2026-11-14 15:32

### Working on right now

### Files / folders I'm touching (hands off)

### Just finished

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
