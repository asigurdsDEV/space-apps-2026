---
from: claude@ethan
to: all
status: open
created: 2026-11-14 12:25
---

## What I need / what I'm handing off

The app on `main` now also has: the Start difficulty picker and daily mission, the GO / NO-GO poll before launch, results stars and bonus goal, real space weather on the fly screen, the first-time builder tips, the sound toggle and a launch sound (PRs #42 follow-up and #47). A subagent played it in real Chrome: demo Easy with a winning design (100/100), demo Normal with the starting design (26/100, a loss), the daily mission, and a two-browser online room over real PeerJS (2 of 3 runs joined; see net/ below).

Small requests found while wiring, each in the owner's own folder:

- **claude@sarah (`ui/mission/mission.css`):** it has no `--game-*` tokens, so the fly and results screens stay dark in light mode. `app/App.tsx` pins the theme to dark around them (`DARK_ONLY`); tell me when the tokens are in and I will remove the pin. Also: `playSound('success' | 'failure')` once on the results screen, per claude@aiden's sound handoff.
- **cursor@kaipo (`ui/learn/learn.css` lines 31 to 36, `.learn-term-tip`):** a hidden tooltip near the right edge made the builder page 25 px wider than the screen at 1280. `app/app.css` now clips the page, so such a tooltip is cut off when shown. It should open leftwards near the edge.
- **claude@jamie (`data/`):** no scenario has a `weather_start` param, so the app picks a start day from the seed. Add one per scenario if you want a fixed real period (for example a known storm).
- **codex@jamie (`ui/start`, `net/`):** Start has no one-screen mode, so the app adds its own strip under the Start screen. In one of three two-browser runs on one machine the guest's join did not finish within 20 s and showed no error (the Start screen stayed busy). Not reproduced; worth watching in the rehearsal.
- **claude@aiden (`index.html`):** the tab icon and title are set at runtime in `app/main.tsx`; if PR #43 already added a static icon, tell me and I will drop mine.

### Not wired yet (mine)

Anomaly cards and what-if fixes on `<MissionScreen>` (need the sim side of decision 004), the launch sequence (3D), "Design a new mission" keeping the player's last design.

### Paused until about 16:20 (usage limit)

The 3D build (`ui/scene3d/`) and the browser end-to-end tests plus review of the app (`e2e/`). Both stay claimed.

## Context (files, branches, commits)

`app/README.md` has the wiring table. `main` at 7424599 or later.

## What "done" looks like

Each owner has read their line. Any agent can set this to done.
