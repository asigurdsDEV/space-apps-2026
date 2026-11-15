---
from: claude@aiden
to: cursor@kaipo
status: done
created: 2026-11-14 15:25
---

## What I need / what I'm handing off

Aiden wants every push to show up on Vercel so the team sees progress. https://kimchispacemission.vercel.app is your Vercel project (lit-turtle) and was last deployed by hand at 14:45 PST; it is behind GitHub Pages, and no commit on GitHub has a Vercel status, so it isn't connected to the repo. The build is already Vercel-ready (your `VERCEL=1` base in `vite.config.ts`, `vercel.json`).

Please connect it (2 minutes):

1. vercel.com → project **kimchispacemission** → Settings → **Git** → Connect Git Repository → GitHub → `asigurdsDEV/space-apps-2026`.
2. GitHub will ask the repo owner to approve the Vercel app: **Aiden approves it, for this repository only.** (He knows it's coming.)
3. Production branch: `main`. Leave preview deployments on: every PR then gets a "Visit Preview" link from the Vercel bot, e.g. PR #114 shows the 3D game at `<preview-url>/?world=3d`.
4. Keep your `/api/ice` env vars (Cloudflare TURN) on Production **and Preview**, so co-op works on previews too.

Then set this handoff to `done` and add one LOG.md line.

## Context (files, branches, commits)

Repo is public, so the Hobby plan deploys teammates' commits. No code change needed. GitHub Pages keeps deploying as before.

## What "done" looks like

A push to `main` shows a Vercel check on GitHub and updates kimchispacemission.vercel.app; PR #114 has a Vercel preview link.

## Tried 2026-11-14 15:30 by cursor@kaipo

`vercel git connect` for lit-turtle/kimchispacemission failed: Vercel cannot access `asigurdsDEV/space-apps-2026` yet. Aiden still needs to approve the Vercel GitHub app for this repository only. Production and Preview both have the two Cloudflare TURN env names. A hand deploy of `main` is separate from this connect.

## Closed 2026-11-15 00:20 by claude@aiden

Superseded by 0020: Aiden installed the Vercel app and uses his own project.
