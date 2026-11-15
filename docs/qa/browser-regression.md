# Browser regression after tonight's merges

claude@ethan's handoff 20261114-2323, run by claude@jamie for codex@jamie (out of usage). Build: `main` at **a577c85** (after PRs #164 to #170), served by `npx vite` on a fresh dependency cache. Chrome via playwright-core 1.65.1. Both scripts drive the classic 2D screens (`?world=classic`), as their README says; the first-person 3D world is not covered.

**Result: solo 15 / 15 PASS, co-op 24 / 24 PASS.** No game failures, so no handoffs to owners were needed.

## What failed first, and why (none of it was the game)

| Symptom | Cause | Fix |
|---|---|---|
| Every solo case blank, `504 (Outdated Optimize Dep)`, `Failed to fetch dynamically imported module …/SpaceView.tsx` | A dev server already on port 5173 had a stale dependency cache (Vite re-optimised mid-run after `npm i --no-save playwright-core`) | Ran a fresh server: `npx vite --port 5174 --force`, `E2E_URL=http://localhost:5174/?world=classic`. README note added |
| Co-op guest never joins: "it did not answer" (2 runs of 4) | Direct WebRTC between the two browsers was blocked on this network some of the time; a dev server has no TURN relay (`/api/ice` is Vercel-only). The same script joined fine against the Vercel site, which has the relay | Script: this case now reports **SKIP** with that reason (and skips the cases that need it), not FAIL |
| "cannot pause" timed out | A real storm day opened an anomaly card on day 1; Pause is off until the PLAN console answers | Script: new `clearCards()` answers open cards first |
| Guest's mission clock "stopped at \"\"" | `.mv-head .mv-muted` no longer exists; the day counter is `.mv-day` | Script: selector updated |
| Host "still counts the guest" while it shows `CREW (1)` | The app bar's theme writes the crew count in capitals, and `innerText` follows `text-transform` | Script: crew-count checks ignore case |
| Third/fourth/fifth join, closed tab, host leaves | Knock-on from the case above | Pass after the fixes |

## solo.mjs

| Case | Result | Note |
|---|---|---|
| start screen | PASS |  |
| demo easy winning design | PASS | Mission success, 1000 / 1000 · 365 days flown |
| demo normal winning design | PASS | Mission success, 934 / 1000 · 365 days flown |
| demo hard winning design | PASS | Mission success, 900 / 1000 · 365 days flown |
| mars easy winning design | PASS | Mission success, 1000 / 1000 · 1095 days flown |
| mars normal winning design | PASS | Mission success, 1000 / 1000 · 1095 days flown |
| mars hard winning design | PASS | Mission success, 999 / 1000 · 1095 days flown |
| moon easy winning design | PASS | Mission success, 990 / 1000 · 730 days flown |
| moon normal winning design | PASS | Mission success, 934 / 1000 · 730 days flown |
| moon hard winning design | PASS | Mission success, 896 / 1000 · 730 days flown |
| sandbox easy winning design | PASS | Mission success, 817 / 1000 · 365 days flown |
| sandbox normal winning design | PASS | Mission success, 817 / 1000 · 365 days flown |
| sandbox hard winning design | PASS | Mission success, 818 / 1000 · 365 days flown |
| demo impossible design refused at launch | PASS |  |
| demo normal starting design loses | PASS | Science goal missed, 257 / 1000 · 365 days flown |

## coop.mjs

| Case | Result | Note |
|---|---|---|
| online: the host creates a room | PASS | code XMX4PD |
| online: a guest joins with the code | PASS |  |
| online: each player claims a different role | PASS |  |
| online: the host starts and both reach the builder for the same mission | PASS | First Light: your first Earth-observing CubeSat (Easy) |
| roles: the guest changes the part its role owns and the host sees it | PASS |  |
| roles: the host changes the part its role owns and the guest sees it | PASS |  |
| roles: another player’s part is locked in the builder, with a readable reason | PASS |  |
| roles: the host refuses the guest’s change to the host’s part, with a readable message | PASS | Only Hana (Mission planning) can change that part of the design. |
| roles: the host is refused on the guest’s part too, with a readable message | PASS | Only Gus (Science) can change that part of the design. |
| roles: a part whose role nobody claimed can be changed by anyone | PASS |  |
| sync: both screens show the same design and budgets | PASS |  |
| launch: the mission planner launches and both screens fly | PASS |  |
| flight: a player who is not the mission planner cannot pause, and is told why | PASS |  |
| flight: the mission keeps running for the guest while the host’s page is hidden | PASS | Day 2 / 365 -> Day 3 / 365 -> Day 4 / 365 |
| results: both players reach the same results | PASS | Mission success, 1000 / 1000 · 365 days flown |
| leave: the guest leaves and the host keeps playing | PASS |  |
| room: a third and a fourth player join | PASS |  |
| room: a fifth player is told the room is full | PASS | after 17 s: Could not join that room: it did not answer. It may be full (4 players at most), or the network may be blocking the connection.  |
| join: a wrong room code shows a clear error | PASS | Could not join that room: no open room has that code. Check the code with your host. Solo and one-screen play work without a network. |
| leave: a guest who closes the tab is dropped from the crew | PASS | after 0 s |
| leave: the host goes to the main menu and the guests are told the room is closed | PASS |  |
| one screen: every role’s parts are open on the one device | PASS |  |
| one screen: the crew launches and reaches the results | PASS | Mission success, 1000 / 1000 · 365 days flown |
| console: no errors on any page | PASS |  |

## Second run (after realism pass 2)

`main` at **3339c29** (realism pass 2, PRs #176 to #178, and the Earth on the real clock, #179). `npm install` first: `main` now needs `geotiff`, and a dev server without it answers 500 for `app/App.tsx` (every case blank).

- **solo.mjs: 15 / 15 PASS**, same results as the first run.
- **Launch fills the window** (the 3D game, guided First Light, Launch pressed from the hall through the dev hooks `__fps.teleport` / `__fps.interact`; Chrome with software WebGL so the picture really renders):

| Window | Launch shell and canvas (top, bottom, width) | Gap at the bottom | Picture |
|---|---|---|---|
| 1290 × 690 | 0, 690, 1290 | 0 px | PASS: pad, rocket, sea and sky to every edge |
| 1280 × 800 | 0, 800, 1280 | 0 px | PASS |
| 1920 × 1080 | 0, 1080, 1920 | 0 px | PASS |
| 390 × 844 | 0, 844, 390 | 0 px | PASS: whole rocket in frame, caption card at the bottom |

No black band at the bottom at any size; no page errors. (Headless Chrome without `--use-angle=swiftshader --enable-unsafe-swiftshader` draws the launch black, so use those flags for a picture check.)

## Not covered

- Co-op on the live site needs the TURN relay, so it is only meaningful on Vercel; Vercel was still on an older build (d70c4e8) at this run.

## Third run: after realism passes 3 and 4 (2026-11-15 04:59, claude@ethan)

On `main` at 0f64dee (PRs #188 to #199 merged: upright Earth, lift-off, spacecraft room twice, sound twice, Live Earth, aurora and stars, the `debris-pass` card, alarm order, astronaut, climb backdrop). Dev server on this Mac, Chrome, real PeerJS broker.

| Script | Result |
|---|---|
| `e2e/solo.mjs` | 15 / 15 PASS (every scenario at every difficulty wins, the impossible design is refused, the starting design loses) |
| `e2e/world.mjs` | 1 / 1 PASS (guided First Light, first-person, won and unlocked the Moon) |
| `e2e/coop.mjs` | 24 / 24 PASS, 0 skipped (room, roles, locks, launch, hidden host tab, same results, leave, room full, one screen, no console errors) |

Not covered: Safari and Firefox, a real phone, co-op in the first-person 3D world, co-op across networks on the Vercel site, and the Live Earth screen inside a co-op room.
