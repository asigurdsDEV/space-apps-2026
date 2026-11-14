# ui/mission/ — mission run view + results screen

Owner: claude@sarah. What the player sees after pressing **Launch**: the spacecraft on its orbit, live progress (science, mission time, money, data), a mission log, run controls, and the graded results screen when the mission ends.

React only. Reads `SimState` / `SimEvent` / `Summary` from `shared/`, and sends `Command`s up. It never imports `sim/` or `data/` (only the dev preview and tests do).

## Use it from the app loop

```tsx
import { MissionScreen } from '../ui/mission'

<MissionScreen
  state={state}            // latest SimState
  events={events}          // every SimEvent so far, oldest first (the log shows the newest 50)
  onCommand={handle}       // gets pause / resume / set_speed / reset
  paused={paused}          // app-side pause flag (falls back to state.status === 'paused')
  speed={speed}            // current set_speed multiplier, to highlight the button
  title={config.title}
/>
```

- Shows `MissionView` while flying and switches to `ResultsScreen` once `state.status === 'ended'`.
- The results come from the last `scenario_ended` event's `summary`, or pass `summary={summary(state)}`.
- Speed buttons send `set_speed` with multipliers `1, 5, 20, 60`. The app decides what 1× means. The preview uses 1 sim day per second.
- "Start over" and "Design a new mission" both send `reset`.
- It brings its own CSS (`mission.css`, every class prefixed `.mv`) inside a `.mv-root` wrapper.

### Game layer (decision 004, `docs/game-design/GAME_DESIGN.md`)

Optional props. Leave them out and the screens work as before.

```tsx
<MissionScreen
  {...above}
  decision={openCard}                 // latest unresolved `decision_required` payload, or null
  onDecide={(decision_id, option_id) => send({ type: 'resolve_decision', payload: { decision_id, option_id } })}
  canDecide={myConsoleOwnsIt}         // co-op: false greys out the options for other players
  bonusGoal={config.params.bonus_goal} // 'no_data_lost' | 'budget_left_20' | 'mass_margin_10'
  fixes={whatIf(...)}                  // from sim/analysis.ts; best 3 that beat the score are shown
  onTryFix={(fix) => loadIntoBuilder(fix.params)}
  share={{ daily: '2026-11-14', anomalies: cardsAnswered }}
/>
```

- **Anomaly card:** shown above the run view while `decision` is set. Pause and speed are locked, because the sim doesn't advance time until the card is answered. Focus moves to option A for keyboard players.
- **Debrief:** 3 stars (success, scenario bonus goal, 85+ points), "Change one thing" / "Even better" with **Try it**, and a share card with a Copy button.
- `Decision` and `WhatIfFix` are local types in `game.ts` matching decision 004. When claude@ethan adds them to `shared/`, switch to those.

`MissionView`, `ResultsScreen`, `eventText` and `logLines` are exported too, if the app wants to lay things out differently.

## Orbit view

The run view shows `ui/scene3d`'s `<SpaceView mode="orbit">` (decision 003, claude@ethan's folder): the planet, the picked orbit and the spacecraft. It has its own text fallback when WebGL is missing.

## Real mission match

Pass `realMissions={rowsAsObjects(realMissions)}` (claude@jamie's `data/real-missions.json`) and the debrief shows "Your mission is most like …" with the mission's fact and a Source link. `matchMission` picks the same body, then orbit class, then objective, then the closest launch mass.

## Preview without the app loop

```bash
npm run dev
```

Then open <http://localhost:5173/ui/mission/preview/preview.html>. It runs the real sim with `sim/testing/fixtures.ts`, designs the fixture's good spacecraft and launches it. Add `?sandbox` for no random failures, `?seed=7` to change the dice, or `?weak` to fly a one-ground-station design that loses data, so the debrief has fixes to show. A stand-in anomaly card pops up on day 20 until the sim emits real ones. The what-if fixes are real reruns of the sim.

## Tests

`mission.test.tsx` checks the format helpers and event text, and renders both screens (with `react-dom/server`) from a real sim run: mid-flight, paused, before launch, and at the end.
