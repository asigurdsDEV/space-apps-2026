# Multiplayer transport integration

This folder implements decision 002's transport boundary without importing sim, app, UI, or data. Game message schemas and role policy come from shared/. The concrete session router enforces them on the authoritative host. Message type is generic so the shared NetMessage can be supplied without duplicating it here.

## PeerJS wiring (app owner)

```ts
import Peer from 'peerjs'
import { PeerTransport, LocalTransport } from '../net'
// Import NetMessage and a runtime validator once supplied by shared/.
const transport = new PeerTransport<NetMessage>(new Peer(), {
  validate: isNetMessage,
  // hostId: roomCode.trim(), // include ONLY on a guest
})
transport.onMessage((message, from) => {
  // Host: look up `from` in authoritative roster; enforce role before queuing Command.
  // Guest: apply state/roster messages from host, never call sim.step.
})
transport.onStatus((status, error) => { /* render status; offer local play on error */ })
await transport.ready
// Host displays transport.roomCode. It is the FULL PeerJS id, not a truncated code.
// host: send broadcasts state/events; guest: send sends only to host.
transport.send(message)
// Unmount / leave room:
transport.close()
// Offline/same-screen mode uses the identical send/onMessage/close surface:
const local = new LocalTransport<NetMessage>()
```

Install `peerjs` in the scaffold package before using this snippet. PeerJS is injected so tests do not require a broker or WebRTC. `ready` resolves on host registration, or on guest data-channel open. Subscribe before awaiting it. `onMessage`, `onStatus`, and `onPlayers` return unsubscribe functions. Methods may throw when called before readiness or after closure; disable send controls unless ready.

`onPlayers` gives connection identities, not role assignments. Host sees all connected guests; guests see self and host. Use authoritative roster messages for names and roles across the whole room. Pending channels count toward the host-plus-three limit. Host closes extra connections. A pending connection expires after 15 seconds. A full room currently appears as a failed join, not a distinct game rejection.

Disconnect notifications wait until the current broadcast finishes. This ensures a corrected roster cannot arrive before an older roster still being sent to another guest. A failed guest is removed without stopping healthy guests; its slot and role can be reused. Late open/data/close events from expired or replaced connections cannot revive them or remove their replacements. Synchronous connection setup failures reject `ready` and dispose the peer/timers immediately.

`net/lifecycle.test.ts` runs the real host/guest app sessions through `PeerTransport` with deterministic channels: a guest fails during a roster send, the surviving guest sees the correct roster and claims the freed role, the departed identity rejoins, and the host starts the game. It covers send exceptions and synchronous close events. This is regression coverage, not a real-device WebRTC or venue-wifi rehearsal.

## Host responsibilities (app + shared owners)

- Shared NetMessage validator must check the discriminant and each payload, numeric finiteness, maximum lengths, and state/event structure. The transport requires a validator; `data as NetMessage` is not validation.
- Host maps connection `from` to a player and assigned role. Ignore any claimed sender/role inside a wire message. Reject role collisions and unauthorized parameter keys/commands. Send roster after join/leave/role changes. Send the latest state to a newly joined player.
- Guest messages must never install state on host. Only host simulates; host messages drive guest rendering. The generic channel itself does not implement role policy.
- Maintain a bounded command queue in app/. Coalesce repeat parameter edits or rate-limit excessive guest commands.
- LocalTransport loops messages back asynchronously with a JSON copy; route local commands and state by message type to avoid feedback loops. Same-screen UI may expose all four roles.

## Failure behavior and verification

Guest host-loss is terminal. Peer signaling disconnect is terminal for this initial implementation; create/rejoin a room or switch explicitly to local mode. No automatic switch silently discards the current mission. Host migration, TURN, reconnect/resume and delivery acknowledgments are outside this transport.

Tests use deterministic PeerJS-shaped doubles for lifecycle, attribution, limits, malformed payload rejection, timeout and cleanup. These do not prove live WebRTC connectivity. Before judging, check two browsers on venue Wi-Fi; then four players; try a fifth; close a guest; close the host; verify the UI offers local fallback. The public broker and NAT conditions can prevent connection.

API reference: [PeerJS getting started](https://peerjs.com/client/getting-started) and [Peer API](https://peerjs.com/client/api/peer), checked 2026-11-14.

## Lobby authority

`HostRoom<Role, Command>` manages host-plus-three roster, unique role claims, departures, and command authorization. Instantiate only on the host with shared role names and the shared policy callback. Use `join(from, name)`, `claimRole(from, role)`, `authorize(from, command)`, and `leave(from)` when handling the corresponding validated messages. Return failures as shared `rejected` messages; broadcast `room.players` as the shared roster envelope. Send host commands through the same authorization path. A player must claim a role first. For same-screen play, the app can route the four local roles separately; LocalTransport itself does not impose role permissions.

```ts
const room = new HostRoom<Role, Command>(transport.playerId, hostName, ROLES, canSendCommand)
transport.onMessage((message, from) => {
  // Route validated discriminants to room.join/claimRole/authorize/leave.
  // Only queue message.command when room.authorize(from, message.command).ok.
})
transport.onPlayers(ids => {
  for (const player of room.players) if (!ids.includes(player.player_id)) room.leave(player.player_id)
  // Broadcast changed roster using the shared message shape.
})
```

`HostRoom` deliberately delegates command permissions to the contracts owner. It does not invent parameter names or silently grant host permissions. Role types and roster objects are structural, so use the final shared types at the integration boundary.

## Ready-to-use app API

`createLocalRoom(name): Room`, `hostRoom(name): Promise<Room>` and `joinRoom(code, name): Promise<Room>` now implement the requested shared-protocol API. Import them from `net/index.ts`. `Room` exposes `code`, a current `self` getter, `transport` and `close()`. PeerJS loads dynamically only for online mode; it must be installed in package.json. These functions supply `isNetMessage` internally.

The session consumes join/claim_role/leave messages, broadcasts authoritative rosters and routes authorized commands to app listeners. It imports shared `ROLES` and `canSend`, allowing commands owned by unclaimed roles as specified by the contract. It drops guest state/roster messages, refuses host-only guest sends, handles null role release, and removes disconnected players from host membership. `joinRoom` waits for roster acknowledgment. `onMessage` replays the current roster in a microtask, so app can subscribe after room creation. Read `room.self` when processing roster updates; it is a getter, not a reactive store.

App still owns initial/current state transmission on roster change, command queues, sim execution and rendering. Host app should broadcast latest state after accepting a new player. Guest app must never run sim.step. `close()` tolerates an already disconnected channel. Live WebRTC/venue verification remains outstanding.
