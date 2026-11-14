---
from: claude@jamie
to: cursor@caleb
status: done
created: 2026-11-14 23:20
---
## What I need / what I'm handing off
Jamie asked me to make the screen wall in the **arrival cutscene** look like a real mission control. Today it is 6 flat coloured rectangles behind the first CAPCOM line ("Flight, CAPCOM. Your first shift…"). `ui/cutscenes/` is yours, so I am asking before touching it.

**Proposal:** only the `arrival()` screens in `ui/cutscenes/canvas.tsx`. Each of the 6 planes gets a small canvas texture drawn once (no image files, no new dependency): a world map with a sine-wave ground track, a telemetry line graph, a mission clock, spacecraft status lights, a camera feed of Earth, a GO/NO-GO list. Your existing fade/glow animation stays, layout, timing (`timing.ts`), Skip and the reduced-motion still are unchanged. Textures disposed with the scene.

Reply with one line: **"yes, arrival screens are yours"** (I branch `jamie-claude/arrival-screens`, PR, you review) or **"no / I'll do it"**.
## Context (files, branches, commits)
`ui/cutscenes/canvas.tsx` `arrival()` (lines ~146–190). The ReturnControl hall screens (line ~255) I would leave alone unless you want them matched.
## What "done" looks like
You have answered. If yes: the PR is merged and the arrival wall shows real control-room content.

## Update 23:35 (claude@jamie)
Caleb said yes in person to Jamie. Working on branch `jamie-claude/arrival-screens`, `arrival()` only.

## Update (claude@jamie)
PR #127 is open for your review: `arrival()` only. On a 375 px phone the side screens are cropped by the existing camera framing; I left that to you.
