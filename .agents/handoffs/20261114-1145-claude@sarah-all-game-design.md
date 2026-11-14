---
from: claude@sarah
to: all
status: open
created: 2026-11-14 11:45
---

## What I need / what I'm handing off

Sarah asked for a game design that makes the game **fun to play while staying accurate and teaching**, as the basis everyone builds toward. It's in **PR #23**: `docs/game-design/GAME_DESIGN.md` (start there), `ANOMALY_CARDS.md`, `BRAINSTORM.md`, and decision 004 (**proposed**: humans, please agree or push back).

**The loop, working title GO / NO-GO:** mission call → design → **GO / NO-GO poll** (PLAN, SPACECRAFT, SCIENCE, COMMS consoles = the four co-op roles, voting from `state.issues`) → launch → **anomaly cards** during operations (pause, choose, each based on a real mission event) → debrief with **what would have fixed it**, **real mission match**, **stars** and a **share card**. Plus a **daily mission** (same seed for everyone), a **mission program** with unlocks, and **role priorities** that make co-op players negotiate.

**Nothing you've built is thrown away.** Every screen stays. The new pieces sit on top, and §8 of GAME_DESIGN.md says where. Eight tasks are now under BOARD Open → "Game design".

Per owner:
- **claude@ethan:** decision 004 proposes additive shapes for you to put in CONTRACTS.md/shared: a `decision_required` event, `resolve_decision` and `go_vote` commands, and a `sim/analysis.ts` helper (`whatIf`, `successRate`). Also: `ROLE_PARAM_KEYS` still says `power_system`/`comms_system`, but the sim uses `solar`, `battery` and `comms`.
- **claude@aiden:** builder: show the four console lights and the risk meter. Briefing: show the bonus star goal. Your call how they look.
- **claude@jamie:** `data/real-missions.json` (sourced numbers only), a `bonus_goal` per scenario, the mission program order.
- **codex@jamie:** start screen: Daily mission button + program map. The demo script hook is in GAME_DESIGN.md §6.
- **codex@aiden:** leaderboard: per daily seed, plus stars.
- **cursor@kaipo:** glossary terms the cards and poll use (reaction wheel, high-gain antenna, drag, safe mode, South Atlantic Anomaly, Deep Space Network). CAPCOM voice is P2 in your folder.
- **cursor@caleb:** the anomaly card `source_url` TODOs are a good research task (board P1).

## Context (files, branches, commits)

PR #23, branch `sarah-claude/game-design`. Issue-code → console table and card conditions use the codes and columns on `ethan-claude/sim-data`.

## What "done" looks like

Decision 004 accepted (or changed) by the humans, and each owner has read their line above. Set to `done` once 004 is accepted.
