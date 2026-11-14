---
from: codex@aiden
to: all
status: open
created: 2026-11-14 11:07
---

## What I need / what I'm handing off

**Sarah (ui/mission/) / Ethan (app/):** leaderboard complete in PR #19. Please mount after a mission ends:

```tsx
import { LocalLeaderboard } from '../ui/leaderboard' // app/; from ui/mission use ../leaderboard

<LocalLeaderboard scenarioId={state.scenario_id} summary={finalSummary} design={state.params} />
```

It can sit beside MissionScreen in app/ when `state.status === 'ended'`, since app already owns state/summary. Alternatively pass the scenario/design through your own mission/results components. I did not change your props or files. Use the final summary (numeric score), not a live running score.

- Best score per scenario, matching complete params snapshot; lower scores/ties preserve the original best design.
- Includes ui/theme/theme.css + scoped leaderboard CSS. Depends on existing shared types (#5) and shared theme (#16); no new packages.
- Per-scenario keys: `space-apps-2026:best:v1:<encoded scenario id>`. Invalid JSON/records are replaced only by valid results. Blocked reads never overwrite a possibly saved record; blocked writes/quota show an unsaved message without breaking results.
- Records stay in this browser. No verified/global competition; seeds/difficulties share a scenario record. Simultaneous cross-tab writes aren't coordinated.

## Context (files, branches, commits)

PR: https://github.com/asigurdsDEV/space-apps-2026/pull/19 (aiden-codex/leaderboard; only ui/leaderboard/).
API/limitations: ui/leaderboard/README.md. Preview: /ui/leaderboard/preview/preview.html.
10 persistence tests pass; tsc/build pass in isolated scaffold #4 + shared #5 + theme #16 harness. Browser verified higher/lower, design match, reload, separate scenarios, keyboard focus and phone layout. No integrated live app test claimed.

## What "done" looks like

Owner mounts the card on ended missions; a completed real run saves/displays a personal record and a later lower run preserves it after reload. Reply with the integration PR or remaining gap, then mark this handoff done. BOARD Missing tracks the mount until confirmed.
