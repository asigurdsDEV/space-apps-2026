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

## Desktop polish follow-up — 2026-11-14 (codex@aiden)

Implementation snapshot **52c3748**, branch `aiden-codex/desktop-polish`, on main **12f9735** (includes merged default-3D #124, V7 and the new theme). Aiden authorized continuing Claude's work after the usage limit. Claude's branches/section and scene3d source were not edited.

Changes:

- One **Menu / Esc** trigger replaces the permanent Sound / Classic / Main menu strip. A native dialog contains focus; the room cannot move/interact behind it. Back/Escape restores room focus. Cutscenes take precedence over the menu.
- CAPCOM is a six-second, noninteractive radio subtitle in first-person play. It does not put a Got it menu over the room. The input hint is top-left, Menu top-right, radio bottom-left, and E prompt stays at the crosshair.
- Both rooms cancel their animation callbacks under menus/cutscenes and in hidden tabs, then restart with a fresh frame clock. Gauge throttling, resolution cap and rack-model culling from #124 are preserved.
- Cabin craft geometry is compared by its values, not object identity. The sim clones params on each step; that previously made an unchanged craft rebuild repeatedly.
- Escape clears held input even without pointer lock; focused buttons/fields/dialogs do not drive the room. Disable/blur/cancellation clear queued look and dragging. The final frame settles head bob when walking stops.
- The 3D end path saves score, flown design and stars through the existing personal-best helper. Daily seed is preserved. It does not add a leaderboard panel over gameplay.
- Switching to Classic passes an already-watched-launch flag, avoiding a second 20-second launch on day 1. The flag resets with the World flight lifecycle, so later missions still have their launch.

### Executed browser checks

Chrome 157 on this Mac; CDP keyboard/mouse and existing development teleport fixture placement as described above. Screenshots inspected at **1280×800** and **756×469**. This is not an unaided-navigation or low-end-GPU claim.

- Single visible gameplay menu button; menu focuses Back to game, keeps Tab inside, ignores movement/turning behind it, closes with Escape and restores movement/focus. Hint, radio and menu do not overlap at the tested desktop sizes.
- Full first-person First Light: launch → cabin → real storm planning panel → radio module's station-bumped choice → power module's radiation choice → 3D debrief. All choices answered with E. Saved regular record **26 points / 0 stars**, with the flown design; no browser exceptions.
- Daily First Light, UTC **2026-11-15**, seed **20261115**: radiation/reaction-wheel panels answered; debrief saved **25 points / 0 stars** under `daily-best:v1:demo:20261115`. Existing regular 26-point record was unchanged.
- Real World + session fixture: opening the menu paused a running solo mission; manually paused stayed paused after closing. In the online-shaped fixture, opening the menu did not pause the shared clock. This is not a network-transport test.
- Steady cabin sample, 1280×800: **132 renders / 2.2 s (60 FPS)**, **164 draw calls**, renderer CPU submission **1.41 ms mean / 2.20 ms p95**. No geometry buffer uploads after warm-up. Menu-covered renderer produced **0 frames** during a 300 ms check and resumed afterward. These measurements preceded the later main/theme integration; they are local evidence, not an all-hardware guarantee.
- Direct cabin regression: 12 `.show()` calls with fresh but identical craft objects produced **0 new buffer uploads**. Changing the bus produced **228 uploads**, confirming a real design change still rebuilds it.
- Separate cabin fixture at **4× CPU throttling**: **150 renders / 2.5 s**, frame-interval **17.9 ms p95**, **173 draw calls**. CPU emulation does not emulate a slow GPU or thermal limits.
- Built production preview, fresh cache: plain URL entered mission control then cabin in first person; Menu/Escape worked. First-person script requests did not load SpaceView. Classic menu switched without replaying launch; `?world=classic` and simulated no-WebGL both reached the classic briefing. Background service-worker precaching is not included in that script-request statement.

### Validation and remaining limits

After integrating current main: **525 tests pass**, TypeScript/production build pass, first load **144.5 / 150 kB gzipped**. Added regression tests cover room suspension/restart/disposal, input cleanup/UI focus, radio/menu structure and watched-launch handoff. No dependencies added.

Not checked: physical lower-end laptop/GPU, native browser Escape while pointer-locked, Safari/Firefox, screen reader, fresh cross-device co-op, or offline behavior of this new build. Weather/leaderboard visualization in the 3D room remains separate; score persistence is now implemented. Public availability depends on merging the follow-up and the deployment completing; local production preview is not proof of a deployed build.

Final integration **8110b85** preserves newly merged #133 (Sarah's theme + live fit replies). Live replies use the same noninteractive radio subtitle, never a second CapcomPopout. Browser E on body panels produced “Body-mounted solar cells fitted. Heads up, Flight: Not enough power”; no st-capcom popup existed. Menu/focus/hint layout was rechecked with the new theme. Combined validation: **529 tests**, build/typecheck pass, **146.0 / 150 kB** first load. Ethan's still-open #132 training integration must put its control inside WorldMenu and add training to the shared clock-hold condition; do not restore app-world-bar.
