# 30-second demo and recording run sheet

Prepare an edited **30-second video** (or at most seven slides, per the submission brief). This is a capture plan, not evidence of a finished recording. Submission owner maintains the final event requirements and upload.

## Shot list — current guided 3D game

| Time | Footage to capture | Narration cue |
|---|---|---|
| 0–4 s | Brief Download/Continue transition, then the guided Earth → Moon → Mars board | “Build a space program from Earth to Mars.” |
| 4–10 s | Walk to a mission-control station; press E to fit a part; show the changed resource gauge | “Walk into mission control, fit your spacecraft, and balance power, science and cost.” |
| 10–15 s | Short launch excerpt, then the spacecraft room and an alarm interaction | “Launch, then answer alarms inside your spacecraft.” |
| 15–21 s | Readable close-up of the real dated geomagnetic-storm card | “NASA’s real space-weather records put storms on the days they happened.” |
| 21–26 s | Actual successful debrief and next-assignment grant; show Moon becoming available | “Bring the science home to unlock the next mission and its funding.” |
| 26–30 s | Mission board or next assignment, title, deployed URL and compact source credit | “Every choice teaches a trade-off. What will you build?” |

Use [PITCH.md](PITCH.md) for the complete narration. Record separate shots, then edit to length: the download, walk, launch and full mission do not happen in 30 seconds. Use clearly edited launch excerpts, readable captions and actual game values. Do not imply the next mission unlocks merely from pressing Launch.

## Onboarding and capture route

1. Open the intended deployed build on desktop. Select **Download game**, wait for preparation, then **Continue to game**. Cached files can be reused; this does not prove permanent offline availability or guarantee GPU frame rate.
2. The default board says **Build your space program**. On a fresh browser profile, First Light is funded; Moon and Mars are locked. Use a separate recording profile for a fresh campaign instead of clearing anyone’s saved progress.
3. Select **Start guided mission**. WASD moves, mouse/arrows look, E uses the station in reach, and Escape opens the menu. Skip the arrival cutscene when staging a shot. The current hall uses stations and a central hologram, not the older spreadsheet-first/rack-only presentation.
4. Fit the reference design below and capture a real resource change. Launch after checking GO. Skip long cutscenes while rehearsing; capture short excerpts separately.
5. In the spacecraft room, face the alarm choice/module and use E. Record the dated storm text while it is visible. Use the existing speed control to finish the mission; do not imply accelerated sim time is real elapsed time.
6. Capture the actual result and **Continue to next mission** / **Mission board** flow. Moon becomes funded after an Earth win. A loss offers a funded retry and leaves later missions locked.

The **Free play, Daily & online** route opens the separate Start menu (Start → crew setup → mission → difficulty). Use it for a Normal/free-play comparison or multiplayer footage; it does not unlock the campaign. An explicit `?world=classic` URL uses the Classic entry path. Do not splice those budgets into a shot labelled as guided play.

## First Light recording setup

- **Guided campaign:** First Light uses Easy settings, seed 1, $12M grant and 24-point target. Moon and Mars use Normal settings with $300M/$500M grants. These are fixed assignment grants, not a cumulative bank balance. Re-check the recording build’s actual values before filming.
- **Free-play comparison, if needed:** First Light Normal uses $8M and 30 points. Keep that footage explicitly labelled and separate from the campaign win/unlock shot.
- Starting parts: `cubesat-6u`, `camera-basic`, `solar-deployable-small`, `battery-small`, `s-band-patch`, `rideshare`, `sso`.
- Reference improvement: `cubesat-12u`; instruments `camera-basic,ir-spectrometer`; solar `solar-deployable-large`; comms `x-band-transmitter`; keep the other defaults. Reference wins are covered by `tests/playthrough.test.ts`; `ui/campaign/model.test.ts` checks all three funded configurations through the real sim and anomaly rules.
- First Light seed 1 replays September 2017. The real G4 storm on **7 September 2017** appears on mission day 1. Choose the safe first option (option `a` in tests); record the actual label and any later answers. The dated event comes from OMNI, while its gameplay consequences are simplified.
- For a blocking example, use `geo` with `rideshare`, show the reach error, then restore `sso`. This is optional rehearsal footage, not another failure sequence to squeeze into 30 seconds.
- The reference setup has automated win evidence; the final recording still needs a complete rehearsal on its deployed commit. Do not reuse old score or budget screenshots after balance changes.

## Before recording

1. Check the intended merged commit: `npm ci`, `npm test`, `npm run build`, `npm run size`. Verify the deployed URL serves that build. Pages and Vercel can differ when the Vercel deployment is manual.
2. Rehearse download → campaign → station fitting → launch → module choices → debrief → next grant. See [guided campaign QA](qa/guided-campaign.md) for prior evidence and its limits; it is not a sign-off on a newer recording build.
3. Capture the dated NASA storm card. Historical data schedules this event; the effects remain a separate simplified game model. A weather strip or Classic real-mission comparison may be optional extra footage only if actually visible in the chosen view.
4. Time the finished video to ≤30 seconds and check captions. For slides, count ≤7. Put complete credits in the submission References; a compact video credit is not a substitute.
5. Use solo for the campaign recording. Cross-device multiplayer evidence belongs in [MULTIPLAYER_TEST.md](MULTIPLAYER_TEST.md); automated transport tests do not replace physical-device acceptance.

## Recording evidence — fill after rehearsal

| Item | Actual recording value |
|---|---|
| Build commit / deployed URL | Not yet recorded |
| Route / scenario / difficulty / seed | Guided / First Light / Easy / 1 planned; verify actual |
| Exact changes / anomaly answers | Reference above; record actual answers |
| Outcome / displayed grant / science | Not yet captured on final recording build |
| Storm date / next mission unlocked | Not yet captured |
| Final video duration / captions / video URL | Not yet recorded |
| Device / browser / playback performance | Not yet recorded |

## References for the recording

NASA SPDF OMNIWeb and its index providers; NASA/USGS body maps; historical anomaly stories and sourced mission comparisons when shown. Full provenance and limits: [NASA_SOURCES.md](NASA_SOURCES.md). Submission owner maintains the software/assets References list in [SUBMISSION.md](SUBMISSION.md). No NASA endorsement is implied.
