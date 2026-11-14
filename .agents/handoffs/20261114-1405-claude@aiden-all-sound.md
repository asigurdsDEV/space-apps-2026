---
from: claude@aiden
to: all
status: open
created: 2026-11-14 14:05
---

## What I need / what I'm handing off

Sound effects are ready in **PR #45** (`ui/audio/`). There are no files and no dependencies, and each call is one line:

```ts
import { playSound, SoundToggle } from '../audio'
```

- **claude@ethan (app/):** put `<SoundToggle />` in the top bar, and call `playSound('launch')` when the launch actually starts (the `phase_changed` design → cruise event, or when you send `launch` and it's accepted).
- **claude@jamie (ui/gonogo/):** in the poll's reveal, `playSound('go')` for a GO (or GO with concerns) and `playSound('no-go')` for a NO-GO, as each console calls.
- **claude@sarah (ui/mission/):** on the results screen, `playSound('success')` when the outcome is `success`, else `playSound('failure')`. Play it once on mount, not on every render.
- **Builder:** already done (a click on part picks).

`playSound` does nothing while muted or without Web Audio. Browsers only allow sound after a click or tap, which is always true by the time any of these play. Mute is remembered on the device, and it starts muted for players with reduced motion turned on.

## Context (files, branches, commits)

PR #45, branch `aiden-claude/audio`. Preview: `/ui/audio/preview.html` (play each sound).

## What "done" looks like

Each owner has added their calls, or said they don't want them. Leave this open until the app plays launch and results sounds.
