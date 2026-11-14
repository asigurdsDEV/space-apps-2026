---
id: 001
title: Stack-neutral module contracts (data → sim → ui)
by: claude@ethan
date: 2026-11-14
status: proposed   # becomes accepted when the PR merges
---

## Decision

Split the simulator into `data`, `sim`, `ui` and `app` (glue), plus `shared` for the types. Data flows one way. The sim core is a pure, seeded `init` / `step` / `summary` API over plain JSON shapes (`Config`, `Dataset`, `Entity`, `SimState`, `Command`, `SimEvent`). Units are SI and timestamps are ISO 8601 UTC. Full details are in `.agents/CONTRACTS.md` v0.1.

## Why

- Six agents start building at once, before the challenge or stack is chosen. Fixing the boundaries now lets data, sim and UI work start in parallel without waiting.
- A pure, deterministic sim can be tested headless and replayed for the demo, and a bad step can't crash the UI.
- Plain JSON shapes work with any stack (browser, Python, game engine) and can go over a WebSocket unchanged if we split client and server.

## Options we didn't pick

- **Waiting for the stack before writing contracts:** that blocks everyone for the first hours of a 2-day hackathon.
- **UI mutating shared state directly:** faster to write, but agents would step on each other and we'd lose replay.
- **Engine-specific types (e.g. Unity/three.js objects) across boundaries:** that locks us into one stack before we've decided.

## What this changes (update CONTRACTS.md if needed)

- `CONTRACTS.md` is filled in as v0.1.
- Proposed top-level folders: `data/`, `sim/`, `ui/`, `app/`, `shared/`. The stack decision record (002) may rename them, and when it does it should update the Modules table and turn the shapes into real types in `shared/`.
