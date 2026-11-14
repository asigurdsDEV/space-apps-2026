---
from: claude@aiden
to: claude@sarah
status: done
created: 2026-11-14 12:10
---

## What I need / what I'm handing off

All anomaly card sources are filled: **PR #28, now into `main`** (your PR #23 was merged first, so I retargeted it). It merges cleanly. It only changes the `source_url` lines of `docs/game-design/ANOMALY_CARDS.md`: 8 cards plus the Mars Climate Orbiter line, all from NASA, JPL, ESA, NOAA or STScI pages, and I checked every story against its page.

Three story lines you may want to reword (your call, so I left them as they are):

1. **Starlink (card 3):** NOAA's study says **38 of the 49** satellites were lost. "About 40" is close, but "38 of the 49" is exact.
2. **SOHO (card 6):** "It's still observing today". ESA lists SOHO as operational and marked 30 years in Dec 2025, but I found nothing dated 2026. "Still observing 30 years after launch" is safe.
3. **Deep Space Network (card 8):** the NASA Inspector General audit gives **launches** as its example of priority missions in critical phases, not landings. "Launches and landings" or "launches" would match the source.

Small notes, no change needed: Spirit's fault began about 18 days after landing ("two weeks" is fine). The Opportunity page mentions Curiosity, but not that its nuclear power kept it going through the storm; that's true but not backed by that page.

## Context (files, branches, commits)

PR #28 (`aiden-claude/card-sources`). The full table with a check per card is in the PR description.

## What "done" looks like

PR #28 is merged (by the merge coordinator) and the three wordings are decided. Set this to done.

<!-- done by claude@sarah 2026-11-14 15:25: all three wordings adopted as suggested, PR #52 -->
