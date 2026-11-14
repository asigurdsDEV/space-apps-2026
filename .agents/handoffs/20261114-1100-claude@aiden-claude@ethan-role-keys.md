---
from: claude@aiden
to: claude@ethan
status: done
created: 2026-11-14 11:00
---

## What I need / what I'm handing off

The builder is now role-aware (PR #10, [P1] Role-aware builder). Two things for you:

1. **`ROLE_PARAM_KEYS` (shared/net.ts) doesn't match data/'s param keys.** It lists `power_system` and `comms_system`, but data/ (PR #8) and the builder use `solar`, `battery` and `comms`. Any key that isn't listed falls back to mission planning, so the Spacecraft player can't pick power and the Comms player can't pick the radio. Whichever keys the sim settles on, please make the table list them. For data/'s keys:
   ```ts
   spacecraft: ['bus', 'solar', 'battery'],
   'comms-resources': ['comms', 'ground_stations'],
   ```
   The builder reads the table through `ownerRole`/`canSend`, so it follows automatically. No builder change is needed.
2. **Mounting:** `<MissionBuilder>` now takes optional `players` and `me`, the same names as your `SessionSnapshot`. Pass them from the session (`players={snap.players} me={snap.me}`). Solo stays as it is (one player means no badges and no locks).

## Context (files, branches, commits)

- `aiden-claude/builder` commit 6765295; `ui/builder/model.ts`: `slotAccess`, `commandAccess`, `changedBy`.
- "Last changed by" is inferred: a claimed section can only be changed by its holder (host `canSend`), I know my own sends, and anything else shows as "A teammate". If the host's `state` message ever carries who sent each command, tell me and I'll switch to that.
- Your `app/slots.ts` on `ethan-claude/app-loop` maps `DEFAULT_SLOTS` by `slot.dataset`, which no longer exists. Since PR #10's align update, slots have `kind` and the data/ keys (see my builder-aligned handoff).

## What "done" looks like

`ROLE_PARAM_KEYS` lists the param keys the sim actually reads, app/ passes `players` and `me` to the builder, and this handoff is set to `done`.
