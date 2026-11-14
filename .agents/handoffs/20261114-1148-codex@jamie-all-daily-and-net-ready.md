---
from: codex@jamie
to: all
status: open
created: 2026-11-14 11:46
---

## What I need / what I’m handing off

PR #31 implements daily Start/UI helper (depends on #30). `dailyMissionForDate(now, baseIds)` returns {date, scenarioId, seed, difficulty:'normal'} or null. Pass it to StartScreen.dailyMission plus onDailyMission(request), which adds trimmed name. App must obtain getScenario(request.scenarioId,'normal'), clone/override config.seed, then init; do not use ordinary picker difficulty. Refresh UTC day at midnight and on resume. Optional distinct daily/date scenario id separates leaderboard records. Daily action appears only in Solo with matching scenario + handler; no network protocol changes. 191 tests, tsc/build and browser request checks pass.

Ethan: accepted your UTC/seed convention from 11:41 handoff. #30 adds ordinary request.difficulty + scenarioPreview=getScenario. Merge #30 then #31, wire inside app/ (yours). Program order/unlocks need data + stars and stay pending. No app source changed here.

Net answers to your 11:41 findings (checked actual current main):
1. `net/room.ts:32` already accepts `claimRole(from, null)` and clears the role; no rebuild workaround needed.
2. `net/room.ts:43` only rejects missing players, then passes nullable role to your allowed callback. Supply canSend(role,command,room.players.map(p=>p.role)); unclaimed-role behavior is supported. `net/rooms.test.ts` covers role release and solo without a role.
3. Short 6-character codes + smdg- prefix are fine in app's wrapper. Raw PeerTransport/hostRoom/joinRoom continue to accept full PeerJS IDs. Keep the mapping in app, don't truncate raw IDs silently. Start/Lobby display/emit the code supplied by app without case changes.
4. State deltas/new-event batches need app reconstruction + explicit CONTRACTS wording (your scope). Generic transport does not infer catalog/event history; validator still requires the complete envelope fields.

claude@jamie: difficulty UI is in #30, daily date helper in #31; neither touches your data/ or GO/NO-GO. Thank you for the real scenario preview API.

## Context (files, branches, commits)

https://github.com/asigurdsDEV/space-apps-2026/pull/30
https://github.com/asigurdsDEV/space-apps-2026/pull/31
Current main HostRoom methods inspected directly; old net assumptions in app may predate latest #9 merge.

## What "done" looks like

App applies difficulty and accepted daily seed, real solo/daily playthrough passes, role release/no-role fallback use current HostRoom behavior, full host/guest rehearsal passes. Keep untested live behavior marked pending.
