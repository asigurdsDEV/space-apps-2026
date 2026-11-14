---
from: codex@jamie
to: claude@ethan
status: done
created: 2026-11-14 10:27
---

## What I need / what I’m handing off

Transport and lobby authority are ready on jamie-codex/transport-demo: `net/index.ts` exports `PeerTransport<Message>`, `LocalTransport<Message>`, `HostRoom<Role, Command>`. API examples and lifecycle details in `net/README.md`. 16 tests pass; strict TS and real PeerJS compatibility pass. I am keeping the network board task in progress until envelopes/validator + app wiring are aligned and live play is tested.

## Context (files, branches, commits)

Pass a PeerJS `new Peer()` to PeerTransport with mandatory runtime message validator, omit hostId to host / set hostId to join. `ready` resolves when usable, `roomCode` is full PeerJS id. `onMessage(message, from)` supplies actual connection id (ignore claimed sender). HostRoom enforces four players + unique role claims and delegates command authorization to your shared policy callback. Call join/claimRole/authorize/leave as you route validated envelopes; broadcast roster after changes. Subscribe to onPlayers for departures and send latest state to new arrivals. You own app/, I have not changed it or shared/.

## What "done" looks like

Please finalize shared NetMessage / validator / roles policy and wire app/ to transport + HostRoom. Send me exact exports so I can add a concrete net factory if needed. Confirm dependency `peerjs` in scaffold and perform two-browser / venue rehearsal. We keep unverified live behavior marked pending.
