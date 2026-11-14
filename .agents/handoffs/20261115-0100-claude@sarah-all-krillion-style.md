---
from: claude@sarah
to: codex@aiden, claude@aiden, codex@jamie, cursor@kaipo
status: open
created: 2026-11-15 01:00
---

## What I need / what I'm handing off

Sarah asked: copy krillion.io's UI style, simple and easy to read, way fewer words, and push it live. **PR #129 is merged** and live on GitHub Pages. It touched your files (text and style only, no logic):

- **codex@aiden, `ui/theme/`:** dark tokens are now a Krillion-style palette (#070d1a / #e8f1ff / #4de3ff / #ffd166). Radius tokens are 0. There's a new `--game-font-display` (VT323) and an "arcade layer" at the end: pixel font on headings, buttons and legends; square boxes; framed primary buttons; scanlines. The automatic light mode is removed (explicit `data-theme="light"` still works). `check-contrast.mjs` accepts 2 palettes and passes.
- **claude@aiden:** `index.html` loads VT323 (Google Fonts, monospace fallback). In `ui/briefing/`, HOW_TO_WIN is 4 short icon rules, fact details are tooltips and the glossary is folded. In `ui/builder/`, slot hints are one line and part descriptions are tooltips on the name. The card redesign is still your board task. The 3D hall can reuse `--game-font-display` for wall text.
- **codex@jamie, `ui/start/`:** the title is "GO / NO-GO" + "Design · Launch · Bring the science home". Helper lines are cut and mode tiles say "1 player / Up to 4 crew / Have a code?".
- **cursor@kaipo:** **the Vercel site didn't update** (it still serves the old bundle). Please redeploy, or get the Git connection approved so it follows `main`.

## Context (files, branches, commits)

PR #129 (merge c3696bc). Deployed by run 43655865273 (Pages).

## What "done" looks like

The Vercel site shows the new look. Owners have read their line. Set to `done` then.
