# First-person 3D loop — test plan

Written by `cursor@caleb`, 2026-11-14, for the decision 007 cutscene task.

This file is the test plan. The Sunday 02:00 build is not here yet, so every result below is **not run**. Fill the result column on that build, and write the commit and the URL at the top of the log. Do not copy a preview check into the result column as a pass of the whole loop.

The two new pictures are in `ui/cutscenes/`: `EnterCraftScene` (8 s, hall doorway into the walk-in spacecraft) and `ReturnControlScene` (6 s, back out to the hall). Both are at most 10 s. Reduced motion holds the first frame. Skip and Escape belong to the story frame in `ui/story`, which is not mounted for these two ids yet. Mounting is a handoff to claude@aiden.

## What a pass is

On a build that plays start to debrief behind `?world=3d`:

1. After the launch cutscene, the player sees the hall, moves through the doorway, and is left inside the walk-in spacecraft.
2. After the ending, the player sees the inside, moves back through the doorway, and is left in mission control for the debrief.
3. Each of those pictures is 10 seconds or less, can be skipped, and holds still when reduced motion is on.
4. The rest of the loop still works: walk, look, fit a part, launch, read gauges, answer an anomaly, and read the debrief.

A camera move in the cutscene preview, with no game around it, does not pass the loop.

## What stays out of this plan

- Authoring the walk-in spacecraft, the first-person controller, or the hall. Those are claude@ethan and claude@aiden.
- Changing `sim/`, `app/`, or `ui/story` from this plan. Send a handoff.
- Phone frame rate. Aiden paused further phone work. A 390 px window can check that the doorway and the window stay on screen. It is not a phone pass.

## How to run it

1. Open the Sunday 02:00 build with `?world=3d`. Write the commit and the URL in the log.
2. Laptop, keyboard and mouse. Then the same path with the window at 390×844.
3. One pass with reduced motion on, and one Skip during each new cutscene.
4. For each case write Pass or Fail and one sentence. A Fail names the screen and the commit. Do not edit another owner's folder.

## Cases

| Id | Case | Result |
|---|---|---|
| P1 | Start to the hall. The arrival picture ends and you can walk. | not run |
| P2 | Look at a part and press E. The spacecraft on the stand changes. | not run |
| P3 | Four consoles show one line each. The launch button starts the launch picture. | not run |
| P4 | After launch, `EnterCraftScene` plays: doorway, then the inside, with modules and a window. It ends by itself in 10 s or less. | not run |
| P5 | Skip and Escape each end that picture once, and the game does not play it twice. | not run |
| P6 | Reduced motion shows the first frame of `EnterCraftScene` and does not move the camera. | not run |
| P7 | Inside, the modules match parts you picked. Gauges show battery, storage, science, money, and day. The time lever pauses and changes speed. | not run |
| P8 | An anomaly alarms, the affected module flashes, and E on a choice resolves it. The clock stays held until then. | not run |
| P9 | The window shows the craft in space, not a second interior. | not run |
| P10 | After the ending, `ReturnControlScene` plays back through the doorway into the hall and ends in 10 s or less. | not run |
| P11 | Skip and reduced motion behave the same on the return as on the way in. | not run |
| P12 | The debrief wall shows the grade and one fix. E on the fix flies it again. | not run |
| P13 | No WebGL shows the classic screens, not a blank hall. | not run |
| P14 | At 390 px the doorway, the modules, and the window stay in frame for both new pictures. | not run |
| P15 | WASD and the mouse do not stick after a cutscene, and keys typed in a text field are not stolen. | not run |

## Log

| When | Build | What was run |
|---|---|---|
| 2026-11-14 | cutscene preview only, not the 02:00 build | Pictures added. The loop cases above were not run. |
| 2026-11-15 | https://nasaspacemission.vercel.app commit c4d0f7b (main). Emulated viewports in the Cursor browser, not a physical laptop. | Desktop acceptance slice below. P1–P15 still not run: the enter/return cutscenes are still unmounted. |

## Desktop acceptance (cursor@kaipo covering for cursor@caleb, 2026-11-15)

Live site https://nasaspacemission.vercel.app. Viewports were set with device emulation (1280×800, 1920×1080, then a resize to 1100×700). This is not Ctrl+/- on a physical laptop and not a GPU frame-time pass.

| Check | Result |
|---|---|
| 1280×800 download gate | Pass. Title and Download button on screen. No horizontal overflow. |
| 1280×800 campaign board and briefing | Pass. Canvas 1280×800, edge to edge. Mission cards and Start / Free play stay inside the window. |
| 1920×1080 campaign board and briefing | Pass. Canvas 1920×1080, edge to edge. No button outside the window. Briefing title 28px, walk hint 14px. |
| Resize to 1100×700 | Pass. Canvas fills that window. Menu stays in the top-right. No horizontal overflow. |
| Download, then reload from cache | Pass. First download reached “Ready for launch”. After reload, Download finished in about 0.2s and showed the same ready screen. |
| Download failure and Retry | Not run. The network was not blocked. |
| Browser zoom 100% / 125% / 150% | Not run. This browser has no page-zoom control, and a CSS zoom did not change layout measurements. Needs a physical laptop. |
| GPU / frame rate | Not run. The canvas drew at these sizes. No frame timing on a real GPU. |
| Launch cutscene full height | Not run this pass. The briefing canvas already fills the viewport. The launch movie itself was not opened. |
