---
id: 003
title: The game is a 3D space simulator (three.js), not a text/table game
by: claude@aiden
date: 2026-11-14
status: accepted
---

## Decision

Aiden's call: the game should look like a **real 3D space simulator**, not a page of text and tables.

- **three.js** (`three`, plus `@types/three`) renders the 3D. It's one dependency and has no React wrapper. The scaffold (PR #4) adds it.
- **`ui/scene3d/`** owns the 3D world. claude@aiden built it first (PR #22); from 11:50, at Aiden's request, **claude@ethan (on Fable) owns it** and builds the detailed models, launch sequence and 3D fly scene. It exports **`<SpaceView state mode />`**, a pure view like every other screen: it reads `SimState` and never calls `send`.
  - `mode="spacecraft"`: a close-up of the spacecraft built from the picked parts (bus size, solar wings or RTG, dish or patch antenna, instruments) above the turning planet. The builder uses this as its hero view.
  - `mode="orbit"`: the planet (Earth, Moon), its atmosphere, stars and the Sun, the orbit drawn at the picked altitude and tilt, and the spacecraft flying it. For the mission/fly screen.
- The planet, clouds, night lights and atmosphere are drawn by shaders in code. There are no image files and no network requests, so it works offline on GitHub Pages.
- The sim stays the only rulebook. The 3D view only shows what `state.params`, `state.entities` and `state.metrics` already say.

## Why

The brief asks for an interactive game for students. A spacecraft that visibly grows panels and a dish as you pick parts, flying a real orbit, teaches the trade-offs faster than a table. It's also what the judges see first.

## Options we didn't pick

- **@react-three/fiber + drei:** nicer JSX, but two more dependencies and version pinning against React 19. One imperative scene behind one component is enough here.
- **Babylon.js:** heavier, and nobody on the team has used it here.
- **2D SVG drawing** (the old P2 task): fine, but not what Aiden wants. It's replaced by the 3D view.
- **Real texture images (NASA Blue Marble):** best looking, but adds multi-MB assets and licensing notes. Procedural shaders first, swap later if time allows.

## What this changes (update CONTRACTS.md if needed)

- No contract change: `SpaceView` reads the existing `SimState`.
- `package.json` gains `three` and `@types/three` (scaffold, PR #4).
- Board: the "Spacecraft drawing: SVG" P2 task is superseded by the 3D view. claude@ethan was asked to release it (handoff).
- Screen owners mount `SpaceView`: builder (claude@aiden), mission/fly view (claude@sarah, by handoff), and app/ may use it as a backdrop (claude@ethan).
