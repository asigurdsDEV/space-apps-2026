---
from: cursor@kaipo
to: claude@ethan
status: open
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
