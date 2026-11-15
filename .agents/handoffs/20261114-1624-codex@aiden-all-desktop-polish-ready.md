---
from: codex@aiden
to: all, claude@ethan, claude@aiden, claude@sarah
status: done
created: 2026-11-14 16:24
---

## What I need / what I'm handing off

**PR #135 is ready:** https://github.com/asigurdsDEV/space-apps-2026/pull/135 . Aiden asked to finish Claude's desktop optimization and fix overlapping menus. It preserves merged #124 and integrates merged #133 normally (no force pushes/owner branch edits). 529 tests/build pass, size 146.0/150 kB.

- One native Menu/Escape dialog instead of a permanent utility bar. CAPCOM is a noninteractive radio subtitle; Sarah's fitted-part callouts remain in that same subtitle. No duplicate Got it panel in first person.
- Both rooms cancel callbacks while covered/hidden. Craft descriptions are compared by values, preventing geometry rebuilds on cloned sim params. Input release/focus/cancel and head-bob settle fixed.
- Classic handoff no longer replays a watched launch; future launches still play. 3D debrief saves score/design/stars through the existing helper with Daily isolation.
- Full first-person First Light regular 26/0 and Daily 25/0 saved separately; planning/radio/power choices answered in world. Production default, menu, Classic URL, no-WebGL fallback checked. Evidence/limits in docs/qa/desktop-world.md.

**Ethan #132 integration:** please put Flight training *inside WorldMenu*, not app-world-bar. Its holdClock callback has been replaced by one effect combining menu/cutscene/launch holds; include `training` in that condition instead of restoring a competing pause/resume callback. Close the menu when starting training. Preserve current canTrain/decision checks, and returning from training must restore the prior manual pause. Update your SSR test to find the training button inside the dialog. app/World.test.tsx was not created by Codex and remains yours. This is an integration handoff, not an edit to your branch.

## Context (files, branches, commits)

Branch aiden-codex/desktop-polish, PR #135, latest source integration 8110b85 and report 5dffaf1. Sarah #133 live feedback and theme preserved; UI radio regression added. Code does not touch scene3d or the pending cutscene/label PRs. Claim and additive App.tsx scope were pushed separately before code.

## What "done" looks like

Ethan reviews/merges #135 through normal coordination, checks deployment and adapts #132 without bringing back overlapping utility bars. A real laptop/native pointer-lock Escape and cross-device co-op remain hardware/team acceptance. Measured here: cabin60FPS/1.41ms mean render submission, 0 covered renders, unchanged craft0 uploads vs changed bus228; 4x CPU fixture150 renders/2.5s, p95 interval17.9ms. These are Mac/Chrome samples, not a guarantee for every GPU. No mobile gate.

## Integration update 2026-11-14 16:30

#132 merged during publication. PR #135 now merges that main normally and **implements** the menu/clock adaptation above. Training remains available only when canTrain permits it, inside WorldMenu; single shared hold includes training. Browser fixtures confirm running/manual-pause → Menu → Flight training → Back restores initial pause. Ethan Training and World.test source preserved. Latest source44a88d7; report b70025d; 532 tests/build pass, size146.3/150 kB. The earlier request for Ethan to adapt #132 is superseded; review/merge #135 when current-head CI is green.
