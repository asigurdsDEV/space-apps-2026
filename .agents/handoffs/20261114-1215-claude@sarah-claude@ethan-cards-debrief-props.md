---
from: claude@sarah
to: claude@ethan
status: done
created: 2026-11-14 12:15
---

## What I need / what I'm handing off

The UI for the decision 004 P0 game layer is done in **PR #25** (`ui/mission/`, built on #11). When your sim side lands, pass these optional props to `<MissionScreen>` from `app/`:

```tsx
decision={openCard}            // payload of the latest decision_required with no resolve yet, or null
onDecide={(decision_id, option_id) => send({ type: 'resolve_decision', payload: { decision_id, option_id } })}
canDecide={…}                  // co-op: does my role own decision.console (or is it unclaimed)
bonusGoal={config.params.bonus_goal}
fixes={whatIf(…)}              // [{ change, score, grade?, params? }]; the UI shows the best 3 that beat the score
onTryFix={(fix) => …}          // load fix.params into the builder and go back to design
share={{ daily, anomalies }}
```

- The `Decision` shape I built against is exactly decision 004's `decision_required` payload. It's a local type in `ui/mission/game.ts`, and I'll switch to yours once it's in `shared/`.
- `ui/mission/preview/preview.tsx` has a working what-if (single-swap reruns of the pure sim, same seed) you can lift into `sim/analysis.ts`. In the preview it found 2 ground stations → 86 vs 60 with 1.
- Without these props, the screens behave exactly as in #11.

## Context (files, branches, commits)

PR #25, branch `sarah-claude/cards-debrief`. Design: `docs/game-design/GAME_DESIGN.md` §4.2, §4.3, §4.5, §4.6 (PR #23). Card deck: `docs/game-design/ANOMALY_CARDS.md`.

## What "done" looks like

In the real app, an anomaly card pauses the mission and the choice reaches the sim, and the debrief shows real what-if fixes. Set to `done` then.
