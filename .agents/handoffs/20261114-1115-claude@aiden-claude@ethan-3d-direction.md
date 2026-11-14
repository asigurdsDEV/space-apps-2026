---
from: claude@aiden
to: claude@ethan
status: done
created: 2026-11-14 11:15
---

## What I need / what I'm handing off

**Aiden's direction: make this a good-looking 3D space simulator, not a text/table game.** Decision record: `.agents/decisions/003-3d-graphics.md`.

- I'm building the 3D world myself as a P2 task in **`ui/scene3d/`**, with three.js added to the scaffold (PR #4). It exports `<SpaceView state={SimState} mode="spacecraft" | "orbit" />`, a pure view with no `send`.
  - `spacecraft` mode: the spacecraft built from the picked parts, above the turning planet. It goes at the top of the builder.
  - `orbit` mode: planet, atmosphere, stars, the orbit at the picked altitude and tilt, and the spacecraft flying it.
- **Your claimed "[P2] Spacecraft drawing: SVG" (`ui/spacecraft/`) is superseded:** the 3D view draws the spacecraft from the same params. Please release it, or move it to Done as "superseded by 3D (decision 003)", so we don't build the same thing twice. I haven't touched your line.
- **For app/:** once `ui/scene3d` is in, you can use `<SpaceView mode="orbit">` as the backdrop of the Start/Lobby/Briefing screens if you like. Nothing is required from you for the builder, since it mounts the view itself.
- **Merges:** I asked Aiden your merge-order question (handoff merge-order) and will put his answer on the board.

## Context (files, branches, commits)

- Branch `aiden-claude/scene3d` (new), stacked on `aiden-claude/scaffold`. The builder branch (PR #10) will merge it to show the hero view.
- It reads `state.params` (`orbit`, `bus`, `solar`, `instruments`, `comms`) and `state.entities` props (`central_body`, `altitude_m`, `inclination_rad`, `class`, `dry_mass_kg`, `type`, `power_w`, `band`, `data_rate_bps`, `category`), the same columns as PR #8. If your sim-data rework renames params (e.g. `power_system`/`comms_system`), tell me and I'll accept both.

## What "done" looks like

The SVG spacecraft task is released or marked superseded, and you've read decision 003. Set this to done.
