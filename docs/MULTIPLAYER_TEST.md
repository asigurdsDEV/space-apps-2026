# Multiplayer rehearsal

How to check online co-op for up to 4 players, and what to do when the network fails. This is the venue script for the Space Mission Design Game (team Kimchi Trenchers).

**Status:** first attempt 2026-11-14 11:35 **fail** (scaffold only). **Preflight 2026-11-14 13:30 pass:** live [Pages](https://asigurdsdev.github.io/space-apps-2026/) and local dev show **Play solo**, **Host online**, and **Join a room** (app loop on `main`, merge `929fb77+`). **Run A-local 2026-11-14 ~13:40 partial pass** (4 tabs, one laptop, loopback — see below). **Venue Run A / Run B still not run.** Net unit tests still do not prove WebRTC.

Transport behavior below matches `net/README.md` (checked 2026-11-14). The room code players type is the **6-letter code** (`smdg-` plus that code is the PeerJS id). A room never grows past **4 players** (host + 3). Extra joins are closed.

**Public play:** open the same site on every device. The Vercel address is [https://kimchispacemission.vercel.app](https://kimchispacemission.vercel.app) (Vercel account lit-turtle). GitHub Pages remains `https://asigurdsdev.github.io/space-apps-2026/`. Play still goes peer-to-peer (PeerJS signaling + WebRTC). `/api/ice` on that Vercel site gives each browser a short-lived Cloudflare TURN relay (including TCP/TLS on port 443) so guest Wi-Fi does not have to be a hotspot. Confirmed live 2026-11-14. The TURN key stays in Vercel env (`CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN`), not in the repo. GitHub Pages has no `/api/ice` and keeps the direct PeerJS path. There is no extra game server, and a fifth player is still rejected.

## What you need

- 4 devices: laptops or phones. One of them is the host.
- The built game open on every device (the Pages URL once it serves the app, or the same `npm run dev` origin if you are still on a laptop network).
- Venue wifi, then a phone hotspot if wifi fails.
- One person reading this page out loud.

Roles, one each: mission planning, spacecraft, science, communications. A player must claim a role before their commands count. The host is the only machine that runs the sim. Guests only send commands and draw the state the host sends.

## Pass / fail

A network **passes** when all of these happen:

1. Host creates a room and the other three join with the full room code.
2. Each player claims a different role. A second claim of the same role is rejected.
3. A fifth join fails or is closed. The room stays at host + 3.
4. One guest changes a part they own. The other screens show that change.
5. Host starts the mission. Guests see the same phase advance. Guests are not running their own sim.
6. One guest closes the tab. The roster drops them. The mission on the host keeps going.
7. Host closes the tab. Guests see that the room is dead. They do not keep a private copy of the mission.

A network **fails** if join never completes, the room code is rejected, only some devices connect, or a guest can launch or edit another role's parts.

PeerJS tests in the repo do **not** prove this. They never open a real WebRTC connection.

## Preflight (before Run A)

| Check | Result | Notes |
|-------|--------|-------|
| Live Start has Host / Join | pass | 2026-11-14 ~13:30 Pacific. Pages serves the full game; no "Scaffold is running". |
| Local dev has Host / Join | pass | `http://localhost:5176/` (Vite on this machine). |
| Four devices available | not run | One laptop only at preflight time. |
| Venue wifi | not run | Do Run A at the event. |

## Run A-local — same machine, 4 browser tabs

Smoke test when you have one computer: open four tabs on the same origin (e.g. `http://localhost:5176/`). This exercises PeerJS/WebRTC over loopback; it does **not** replace venue wifi or hotspot Run A/B.

| Step | Who | Action |
|------|-----|--------|
| 1 | Host tab | Start → Host online → name **Host-A** → Create room. Note room code (display showed `LL2KQG`; join used that code). |
| 2 | Guest tabs | Start → Join → same code → names **Guest-B**, **Guest-C**, **Guest-D**. |
| 3 | All | Lobby shows **Crew 4 / 4**. Claim roles (host: mission planning; Guest-B: spacecraft). |
| 4 | Optional 5th tab | Try to join — not run in this session. |
| 5 | Guest-B (spacecraft) | Change bus **6U** → **12U**. Host tab should show **12U** and **Last changed by Guest-B**. |
| 6 | Host | Continue → briefing, then builder. Confirm role locks (“Only Guest-B can change bus” on host). |
| 7–8 | Disconnect tests | Not run in this session. |

| Check | Result | Notes |
|-------|--------|-------|
| Date / place | 2026-11-14 ~13:35–13:45 Pacific | One Windows laptop, Cursor IDE browser tabs + automation. |
| URL or build | `http://localhost:5176/` | Vite dev on `main` after V3 + preflight merges. |
| Network | localhost loopback | Not venue wifi. |
| 3 guests joined | pass | Guest-B/C/D joined; roster **Crew 4 / 4**. |
| Roles unique | partial | Host **mission planning**, Guest-B **spacecraft**; Science / Comms left **Free** (valid; two players had no role yet). Duplicate-role block when a role is taken was not re-tested. |
| Fifth player rejected | not run | |
| Guest edit seen by others | pass | 12U CubeSat on host; attribution **Last changed by Guest-B**. |
| Host advance (lobby → briefing → builder) | pass | Guest-C saw briefing; all four in co-op builder with section locks. |
| Host launch / flight seen by guests | not run | |
| Guest leave updates roster | not run | |
| Host close ends the room | not run | |
| Pass or fail | partial pass | Join, roster, sync, and phase advance OK; finish venue Run A + disconnect/launch before judging sign-off. |

## Run A — venue wifi

Do this first, on the event wifi.

| Step | Who | Action |
|------|-----|--------|
| 1 | Host | Start → Host online. Write the **full** room code where everyone can see it. |
| 2 | Guests | Start → Join. Paste the full code. Enter a name. |
| 3 | All | Claim one role each. Confirm the roster lists 4 names. |
| 4 | Extra device, if you have one | Try to join as a fifth. Expect failure. |
| 5 | Science (or whoever owns the instrument) | Change one part. Others confirm the bar or part updates. |
| 6 | Mission planning | Launch only after the screen says launch is allowed. |
| 7 | One guest | Close the tab. Host confirms the roster drops them. |
| 8 | Host | Close the tab. Guests confirm the room ends. |

| Check | Result | Notes |
|-------|--------|-------|
| Date / place | 2026-11-14 11:35 Pacific | One laptop. Not the venue. |
| URL or build | https://asigurdsdev.github.io/space-apps-2026/ and http://localhost:5173/ | Both pages: heading "Space Mission Design Game", text "Scaffold is running." Live bundle `assets/index-COb7i1JO.js` contains that sentence and does not contain "Host online" or "Join a room". |
| Network | not venue wifi | Dev machine only. |
| 3 guests joined | fail | No room was created. The running page has no Host or Join. |
| Roles unique | not reached | |
| Fifth player rejected | not reached | |
| Guest edit seen by others | not reached | |
| Host launch seen by guests | not reached | |
| Guest leave updates roster | not reached | |
| Host close ends the room | not reached | |
| Pass or fail | fail | Blocked before join. `npm run dev` on `main` (`d248feb`) served the same scaffold. |

## Run B — phone hotspot

Do this only if Run A fails, or if you have time after a pass. One phone turns on its hotspot. Every device joins **that** hotspot, not venue wifi. Repeat steps 1–8.

| Check | Result | Notes |
|-------|--------|-------|
| Date / place | not run | Run A never opened a room, so there was nothing to retry. |
| Hotspot owner | | No second network. |
| 3 guests joined | not run | |
| Guest edit seen by others | not run | |
| Host launch seen by guests | not run | |
| Host close ends the room | not run | |
| Pass or fail | not run | Do this after Host online is on the live site and Run A fails. |

## Fallback call

Use this call at judging. Say it out loud so the team switches together.

1. **Try venue wifi once** (Run A). Give joins about 20 seconds. A pending guest expires after 15 seconds in the transport, so a hung join is a fail, not a "still connecting."
2. **If wifi fails, switch every device to one phone hotspot and try once** (Run B). Create a **new** room. Do not reuse the dead room code.
3. **If the hotspot fails, or the host dies mid-demo, stop online play.** Say: "We're on local fallback." One laptop, same-screen play, all four roles on that machine. That is `LocalTransport` (same-screen), not a silent reconnect.
4. **Do not** keep clicking Join on a half-open room, and do not pretend a guest is still in the mission after the host tab is gone. Host loss is terminal: new room, or local fallback.
5. Solo play is always available from Start if co-op is the thing that failed. The judging demo can finish solo.

## After the run

- Fill the tables above. Replace "not run" with pass or fail and one line of what you saw.
- If something broke in the UI rather than the network, hand it to the screen owner (`ui/start/`, `ui/lobby/`) or to claude@ethan (`app/`). Do not patch those folders from this doc.
- Leave this file's status line updated so the board can move to done only after a real run is recorded.
