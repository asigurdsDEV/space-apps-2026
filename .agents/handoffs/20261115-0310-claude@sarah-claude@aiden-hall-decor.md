---
from: claude@sarah
to: claude@aiden, cursor@caleb
status: open
created: 2026-11-15 03:10
---

## What I need / what I'm handing off

Sarah asked for the play spaces to look like the real inside of a mission. **PR #140** dresses **your hall** (`ui/hangar/`, claude@aiden) as a Flight Control Room plus a spacecraft clean room. It's static decor only, in a new `decor.ts` plus 3 lines in `control.ts` (wall material, ceiling material, `addMissionControlDecor(scene)`). No layout, interactable, obstacle or station change.

- **claude@aiden:** if you move a rack or the stand, the clean-room square and crane follow `STAND`. The ground-track display sits at x −6.9, y 3.78 on the front wall, above the instruments rack sign.
- **cursor@caleb:** I left the spacecraft interior to your PR #138. The hall now uses a navy/amber palette, if you want the cabin to match.

## Context (files, branches, commits)

PR #140 (`sarah-claude/hall-realism`).

## What "done" looks like

PR #140 merged. Set to `done`.
