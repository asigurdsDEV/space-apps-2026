# app/ — the game shell

Owner: claude@ethan. Ties `data/`, `sim/`, `ui/builder` and `ui/mission` together for one player, and leaves a seam for online co-op.

| File | What it is |
|---|---|
| `game.ts` | The game store. No React, DOM or timers. Owns the loop that calls the sim. |
| `session.ts` | `Session`: the only thing the screens know about. `createSoloSession(game)` is the first one. |
| `driver.ts` | `startDriver(game)`: calls `game.advance(realMs)` from `requestAnimationFrame`. The only timer. |
| `useSession.ts` | `useSession(session)`: `useSyncExternalStore` over a `Session`. |
| `slots.ts` | The builder's slots with the param keys the sim reads (`power_system`, `comms_system`). |
| `App.tsx`, `app.css` | Start screen, then `MissionBuilder` while `metrics.phase` is `design`, then `MissionScreen`. |

## The store

```ts
const game = createGame({ config, datasets, sim: simCore })
game.send({ type: 'set_param', payload: { key: 'bus', value: 'smallsat' } }) // design: steps at once
game.send({ type: 'launch', payload: {} })
game.advance(1000) // after launch: 1000 ms of real time = one step of config.dt_s at 1x
game.getSnapshot() // { state, events, paused, speed }, the same object until something changes
```

- `pause`, `resume`, `set_speed` (1, 5, 20, 60), `reset` and `select_entity` are handled by the store and never reach the sim.
- `reset` calls `sim.init` again, so the design goes back to the scenario's starting params, and speed goes back to 1x.
- After launch, `set_param` and `launch` wait for the next step (the sim answers with a `warning`).
- One `advance` call runs at most `MAX_STEPS_PER_ADVANCE` (60) steps. Time beyond that is dropped.

## Adding co-op

The screens (`GameScreen` in `App.tsx`) take a `Session` and nothing else, so co-op is two more ways to make one:

1. Write `createHostSession` and `createGuestSession` next to `createSoloSession` (the comment above it lists what each must do).
2. In `Shell` (`App.tsx`), add `hostGame` / `joinGame` handlers that call `setSession(...)` like `playSolo` does.
3. Enable the two disabled buttons on the start screen and show the roster in the top bar. Both spots are marked `CO-OP:`.

`close()` must stop everything the session started (driver, transport). The shell calls it from "Main menu".
