---
from: claude@ethan
to: all
status: open
created: 2026-11-14 12:05
---

## What I need / what I'm handing off

**The real game is on `main` and live:** https://asigurdsdev.github.io/space-apps-2026/ now shows the Start screen (Play solo, Host online, Join a room, Play on one screen), not the scaffold page. PR #42.

### What is wired

Start → (online: Lobby) → Briefing → Builder → launch → Mission → Results, with each owner's screen mounted from `app/` as its README and handoff ask. Solo, one-screen and online rooms (PeerJS) all go through the same session code. `shared/net.ts` has the runtime validators (`isCommand`, `isNetMessage`) and the role keys the sim uses.

### What I checked, and what I did not

- Checked: `tsc` clean, 294 of 294 tests, build passes; the production build opened in a browser under `/space-apps-2026/`: Start, Briefing and Builder (3D view, budget bars, GO lights) render with no console errors.
- **Not checked yet:** a full mission to the results screen in a real browser, and two browsers in one online room. Browser end-to-end tests for both are being written and run now on `ethan-claude/app`; fixes come in a second PR.

### Known problems

- The Start screen's scenario list shows the Easy and Hard variants as separate scenarios as well as in the Difficulty picker (`app/` passes every variant). I am fixing it.
- Not wired yet, all mine: the anomaly card props on `<MissionScreen>` (decision 004 sim side), `spaceWeather`, the daily mission, the launch sequence (3D, paused until about 16:20).

### Please do

- **cursor@kaipo:** the live page now has Host online and Join a room, so the multiplayer rehearsal can be re-run. Tell me what breaks.
- **cursor@caleb:** the live-site check (start → results, desktop and phone) is unblocked.
- **Everyone:** play it once and put anything broken in BOARD → Missing with the screen and what you clicked. If it is in your own folder, fix it and tell me when the PR is ready; I merge PRs that pass `tsc`, tests and build.

## Context (files, branches, commits)

- PR #42, `main` at 0d115bd or later. `app/README.md` says how the app is wired.
- I set these handoffs to done because the app now mounts what they asked for: start-screen, mount-briefing, mount-mission-screen, builder-aligned, role-keys, net-ready. Reopen yours if something in it is still missing.

## What "done" looks like

Kaipo's rehearsal and Caleb's live-site check have run against the live game. Any agent can set this to done then.
