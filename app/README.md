# app/ — the game shell

Owner: claude@ethan. `app/main.tsx` renders `<App />`. The app mounts every screen and switches between them. The screens are pure views from `ui/`; the app gives them props and nothing else.

```
Start ─► (online: Lobby) ─► Briefing ─► Builder ─► launch ─► Mission ─► Results ─┐
  ▲                                        ▲                                      │
  └──────────── Main menu ─────────────────┴──────── Design a new mission ────────┘
```

## How the screens are wired

| Step | Screen | What the app gives it |
|---|---|---|
| Start | `ui/start` `StartScreen` | `SCENARIOS`: every scenario in `data/` at every difficulty (`withDifficulty`), the scenario as written first. `onStart` plays solo, hosts a room or joins one. `busy` and `error` come from opening the room. |
| Start | `SameScreen` (app) | A strip under the Start screen: play on one screen with no network. `ui/start` has no mode for it. |
| Lobby | `ui/lobby` `LobbyScreen` | Online rooms only, while the session's stage is `lobby`. `onClaimRole` → `session.claimRole`, `onContinue` → `session.start()`, `onLeave` → main menu, `error` is the session's notice. |
| Briefing | `ui/briefing` `Briefing` | The scenario's `Config`. Each player reads it on their own screen and presses Start designing. Back goes to the main menu. |
| Builder | `ui/builder` `MissionBuilder` | `state`, `send`, and `players` and `me` from the session, so role badges and locks work. It mounts the 3D `SpaceView` itself. |
| Builder | `ui/share` `SharePanel` | Under the builder: copy link, save, load and compare designs. |
| Launch | `LaunchView` seam | See below. Today it is empty and the game goes straight on. |
| Mission, Results | `ui/mission` `MissionScreen` | `state`, `events`, `onCommand`, `paused`, `speed`, `title`, and the final `summary` once the sim has ended. |
| Results | `ui/leaderboard` `LocalLeaderboard` | Under the results: the personal best for this scenario and difficulty. |

- **Which screen shows** is decided in `Room` (`App.tsx`) from the session snapshot: `stage`, then `state.metrics.phase`.
- **Guests learn the scenario from the host.** The first `state` message carries `scenario_id` (for example `mars-hard`), and the guest looks it up in `SCENARIOS`. That same message moves every guest from the lobby to the briefing.
- **Play again** is the results screen's "Design a new mission". It sends `reset`, which goes back to the builder with the scenario's starting design. **Main menu** is in the top bar on every game screen and closes the session.
- **Shared links** (`designFromHash` from `ui/share`): a design in the address bar when the page loads is applied to the first game this player starts or hosts. A link pasted while the builder is open is applied at once.
- **Launch seam:** `LaunchView` in `App.tsx` is `null`. Set it to `ui/scene3d`'s `<LaunchView state onDone />` and it is shown after every successful launch until it calls `onDone`. Nothing else has to change.
- **Theme:** `App.tsx` imports `ui/theme/theme.css` and `ui/learn/learn.css` once and wraps the game in `game-theme`. The app's own chrome (top bar, notice, crew menu, the one-screen strip, the closed-room page) uses only `--game-*` tokens, so it follows light and dark.
- `ui/start`, `ui/lobby` and `ui/mission` only have a dark palette so far, and the Start screen cannot be read on a light page. The app pins the theme to dark around those three (`DARK_ONLY` in `App.tsx`). Remove the pin when they use the tokens.
- The tab title and the icon are set in `main.tsx`, because `index.html` belongs to the scaffold.

## Files

| File | What it is |
|---|---|
| `App.tsx`, `app.css` | The wiring above. Exports `App`, `Room`, `GameScreen`, `SCENARIOS`, `BASELINE`. |
| `Crew.tsx` | The app's chrome inside a game: the notice banner, and the top bar's crew menu for online rooms (room code, roster, role picker). |
| `game.ts` | The game store. No React, DOM or timers. Owns the loop that calls the sim. |
| `session.ts` | `Session`: the only thing the screens' wiring knows about. `createSoloSession`, `createHostSession`, `createGuestSession`. |
| `room.ts` | `openRoom(joinCode)`: opens a PeerJS room (host or guest). The only file that touches the network; PeerJS is loaded on demand. |
| `driver.ts` | `startDriver(game)`: calls `game.advance(realMs)` from `requestAnimationFrame`; an online host uses `timerClock()` so it keeps stepping in a background tab. The only timer. |
| `useSession.ts` | `useSession(session)`: `useSyncExternalStore` over a `Session`. |

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
| Play on one screen | `createHostSession(game, new LocalTransport(), 'Crew')`, started at once (no lobby) | `LocalTransport` (no network) |
| Host online | `createHostSession(game, transport, name)` | `PeerTransport` from `openRoom(null)` |
| Join a room | `createGuestSession(transport, name, { baseline })` | `PeerTransport` from `openRoom(code)` |

How co-op works (decision 002, contract section "Multiplayer"):

- **Only the host runs the sim.** A guest session has no `Game` and never imports `sim/`.
- **The host checks every command**, its own included, with `canSend(role, command, claimedRoles)` from `shared/net.ts`. The sender is the transport's `from`; nothing in a payload is trusted. A refusal goes back as a `rejected` message and shows up as that player's `notice`. So does a launch the sim refuses.
- **Roster:** `net/`'s `HostRoom` holds the 4-player cap and one-player-per-role. The host sends `roster` after every join, leave and role change. A guest whose connection drops is removed too.
- **State:** the host sends `state` after every design change, when the phase changes, when the sim ends, and otherwise at most every `STATE_INTERVAL_MS` (100 ms) in flight.
- **Lobby:** the host sends no `state` until `start()` (the lobby's Continue button). A guest stays in the lobby until its first `state` arrives, so a late joiner goes straight to the briefing, or to the flight if the mission has launched.
- **Play on one screen** is a host session with one seat that holds no role, so every role's controls work on that device.
- `close()` stops everything the session started (driver, timers, transport). The shell calls it from "Main menu" and "Leave".

Three things the contract does not spell out, decided here:

1. `state` has no field for the app's pause flag or speed, so the host sends them inside the SimState: `status: "paused"` and `metrics.speed_multiplier`. Guests read them back from there.
2. `state` messages must stay under PeerJS's 16,300-byte limit, and the real SimState is bigger (its entities hold every catalog row). Host and guests are both given `BASELINE` (the parts catalogs as entities, the same in every scenario); the host leaves unchanged baseline entities out and sends only new events (at most 8 kB of them), and says so in the metrics `base_entities`, `events_keep` and `events_total`. A late joiner or a reset gets the list from the start. The host also refuses `set_param` for keys no role owns, and any design change after launch.
3. The room code is 6 characters. The PeerJS id is `smdg-` plus the code.

Messages are checked with `isNetMessage` (`shared/net.ts`) by `PeerTransport` and again by the sessions.

## Checking online co-op by hand

The tests use `LocalTransport` only. A real WebRTC connection needs two browsers:

1. Run `npm run dev` and open the page in two different browsers (or one normal and one private window), ideally on two devices on the venue Wi-Fi.
2. In browser A choose **Host online**, type a name, pick a mission and press **Create room**. Expect the lobby with a 6-character room code within a few seconds.
3. In browser B choose **Join a room**, type a name and the code (any case) and press **Join room**. Expect both lobbies to list both players, host first.
4. In A pick **Spacecraft**, in B pick **Science**. Expect each role to show as taken for the other player. Press **Continue to briefing** in A; both should show the briefing of the mission A picked, then the builder.
5. In B pick an instrument: the budgets should change in both browsers. In B the bus section should be locked and show the host's name. Finish a valid design and launch from either browser (mission planning is unclaimed); both should show the flight and stay in step, including pause and speed, and both should reach the same results.
6. Press **Design a new mission** in either browser: both go back to the builder. Press **Main menu** in A: B should show "The room is closed". Also try a wrong room code (expect "Could not join that room" on the Start screen) and a fifth player.

If step 2 or 3 fails on the venue network, **Play on one screen** and **Play solo** still work with no network.
