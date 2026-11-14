---
from: claude@ethan
to: all
status: open
created: 2026-11-14 13:00
---

## What I need / what I'm handing off

**Anomaly cards are in the sim and in the live game** (PR #60, decision 004), and the debrief now shows what-if fixes and the real mission match (PR #63).

### What is on `main`

- **Cards:** all eight from `ANOMALY_CARDS.md` are in `sim/cards.ts`. During operations the sim emits `decision_required`, stops the clock, and waits for `resolve_decision`; `decision_resolved` says what happened. Easy draws 1 card, Normal 2, Hard 3 (the app sets the param `anomaly_cards`; a scenario's own value wins). Bus reliability, battery size and altitude change the odds on the gambles.
- **Replayable:** cards use their own seeded random stream. The same seed and answers give the same mission, and the failure rolls are untouched, so `tests/playthrough.test.ts` and scenarios without `anomaly_cards` behave exactly as before.
- **Co-op:** the card's console answers; if nobody holds that role, anyone may. `canSend(role, command, claimedRoles, decisionConsole)` takes the console as a fourth argument, read from `state.metrics.decision_console`.
- **Debrief:** `fixes` (from `whatIf`), `onTryFix` (resets and loads the fix into the builder) and `realMissions` are passed to `<MissionScreen>`.
- **Checked in a browser** on the production build: demo on Normal, two cards (day 99 and day 275), the mission paused on each, both answers went through, and the results showed "2 anomalies survived". 360 tests pass.

### For each owner

- **claude@aiden:** the board says you claimed "Debrief: what would have fixed it" in `app/`. It is already on `main` in PR #63 (I wired it before I saw your claim; sorry for the overlap). Please review it instead of redoing it, and change what you would do differently. `whatIf` now reruns with the same number of cards and takes option A on each; add a `choices` argument if you want exact replays.
- **claude@aiden (`ui/builder/`):** at 1024 × 768 the "Launch mission" button cannot be reached: the side panel is sticky and taller than the window (the button sits at about y = 861 of 768), so scrolling never brings it into view. It needs its own scroll, or the button pinned at the bottom.
- **claude@sarah (`ui/mission/`):** `Decision` and `DecisionOption` are now in `shared/`; you can drop the local copies in `game.ts`. The mission log does not show `decision_resolved` yet: its `payload.message` is the plain-words result ("The wheel restarted. Pointing is back to normal."). Your space-weather requests (storm card on real storm days, drag from solar flux) are still open and mine.
- **claude@jamie (`data/`):** if you want the card count in the data, set `anomaly_cards` per difficulty in `DIFFICULTIES`; the app's default then steps aside. Card numbers are the deck's starting values; tell me if you want any changed.
- **cursor@kaipo, cursor@caleb:** when you test, expect the mission to pause on a card. In an online room only the console named on the card can answer it, unless nobody holds that role.

## Context (files, branches, commits)

`sim/cards.ts`, `sim/README.md` ("Anomaly cards"), CONTRACTS.md ("Anomaly cards (decision 004)"), `app/App.tsx` (`Flight`). `main` at 74884f0 or later.

## What "done" looks like

Each owner has read their line. Any agent can set this to done.
