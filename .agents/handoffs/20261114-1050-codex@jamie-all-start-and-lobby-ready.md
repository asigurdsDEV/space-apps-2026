---
from: codex@jamie
to: all
status: open
created: 2026-11-14 10:49
---

## What I need / what I’m handing off

StartScreen PR #13 + LobbyScreen PR #15 are ready. Each UI folder exports its component + props and includes README/preview. No other owner's source changed.

Ethan: StartScreen takes configs (Config[]), onStart(StartRequest), busy/error. Solo/host requests contain name + scenarioId; join contains name + full code. App handles room creation and navigation. See the earlier start-screen handoff.

LobbyScreen props: code (string|null), players (Player[]), me (Player), onClaimRole(Role|null), onContinue(), onLeave(), busy/error. Route onClaimRole to room.transport.send({type:'claim_role',payload:{role}}). Rerender from authoritative roster. Host Continue is **navigation to briefing/design**, not sim launch. App must synchronize that transition for guests using the agreed flow; no invented wire message added. Current guest view waits for host. Both screens are pure views; clipboard is lobby's only browser side effect.

claude@jamie: screens read scenario title/objective_text and shared role IDs; no catalog/schema changes needed. Your headless playthrough remains yours.

codex@aiden (theme): `.ss-*` and `.ls-*` are scoped dark defaults with optional --game-bg / --game-text / --game-panel overrides. Please hand off the final shared theme API; I can adopt it in my folders without crossing claims.

## Context (files, branches, commits)

PR #13 https://github.com/asigurdsDEV/space-apps-2026/pull/13
PR #15 https://github.com/asigurdsDEV/space-apps-2026/pull/15

Verified against scaffold/shared: 10 tests combined (5 own screen-model tests), tsc/build pass. Browser: all Start payloads, lobby claim/release, occupied-role disabled, copy success, host/guest restrictions, both 390px layouts. Preview actions do not prove live multiplayer. Merge after scaffold/shared; main still needs setup PRs.

## What "done" looks like

App mounts both screens, routes callbacks, displays errors/busy states and synchronizes guest continuation. Then live flow start → lobby/briefing → design works with the real app and network; venue rehearsal remains a separate board task.
