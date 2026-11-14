---
from: codex@aiden
to: all
status: open
created: 2026-11-14 12:07
---

## What I need / what I'm handing off

Aiden asked what remains to complete, without overlapping Claude's offline/PWA work or Ethan's 3D. This is an assessment; no source scope is claimed or transferred. Existing repo-level permission stands. Ethan remains sole merge coordinator.

1. **Ethan:** app is live; fix the already-known duplicated scenario variants AND apply `StartRequest.difficulty` (current `App.start()` looks up scenarioId and ignores difficulty). Finish full-mission/two-browser e2e, then the app integration seams: daily descriptor/seed/UTC refresh, GO/NO-GO poll, bonusGoal on MissionScreen, earned stars on LocalLeaderboard, dailySeed only for Daily, and optional spaceWeather. `LaunchView` remains null; all 3D/lazy-loading work stays yours. Error boundaries are also your Open task.
2. **Ethan + sim/mission owners:** anomaly UI and what-if views exist, but the sim decision events/command and analysis helpers are absent on checked main. These belong to proposed decision 004, beyond the already-playable basic MVP. Prioritize reliable solo/co-op over adding everything at once.
3. **Kaipo:** Host/Join are live now. Re-run four real devices on venue wifi and a phone hotspot; update MULTIPLAYER_TEST. The old scaffold blocker no longer applies.
4. **Caleb:** live Start → Results checks, 390px phone, keyboard/screen-reader report can resume. SUBMISSION exists but still says scaffold; update after your checks, and coordinate measured space-weather provenance with Sarah/Jamie. Do not keep the draft claim that no measured NASA data is downloaded without reconciling `data/space-weather/`.
5. **Jamie Codex / Caleb:** fill actual commit/seed/result/failing change/repair/network evidence in DEMO before recording the final video. Jamie's tips are already PR #44; please mount through the builder owner rather than claiming tutorial again.
6. **Merge coordinator:** open PRs #41 (bonus goals/program), #43 (offline/PWA), #44 (tips) have green build checks at inspection. Review current heads/dependencies and merge under existing rules. A board Done entry means in a PR, not necessarily deployed. Claude Aiden retains the bundle-size workflow after Ethan's lazy 3D split.

Real mission matching data remains Jamie Claude's Open task. During the final pull Claude Aiden also claimed sound (`ui/audio/` plus builder click, commit 5816068), so that scope is reserved too. No currently Open implementation task is unowned. No one is waiting on an additional permission from Aiden for these existing scopes.

## Context (files, branches, commits)

- Main source checked at 8c7a293; later coordination caa0791. No source edits in this assessment.
- `npm test`: 294/294 pass; `npm run build`: typecheck/build pass.
- Main entry bundle: 959.41 kB minified / 263.53 kB gzip; lazy 3D still matters. Do not treat the earlier 219 kB scaffold bundle as the game baseline.
- Live https://asigurdsdev.github.io/space-apps-2026/ : solo First Light Normal, untouched starting design, Start → Briefing → Builder → Launch → Mission, 60× → Results. Correct expected loss: 365 days, 1.7/30 science, 26 points; local best panel shown. No GO/NO-GO poll appeared between builder and mission.
- `app/App.tsx`: Start passes no daily/preview props; ignores difficulty; Flight passes no bonusGoal/weather/analysis props and regular LocalLeaderboard has no stars/dailySeed. This records integration gaps, not faults in the individual UI modules.
- Online, phone, offline, winning live run, and full accessibility were NOT checked by this assessment. Ethan's e2e and Caleb/Kaipo remain owners. Test-suite success is not venue rehearsal evidence.

## What "done" looks like

Owners report their checks/fixes on current main, ready PRs are reviewed/merged/deployed, demo has reproducible win/loss evidence, and the final presentation/submission describes only what the team actually verified. Keep user-reported offline and all 3D scopes separate from any new Codex work.
