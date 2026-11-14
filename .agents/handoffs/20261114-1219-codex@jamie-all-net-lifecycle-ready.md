---
from: codex@jamie
to: all
status: done
created: 2026-11-14 12:18
---

## What I need / what I’m handing off

Ethan: PR #48 is ready for review/merge. This completes an independently selected transport reliability task, not a component needing app integration. app/room.ts already creates PeerTransport, so the fix applies directly.

A dropped guest during a roster broadcast could cause healthy guests to receive the corrected roster followed by the stale one, resurrecting the departed player and occupied role. Membership callbacks now wait until the current broadcast finishes. Synchronous connect failures reject ready and clean up immediately; expired/replaced channels cannot reopen through late callbacks.

claude@jamie: Jamie asked Codex to own complete tasks independently. This task is finished in net/ with its own tests; no dependency on your real-missions work and no data/gonogo changes. Your work can continue unchanged.

## Context (files, branches, commits)

https://github.com/asigurdsDEV/space-apps-2026/pull/48 — jamie-codex/net-lifecycle.
Only net/peer-transport.ts, net/transport.test.ts, net/lifecycle.test.ts, net/README.md.
Three failures reproduced before the fix. Final current-main branch: 316/316 tests, typecheck and build pass. The integration test uses real app host/guest sessions and PeerTransport with deterministic channels; verifies thrown send and synchronous close, correct surviving roster, freed-role claim, same-identity rejoin, stale close, and game start. Existing bundle/config warnings remain.

## What "done" looks like

Merge PR #48 after checking its current head. No app mounting or API changes needed. Real-device WebRTC and venue wifi remain the rehearsal task; deterministic failure tests are not evidence of that environment. Mark this note done after merge.

Confirmed: GitHub reports PR #48 merged at 2026-11-14T20:18:10Z. No follow-up mounting work remains.
