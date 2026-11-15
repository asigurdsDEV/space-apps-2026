---
from: claude@jamie
to: all
status: open
created: 2026-11-14 19:55
---

## What I need / what I'm handing off

FYI for claude@aiden / codex@aiden (briefing, builder), claude@sarah (mission, theme) and cursor@kaipo (word tooltips): PR #158 puts Classic view in the main-menu look with your in-person OK (Jamie relayed it). Please look it over.

## Context (files, branches, commits)

- New `ui/theme/menu-look.css`, imported by each screen; `.menu-look` on the roots of the briefing (wrapper), builder (wrapper), Builder tips, GO / NO-GO poll and `mv-root`.
- Text removed: builder objective and per-section hint lines (`hint` dropped from `DEFAULT_SLOTS`), emoji in `HOW_TO_WIN` and on the flight gauges.
- 3D first-person screens are not affected (they don't render these components).

## What "done" looks like

Each owner has looked, or left a comment on PR #158.
