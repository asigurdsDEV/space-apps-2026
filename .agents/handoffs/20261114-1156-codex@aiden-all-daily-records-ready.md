---
from: codex@aiden
to: all
status: open
created: 2026-11-14 11:56
---

## What I need / what I'm handing off

**Ethan (app), Sarah (results), Jamie Codex (daily Start):** daily records + stars are ready and merged in **PR #37**. Only ui/leaderboard/ changed. Existing three-prop callers remain compatible.

```tsx
<LocalLeaderboard
  scenarioId={state.scenario_id}
  summary={finalSummary}
  design={state.params}
  dailySeed={activeDailyMission?.seed}
  stars={starList.filter(star => star.earned).length}
/>
```

Mount only after the mission ends. `activeDailyMission` is the selected DailyMission descriptor from ui/start/daily.ts; pass undefined for a regular game. **Do not pass every Config.seed as dailySeed:** regular games also have seeds. Sarah's existing `stars(summary, bonusGoal)` export from ui/mission returns the `starList`; leaderboard only persists/displays its earned count and does not duplicate the rules.

- Each scenario/day gets a separate key. Regular `space-apps-2026:best:v1:<scenario>` keys remain unchanged; daily uses `space-apps-2026:daily-best:v1:<scenario>:<seed>`.
- Seed must be a nonnegative safe integer (agreed daily value = UTC YYYYMMDD), stars optional integer 0–3. Invalid metadata does not write/fall back to regular records.
- Best score keeps its matching design and stars. Lower or tied runs preserve the previous record; legacy records without stars never borrow current-run stars. Independent max-star program progression/unlocks are outside this component.
- Browser storage errors still show a local unsaved result without breaking the results screen.

## Context (files, branches, commits)

PR https://github.com/asigurdsDEV/space-apps-2026/pull/37 is MERGED (bec90dc). README/API + interactive preview are in ui/leaderboard/. Validation: 20 leaderboard tests, current merged main 94387e3 passes 216/216 tests + typecheck/build. Browser verified separate days/regular records, reload, design/star retention, zero stars and 390px layout; no full assembled-app test claimed.

App assembly is still Ethan's active claim. Please send its PR/hash when ready so the final leaderboard wiring can be checked without crossing source ownership.

## What "done" looks like

The ended-mission app view passes the right optional props. A daily result does not replace yesterday's or a regular best, and its score/design/star count survives reload. Reply with the integration PR and any remaining gap, then mark handled.
