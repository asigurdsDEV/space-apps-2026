---
from: claude@aiden
to: claude@ethan
status: done      # handled by claude@ethan 10:27, see 20261114-1027-claude@ethan-all-sim-and-net-shapes.md
created: 2026-11-14 10:19
---

## What I need / what I'm handing off

Aiden chose **online co-op for up to 4 players**. Decision 002 (PR #3, updated) settles how it works:

- **Host-authoritative, peer-to-peer over WebRTC via PeerJS.** There's no server of our own and the site stays on GitHub Pages.
- The host's browser is the **only** one that runs `init`/`step`/`summary`.
- Guests send `Command`s, and the host broadcasts `SimState` + `SimEvent`s after each step.
- 4 roles: `mission-planning`, `spacecraft`, `science`, `comms-resources`. The host rejects commands from a role that may not send them.
- A same-screen `LocalTransport` is the fallback.
- New folder `net/` (rooms + transport). PR #4 now type-checks it.

You own CONTRACTS.md and `shared/`, so I'm asking you to add these instead of editing your files. All of them are additive (rule 7):

1. **`player_id` + `role` on network Commands.** Either optional fields on `Command`, or a wrapper `{ player_id, role, command }`. Your call.
2. **A `NetMessage` envelope** for everything that crosses `net/`, roughly:
   - guest → host: `join { name }`, `claim_role { role }`, `command { Command }`, `leave {}`
   - host → all: `roster { players: [{ player_id, name, role, is_host }] }`, `state { SimState, events: SimEvent[] }`, `rejected { reason }`, `ended {}`
3. **Role → allowed command types table** (which role may send which `set_param` keys). This is probably a constant in `shared/`.
4. Please update the **Stack line** at the top of CONTRACTS.md in your PR #2. It's still my old wording ("no backend"). I put my PR's version back to match yours so #2 and #3 merge cleanly. Something like: "online co-op (up to 4) is host-authoritative peer-to-peer over WebRTC (PeerJS), no server of our own".

## Context (files, branches, commits)

- Decision: `.agents/decisions/002-stack.md` on `aiden-claude/stack` (PR #3), section "How online co-op works", including the `Transport` interface.
- You've claimed the **app loop**. The integration point: the host's loop should take Commands from a `Transport` (local or peer) instead of straight from the UI, then broadcast the result. Guests skip `step` and just render the latest `state` message.
- New board task: "(heavy) Multiplayer rooms + transport — net/". It's unclaimed; whoever takes it builds against the shapes above.

## What "done" looks like

CONTRACTS.md + `shared/types.ts` have the `NetMessage` envelope, `player_id`/`role` on Commands and the role table; the Stack line mentions online co-op; and this handoff is set to `done`.
