---
id: 002
title: Stack — browser game in TypeScript + Vite + React, online co-op over WebRTC, no server of our own
by: claude@aiden
date: 2026-11-14
status: proposed   # becomes accepted when the PR merges
---

## Decision

The game is a **static web app** that runs entirely in the browser, with **online co-op for up to 4 players** (Aiden's call, 2026-11-14).

| Piece | Choice |
|-------|--------|
| Language | TypeScript (strict) everywhere |
| Build / dev server | Vite 8 (`npm run dev`, `npm run build` → `dist/`) |
| UI | React 19 for the panels/forms (mission builder, budgets, results) |
| Mission view | SVG or `<canvas>` drawn from `SimState` in React. A 3D view (three.js) is optional later and stays inside `ui/` |
| Sim core | Plain TypeScript, no React, DOM or network imports, pure `init` / `step` / `summary` as in CONTRACTS.md |
| Multiplayer | **Host-authoritative peer-to-peer over WebRTC using PeerJS** (MIT). Lives in `net/` (see below) |
| Tests | Vitest (sim core tested headless) |
| Data | Static JSON files in `data/` (launch vehicles, instruments, bus parts, scenarios), imported at build time |
| Hosting | GitHub Pages via a GitHub Actions workflow. Judges open one link with nothing to install |
| Runtime | Node 22+ and npm. No backend, no database, no accounts |

Folders keep the names from decision 001, as top-level dirs, plus one new one:
`data/`, `sim/`, `ui/`, `app/` (entry `app/main.tsx`, the loop), `shared/` (the TS types for every CONTRACTS.md shape), **`net/` (rooms + transport)**. `index.html`, `package.json`, `vite.config.ts` and `tsconfig.json` sit at the repo root.

### How online co-op works

1. **Host creates a room.** Their browser opens a PeerJS peer, and the peer id becomes a short **room code** shown on screen.
2. **Up to 3 others join** by typing the code. Each picks a free **role**: mission planning, spacecraft, science, or comms/resources (the 4 roles from the brief).
3. **The host's browser is the only one that runs the sim.** Guests never run `step`.
   - Guest → host: the same `Command` JSON from CONTRACTS.md, tagged with the sender's player id and role.
   - Host → everyone: the latest `SimState` plus the `SimEvent`s after each step, plus a lobby/roster message.
   - The host checks that a role may send a command (e.g. only "science" changes instruments) before applying it.
4. **Same-screen fallback:** the same role UI works with all 4 roles on one device (a local transport that skips the network). If venue wifi blocks WebRTC during the demo, we switch to this.

`net/` exposes one small interface, so the transport can be swapped without touching `sim/` or `ui/`:

```ts
interface Transport {
  send(msg: NetMessage): void            // guest → host, or host → all
  onMessage(cb: (msg: NetMessage, from: PlayerId) => void): void
  close(): void
}
// implementations: PeerTransport (PeerJS/WebRTC), LocalTransport (same screen)
```

## Why

- **Challenge fit:** "Space Mission Design Game" is mostly trade-off UI (pick a launch vehicle, instruments and power, watch mass, budget and power add up), then a mission sim and a results screen. That's forms plus a 2D view, which React handles well. We don't need a game engine.
- **Online co-op without running a server:** PeerJS's free public broker only introduces the browsers to each other; the game traffic goes browser to browser. So the site stays a static GitHub Pages link, with no server to deploy, pay for or keep alive during judging.
- **Host-authoritative fits decision 001 exactly:** the sim is already pure and driven by JSON `Command`s with JSON `SimState` back. That's a network protocol already. One sim instance means no desync between players.
- **Judging:** a link that just works beats "clone this and install Unity".
- **Six people, six agents:** TS + React + Vite is the stack every AI agent writes most reliably, and type errors catch contract drift across modules early.

## Risks (and what we do about them)

- **WebRTC can fail on strict networks** (school/venue wifi, symmetric NAT). Decision 008 adds a Cloudflare TURN credential mint on Vercel (`/api/ice`, including TLS on port 443). Game traffic stays peer-to-peer; there is still no game server. GitHub Pages has no `/api/ice`. → Keep the same-screen fallback demo-ready.
  `shortcut used: TURN credentials on Vercel, not a WebSocket game relay`
- **The public PeerJS broker is a free shared service** with no uptime guarantee. → Same mitigation; the Transport interface keeps the swap to one file.
- **If the host leaves, the game ends** (no host migration). Fine for a hackathon demo.

## Options we didn't pick

- **Same-screen roles only (no network):** simplest, but Aiden chose online play.
- **Our own WebSocket server (Node `ws` on Render/Fly/Railway):** most reliable connection, but it needs an account, a deploy, and a server that must stay up during judging. It's the upgrade path if WebRTC fails, using the same messages.
- **Firebase / Supabase / PartyKit realtime:** works, but adds an account, keys and vendor setup for six people, and puts game state in a third-party database.
- **Unity / Godot:** heavier to set up, harder for six agents to merge (scene files), and the web export is big and slow to load. We only need 2D panels.
- **Python (Pygame / Streamlit):** judges would have to install it, or we'd need a server, and Pygame UI for forms is slow to build.
- **Plain JS, no framework:** fine for the sim, but hand-wiring lots of interactive panels without React costs more time than it saves.

## What this changes (update CONTRACTS.md if needed)

- `CONTRACTS.md` gets a **Stack** line pointing here. claude@ethan's PR #2 (contracts v0.1) stays as written.
- Open question from v0.1 answered: **the sim runs in one browser (the host's).** Commands/SimState travel over WebRTC as exactly the v0.1 JSON shapes, not over a WebSocket server.
- **Contract additions needed (contracts owner, claude@ethan; handoff sent):** a `NetMessage` envelope (join/leave/roster/role-claim, guest `Command`, host `SimState` + `SimEvent`s), and `player_id` + `role` on Commands sent over the network. These are additive (rule 7).
- New board task: **Multiplayer rooms + transport** in `net/` (PeerJS + Local transports, lobby, role claim, host relay).
