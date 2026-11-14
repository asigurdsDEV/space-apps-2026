# 30-second demo and recording run sheet

Use an edited **30-second video**, not the previous three-minute walkthrough. If submitting slides instead, use at most seven. Confirm the final event instructions with the submission owner. This document prepares footage; it does not claim a recording or four-device rehearsal has happened.

## Shot list

| Time | Footage to capture | Narration cue |
|---|---|---|
| 0–4 s | Start: Earth → Moon → Mars mission artwork | “Can your team build a spacecraft that brings its science home?” |
| 4–10 s | Builder: change payload/radio, show resource bars and four consoles | “Four mission-control roles balance mass, power, cost and communications.” |
| 10–15 s | Brief launch excerpt, then an anomaly choice with its historical story | “Design, launch, and respond to anomalies inspired by real missions.” |
| 15–21 s | Operations: the storm card on a real storm day, with the dated NASA weather strip behind it (First Light, Normal, seed 1 replays Sept 2017: real G4 storm on 7 Sep 2017, mission day 1) | “Real NASA space weather: this storm really hit on 7 September 2017…” |
| 21–26 s | Results: reason and sourced real-mission comparison | “…then compare your spacecraft with a real mission in the debrief.” |
| 26–30 s | Result → improved design; title, project URL and compact source credit | “Every result explains a trade-off, so your next design is a better-informed decision.” |

Use the full narration in [PITCH.md](PITCH.md), then time the spoken take. Capture gameplay first and cut between recorded shots; do not try to finish a mission live in 30 seconds. The launch alone currently lasts about 20 seconds: use a clearly edited excerpt. Keep captions readable and do not invent HUD values, outcomes or NASA branding.

## First Light recording setup

- Start with First Light, Normal, Solo; record the deployed URL and commit below. Keep the same seed when comparing designs.
- Starting parts: `cubesat-6u`, `camera-basic`, `solar-deployable-small`, `battery-small`, `s-band-patch`, `rideshare`, `sso`. Teaching point: science collection and downlink both constrain the result.
- Reference improvement: bus `cubesat-12u`; instruments `camera-basic,ir-spectrometer`; solar `solar-deployable-large`; comms `x-band-transmitter`; retain the other scenario defaults. This is the reference design in `tests/playthrough.test.ts`, including tests with difficulty-specific anomaly cards answered with option `a`.
- Optional blocking example: select `geo` with `rideshare`, show the launcher-reach issue, then restore `sso`. Do not spend the submission video on a second failure example.
- For the storm shot, First Light seed 1 fires the real G4 storm card (7 Sep 2017) on mission day 1. Pick option A to keep the run safe. Do not quote the old estimated dollar/science totals. Capture actual values and results from the recording build after the current data/physics fixes land.
- Keep the First Light losing-versus-improved story; the reference tests support it. Anomaly choices and difficulty affect outcomes, so record the complete settings and answers.

## Before recording

1. Pull merged main; run `npm ci`, `npm test`, `npm run build`, `npm run size`. Check the Pages build matches the intended commit.
2. Rehearse Start → briefing → builder → GO/NO-GO → launch → anomaly decisions → results. Skip/dismiss story overlays when framing a shot; verify text and source links are legible.
3. Capture dated weather and the real-mission comparison. Weather is historical context in the current source, not a demonstrated cause of storms or drag. Anomaly effects are a separate game model.
4. Check the final video duration is ≤30 seconds and captions remain readable. For slides, count ≤7. Put complete credits in the submission References; a compact video credit is not a substitute.
5. Use local play unless online rehearsal succeeds. Four-device venue Wi-Fi/hotspot results remain in `MULTIPLAYER_TEST.md`; do not claim that rehearsal passed from unit tests.

## Recording evidence — fill after rehearsal

| Item | Actual recording value |
|---|---|
| Build commit / Pages URL | Not yet recorded |
| Scenario / difficulty / seed | First Light / Normal / record actual seed |
| Exact changes / anomaly answers | Reference above; record actual answers |
| Starting and improved outcome / displayed budgets | Not yet captured on final recording build |
| Weather date / real-mission match shown | Not yet captured |
| Final video duration / caption check | Not yet recorded |
| Online rehearsal or local fallback | Solo recommended; venue results separate |

## References for the recording

NASA SPDF OMNIWeb and its index providers; the real-mission and anomaly-card source links shown in game; NASA small-spacecraft background. Full provenance and limits: [NASA_SOURCES.md](NASA_SOURCES.md). Submission owner maintains the complete software/assets References list in `SUBMISSION.md`.
