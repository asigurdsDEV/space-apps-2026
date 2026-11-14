---
id: 002
title: Stack — browser game in TypeScript + Vite + React, no backend
by: claude@aiden
date: 2026-11-14
status: proposed   # becomes accepted when the PR merges
---

## Decision

The game is a **static web app** that runs entirely in the browser:

| Piece | Choice |
|-------|--------|
| Language | TypeScript (strict) everywhere |
| Build / dev server | Vite 8 (`npm run dev`, `npm run build` → `dist/`) |
| UI | React 19 for the panels/forms (mission builder, budgets, results) |
| Mission view | SVG or `<canvas>` drawn from `SimState` in React. A 3D view (three.js) is optional later and stays inside `ui/` |
| Sim core | Plain TypeScript, no React or DOM imports, pure `init` / `step` / `summary` as in CONTRACTS.md |
| Tests | Vitest (sim core tested headless) |
| Data | Static JSON files in `data/` (launch vehicles, instruments, bus parts, scenarios), imported at build time |
| Hosting | GitHub Pages via a GitHub Actions workflow. Judges open one link with nothing to install |
| Runtime | Node 22+ and npm. No backend, no database, no accounts |

Folders keep the names from decision 001, as top-level dirs:
`data/`, `sim/`, `ui/`, `app/` (entry `app/main.tsx`, the loop), `shared/` (the TS types for every CONTRACTS.md shape). `index.html`, `package.json`, `vite.config.ts` and `tsconfig.json` sit at the repo root.

## Why

- **Challenge fit:** "Space Mission Design Game" is mostly trade-off UI (pick a launch vehicle, instruments and power, watch mass, budget and power add up), then a mission sim and a results screen. That's forms plus a 2D view, which React handles well. We don't need a game engine.
- **Judging:** a link that just works beats "clone this and install Unity". Static hosting is free and can't go down mid-demo.
- **Six people, six agents:** TS + React + Vite is the stack every AI agent writes most reliably, and type errors catch contract drift across modules early.
- **Fits decision 001 unchanged:** the JSON shapes become TS interfaces in `shared/`, and the pure sim runs in the browser and in Vitest alike. No WebSocket or server split is needed.

## Options we didn't pick

- **Unity / Godot:** heavier to set up, harder for six agents to merge (scene files), and the web export is big and slow to load. We only need 2D panels.
- **Python (Pygame / Streamlit):** judges would have to install it, or we'd need a server, and Pygame UI for forms is slow to build.
- **Backend (Node/Flask) + frontend:** nothing needs a server; it only adds deploy risk.
- **Plain JS, no framework:** fine for the sim, but hand-wiring lots of interactive panels without React costs more time than it saves.

## What this changes (update CONTRACTS.md if needed)

- `CONTRACTS.md` gets a **Stack** section pointing here. claude@ethan's PR #2 (contracts v0.1) stays as written. Turning its shapes into TS interfaces in `shared/` is follow-up work for the contracts owner.
- Open question from v0.1 answered: **the sim runs in the browser only.**
- Next tasks, added to BOARD.md: scaffold the Vite + TS + React project (with a Pages deploy workflow), and turn the CONTRACTS.md shapes into `shared/` types.
