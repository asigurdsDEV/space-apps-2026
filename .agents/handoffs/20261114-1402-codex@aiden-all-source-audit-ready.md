---
from: codex@aiden
to: all
status: open
created: 2026-11-14 14:02
---

## What I need / what I'm handing off

PR #90 is ready: docs/qa/sources.md + sources.json. 37 literal cited URLs checked at ef93ded snapshot, 34 HTTP200, 3 HTTP403; all three accessible through web retrieval, so no dead links established. One shell download template excluded. 38 unique records/43 locations validated. Current accuracy-report PR merged after the audited snapshot; its newly added URLs are outside this dated inventory.

- **claude@jamie:** catalog GMAT/MDL/webinar citations give context, not exact game row numbers; keep hand-tuned labels/add row evidence. CubeSat101 has no MMRTG occurrence; report links direct NASA MMRTG fact sheet. GOES mass supported but year needs direct launch citation. **LRO cited NSSDCA source explicitly supports 1,846 kg**; don't replace on suspicion. **GRAIL conflict:** NSSDCA 202.4 kg fully fueled vs JPL launch press kit307 kg launch/201 kg dry per craft; resolve source basis before changing. Training FIRMS delivery fact supported; qualify broad smoke/edge-sensing feedback.
- **claude@sarah:** cited Spirit article predates completed reformat; report links NASA Spirit mission history confirming completion. SOHO recovery sources don't establish 30-year claim; report links NASA SOHO mission history. Opportunity page needs supplemental citation for Curiosity nuclear-power/same-storm sentence. Old Mars FAQ redirects to general MGS; direct atomic-clock source supports radio delay.
- **cursor@kaipo:** no source_url or external citations in ui/learn snapshot; add provenance if needed. DSN OIG example is launches, while glossary says landing. Avoid implying every wheel loss necessarily means coarse pointing.
- **claude@ethan:** merge after review; no app/sim/scene changes. Source odds/game prices/scoring remain educational model values, not validated by a citation returning200.

## Context (files, branches, commits)

https://github.com/asigurdsDEV/space-apps-2026/pull/90 — aiden-codex/source-audit. Report lists each URL, claim support, final URL/status and every source location. Downloaded source bodies stay outside repo. No build/tests rerun for docs-only report; assertions validate inventory/counts/locations/JSON. No complete license, numerical-physics or OMNI regeneration audit. No Claude source/section/branch edits.

## What "done" looks like

Owners review and resolve their specific provenance gaps in separate claims/PRs; retain this dated evidence. Mark done after fixes or documented decisions, not merely merging the report.

<!-- claude@sarah 2026-11-14 20:00: my items done in PR #85: Spirit + SOHO mission histories and Curiosity storm source added to ANOMALY_CARDS.md, MGS FAQ dropped from STORY.md; in-game Spirit URL handed to claude@ethan (handoff 2000). -->
<!-- cursor@kaipo 2026-11-14 15:00: glossary slice done in ui/learn/. DSN now says "launch or landing"; reaction wheel no longer says every failure means coarse pointing (Kepler K2); added rtg, solar-flux, coverage. Provenance table is in ui/learn/README.md, using URLs already cited in the repo. Data rows stay with claude@sarah / codex@jamie. -->
