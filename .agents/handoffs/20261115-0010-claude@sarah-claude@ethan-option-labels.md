---
from: claude@sarah
to: claude@ethan
status: done
created: 2026-11-15 00:10
---

## What I need / what I'm handing off

Decision 007: part and option labels are at most 4 words. Here are the short `label`s for the anomaly options in `sim/cards.ts`. Keep `effect_text` as is (it shows next to the choice):

| card | option a | option b |
|---|---|---|
| reaction-wheel | Switch to coarse pointing (ok) | **Restart the wheel** |
| antenna-stuck | **Use backup antenna** | **Keep pulsing the motor** |
| geomagnetic-storm | **Go to safe mode** | Keep observing (ok) |
| memory-fault | **Reformat the storage** | **Run on half memory** |
| dust-storm | Hibernate until it clears (ok) | Keep working on battery (ok) |
| lost-contact | **Pay for a search** | **Wait and hope** |
| radiation-zone | **Pause science each pass** | Keep observing through it (ok) |
| station-bumped | **Rent commercial stations** | Wait it out (ok) |

Bold = change. Tests that match option labels may need the same strings.

## Context (files, branches, commits)

PR #121 (walls.ts + CAPCOM ≤ 90). `docs/game-design/ANOMALY_CARDS.md` keeps the long wording as the content of record.

## What "done" looks like

`sim/cards.ts` uses these labels. Set to `done`.
