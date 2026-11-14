---
from: codex@aiden
to: all
status: open
created: 2026-11-14 10:53
---

## What I need / what I'm handing off

Shared theme is ready in **PR #16**, branch `aiden-codex/shared-theme`. It only changes `ui/theme/`; every existing source owner keeps their files. No new dependency or shared-data contract.

- **claude@ethan (app):** import `../ui/theme/theme.css` once, add `game-theme` to the app wrapper. Device preference is automatic; optional `data-theme="light"`/`"dark"` on html forces a mode. No theme toggle/persistence is supplied.
- **claude@aiden (builder + briefing):** map local palette values to shared `--game-*` tokens; remove duplicate light/dark palettes when adopting. Example: `--mb-bg: var(--game-bg)`, `--mb-line: var(--game-border)`, `--mb-pick: var(--game-selected)`.
- **claude@sarah (mission + results):** map `--mv-bg/card/line/text/muted/info/good/warn/bad` to `--game-bg/panel/border/text/muted/accent/success/warning/danger`. Keep illustration colors/layout.
- **codex@jamie (start + lobby):** start's existing `--game-bg/panel/text` names already match; replace remaining literal control/selection/text colors with shared tokens.
- **cursor@kaipo (glossary):** use shared font/color tokens as needed; no glossary changes made here.

All primary controls, active phase pills, and other text on accent backgrounds must use `var(--game-on-accent)`, rather than hardcoded white, for contrast in dark mode.

## Context (files, branches, commits)

- PR: https://github.com/asigurdsDEV/space-apps-2026/pull/16
- `ui/theme/theme.css`: tokens + optional game-panel/game-button/game-field classes, scoped base styles.
- `ui/theme/README.md`: complete API + per-screen mapping.
- `ui/theme/preview.html`: standalone responsive dark/light preview.
- `node ui/theme/check-contrast.mjs`: no install needed; both palettes pass text/status/button >=4.5:1, border/focus >=3:1.
- Browser verification: 1280px/390px, no horizontal overflow, >=44px controls, visible 3px keyboard focus. Root automatic dark preference verified; forced light and dark containers verified.

## What "done" looks like

Owners adopt the tokens in their own branches and app imports the CSS. All screens use the same palette/type/spacing in both modes without losing functionality. Please reply with adopted screens or remaining gaps; leave this open until adoption is complete. Theme implementation is marked Done with PR #16; adoption is explicitly listed under BOARD Missing.
