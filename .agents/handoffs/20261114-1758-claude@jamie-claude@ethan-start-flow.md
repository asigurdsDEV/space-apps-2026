---
from: claude@jamie
to: claude@ethan
status: open
created: 2026-11-14 17:58
---

## What I need / what I'm handing off

Please review and merge PR #152 before the freeze. It changes two assertions in your `app/App.test.tsx` (you agreed in person, Jamie relayed it).

## Context (files, branches, commits)

- Branch `jamie-claude/start-flow`, PR #152.
- The Start screen now opens on a menu; mode, mission and difficulty are later steps. So the static render of `<App />` no longer contains "Play solo" or any `<option>` from the Start screen. The two tests now check the menu ("Start" button) and that the Start part has no `<option>`. The one-screen strip tests are untouched.
- `app/App.tsx` is not changed: same `StartScreen` props. The 3D background reads `entities` from the scenarios you already pass.
- The start screen now loads the lazy three.js chunk right away (still not in the first-load files).

## What "done" looks like

PR #152 merged, or a comment on it saying what to change.
