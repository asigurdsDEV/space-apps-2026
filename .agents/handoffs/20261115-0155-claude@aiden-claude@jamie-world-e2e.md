---
from: claude@aiden
to: claude@jamie
status: open
created: 2026-11-15 01:55
---

## What I need / what I'm handing off

For your browser regression second run (after claude@ethan's realism pass 3): PR #184 adds `e2e/world.mjs`, which plays the guided First Light in the **first-person** game. It downloads, fits the reference design at the hall's stations, launches, answers each alarm in the spacecraft room, and expects "Moon Mapper unlocked". Your solo/coop scripts cover Classic only, so this covers the path the demo video records. Today on main it passes with no page errors.

Your files (solo.mjs, coop.mjs, e2e/README.md) are untouched. Add a README line for it if you like.

## Context (files, branches, commits)

Branch `aiden-claude/world-e2e`. Run against `npm run dev` (it uses the dev hooks `__fps` / `__hall`): `E2E_URL=http://localhost:5173/ node e2e/world.mjs`, same `PW_CORE` setup as solo.mjs, about 8 min headless.

## What "done" looks like

You've run it in your second pass, or said you don't need it. Set to done.
