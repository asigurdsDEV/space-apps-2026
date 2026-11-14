# Desktop first-person acceptance — PR #114

Tested 2026-11-14 on the published PR #114 head **1804d2beefec2bd50451e9b734fc8c21fdd1c64f**, which includes FPS PR #107. This is evidence for that snapshot, not a claim about later rack changes, live Pages/Vercel, or a finished 3D flight interior.

**Result:** desktop design → launch → existing flight → 3D debrief → Try the fix completed. Record persistence needs adoption before switching 3D on by default. Flight is intentionally the existing screen until Ethan's interior lands.

## Setup and limits

- Exported `git archive` of the published head into a temporary directory; no owner branch or source was changed. Reused installed dependencies.
- Chrome 157 headless on macOS, 1280×800, fresh browser profile; Vite development server at `http://127.0.0.1:4198/?world=3d`.
- Chrome DevTools Protocol dispatched real keyboard and mouse events. Existing development-only `__fps.where()` observed camera state; `__fps.teleport()` placed the camera for individual interaction fixtures. Consequently this is **not** proof that a new player can navigate the whole room unaided.
- First Light starting design; changed solar to body panels and back to the small deployable array; answered anomaly cards, ran at 60×. Ended **F / 26 points / Science goal missed**, then used **Try the fix: Add the Magnetometer**.
- Role test used a temporary, uncommitted page mounting the original MissionControl with a planning host, spacecraft guest Sam, and a command collector. This checks UI permission routing, not network transport.
- Desktop only per Aiden. No mobile acceptance, physical keyboard/browser-native Escape, screen reader, Safari/Firefox, co-op transport, offline, or measured hardware FPS claim.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| W walking, D strafe | Pass | D moved x about 1.17 m in 350 ms; W moved about 1.12 m |
| Shift + W | Pass | About 2.10 m in 350 ms versus 1.12 m walking |
| Arrow look | Pass | Right arrow changed yaw about −0.665 radians in 350 ms |
| Mouse pointer lock + look | Pass | Real click acquired lock; 40 px mouse motion changed yaw −0.088 radians |
| Pointer-lock loss + re-entry | Pass | `document.exitPointerLock()` stopped held W; no further displacement in 220 ms; subsequent real click re-acquired lock |
| Drag-to-look fallback | Pass | 50 px right / 10 px down gave yaw −0.11 / pitch −0.022 radians |
| Window blur clears movement | Pass | Synthetic window blur while W held; subsequent displacement 0 |
| Aim at upper/lower shelf | Pass | Horizontal look selected small deployable array; pitch −0.42 selected body panels |
| E fits a part | Pass | Body-panel interaction changed prompt to Fitted; restoring deployable array restored launchability |
| Fitted part does not change selection | Pass | E on fitted small deployable array stayed Fitted |
| Out-of-reach item | Pass | At x=5 facing the power rack, aimed target was absent |
| Cabinet collision | Pass | Walking east at the power cabinet stopped at x≈9.12 |
| Invalid design blocks launch | Pass | Body panels caused power issue; launch displayed A console says NO-GO and E stayed in design |
| Valid design launches | Pass | Restoring array enabled Launch mission; E opened launch sequence |
| Anomaly and ending cutscene Skip | Pass | Continued through existing flight and ending to 3D room |
| 3D debrief | Pass | Wall showed F, Science goal missed, 26 points, Add the Magnetometer |
| Try the fix | Pass | E at the stand returned to design; rack interactions replaced debrief actions |
| Another player's role | Pass, fixture | Power prompt said Sam's call; E sent 0 commands |
| Own role | Pass, fixture | E on Low Earth orbit sent exactly one set_param orbit=leo-iss |
| Horizontal overflow at 1280×800 | Pass | Document width did not exceed viewport |
| Personal best after 3D completion | **Missing** | Only player-name key existed in localStorage after the debrief; no best:v1:demo entry |

## Follow-ups for owners

### P1 — save the record when a mission ends in World (claude@aiden)

Reproduce on a fresh profile: start `?world=3d`, complete First Light without selecting Classic view, dismiss the ending, inspect `localStorage.getItem('space-apps-2026:best:v1:demo')`. It is null despite the 26-point debrief. Try the fix then resets the run with no record saved.

`app/World.tsx` returns GameScreen only while `classic || flying`; at end it replaces GameScreen with MissionControl. The existing saving effect belongs to `ui/leaderboard/LocalLeaderboard.tsx`, mounted only in App's Flight result path. World does not mount it or call the storage helper. The board already notes the missing 3D leaderboard display; persistence is missing too.

Reuse `savePersonalBest` or the existing component from the World end path with the final score, flown design, earned stars and optional daily seed. Preserve separate Daily/regular keys and score/design/star pairing. Daily was not run here; it needs a regression check after adoption. Codex has not edited app/ or claimed this fix.

### P2 — budget the complete prompt, including its verb (claude@aiden / catalog owner)

Observed `Fit Small deployable solar wings` (5 words). `shortLabel()` caps only the part name at four words; `interactables()` prefixes Fit/Add/Remove. The current layout test checks shortLabel only. Decision 007's four-word interaction-label limit applies to the final label. Test final Interactable labels when adopting catalog short labels.

### P2 — make unlocked Escape behavior explicit (claude@aiden)

With pointer lock off, hold W and press Escape while W remains held: movement continues about 0.8 m over the next 250 ms. The controller handles pointer-lock loss, blur and visibility, but has no Escape branch when there is no pointer lock. Consider clearing inputs in that mode too if Escape is intended as universal release. This is a usability gap, not evidence that browser-native Escape fails to unlock: CDP's Escape did not exercise that browser behavior reliably. A physical desktop Escape check is still needed.

### P2 — narrow desktop window hint overlap (claude@aiden)

At a 756×469 window, the top-right Sound / Classic / Main menu bar covers the right half of the centered “Click to look around · WASD walk” hint. At 1280×800 they do not overlap. Keep the hint clear on smaller laptop windows when polishing the desktop HUD.

## Automated validation

- `npm test -- ui/fps ui/hangar`: **18/18 pass**.
- `npm run build`: TypeScript and production build pass.
- `npm run size`: **140.9 kB / 150 kB**, first load gzipped.
- First full `npm test` while browser/rendering was active: **476 passed, 1 timed out** at the 5 s limit in `sim/cards.test.ts`, “only draws cards that fit the mission”. This matches the intermittent test already noted by Claude in LOG.md.
- After stopping browser and server: focused `sim/cards.test.ts` **13/13 pass**; repeat full suite **477/477 pass**. No timeout setting or production source was changed. One passing retry does not erase the intermittent timing risk.

No claim is made about source changes after the pinned head, default-3D readiness, a fully 3D flight run, or public deployment behavior. Caleb's first-person QA plan and Ethan's e2e files were not edited.
