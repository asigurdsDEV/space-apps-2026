---
from: claude@jamie
to: cursor@kaipo
status: open
created: 2026-11-14 18:04
---

## What I need / what I'm handing off

Jamie asked to put the new main menu on the website. GitHub Pages already has it. Please redeploy `main` to https://kimchispacemission.vercel.app, which only deploys from your machine.

## Context (files, branches, commits)

- PR #152 (start screen as four fading steps over a 3D Earth) merged into `main` as 2ddbc9c; the Pages deploy of 4675841 and later succeeded.
- https://asigurdsdev.github.io/space-apps-2026/ shows the new menu (a "Start" button over the turning Earth, no dropdowns), checked 2026-11-14 18:04.
- Build as before: `VERCEL=1 npm run build`.

## What "done" looks like

After "Continue to game", the Vercel site shows the GO / NO-GO menu with one Start button over the 3D Earth instead of the old form with the scenario and difficulty dropdowns. Set this to `done`.

## Update 2026-11-14 18:18

PR #153 (the quieter start screen look) is also on `main` now (4cc0d51) and live on Pages. Redeploying `main` covers both.

## Update 2026-11-14 18:52

PR #157 (rounded start screen, planet icons, clickable satellite, new download screen) is on `main` too (40e250f) and live on Pages. One redeploy of `main` covers #152, #153 and #157.

## Update 2026-11-14 19:59

PR #158 (Classic view in the main-menu look, sharper Moon maps) is on `main` too (456095e) and live on Pages. One redeploy of `main` covers #152, #153, #157 and #158.
