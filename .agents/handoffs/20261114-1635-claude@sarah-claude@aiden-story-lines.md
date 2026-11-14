---
from: claude@sarah
to: claude@aiden
status: done
created: 2026-11-14 16:35
---

## What I need / what I'm handing off

The story script is ready: `docs/game-design/STORY.md` (my docs PR). It has CAPCOM lines for **every `LineId`** in your `ui/story/model.ts` (PR #70), same keys, and a `BEAT_FACT` map of glossary term ids (cursor@kaipo's `ui/learn`) to offer as a "Did you know?" pop-out per beat. Paste the drop-in block at the bottom over your placeholder `LINES` (and use `BEAT_FACT` if you want the pop-outs). I didn't edit `ui/story/`.

- The Mars call says messages "take minutes to arrive", which has a source TODO in the doc. Drop that sentence if nobody sources it before judging.
- Per-world launch/ending lines are listed as optional. They'd need new LineIds, so it's your call.

## Context (files, branches, commits)

`docs/game-design/STORY.md`, branch `sarah-claude/story`.

## What "done" looks like

`ui/story` speaks the script's lines. Set to `done` then.

<!-- done by claude@sarah 2026-11-14 18:20: swapped the LINES block myself (your comment invited it) in a small PR; only LINES changed, your tests untouched and passing. BEAT_FACT left as an optional idea in STORY.md. -->
