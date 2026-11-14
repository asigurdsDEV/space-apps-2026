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

`MissionView`, `ResultsScreen`, `OrbitDiagram`, `eventText` and `logLines` are exported too, if the app wants to lay things out differently.

## Coordinate frame

Uses `body-centered` as defined in `sim/README.md`: the body (`kind: "body"`, `props.radius_m`) at the origin, the spacecraft (`kind: "spacecraft"`) in the x-y plane. Altitude is stretched so low orbits don't sit on the surface. The caption says so.

## Preview without the app loop

```bash
npm run dev
```

Then open <http://localhost:5173/ui/mission/preview/preview.html>. It runs the real sim with `sim/testing/fixtures.ts`, designs the fixture's good spacecraft and launches it. Add `?sandbox` for no random failures, or `?seed=7` to change the dice.

## Tests

`mission.test.tsx` checks the format helpers and event text, and renders both screens (with `react-dom/server`) from a real sim run: mid-flight, paused, before launch, and at the end.
