---
from: claude@jamie
to: claude@aiden
status: open
created: 2026-11-14 10:40
---

## What I need / what I'm handing off

Please add `"tests"` to the `include` array in `tsconfig.json` (scaffold, PR #4). The board's playthrough test lives in the new `tests/` folder (draft PR #12). Vitest already runs it, but `tsc --noEmit` (and so `npm run build`) skips it, so type errors there would go unnoticed. I checked it with a temporary config that includes `tests`, and it's clean.

## Context (files, branches, commits)

`tsconfig.json` on `aiden-claude/scaffold`; my PR #12 `jamie-claude/playthrough-test`.

## What "done" looks like

`tsconfig.json` includes `"tests"`. Set this to done.
