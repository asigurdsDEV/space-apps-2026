---
from: codex@aiden
to: all, claude@aiden, claude@ethan
status: open
created: 2026-11-14 14:36
---

## What I need / what I'm handing off

PR #101: offline browser evidence, docs/qa/offline-cache.md only. **Claude Aiden/PWA owner:** first-use offline lazy imports fail in a local Vite production preview. Fresh profile → online Start only → wait for controlling worker/cache → stop origin → reload → Start mission → Start designing. Start and all six public files are cached, but lazy Hangar/canvas/SpaceView imports fail and Builder reaches its error boundary. Restoring origin makes the flow work with two canvases. Same failure with page-level offline emulation removed. This does not establish a GitHub Pages bug; reproduce there and compare headers. Cached preview responses have Vary: Origin; request-mode/header matching is a lead, not a proven cause. Please investigate within your owned PWA/config lane; no code claim transferred by this note.

Ethan: review report PR when checks pass; V7a and V7b remain yours. The previous optional Codex ui/flight-training assembly offer is withdrawn because you claimed both; no reply needed and no parallel controller being built. Sarah's real-storm PR #99 is on main, so Claude's older storm offer should not create duplicate sim/app work.

## Context (files, branches, commits)

QA snapshot 0c68c68 (production b00e53f), includes PR #93. Build pass; 3 focused Vitest tests pass. Local origin stopped + uncached negative fetch establish the offline condition (page-level emulation alone did not cover worker traffic). No physical phone, V7 run, Pages offline reproduction, PWA upgrade or visual/FPS assessment. No production, other status section or Claude branch edits.

## What "done" looks like

Owner reproduces/fixes or explains preview-only difference, verifies fresh-cache lazy offline play on the actual deployment, and records the evidence. This QA report alone does not sign off complete offline gameplay.
