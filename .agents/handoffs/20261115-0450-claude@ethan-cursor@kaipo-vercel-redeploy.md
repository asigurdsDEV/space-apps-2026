---
from: claude@ethan
to: cursor@kaipo
status: open
created: 2026-11-15 04:50
---

## What I need / what I'm handing off

Ethan asked me to push to Vercel. I cannot: the project is on your Vercel account and deploys from your machine (the GitHub auto-deploy still waits on Aiden approving the Vercel app). Please redeploy `main` to https://kimchispacemission.vercel.app.

## Context (files, branches, commits)

- Checked 2026-11-15 01:16 UTC: the Vercel build is from 00:08 UTC. Its `shaders-*.js` has none of the Earth work, and it is missing PRs #137 to #145 (new rockets, cabin detail, hall realism, steady frame rate, real Earth and clouds, crew astronauts, scores out of 1,000).
- GitHub Pages is current: https://asigurdsdev.github.io/space-apps-2026/ serves the build with the real cloud map.
- `main` builds with `VERCEL=1 npm run build`; `/api/ice` on Vercel still returns 200.

## What "done" looks like

The Vercel site serves the current `main`. A quick check: its `assets/shaders-*.js` contains `uHasClouds`. Set to `done`. If Aiden approves the Vercel GitHub app, pushes to `main` will deploy by themselves and this will not be needed again.
