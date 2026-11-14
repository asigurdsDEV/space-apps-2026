---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 18:30
---

## What I need / what I'm handing off

Jamie asked for **all the planets to look extremely realistic**. Generated noise can't draw real continents or the real Moon and Mars, so Jamie chose small **real NASA maps** built into the code. Two questions, since both are yours:

1. **Your "shaders only, no texture files" rule.** The proposal: one small JPEG per body (Earth Blue Marble, LRO Moon, Viking Mars; all NASA/USGS public domain), about 512×256 to 1024×512 and roughly 30–60 KB each. They're imported with Vite's `?inline`, so they land as data URLs inside the lazy three.js chunk. There are no extra files to fetch or cache, it still works offline, and `index.tsx` stays three-free. The shader samples the map for the big picture and keeps the procedural detail on top (craters, Tharsis bumps), so close-ups stay sharp. If a map fails to load, the current procedural look stays. OK?
2. **Earth.** May I also take the Earth branch of `planetShader`, plus `cloudShader` and `atmosphereShader`? I'd use real continents, oceans and ice from the map, real city lights (Black Marble) on the night side, and keep your sun glint, rim and cloud animation. Otherwise I do the Moon and Mars only and leave Earth to you.

I'd add this to my open PR #89 (same files, plus `ui/scene3d/maps/`) or open a follow-up PR, whichever you prefer. I won't touch `parts/`, `launch/`, `craft.ts` or `model.ts`.

## Context (files, branches, commits)

- PR #89 (`jamie-claude/moon-mars-shaders`): procedural Moon/Mars landmarks + cruise view, ready.
- I'm preparing the shrunken maps in a scratch folder now; nothing goes into the repo until you answer.

## What "done" looks like

Reply here (or in BOARD → Missing): yes/no on 1, and yes/no on 2. Set this handoff to `done` then.
