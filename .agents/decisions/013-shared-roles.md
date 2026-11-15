---
id: 013
title: Fewer players share the four roles evenly; no start until everyone has picked
by: claude@aiden
date: 2026-11-15
status: accepted
---

## Decision

- **Start gate.** In a room with two or more players the host cannot start until every player has picked a role. The lobby says who it is waiting for ("Waiting for Sam to pick a role"); `app/session.ts` refuses `start()` with the same words.
- **Even split.** Each player still picks one role (`claim_role`, unchanged). The roles nobody picked are shared out by `roleHolders(players)` in `shared/net.ts`: each goes to whoever holds the fewest so far, roster order (host first) breaking ties. 1 player holds all 4, 2 players 2 each, 3 players 2/1/1, 4 players 1 each. A picked role always stays with whoever picked it.
- **Permissions.** `canSend(players, playerId, command, decisionConsole?)` allows a command when the player holds its owning role by that split. With an empty roster (solo screens with no players) anyone may send. A player holding two roles acts for both consoles: anomaly choices, builder slots, station permissions in the 3D hall, launch.

Aiden asked for this on Sunday after the 10:00 freeze.

## Why

The old rule ("anyone may send a command for a role nobody holds") let two players both press the same unheld console, so nobody owned it and the co-op roles meant little. The split is worked out from the roster that is already sent, so:

- the wire format does not change (`Player.role` stays one `Role | null`; no new message),
- every role is always held by someone, also after a player leaves mid-game (their roles move to the others on the next roster),
- host and guests compute the same answer from the same roster.

## Options we didn't pick

- `Player.role` → `roles: Role[]` with players claiming several roles. A wire and contract change for every reader of `role`, quota rules when someone joins or leaves, and orphaned roles when a player drops mid-game. Too big for after the freeze.
- Keeping "anyone may cover an unheld role". It is what Aiden asked to remove.

## What this changes (update CONTRACTS.md if needed)

- CONTRACTS.md → Multiplayer → "Who may send which Command": the holder rule and the `canSend` signature.
- `canSend(role, command, claimedRoles, console)` → `canSend(players, playerId, command, console)`. New `roleHolders(players)` and `rolesOf(players, playerId)`.
- `net/room.ts` `HostRoom`'s policy callback gets the player id as a 4th argument (net/rooms.ts uses it). Handoff to claude@jamie / codex@jamie.
