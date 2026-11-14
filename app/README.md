# app/ — the game shell

Owner: claude@ethan. Ties `data/`, `sim/`, `ui/builder`, `ui/mission` and `net/` together: solo play, same-screen play, and online co-op for up to 4 players.

| File | What it is |
|---|---|
| `game.ts` | The game store. No React, DOM or timers. Owns the loop that calls the sim. |
| `session.ts` | `Session`: the only thing the screens know about. `createSoloSession`, `createHostSession`, `createGuestSession`. |
| `room.ts` | `openRoom(joinCode)`: opens a PeerJS room (host or guest). The only file that touches the network; PeerJS is loaded on demand. |
| `driver.ts` | `startDriver(game)`: calls `game.advance(realMs)` from `requestAnimationFrame`. The only timer. |
| `useSession.ts` | `useSession(session)`: `useSyncExternalStore` over a `Session`. |
| `slots.ts` | The builder's slots with the param keys the sim reads (`power_system`, `comms_system`). |
| `Lobby.tsx` | Co-op pieces: room code, crew list with role picker, lobby, notice banner. |
| `App.tsx`, `app.css` | Start screen, lobby, then `MissionBuilder` while `metrics.phase` is `design`, then `MissionScreen`. |

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

## Sessions

Every screen takes a `Session`. Its snapshot adds `players`, `me`, `notice` and `stage` (`lobby`, `playing` or `closed`) to the game's `state`, `events`, `paused` and `speed`.

| Way to play | Session | Transport |
|---|---|---|
| Play solo | `createSoloSession(game)` | none |
| Same screen | `createHostSession(game, new LocalTransport(), 'Crew')`, started at once | `LocalTransport` (no network) |
| Host a game | `createHostSession(game, transport, name)` | `PeerTransport` from `openRoom(null)` |
| Join a game | `createGuestSession(transport, name)` | `PeerTransport` from `openRoom(code)` |

How co-op works (decision 002, contract section "Multiplayer"):

- **Only the host runs the sim.** A guest session has no `Game` and never imports `sim/`.
- **The host checks every command**, its own included, with `canSend(role, command, claimedRoles)` from `shared/net.ts`. The sender is the transport's `from`; nothing in a payload is trusted. A refusal goes back as a `rejected` message and shows up as that player's `notice`. So does a launch the sim refuses.
- **Roster:** `net/`'s `HostRoom` holds the 4-player cap and one-player-per-role. The host sends `roster` after every join, leave and role change. A guest whose connection drops is removed too.
- **State:** the host sends `state` after every design change, when the phase changes, when the sim ends, and otherwise at most every `STATE_INTERVAL_MS` (100 ms) in flight.
- **Lobby:** the host sends no `state` until `start()`. A guest stays in the lobby until its first `state` arrives, so a late joiner goes straight into the running game.
- **Same screen** is a host session with one seat that holds no role, so every role's controls work on that device.
- `close()` stops everything the session started (driver, timers, transport). The shell calls it from "Main menu" and "Leave".

Three things the contract does not spell out, decided here:

1. `state` has no field for the app's pause flag or speed, so the host sends them inside the SimState: `status: "paused"` and `metrics.speed_multiplier`. Guests read them back from there.
2. Every `state` message carries the whole event list, not only the new events. A late joiner or a reset then needs no special handling. A mission produces a few dozen events.
3. The room code is 6 characters. The PeerJS id is `smdg-` plus the code.

Messages are checked with `isNetMessage` (`shared/net.ts`) by `PeerTransport` and again by the sessions.

## Checking online co-op by hand

The tests use `LocalTransport` only. A real WebRTC connection needs two browsers and a person:

1. Run `npm run dev` and open the page in two different browsers (or one normal and one private window), ideally on two devices on the venue Wi-Fi.
2. In browser A, type a name and press **Host a game**. Expect the lobby with a 6-character room code within a few seconds.
3. In browser B, type a name and the room code and press **Join a game**. Expect both lobbies to list both players, host first.
4. In A pick **Spacecraft**, in B pick **Science**. Expect each role to show the other player's name and be disabled for them. Press **Start mission** in A; both should show the builder.
5. In B pick an instrument: the budgets should change in both browsers. In B pick a bus: nothing should change, and B should see "Only <host name> (Spacecraft) can change that part of the design." with a dismiss button. Finish a valid design and launch from either browser (mission planning is unclaimed); both should show the flight and stay in step, including pause and speed.
6. Close browser B: A's crew menu should drop to one player and free the role. Start again, then press **Main menu** in A: B should show "The room is closed". Also try a wrong room code (expect a "Could not join that room" message on the start screen) and a fifth player.

If step 2 or 3 fails on the venue network, **Same screen** and **Play solo** still work with no network.
