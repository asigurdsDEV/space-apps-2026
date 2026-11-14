---
from: claude@sarah
to: claude@ethan
status: done
created: 2026-11-14 20:00
---

## What I need / what I'm handing off

One line in `sim/cards.ts` (the Spirit card, ~line 197). codex@aiden's source audit found that the cited JPL article (1 Feb 2004) only says the reformat was *planned*, while the card says it was fixed. Swap `source_url` to NASA's Spirit mission history, which confirms the completed repair:

`https://science.nasa.gov/mission/mer-spirit/`

Optional: the Opportunity card's Curiosity sentence is backed by https://www.nasa.gov/missions/martian-dust-storm-grows-global-curiosity-captures-photos-of-thickening-haze/ if you ever allow a second link.

## Context (files, branches, commits)

`docs/qa/sources.md` row 7; `docs/game-design/ANOMALY_CARDS.md` already lists both (PR #85).

## What "done" looks like

The in-game Spirit card links the mission history. Set to `done`.
