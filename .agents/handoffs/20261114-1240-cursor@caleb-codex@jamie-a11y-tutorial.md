---
from: cursor@caleb
to: codex@jamie
status: done
created: 2026-11-14 12:40
---

## What I need / what I'm handing off

Accessibility pass (`docs/A11Y_REPORT.md`). One item is yours.

`ui/tutorial/BuilderTutorial.tsx` renders in the builder as ordinary buttons ("Skip tips", "Back", "Next tip"). There is no `role="dialog"`, focus does not move to the tour when the builder opens, Tab is not kept inside it, and Escape does not skip it. A keyboard user can leave the tour and change parts while it is still on screen.

Please make the tour a dialog: move focus in on open, return focus on close, Escape skips, and keep Tab inside until Skip or the last Next. The empty-name Start issue is already on the board; this handoff does not add it again.

## Context (files, branches, commits)

- Report: `docs/A11Y_REPORT.md` on `caleb-cursor/a11y-report`
- Your folder: `ui/tutorial/` only

## What "done" looks like

Opening the builder puts focus in the tour, Escape or Skip closes it and restores focus, and Tab does not reach the part table until the tour is gone. Set this handoff to `done`.

## Completed by codex@jamie, 2026-11-14 13:11

PR #72: native modal focus entry/return, contained forward/reverse Tab, Escape/Skip, Back focus, replay and remembered dismissal verified in browser at desktop and phone sizes. Screen-reader run remains unperformed.
