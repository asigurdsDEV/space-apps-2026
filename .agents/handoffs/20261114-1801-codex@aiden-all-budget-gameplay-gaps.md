---
from: codex@aiden
to: all
status: open
created: 2026-11-14 18:01
---

## What I need / what I'm handing off

Aiden says the player's budget feels too low and asks what else the game/sections need. Assessment only: no sim, catalog, budget, source or owner branch changes. Default assumption First Light Normal; asked Aiden which mission felt restrictive. Keep current claims (Ethan realism, Jamie Start flow) intact.

**Budget facts, current main bfb8814:** Normal budgets are $8M / $300M / $500M (First Light/Moon/Mars). Easy multiplies them by1.5, so First Light Easy already offers $12M. Sandbox already removes budget/deadline/science limits. Current catalog reference costs using sim/design.ts mass+build+launch formula, defaults ops0:

| Mission | Reference total | Normal budget | Margin |
|---|---:|---:|---:|
| First Light | $7,300,200 | $8,000,000 | $699,800 (8.75%) |
| Moon | $237,800,000 | $300,000,000 | $62,200,000 |
| Mars | $283,500,000 | $500,000,000 | $216,500,000 |

First Light starting assembly costs $1,774,600 but deliberately misses science; tests assert every starting design fails its teaching objective. All33 tests/playthrough.test.ts cases pass on this snapshot, including reference wins at all difficulties and anomaly responses. This proves those designs work, not that a novice finds them.

The racks expose all catalog entries, including $70M Falcon9 and $2B SLS, in the $8M CubeSat mission; slotParts() only filters kind/type. Descriptions now exist but help.ts does not preview replacement price delta, resulting budget, compatibility or forecast. Single-part fitting replaces a design choice, not a purchase that permanently spends cash on every E press; instruments toggle additions/removals. Display this clearly. Game costs are tuned gameplay figures, not authoritative mission procurement estimates.

## Recommended next scope, in priority order

1. **Codex Aiden UI follow-up (proposed, NOT claimed):** in existing contextual inspection space, show net cost change / remaining budget, compatibility reason and one meaningful resource effect before E. Add a small current-objective checklist/next-station cue, not another modal. Confirm source scope/release with owners and normal claim push first.
2. **Jamie data/Start + Ethan sim review after current claim:** use the existing Easy $12M budget for a clearly named guided introduction; retain Normal/Hard challenge and visible Sandbox. Inspect whether more than one plausible novice design wins and leaves a useful reserve. Do not change all costs/budgets based solely on this question. First Light has little spare budget and almost every dedicated launcher is intentionally unaffordable; label mission tiers/affordability on shelves rather than implying every displayed option fits.
3. **Ethan app/sim + Sarah design (proposed):** one mission activity with a visible outcome (science collected, data transmitted, safe-mode recovery) tied to the mission's real commands/metrics. app/Training.tsx explicitly keeps scanning progress local: it sends no commands and never changes mission science/score/stars. Moving through a training scene is not main-mission piloting yet. Any scored activity needs agreed sim/contract semantics; avoid attaching free points to training UI.
4. **Sarah results/weather + World integration handoff:** first-person debrief should expose why the run succeeded/failed, science sent vs goal, budget remaining, stars, saved best and retry with one fix. Classic App has weather/leaderboard/results content that World.tsx does not mount; budget guidance and NASA-data context should reach the3D experience. Readability/bounds need owner checks; no new fullscreen text panels.
5. **Caleb + Kaipo acceptance:** new person completes briefing→assembly→GO/NO-GO→launch→operations→debrief without an agent explaining. Record where they get lost; laptop/zoom/online co-op checks remain actual acceptance work. Kaipo already manually deployed #144–147; later realism updates can need a further deploy. App installation is not evidence Git integration succeeded.

## Suggested playable sections

Mission briefing (what/why/win target) → assembly (compare/fit/undo with resources) → GO/NO-GO (one actionable fix per failure) → launch (short/skippable) → operations (objective, real weather context, visible task result, anomalies) → debrief (causes, score/stars/best, next mission/retry). Settings/help can stay in the existing Menu (desktop mouse/keyboard, sound, motion/quality where supported). Reuse existing systems before adding new rooms, models, currencies or campaign mechanics.

## Context (files, branches, commits)

Read latest status/board/log/contracts + app/World, Training, fps/help, hangar/layout/MissionControl, builder/model, sim/design, data/scenarios, catalogs and playthrough fixtures. Snapshot bfb8814. No physical/browser playtest in this assessment. Prior3D screenshots are evidence for readability, not a novice usability study. Enter/return cutscene acceptance plan remains unexecuted; do not report it complete.

## What "done" looks like

New player understands the money cap and mission goal, can see a part's consequences before fitting it, finds at least one winning path without a recipe, has a meaningful task during flight and gets an understandable result/retry. Owners claim isolated work before implementation. These are recommendations and recorded gaps, not features marked built or assignments claimed for other agents.
