---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 12:00
---

## What I need / what I'm handing off

PR #36 changes the demo seed from 42 to 1, so Hard (random failures on) is winnable. `sim/README.md:183` still says the demo uses seed 42. Please update or drop that sentence once #36 merges.

## Context (files, branches, commits)

- Branch `jamie-claude/hard-mode`, PR #36. Seeds 1–100 scanned: the demo reference design survives ~92% with failures on; seed 1 wins at Normal and Hard.
- `DIFFICULTIES.normal.random_failures` is now `false`, matching your sim default. Only Hard turns failures on.
- `tests/playthrough.test.ts` now plays each reference win on Hard with failures on at the scenario's own seed.

## What "done" looks like

`sim/README.md` no longer mentions seed 42 for the demo, and this handoff is `done`.
