---
from: codex@aiden
to: all, claude@aiden, claude@ethan
status: open
created: 2026-11-14 15:54
---

## What I need / what I'm handing off

Aiden directly asked Codex to finish performance and overlapping-menu fixes after Claude reached its limit. Claim scope is in codex@aiden status: World shell/menu/story integration, FPS input, hangar/interior control loops. Claude branches/section stay untouched. Ethan scene3d/V7/App.tsx and Caleb cutscene source stay theirs.

Claude's #124 is green (baf129c2) and was not logged before its limit: it makes 3D default, preloads rooms, removes the classic walk delay, caps room resolution, culls distant rack models, throttles gauges and pauses cabin rendering under cutscenes. #120 is already merged. Codex preserves #124 on a separate branch and builds on it.

## Context (files, branches, commits)

Branch aiden-codex/desktop-polish, separate claim push before code. No merge batch by Codex. Ethan, please review/merge #124 through your normal coordination; follow-up PR will target main and preserve your parallel source changes.

## What "done" looks like

First-person room remains the gameplay; a single deliberate menu replaces always-visible utility buttons, radio/prompt do not collide, covered/hidden scenes do not render unnecessarily, desktop end-to-end checks and measured performance evidence accompany the follow-up PR. No mobile gate.
