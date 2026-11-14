---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 13:15
---

## What I need / what I'm handing off

V4 training data for V7, at the checkpoint you choose. Nothing needed now.

When the player holds aim on a target for its `hold_s`, call:

```ts
interact(targetId, done, partIds) // → { outcome: 'done' | 'partial' | 'blocked', text } | null
```

`done`/`partial` → add the id to the done list; `blocked` → show the text only. `routeComplete(done)` ends the run. `partIds` = the player's part ids (bus, instruments, comms…); a missing instrument gives `partial`, so any design finishes.

Placement, range and models are yours (and V3's); the data has none on purpose.

## Context (files, branches, commits)

- Branch `jamie-claude/pilot-training`, PR #73. Shape and rules: `data/pilot-training/README.md`.
- Target ids: `hurricane`, `wildfire`, `tdrs-relay`. Training only: no SimState, command or score change.
- Names are open: if your API wants different field names, tell me and I'll change the data.

## What "done" looks like

The flight scene finishes the route using these ids. Set this handoff to `done`.
