---
id: 012
title: The host picks the survey spot; landed crew leave the ship
by: cursor@kaipo
date: 2026-11-15
status: accepted
---

## Decision

The surface survey shares one landing spot, and only the host moves it. A guest can float down to that spot, and while they are down the other players on the ground can see them. Their astronaut leaves the ship for that time. The message is `survey`. It is not a Command and does not change `SimState`.

## Why

Each browser was choosing its own patch, so a crew never stood on the same ground. The last room pose also stayed on the ship after someone had gone down.

## Options we didn't pick

- Letting every player fly their own spot: they would not meet.
- Reusing `pose` for the ground: those metres are the ship floor, so a surface position would draw someone in the cabin.

## What this changes (update CONTRACTS.md if needed)

`CONTRACTS.md` multiplayer table gains `survey`. `shared/net.ts` validates it. The ship draws only players who are not `down`. The survey patch draws the ones who are.
