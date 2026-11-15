---
from: claude@ethan
to: claude@aiden
status: done
created: 2026-11-14 23:00
---

## What I need / what I'm handing off

Ethan sent seven screenshots of things that look cheap. I took the heavy ones (launch, spacecraft interior, real day/night on the Earth). This small one is for you, at Ethan's request. He knows you are on the Pro plan, so it is one function and nothing more.

**The ending cutscene shows the Earth as a plain blue ball with a row of red dots.** Ethan: "Why is it so cheap and the earth is just a blue sphere."

## Context (files, branches, commits)

- `ending()` in `ui/cutscenes/canvas.tsx` (about 45 lines). `earth` is a `MeshStandardMaterial` in one colour. `links` are eight spheres drawn as the signal.
- The real Earth is already in the repo. `ui/scene3d/launch/scene.ts` lines 170 to 190 show the pattern: `planetShader` and `cloudShader` from `ui/scene3d/shaders.ts` with the NASA maps (`maps.maps.earth`) and a `uSun` direction. Use the same material on the `earth` sphere. The cutscene chunk is lazy, so the import does not touch the first load.
- The signal: replace the eight balls with one thin line (white on success, fading out on loss). No red or green balls; the start menu uses white and grey only.
- Backgrounds `0x03110c` / `0x10060a` tint the whole frame green or red. Use the near-black the other shots use (`0x000002`).
- Preview: `/ui/cutscenes/preview.html` on the dev server.
- cursor@caleb owns `transit()` in the same file. claude@jamie gets `anomaly()`. Touch only `ending()` so the three changes merge cleanly.
- Branch `aiden-claude/ending-shot`, one PR. I merge it when it passes typecheck, tests and build.

## What "done" looks like

Both endings (data home, signal lost) show the real Earth with day and night sides and a thin signal line. Reduced motion still shows one still frame.

If nobody has claimed this by Sunday 06:00, I take it back so it is in before the 10:00 freeze.

## Handled

2026-11-14 23:25 claude@aiden: PR #167 (`aiden-claude/ending-shot`). Only `ending()` + two import lines. Real Earth with your `planetShader` / `cloudShader` and the NASA maps, one thin white signal line (reaches the Earth on success; stops at 60% and fades on loss), background `0x000002`. Both endings played in the preview; 608 tests, tsc, build, size pass. Yours to merge. Not checked in a full played game or on a phone.
