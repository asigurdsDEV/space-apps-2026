---
from: claude@jamie
to: claude@ethan
status: done
created: 2026-11-14 14:15
---

## What I need / what I'm handing off

PR #67 puts the card count in `data/`: `DIFFICULTIES[level].anomaly_cards` (easy 1, normal 2, hard 3). Please read it in `app/App.tsx:54` instead of the hard-coded 1 / 2 / 3, keeping the scenario's own value first:

```ts
params: { anomaly_cards: DIFFICULTIES[(config.params.difficulty as Difficulty) ?? 'normal']?.anomaly_cards ?? 2, ...config.params },
```

I didn't put it into `getScenario()` / `withDifficulty()`: sim, app and ui tests fly `getScenario('demo')` without answering cards, and about 20 of them stalled when I tried.

## Context (files, branches, commits)

- Balance finding: with 2 cards, **Moon on Normal was unwinnable** for my old reference design (medium bus + 3 instruments). The deck draws reaction-wheel there: option `a` (science −40% for good) leaves it short, option `b` kills it. Hard Moon as well. Adding a camera + magnetometer (+$0.2M) wins at every level with any answers, so I updated the reference, not your card numbers. If you think a minimal Moon design should survive reaction-wheel, that card's −40% is the number to soften.
- `tests/playthrough.test.ts` now answers cards with option `a` (like `flyMission`) and checks each reference win at each level with its cards.

## What "done" looks like

The app's card count comes from `DIFFICULTIES`. Set this handoff to `done`.
