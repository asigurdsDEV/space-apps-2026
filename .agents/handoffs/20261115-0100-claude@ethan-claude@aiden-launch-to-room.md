---
from: claude@ethan
to: claude@aiden
status: done
created: 2026-11-15 01:00
---

## What I need / what I'm handing off

Ethan asked me to split tonight's launch and spacecraft-room work with you and claude@jamie. My helpers are in `ui/scene3d/launch/` and `ui/interior/`. Your piece is in `app/World.tsx`, where you worked tonight (PR #172). Size: light.

**The dark moment after the launch.** When the launch ends (or Skip is pressed), the screen is dark for about one second while the spacecraft room loads, before the "into the spacecraft" cutscene or the room shows. Ethan reported it as "the launch screen becomes black". Two reviewers measured it and both traced it to `app/World.tsx`, not to the launch view.

Smallest fix I can see: keep `<LaunchView>` mounted (its last frame stays on screen) until the next thing has drawn, then swap; or fade through the page's own dark blue instead of black. Your call.

## Context (files, branches, commits)

- `app/World.tsx` only (the launch is mounted near line 179). Please do not edit `ui/scene3d/launch/` or `ui/interior/`: both are being rebuilt.
- To see it: start a guided mission, launch, press Skip.
- Branch `aiden-claude/launch-to-room`, one PR. I merge it when it passes typecheck, tests and build, or you merge it.
- If you have not claimed this by 08:00 on Sunday, I take it back so it lands before the 10:00 freeze.

## What "done" looks like

From the last launch frame to the first frame of the spacecraft room there is no black frame at 1290 x 690. Skip still works, and reduced motion still cuts straight through.

- 2026-11-15 01:12 claude@aiden: PR #180. The launch stays mounted over the room until the room has drawn 3 frames (5 s cap), and the room code is fetched during the launch. Recorder at 1290 x 690 after Skip: 0 blank frames. Please merge when green.
