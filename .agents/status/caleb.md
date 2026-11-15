# Status — Caleb

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Caleb
**Agent:** Cursor
**Branch:** caleb-cursor/submission-docs
**Last updated:** 2026-11-14 15:22

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## cursor@caleb

**Branch:** caleb-cursor/smooth-move (PR #148)
**Last updated:** 2026-11-14 17:40

### Working on right now

**[P1] Enter / return cutscenes, PR #115.** Pictures and `docs/qa/first-person.md` are in the PR. The Sunday 02:00 run is still open. Mounting is a handoff to claude@aiden.

### Just finished

**Smoother walking and cameras, PR #148.** Walk speed and head bob ease in and out. The view follows the mouse a few frames behind. Story cameras ease at both ends of the shot. Escape still stops you at once.

**Lighter pictures and a satellite interior, PR #138, merged.** Panel seams, gold insulation, avionics, a tank, reaction wheels, a radiator and a harness in the walk-in shot and the cabin. Launch and cutscenes draw fewer pixels. The cabin window keeps the NASA-map Earth from PR #141.

**Launch into orbit and satellite deploy, PR #128.** `ui/scene3d/launch/scene.ts` only: the burn shot holds the upper stage over the Earth, and separation coasts the satellite clear of the stage. Timeline length and rocket meshes are unchanged. Handoff to claude@ethan.

**[P0] Submit form, PR #111.** Paste sheet and full references in `docs/SUBMISSION.md`. Live link checked. Video URL and the Submit button are still a person's.

**[P0] Submission fixes, PR #88.** `docs/SUBMISSION.md`: 30-second video or 7 slides, OMNI named as measured data, live site described as the game, references listed.

**[P1] Cutscene scenes, PR #81.** `ui/cutscenes/`: arrival, Moon/Mars orbit, anomaly, ending. Launch is still Ethan's. Mount handoff to claude@aiden.

**[P1] V5 3D interaction QA, PR #77.** Test plan in `docs/qa/flight3d.md`. Cases are not run; they wait on V7.

**[P2] Accessibility pass, PR #59.** `docs/A11Y_REPORT.md`. codex@jamie closed the tour-dialog handoff in PR #72.

**[P0] Live-site check, 12:26.** Desktop and a 390px phone both reached results (First Light Normal, starting design, F, 26 points).

### Files / folders I'm touching (hands off)

- `docs/qa/first-person.md` (Sunday 02:00 run only)
- `.agents/status/caleb.md`: only the `## cursor@caleb` section

`ui/fps/controller.ts` and the story cameras in `ui/cutscenes/canvas.tsx` are in PR #148. `arrival()` stays claude@jamie's.

### Missing / I need from someone

- Sunday 02:00 build, then fill the result column in `docs/qa/first-person.md`.
- V7 is on main (PR #125 / #126). The result column in `docs/qa/flight3d.md` is still open.
- codex@jamie: confirm the First Light slide story on `20261114-1150-cursor@caleb-codex@jamie-submission.md`.

### Heads up for other agents

Branches use `caleb-cursor/<short-task>`. I will push the board claim and exact file scope before writing any task code.
