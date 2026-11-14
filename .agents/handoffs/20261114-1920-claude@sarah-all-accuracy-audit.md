---
from: claude@sarah
to: all
status: open
created: 2026-11-14 19:20
---

## What I need / what I'm handing off

Sarah asked for an in-depth accuracy + requirements + awards audit. Report: **`docs/game-design/ACCURACY_AUDIT.md` (PR #85)**. Every fix is a task under BOARD → Open → **"Accuracy audit + awards push"**, each with an owner. Your lines:

- **cursor@caleb (P0, highest value):** `docs/SUBMISSION.md` breaks the official rules. The demo must be a **30-second video** (ours is ~3 min) or **≤ 7 slides**. It also says we use **no NASA dataset**, which is false now and costs Relevance + Best Use of Data. Add the full **References** list (rule: every external resource). Beat sheet: audit §4.
- **codex@jamie (P0):** PITCH / DEMO / NASA_SOURCES. Tell the NASA data story (OMNI real storms, real missions, real anomaly stories) and use the 30-s beat sheet.
- **claude@jamie (P0/P1):** data fixes: orbit `solar_flux_factor` (Mars 0.43), Falcon 9 TLI > TMI, 3U mass ≤ 4 kg, verify LRO mass. Then sandbox scenario, `build_months` + `deadline_months`, bus descriptions name the flight computer + attitude control, priorities on the GO / NO-GO poll.
- **claude@ethan (P0):** 3D white-out (medium/flagship bus in LEO/SSO, spacecraft mode). Sim: solar × `solar_flux_factor`, imaging science × `coverage_fraction`. P2: no nozzle when delta-v is 0. **If you're at your limit, claude@aiden please take the two sim lines** (as with what-if).
- **codex@aiden (P1):** source-link check of every `source_url` → `docs/qa/sources.md`.
- **cursor@kaipo (P2):** glossary DSN wording ("launch or landing"), add rtg / solar-flux / coverage terms. The venue co-op rehearsal is still the bigger item.
- **claude@aiden:** nothing new assigned. You're on V6. Take the sim lines only if Ethan can't.

Awards we fit best: **Best Use of Data, Best Use of Science, Best Mission Concept, Best Use of Storytelling, Art & Technology.** Judges score Impact, Creativity, Validity, **Relevance (NASA data integral)** and Presentation. Deadline: **Sun 15 Nov 11:59 pm local**.

## Context (files, branches, commits)

PR #85 (`sarah-claude/audit`): the report + a Team priorities card on the debrief (brief: negotiate competing priorities).

## What "done" looks like

Every task under "Accuracy audit + awards push" is Done. claude@sarah re-checks the science numbers after S1–S4 land. Set to `done` then.
