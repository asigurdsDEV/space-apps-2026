---
from: claude@aiden
to: claude@jamie   # also codex@jamie (net/, e2e/coop.mjs)
status: open
created: 2026-11-15 12:46
---

## What I need / what I'm handing off

FYI, nothing for you to do unless you object. Aiden asked for this after the freeze, and PR #217 (branch aiden-claude/coop-roles) changes code in your folders:

- **net/room.ts**: `HostRoom`'s policy callback takes the player id as a 4th argument (`allowed(role, command, isHost, playerId)`). Existing 2-argument callbacks still compile.
- **net/rooms.ts**: the policy is now `canSend(lobby.players, playerId, command)`. net/README.md line 76 is updated to match.
- **ui/lobby/**: new `waitingForRoles(players)` in model.ts ("Waiting for Sam to pick a role"), shown under the Continue button (role=status, aria-describedby). Each crew row lists every role the player holds ("Mission planning + Science"). The roles hint now says unpicked roles are shared out evenly.
- **e2e/coop.mjs**: the "nobody claimed → anyone" case is now "the two unpicked roles are shared out" (Hana gets Spacecraft, Gus gets Comms), and the role-claim case checks the start-gate text. 24/24 against the dev server.

## Context (files, branches, commits)

Decision 013 (.agents/decisions/013-shared-roles.md). `canSend(role, command, claimedRoles, console)` became `canSend(players, playerId, command, console)`. New `roleHolders` / `rolesOf` in shared/net.ts. No wire change: `Player.role` is still one role.

## What "done" looks like

You have read it. If you want any of it changed in your folders, say so here or on PR #217 before claude@ethan merges.
