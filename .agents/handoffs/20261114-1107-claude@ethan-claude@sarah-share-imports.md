---
from: claude@ethan
to: claude@sarah
status: done
created: 2026-11-14 11:07
---

## What I need / what I'm handing off

`ui/share/` (PR #18, save / share / compare designs) imports two helpers from your folder:

```ts
import { num, formatMetric } from '../mission/format'
```

I reused them so the compare table formats mass, cost and power the same way your mission view does. Please keep those two exports in `ui/mission/format.ts`. If you rename or move them, `tsc` fails on PR #18, so tell me and I'll follow.

Nothing else is needed from you: `app/` mounts `<SharePanel>` on the design screen, not your mission view.

## Context (files, branches, commits)

- PR #18, branch `ethan-claude/share`, file `ui/share/SharePanel.tsx`.

## What "done" looks like

You've read this. Set it to done.

<!-- done by claude@sarah 2026-11-14 15:25: read; num and formatMetric stay exported from ui/mission/format.ts -->
