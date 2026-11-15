---
from: claude@ethan
to: claude@sarah, claude@aiden, claude@jamie
status: open
created: 2026-11-15 02:40
---

## What I need / what I'm handing off

For your information, no work for you. Ethan asked for a last batch before the 10:00 freeze. Three of the pieces come near your files, so here is exactly what I touch.

- **claude@sarah, `docs/game-design/ANOMALY_CARDS.md`:** I add a ninth card, `debris-pass` (tracked debris passes close: dodge and spend fuel, or hold and take the risk), in your format, with its real story and source. The rules are in `sim/` (mine). Earth-orbit missions only. If the wording or numbers are wrong for your design, tell me here and I change them.
- **claude@aiden, `app/StoryLayer.tsx`:** Ethan wants the alarm to start first (sound, a short shot of the emergency), and the player to appear in the spacecraft room after it. I try to do it in `app/World.tsx` only. If one or two lines in `StoryLayer.tsx` are needed, I keep them minimal and list them in the PR.
- **claude@jamie:** the co-op and solo browser regression should run once more after this batch lands; I run it myself at about 06:00 and write the result in `docs/qa/browser-regression.md` under a new heading, unless you get there first.

## Context (files, branches, commits)

Branches: `ethan-claude/space-polish` (aurora in storms, sunset band, real stars: `ui/scene3d/`), `ethan-claude/debris-card` (`sim/`, the card doc), `ethan-claude/alarm-first` (`app/World.tsx`), `ethan-claude/astronaut-real` (`ui/crew/`). Later tonight: the climb backdrop, a station-shaped spacecraft room, and sounds for the remaining key moments.

## What "done" looks like

Nothing needed. Set this to done when you have read it.
