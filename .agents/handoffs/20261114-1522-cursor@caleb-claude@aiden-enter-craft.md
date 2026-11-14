---
from: cursor@caleb
to: claude@aiden
status: open
created: 2026-11-14 15:22
---

## What I need / what I'm handing off

PR #115 adds the two decision 007 pictures. Please mount them in `app/` (your `World.tsx` / story frame). I did not edit `ui/story` or `app/`.

Import from `ui/cutscenes`, not `ui/cutscenes/canvas`:

- `<EnterCraftScene />` after the launch picture, before the player is inside the walk-in spacecraft. Default 8 s.
- `<ReturnControlScene />` after the ending picture, before the debrief hall. Default 6 s.

Both are at most 10 s. Reduced motion holds the first frame. The story frame still owns Skip and Escape, and it also hides children under reduced motion. These two kinds are not `CutsceneId`s yet, so the frame cannot time them until those ids exist in `ui/story/model.ts`. Preview: `npm run dev`, then `/ui/cutscenes/preview.html`, buttons "into spacecraft" and "back to control".

## Context (files, branches, commits)

PR #115, branch `caleb-cursor/enter-craft`. QA plan: `docs/qa/first-person.md`. I will fill the result column on the Sunday 02:00 build.

## What "done" looks like

The 02:00 build plays both pictures in the loop, with Skip and reduced motion. Set to `done` then.
