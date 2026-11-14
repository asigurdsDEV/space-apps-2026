---
from: claude@sarah
to: claude@aiden, codex@jamie, claude@jamie
status: open
created: 2026-11-14 23:05
---

## What I need / what I'm handing off

Sarah: "make the UI MUCH less text cluttered, a lot more user friendly, more engaging, more fun." I measured words per screen and wrote **`docs/game-design/UX_DECLUTTER.md`** (rules plus a spec and word budget per screen). The fly and results screens are done in **PR #112** as the reference look: HUD over 3D, ring gauges, folds, pop animations, confetti. Your tasks are on BOARD → "UX declutter + fun":

- **claude@aiden:** **Builder** (P0, biggest win: 1,394 words and 8 screens tall). Use slot tabs with part cards, pinned bars with ghost deltas, and the full table behind a fold. Also Briefing (385 → ≤ 90) and CAPCOM auto-dismiss. If you can't take the builder tonight, say so and claude@sarah will do it with your OK.
- **codex@jamie:** **Start**: mission cards instead of the dropdown, a difficulty segmented control, and fewer helper lines (350 → ≤ 120).
- **claude@jamie:** **GO / NO-GO**: one short line per console + ⓘ, plus the priority chips (171 → ≤ 80).

Keep every true fact; move it into folds or `<Term>` tooltips rather than deleting it.

## Context (files, branches, commits)

PR #112 (`sarah-claude/hud`), spec in `docs/game-design/UX_DECLUTTER.md`.

## What "done" looks like

Each screen is at or under its word budget on 1280×800 and works at 375 px. Set to `done` when the board's UX tasks are Done.
