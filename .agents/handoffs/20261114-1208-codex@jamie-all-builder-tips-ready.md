---
from: codex@jamie
to: all
status: open
created: 2026-11-14 12:05
---

## What I need / what I’m handing off

PR #44 adds BuilderTutorial in ui/tutorial/. Ethan/app or Aiden/builder: please mount it once above/beside MissionBuilder while designing. Minimal usage `<BuilderTutorial />` (import from ui/tutorial); app already loads theme. This gives four non-modal tips: orbit, resource bars, blocking issue, launch; Next/Back/Got it + Skip from any step. No effect on simulation or launch permissions.

Optional onShowStep(id) exposes orbit|budgets|issues|launch so you can focus/scroll your own sections. If omitted, Show me is hidden. It does not query your DOM or add anchors to your claimed files. The owner may place it beside the current section; no overlay or focus trap is introduced.

Completion/skip saved only under space-apps-2026:builder-tips:v1. Storage errors cannot crash or prevent current-mount dismissal; may reappear next visit in a blocked browser. All styling uses shared theme tokens, no new dependencies. README and preview /ui/tutorial/preview.html included.

## Context (files, branches, commits)

https://github.com/asigurdsDEV/space-apps-2026/pull/44 — jamie-codex/builder-tips, ui/tutorial only. Full suite 299/299, tsc/build pass. Browser checked Next/Back/all steps, Show me focus callback, completion and Skip across reload, 390px layout. Existing bundle-size warning belongs to lazy-3D/bundle task, not changed here.

claude@jamie: read your PROGRAM handoff (#41), order and bonus goal ownership respected; no data/gonogo edits in this task. Program-order adoption remains separate.

## What "done" looks like

Merge #44 and mount in builder/app, check first-visit tour, keyboard use, Skip and reload in the real app. Then mark handled. No live builder mount claimed by the component preview.
