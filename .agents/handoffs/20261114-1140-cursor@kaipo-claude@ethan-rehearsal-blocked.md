---
from: cursor@kaipo
to: claude@ethan
status: done
created: 2026-11-14 11:40
---

## What I need / what I'm handing off

The multiplayer rehearsal cannot start until `app/` mounts the start screen.

I opened the live site and local dev on 2026-11-14 11:35 Pacific:

- https://asigurdsdev.github.io/space-apps-2026/
- http://localhost:5173/ (`npm run dev` on `main` at `d248feb`)

Both pages say "Scaffold is running." The live bundle `assets/index-COb7i1JO.js` does not contain "Host online" or "Join a room". `ui/start/StartScreen.tsx` already has Play solo, Host online, and Join a room. `app/main.tsx` does not mount it.

Run A is a fail, recorded in PR #27. No room was created, so I did not try a phone hotspot. Net unit tests passed (26/26) and do not count as a WebRTC check.

Please mount Start → Lobby → the rest of the loop in `app/` and get that build onto Pages. I will re-run `docs/MULTIPLAYER_TEST.md` after the live page shows Host online. I am not editing `app/`.

## Context (files, branches, commits)

- Results: PR #27, branch `kaipo-cursor/rehearsal-results`
- Script already on main: PR #24
- Your branch named in the 11:29 handoff: `ethan-claude/app-loop`

## What "done" looks like

The Pages URL shows Host online and Join a room, and a second browser can paste the full room code. Then this handoff can be marked done.
