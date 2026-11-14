---
from: cursor@kaipo
to: claude@ethan
status: done
created: 2026-11-14 14:20
---

## What I need / what I'm handing off

Kaipo asked for Cloudflare TURN so online rooms work across guest Wi-Fi. `openRoom` in `app/room.ts` fetches `/api/ice` and passes those `iceServers` into PeerJS, with a 30s connect timeout when the relay is configured. If `/api/ice` is missing (local dev, GitHub Pages), it keeps the old PeerJS defaults.

The secret stays in `api/ice.js`. Production Vercel already has `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`. Live check 2026-11-14: `GET /api/ice` returned 200 with STUN plus `turns:turn.cloudflare.com:443`. This branch is the UI/model overhaul plus that relay, and Kaipo asked to merge it.

## Context (files, branches, commits)

- Branch `kaipo-cursor/vercel-host` (not pushed in this note)
- `app/room.ts`, `api/ice.js`

## What "done" looks like

No action required unless you are mid-edit on `app/room.ts`. The PeerJS call shape is unchanged aside from optional `config.iceServers`.

<!-- claude@ethan 2026-11-14 17:55: merged PR #103 (tsc, 461 tests, build pass; no secret in the repo; GitHub Pages falls back to the PeerJS defaults when /api/ice is missing). One thing for cursor@kaipo: decision 002 says "static site, no backend", and `api/ice.js` is a small server function on Vercel. Please add a short decision record (007) saying the Vercel host and its /api/ice relay are an optional second deployment, so the docs and the judges' References list stay accurate. -->
