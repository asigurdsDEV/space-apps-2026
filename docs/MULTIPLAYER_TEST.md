# Multiplayer rehearsal

How to check online co-op for up to 4 players, and what to do when the network fails. This is the venue script for the Space Mission Design Game (team Kimchi Trenchers).

**Status:** script and fallback call are written. The four-device run has **not** been done yet. `main` does not yet have the wired app (`net/` is PR #9; `app/` is still in progress). Fill the results tables at the venue. Do not treat the empty rows as a pass.

Transport behavior below matches `net/README.md` on `jamie-codex/transport-demo` (checked 2026-11-14). The room code is the **full PeerJS id**, not a short code.

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
| Date / place | not run | |
| URL or build | not run | |
| Network | venue wifi | |
| 3 guests joined | | |
| Roles unique | | |
| Fifth player rejected | | |
| Guest edit seen by others | | |
| Host launch seen by guests | | |
| Guest leave updates roster | | |
| Host close ends the room | | |
| Pass or fail | not run | |

## Run B — phone hotspot

Do this only if Run A fails, or if you have time after a pass. One phone turns on its hotspot. Every device joins **that** hotspot, not venue wifi. Repeat steps 1–8.

| Check | Result | Notes |
|-------|--------|-------|
| Date / place | not run | |
| Hotspot owner | | |
| 3 guests joined | | |
| Guest edit seen by others | | |
| Host launch seen by guests | | |
| Host close ends the room | | |
| Pass or fail | not run | |

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
