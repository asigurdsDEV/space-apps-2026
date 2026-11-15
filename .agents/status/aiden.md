# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 16:00

## Vercel — how it is set up, and how to turn on auto-deploy

Written by cursor@kaipo on 2026-11-14 17:38, because Aiden asked for pushes to show up on the live site. Aiden's own sections below are unchanged.

### What is live now

The production site is https://kimchispacemission.vercel.app. It is the Vercel project `kimchispacemission` on the **lit-turtle** team (Kaipo's Vercel account, CLI user Lit-Turtle). The GitHub repo is `asigurdsDEV/space-apps-2026`, a personal repository on the user asigurdsDEV, not an organization.

It is the same Vite app as GitHub Pages. A build with `VERCEL=1` is served at the domain root (`/`). Pages stays at https://asigurdsdev.github.io/space-apps-2026/ with base `/space-apps-2026/`. `vercel.json` routes `/api/ice` to `api/ice.js`. That route only mints a short-lived Cloudflare TURN credential so two browsers on different networks can open a WebRTC room. The game stays host-authoritative and peer-to-peer. There is no game server.

Production and Preview already have these env names set (the values stay in Vercel, not in git):

- `CLOUDFLARE_TURN_KEY_ID`
- `CLOUDFLARE_TURN_API_TOKEN`

The `.vercel` link folder is gitignored. Until Git is connected, production is updated by hand from a checkout of `main` on Kaipo's machine:

```
npx vercel deploy --prod --yes --project kimchispacemission
```

Latest hand deploy, from app commit `d70c4e8` (PRs #144–#147): deployment `dpl_Cq7xhw4P4aFipP2rTYrt5aegyTmC`, alias https://kimchispacemission.vercel.app, inspector https://vercel.com/lit-turtle/kimchispacemission/Cq7xhw4P4aFipP2rTYrt5aegyTmC. `game-assets.json` listed 45 files and every one returned HTTP 200. `/api/ice` returned 200 with a TURN relay on port 443. GitHub Pages, from the same app commit, also returned 200 for all 45 of its manifest files. The manifest version strings differ (`gmvd1x` on Pages, `afgt3` on Vercel) because the base path is compiled into the scripts.

### Why a push does not deploy

`npx vercel git connect https://github.com/asigurdsDEV/space-apps-2026.git --yes --project kimchispacemission` fails. Vercel answers 400 and says it cannot connect the repository. The Vercel GitHub App that is installed is on **@Lit-Turtle**. That install cannot see a repository owned by **asigurdsDEV**. Kaipo is a collaborator with push, not the owner, and GitHub's approval page for the Lit-Turtle install asks for that account's password. Approving it there does not grant access to this repo.

### What Aiden does (about two minutes)

1. Sign in to GitHub as **asigurdsDEV** (the repository owner).
2. Open https://github.com/apps/vercel and install the Vercel app on that user account. Choose **Only select repositories** and select `space-apps-2026`. Approve the request. Do not install it on a different account.
3. Tell Kaipo. From a checkout of this repo, on the lit-turtle Vercel account, run:

```
npx vercel git connect https://github.com/asigurdsDEV/space-apps-2026.git --yes --project kimchispacemission
```

4. Production branch: `main`. Leave preview deployments on, so each pull request gets its own URL.
5. After that, a push to `main` updates https://kimchispacemission.vercel.app by itself, and a Vercel check appears on the commit. GitHub Pages keeps deploying on its own. The TURN env vars are already on Production and Preview, so co-op on preview URLs can mint a relay too.

Until step 2 is done, Kaipo still runs the hand-deploy command above after `main` changes.

### Update 2026-11-15 00:20 (claude@aiden): Vercel is now Aiden's only

Aiden decided: **his project `kimchi-trenchers/space-apps-2026` is the only Vercel site.** It already deploys every push to `main` and every PR (Vercel GitHub app installed 2026-11-15). Steps, in order:

1. **Kaipo** removes the domain `kimchispacemission.vercel.app` from `lit-turtle/kimchispacemission` (Settings → Domains), then deletes that project (Settings → Advanced → Delete). Handoff `20261115-0020-claude@aiden-cursor@kaipo-vercel-move.md`.
2. **Aiden**, in Vercel → `space-apps-2026`:
   - Settings → **Deployment Protection** → Vercel Authentication: **Only Preview Deployments** (or off). Today every URL of the project redirects to a Vercel login.
   - Settings → **Environment Variables**: add `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` for Production and Preview. Make a TURN key in your own Cloudflare account (Calls / Realtime → TURN), or get Kaipo's values over a private message, never in the repo.
   - Settings → **Domains** → add `kimchispacemission.vercel.app` (after step 1 frees it).
   - **Redeploy** `main` (Deployments → … → Redeploy) so the env values take effect.
3. Check: `https://kimchispacemission.vercel.app` opens without a login, `/api/ice` returns 200, and a commit on GitHub shows the green "Vercel" status.

**Update (claude@aiden):** protection is off, the TURN env values are set (`/api/ice` 200), and Aiden chose **https://nasaspacemission.vercel.app** as the public address instead of the old one, so the domain move in steps 1 and 2 is dropped. Kaipo only deletes his project.

## claude@aiden

**Branch:** aiden-claude/app-walk (PR #87); aiden-claude/hangar (PR #80); aiden-claude/story-app (PR #74, after #70); aiden-claude/story-popouts (PR #70); aiden-claude/launch-visible (PR #68); aiden-claude/debrief-fixes (PR #65); aiden-claude/risk-meter (PR #57); aiden-claude/what-if (PR #55); aiden-claude/app-safety (PR #53); aiden-claude/bundle-check (PR #54); aiden-claude/briefing-bonus (PR #49); aiden-claude/mobile-budgets (PR #46); aiden-claude/audio (PR #45); aiden-claude/offline (PR #43); aiden-claude/part-fit (PR #39); aiden-claude/console-lights (PR #35); aiden-claude/budget-bars (PR #32, after #29); aiden-claude/glossary-terms (PR #29); aiden-claude/card-sources (PR #28 into main); aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Nothing claimed. co-op roles done, PR #217 merged on Aiden's instruction and live on Vercel (start gate + even role split, decision 013). #167 (ending) and #169 (CAPCOM hold) merged. PR #172 (cutscenes show your spacecraft, claude@jamie's handoff) waiting for merge. Builder-cards task left open with a note suggesting to drop it.

### Files / folders I'm touching (hands off)
Until PR #217 merges, co-op roles: `shared/net.ts` (+test), `net/room.ts` + `net/rooms.ts` (one argument), `ui/lobby/model.ts` + `LobbyScreen.tsx`, `ui/builder/model.ts`, `app/session.ts`, `app/World.tsx`, `app/App.tsx` (canDecide + crew label), `app/Crew.tsx`, `.agents/decisions/013-shared-roles.md`, CONTRACTS.md Multiplayer.
PR #87: `app/Walk.tsx`, `app/Walk.test.tsx`, the `<Walk>` / `<WalkTo>` lines in `app/App.tsx`, the walk block in `app/app.css`. Otherwise none outside my open PRs #65 (`sim/analysis.ts`, one argument in `app/App.tsx` Flight) #68 (`ui/builder/builder.css`) #70 (`ui/story/`) and #80 (`ui/hangar/`), #74 (`app/StoryLayer.tsx`, `<StoryLayer>` lines + `online`/clock hold in `app/App.tsx`).

### Just finished
Added Submission readiness to the board (record demo, submit, code freeze Sun 18:00, launch 20 s vs 10 s). Checked the walk + cutscenes on the live site at 375 px, keyboard and screen-reader structure: no change needed.
Offline cache covers every file in public/, incl. cursor@kaipo's flight models (PR #93). Add a file to `public/` → add it to `pwa/public-files.ts` (a test tells you). Not checked: an offline reload in a browser.
3D scenes inside the cutscene frame (cursor@caleb's handoff 1340, branch aiden-claude/cutscene-scenes): arrival, orbit, anomaly, ending in `app/StoryLayer.tsx`. Seen in the game: arrival, anomaly, ending (loss). Not seen in the game: Moon/Mars orbit, ending (success).
Walk between stations (PR #87): `ui/hangar` behind every screen, each screen a panel over the hall; no WebGL = today's screens. Not checked: co-op in two browsers, a real phone, a screen reader.
Walkable mission control in 3D (PR #80, V6 = decision 005's rooms), after splitting the 3D story work at Aiden's request.
Story wired into the game (PR #74): CAPCOM on every station, cutscenes at arrival/launch/Moon-Mars orbit/anomaly/ending.
First-person story direction from Aiden: decision 005, GAME_DESIGN §4.9, 5 board tasks, handoff to all. Story pop-outs + cutscene frame (PR #70, `ui/story/`).
Builder Launch stays on screen on short laptops (PR #68).
What-if reruns replay the player's anomaly-card answers (PR #65); Ethan wired the debrief fixes himself.
Builder risk meter (PR #57): chance of success from background test flights on Hard.
What-if + success-rate helpers (PR #55, taken over from claude@ethan at Aiden's request).
Took over claude@ethan's scroll-to-top + crash safety (PR #53) at Aiden's request; bundle-size check in CI (PR #54, first load 117 kB / 150 kB). Ethan's lazy 3D, GO/NO-GO and daily lines moved to Done in his name.
Briefing shows the bonus star goal (PR #49, claude@jamie handoff 1225 done).
Playtest of main (won A 94 / lost F 26, no errors), 7 findings posted with owners. Fixed mine: compact phone budgets panel (PR #46).
[P2] Sound (PR #45): `ui/audio/` generated sound effects + mute toggle; builder part-pick clicks; handoff to app/gonogo/results owners.
[P1] Offline mode (PR #43): the game loads from cache when venue wifi is down or slow; app icon + manifest; link-preview meta. Moved the lazy-3D task to claude@ethan (Aiden: 3D work is Ethan's).
[P1] Builder part compatibility (PR #39): bus-class and best-orbit badges, parts too big for the bus dimmed, same rules as the sim.
[P1] Builder console lights (PR #35): live PLAN / SPACECRAFT / SCIENCE / COMMS calls from ui/gonogo. Also added 7 improvement tasks to the board (12:55).
[P0] Builder budget bars match the reviewed sim (PR #32): Bus capacity bar was missing, Science bar ignored the radio (demo 10/30 shown vs 1.7 forecast), new Battery-vs-eclipse bar. Merge #29 first.
Glossary adopted (PR #29): briefing terms from the shared glossary, builder tooltips on the Orbit heading, 4 columns and 3 budget labels. Asked cursor@kaipo for unique tooltip ids (`useId`).
[P1] Anomaly card sources (PR #28, into main): an official source for every card + the MCO line, each story checked; Starlink count, SOHO "still observing" and DSN "landings" wording flagged to claude@sarah.
[P2] 3D space view (decision 003, PR #22): `<SpaceView state mode>` in `ui/scene3d/`, a three.js planet (Earth/Moon/Mars, clouds, night lights, atmosphere), stars, Sun, the orbit and a spacecraft built from the picked parts. The builder (PR #10) opens with the 3D close-up. `three` added to PR #4.
Shared theme adopted in builder (PR #10) + briefing (PR #14): local palettes → `--game-*` tokens, dark palettes removed. Both PRs now stack on PR #16 (merge #16 first).
[P1] Role-aware builder (PR #10): with 2+ players each section shows its role + holder, other roles' sections are locked, "Last changed by …" per section, Launch only for mission planning. Optional props `players` + `me` (Session snapshot). Also: tsconfig type-checks `tests/` (PR #4, for claude@jamie).

### Missing / I need from someone
- claude@ethan: `ROLE_PARAM_KEYS` needs `solar`, `battery`, `comms` (or whatever keys the sim reads); pass `players`/`me` to the builder (handoff role-keys).
- claude@ethan: show the briefing between Start and the builder (handoff mount-briefing); sim catalog/param fixes (handoff builder-aligned).
- Aiden: turn on GitHub Pages; merge PRs in the order in docs/GAME_PLAN.md (now plus #14).

### Heads up for other agents
`ui/scene3d/` (PR #22) is handed to claude@ethan (Aiden: build the 3D on Ethan's Fable). I don't edit it anymore; dependency requests for it still come to me (scaffold).
Aiden also runs codex@aiden. It gets its own section in this file; claude@aiden never edits it or its branches. The briefing's key terms are a local list; whoever takes "Glossary + tooltips" (ui/learn/) can reuse or replace `KEY_TERMS` from `ui/briefing`.

## codex@aiden

**Branch:** aiden-codex/campaign-guidance
**Last updated:** 2026-11-15 01:30

### Working on right now
Improve existing campaign designGuide: actual bottleneck/station, precise NO-GO explanation, live updates after each fitted part. Reuse console brief(); no app/rendering changes.

### Files / folders I'm touching (hands off)
`ui/campaign/model.ts`, `ui/campaign/model.test.ts`, `ui/campaign/README.md`; own coordination files. All app/hangar/interior/scene3d/audio/sim/data files remain read-only.

### Just finished
PR #183: restyled Download/Continue review and current origin-stopped solo campaign passed through 3D room/launch/cabin/anomalies, Earth win, Moon grant and reload persistence. 629 tests, build, first load72.5kB. No browser errors at checked milestones. Full limits in docs/qa/preflight-regression.md; external terrain/co-op not tested.
Guided campaign #156 is merged: Earth $12M → Moon $300M → Mars $500M after wins; fixed retry grants and browser-local progress. Prior 578 tests and actual win/loss/retry results in docs/qa/guided-campaign.md.

### Missing / I need from someone
Physical-laptop acceptance and cross-device rehearsal remain their owners' tasks. Current public Vercel address is nasaspacemission.vercel.app per Claude Aiden's update; old Kaipo deploy notes above are historical.

### Heads up for other agents
Aiden requests continued parallel work. I cannot read the account daily-usage balance; work will be checkpointed. This claim adds no renderer, audio, sim or app source overlap.
