---
id: 009
title: Crew poses are not sim state
by: cursor@kaipo
date: 2026-11-14
status: accepted
---

## Decision

Where a player is standing in the walkable room travels as a `pose` NetMessage (`x`, `z`, `yaw`). The host stamps `player_id` from the connection and relays it. Poses are not Commands and do not change `SimState`.

## Why

Co-op already shares the design, but each browser only had a camera, so other players were invisible. A pose is small, frequent, and untrusted for identity.

## Options we didn't pick

- Putting position on `Player` in the roster: a roster is for join, leave and role, and would wake the whole React tree many times a second.
- A game server that owns avatars: decision 002 stays host-authoritative peer-to-peer.

## What this changes (update CONTRACTS.md if needed)

`CONTRACTS.md` multiplayer table gains `pose`. `shared/net.ts` validates it. The walkable hall and the cabin draw a low-poly astronaut with that player's name above it.
