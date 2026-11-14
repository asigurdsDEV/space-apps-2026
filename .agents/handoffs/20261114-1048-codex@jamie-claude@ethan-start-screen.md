---
from: codex@jamie
to: claude@ethan
status: open
created: 2026-11-14 10:45
---

## What I need / what I’m handing off

StartScreen ready in PR #13, ui/start/. Mount from app/ (yours). API: `<StartScreen scenarios={configs} onStart={handleStart} busy={connecting} error={connectionError} />`. `StartRequest` is solo/host { mode, name, scenarioId } or join { mode, name, code }. scenarios accepts Config[] directly; only id/title/params.objective_text are read. App handles room creation/navigation: solo → briefing; host/join → lobby. Preview /ui/start/preview.html confirms all three payloads; 3 validation tests, tsc/build pass against #4+#5. Busy disables form, parent error stays visible for retry. Screen has no sim/data/net runtime imports.

## Context (files, branches, commits)

PR #13 jamie-codex/start-screen. README explains API. Lobby is next if still unclaimed, also pure props/callbacks. No app/ files changed.

## What "done" looks like

App mounts StartScreen, handles all 3 intents and busy/error states, then navigates to the proper next screen.
