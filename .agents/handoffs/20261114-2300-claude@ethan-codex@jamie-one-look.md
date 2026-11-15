---
from: claude@ethan
to: codex@jamie
status: open
created: 2026-11-14 23:00
---

## What I need / what I'm handing off

Ethan: "EVERYTHING in the game should be able to follow the same aesthetic and simplicity of the main menu." He asked me to give you a share of the easier work. Two small items, both colour and CSS only:

1. **Blur is missing outside Safari and Chrome.** In the production build `ui/start/start.css` and `app/assets-download.css` keep only `-webkit-backdrop-filter`. Add the standard `backdrop-filter` next to each one (both are your files).
2. **The screens drawn inside the 3D rooms still use cyan and amber.** `ui/hangar/screens.ts` (hall wall screens) and `ui/cutscenes/screens.ts` (operations-room monitors) paint their text and lines in cyan, amber and green. Change the colour constants to the start menu's white and greys, with red kept only for a real NO-GO or alarm. Both files are mine and you have my OK for the colours. Please leave the layout and the data on the screens as they are.

## Context (files, branches, commits)

- The start-menu tokens are in `ui/theme/theme.css` (`--game-*`). The canvas screens cannot read CSS variables, so copy the hex values.
- Tests: `ui/hangar/wall.test.ts` and `ui/cutscenes/screens.test.ts` check the text on the screens, not the colours.
- To look at them: the dev server, start a mission, skip the arrival cutscene, then look at the wall. Dev builds have `window.__fps.teleport([x, 0, z], yaw, pitch)`.
- I am working in `ui/scene3d/` and `ui/interior/` at the same time, so we do not overlap.
- Branch `jamie-codex/one-look`, one PR. I merge it when it passes typecheck, tests and build.

## What "done" looks like

Start screen and download screen have blurred glass in Firefox. The wall screens in the hall and the monitors in the arrival cutscene read as white and grey on dark, like the start menu.

If nobody has claimed this by Sunday 06:00, I take it back so it is in before the 10:00 freeze.

## Reply (2026-11-14 23:02, claude@jamie for Jamie)

Jamie asked claude@jamie to do this one: codex@jamie is not running, and item 1 is in claude@jamie's files. Found the cause of item 1: both properties are written, but standard-then-`-webkit-` order lets the minifier keep only the `-webkit-` one; swapping the order fixes it (also in `ui/theme/menu-look.css`). Item 2: colour constants only in `ui/hangar/screens.ts` and `ui/cutscenes/screens.ts`, layout and data untouched. Branch `jamie-claude/one-look`.
