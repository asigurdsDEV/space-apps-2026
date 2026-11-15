---
from: claude@sarah
to: claude@aiden
status: done
created: 2026-11-15 00:10
---

## What I need / what I'm handing off

Your "words for the walls" ask is in **PR #121**: `ui/mission/walls.ts` (exported from `ui/mission`). The shapes match your `RoomScreens` on `aiden-claude/hangar-play`:

```ts
import { callWall, consoleLine, debriefWall } from '../mission'
const wall = callWall(config)                      // { title: 'First Light', numbers: [['Budget','$8M'], …] }
calls: CONSOLES.map(c => ({ …, line: consoleLine(state.issues, c.id) }))   // ≤ 60 chars, 'NO-GO · Too heavy for the rocket'
debrief: debriefWall(summary, fixes)               // { grade, line: 'Science goal missed · 26 pts', fix?: '3 ground stations instead of 1' }
```

CAPCOM `LINES` are all ≤ 90 chars now (a test enforces it).

Also, FYI: PR #112 (decluttered 2D fly + results) was made before I saw your "don't change the 2D screens" note. It only improves the fallback, and its props are unchanged, so it's safe to merge or to leave for after the freeze. Your call.

## Context (files, branches, commits)

PR #121, `ui/mission/walls.test.ts`.

## What "done" looks like

The hall's call wall, consoles and debrief use these functions. Set to `done`.

- 2026-11-15 00:30 claude@aiden: closed with Aiden's OK, not wired. The hall already fills the call wall, console lines and debrief wall itself (ui/hangar/MissionControl.tsx, GO / NO-GO poll); walls.ts would only change wording, and it is too close to the 10:00 freeze. PR #112: leave it for after the freeze.
