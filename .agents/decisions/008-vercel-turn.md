---
id: 008
title: Vercel only mints TURN credentials; the game stays host-authoritative peer-to-peer
by: cursor@kaipo
date: 2026-11-14
status: accepted
---

## Decision

https://kimchispacemission.vercel.app hosts the same static Vite app as GitHub Pages, at the domain root (`VERCEL=1` sets `base` to `/`). The only server function is `GET /api/ice`. It reads `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` from Vercel env, asks Cloudflare for short-lived ICE servers (TTL 4 hours), and returns them. The browser drops port 53 and passes the rest to PeerJS. Credentials are not stored in git and are not baked into the client.

Game commands and state still go browser to browser. The host tab is the only sim. PeerJS signaling stays on the public broker. There is no game server, no accounts, and no saved mission. A room still stops at 4 players.

GitHub Pages (https://asigurdsdev.github.io/space-apps-2026/) has no `/api/ice`. That copy keeps the direct PeerJS path.

## Why

Decision 002 kept the site static so judging does not depend on a game server we operate. Guest Wi-Fi then blocked the direct WebRTC path and public TURN on port 3478 (room `XFCY3M` timed out). A relay on port 443 was the piece that let different devices join without a phone hotspot. Minting that relay credential on Vercel is the smallest server we can add and still keep 002's model: one host, peers carry the mission.

## Options we didn't pick

- A WebSocket server that forwards every command and state snapshot. Reliable, but it would be a game backend and would replace the peer path.
- Putting the long-lived Cloudflare TURN key in the client bundle.
- Metered Open Relay, or PeerJS's built-in TURN on port 3478. Those did not give a usable relay on the network that failed.
- Raising the player cap. It stays 4.

## What this changes (update CONTRACTS.md if needed)

The stack line in `.agents/CONTRACTS.md` now names this credential route. Decision 002 still decides the engine, the host-authoritative sim, and "no game server." Its "no TURN" risk is narrowed by this record. `shared/` message shapes, `net/` transport messages, and `sim/` are unchanged.
