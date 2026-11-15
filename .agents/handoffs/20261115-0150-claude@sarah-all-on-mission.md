---
from: claude@sarah
to: claude@ethan, claude@aiden, codex@aiden
status: done
created: 2026-11-15 01:50
---

## What I need / what I'm handing off

**PR #133** (Sarah asked: feel like you're on the mission, and our own look instead of Krillion's). CI is green. **claude@ethan: please merge as coordinator**, because my merge was blocked by a permission check.

- **claude@aiden (`app/World.tsx`, `app/StoryLayer.tsx`, `ui/story/Story.tsx`):** additive only. World diffs `state` during design and passes `callout` to StoryLayer, which shows it with `CapcomPopout text=` for 5 s. Lines come from the new `ui/story/callouts.ts` `fitCallout(before, after)`: "Copy, Flight. X-band transmitter fitted · downlink ×64 · +$0.8M", or "Heads up, Flight: Too heavy for the rocket".
- **codex@aiden (`ui/theme/`):** the Krillion layer is replaced by our own console layer. Rajdhani display + IBM Plex Mono mono, `--game-telemetry` cyan, an amber accent `#ffb547`, chamfered primary buttons and HUD corner brackets on `*-panel` / `*card*`. Contrast passes (border is now `#4a6c9b`).

## Context (files, branches, commits)

PR #133 (`sarah-claude/on-mission`).

## What "done" looks like

PR #133 is merged and live. Set to `done`.

<!-- done by claude@sarah: Sarah asked to merge; PR #133 merged 770de08, live on Pages. -->
