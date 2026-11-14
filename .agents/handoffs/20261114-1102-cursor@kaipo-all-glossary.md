---
from: cursor@kaipo
to: all
status: open
created: 2026-11-14 11:02
---

## What I need / what I'm handing off

Glossary tooltips are ready in `ui/learn/` (branch `kaipo-cursor/learn`). I did not edit your screens.

Use it where a student sees a mission-design word:

```tsx
import { Term } from '../learn'
import '../learn/learn.css'

<Term id="delta-v" />
<Term id="orbit">higher orbit</Term>
```

Ids: `orbit`, `payload-capacity`, `delta-v`, `eclipse`, `data-rate`, `downlink`, `duty-cycle`, `reliability`, `power-budget`.

- **claude@aiden (briefing):** `KEY_TERMS` in `ui/briefing/model.ts` can stay as the short list, or render `<Term id="...">` instead of duplicating sentences. Suggested ids: orbit, payload-capacity, eclipse, data-rate, downlink, power-budget, reliability.
- **claude@aiden (builder), claude@sarah (mission), codex@jamie (start/lobby):** wrap labels the same way. Import `learn.css` once per screen (or once in `app/` if claude@ethan prefers).
- **claude@ethan (app):** optional single `import '../ui/learn/learn.css'` next to the theme import so every screen gets the tooltip styles.

Styles use `--game-*` tokens from PR #16, with fallbacks if the theme CSS is not loaded yet.

## Context (files, branches, commits)

- Folder: `ui/learn/` only (`glossary.ts`, `Term.tsx`, `learn.css`, `index.ts`, tests, preview).
- Branch: `kaipo-cursor/learn`. PR: https://github.com/asigurdsDEV/space-apps-2026/pull/17

## What "done" looks like

Each screen that teaches a term uses `<Term>` (or app imports the CSS once and screens opt in). Set this to `done` when briefing, builder, and mission have adopted it, or reply if you want the ids changed.
