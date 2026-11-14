# Task board

**How to take a task (full rules: AGENTS.md → "Task workflow"):** pull → pick the top Open task with no tag (P0 before P1 before P2; skip `owner:` tasks that aren't yours) → move it to In progress with your tag and **push that alone** (the lock) → pull again and check only your tag is on it → work on your branch → open a PR → move it to Done with the PR # and **push again** → take the next one.
Format: `- [ ] (size) [priority] task — folder — needs: … — owner: … — [agent@human]`
Game plan (screens, folders, MVP): `docs/GAME_PLAN.md`.

## Open

<!-- The six build tasks below are proposed by claude@ethan (one folder each so nobody collides). Rename or split them if your human disagrees. -->
<!-- Ethan has the most agent usage, so claude@ethan takes the heavy ones (sim core + app loop are claimed below). If a task turns out bigger than your usage allows, hand the hard part to claude@ethan with a handoff instead of dropping it. -->

### P0 — playable solo game on the live link

### P1 — online co-op + teaching
- [ ] (light) [P1] Difficulty levels: easy/normal/hard variants (budget, event rate, deadline) — data/scenarios/ — needs: #8 — owner: claude@jamie
- [ ] (light) [P1] Multiplayer rehearsal: 4 devices on venue wifi + a phone hotspot, write results + fallback call in docs/MULTIPLAYER_TEST.md — docs/MULTIPLAYER_TEST.md — needs: #9 + app wiring merged (human-heavy)

### P2 — nice-to-haves from the brief

## Missing / needed

- Leaderboard PR #19 needs results mounting by ui/mission/ or app/ owner with final scenario ID, Summary and state.params; component/storage are complete — [found by codex@aiden]

- Theme PR #16: builder + briefing adopted (Claude FYI); app wrapper and mission/results/start/lobby adoption still need owner confirmation — [found by codex@aiden]

- Actual First Light data fails sim validation (bus dataset, power/comms choices, launcher capacity, science target/objective); candidate winning design cannot launch — Ethan adapting sim, catalog owner informed; reproduction in PR #9 docs/INTEGRATION_REPORT.md — [found by codex@jamie]

- Network needs finalized shared NetMessage validator/role policy, PeerJS package dependency, app wiring and live browser/venue rehearsal — net/app/shared/scaffold owners — [found by codex@jamie]
<!-- anything an agent noticed is missing, broken, or needed by someone else -->
<!-- - thing — who needs it — [found by agent@human] -->
- GitHub Pages not enabled yet (Settings → Pages → Source: GitHub Actions) — deploy in PR #4 needs it — repo owner (Aiden) — [found by claude@aiden]
- ~~Challenge + engine/stack not picked yet~~ resolved 10:07: Space Mission Design Game, TS + Vite + React (decision 002) — [found by claude@ethan]
- Open PRs need a human review + merge, in this order: #3, #2, #4, #5, #7 (and #6 docs any time); `main` has no package.json until then — everyone — [found by claude@ethan]
- PR #1 (jamie/setup) conflicts with main and is out of date — Jamie — [found by claude@ethan]
- Sarah and Caleb have no agent set up yet (blank status files) — Sarah, Caleb — [found by claude@ethan]
- README Team table: every Role is blank — everyone — [found by claude@ethan]
- BOARD `## Open` is empty; Kaipo and Caleb have nothing to claim — need structured next tasks from repo lead — [found by cursor@kaipo] — handoff `20261114-1029-cursor@kaipo-claude@aiden-open-task-list.md`

## In progress

- [ ] (light) [P0] Live-site check after merges: play start → results on the Pages link on desktop + phone, add anything broken to Missing — no files — needs: Pages on + PRs merged — [cursor@caleb]
- [ ] (light) [P2] Accessibility pass: keyboard-only + screen reader run through every screen, report + handoffs to owners — docs/A11Y_REPORT.md (source read-only) — [cursor@caleb]
- [ ] (light) [P2] Space Apps submission package: project summary, NASA resources used, AI-use note, demo video/slides plan (coordinate with codex@jamie's PITCH/DEMO) — docs/SUBMISSION.md — [cursor@caleb]
- [ ] (medium) [P1] More scenarios: beginner CubeSat Earth imaging, Moon, Mars, each provably winnable — data/scenarios/ — needs: #8 — owner: claude@jamie — [claude@jamie]

- [ ] (heavy) [P2] 3D space view (decision 003): three.js planet + atmosphere + stars + orbit + spacecraft built from the picked parts; `<SpaceView state mode="spacecraft"|"orbit">`; hero view in the builder — ui/scene3d/ (new) + ui/builder/ — needs: #4 (three dep) — owner: claude@aiden — [claude@aiden]

- [ ] (light) [P2] README "How to play" + live link section — README.md (new `## How to play` section only + Kaipo Team row) — [cursor@kaipo]

- [ ] (medium) [P1] Sim: richer random events + difficulty knobs the scenario files can set (the easy/normal/hard scenario variants stay with claude@jamie) — sim/ — starts when ethan-claude/sim-data lands — [claude@ethan]
- [ ] (heavy) [P1] Browser end-to-end tests of the assembled game: full solo mission, and two browsers in one co-op room — e2e/ (new), playwright devDependency + one script in package.json — starts when the app loop lands — [claude@ethan]




- [ ] (heavy) Multiplayer rooms + transport: PeerJS/WebRTC host-authoritative co-op for up to 4, room codes, role claim, LocalTransport fallback (decision 002) — net/ — [codex@jamie]

- [ ] App loop + state store: load data, run the sim, hand state to the UI, handle pause/reset/speed — app/ (everything in app/ except replacing the placeholder in `app/main.tsx` until PR #4 merges) — [claude@ethan]

## Blocked


## Done

- [x] (light) Official challenge brief + NASA resources, verbatim — docs/CHALLENGE_OFFICIAL.md — [claude@sarah] — in PR #20
- [x] (light) [P2] Local leaderboard: best score + design per scenario in localStorage, shown on results — ui/leaderboard/ — [codex@aiden] — in PR #19; 10 tests + harness build + browser persistence/phone checks pass; results mounting handed off

- [x] (medium) [P2] Save / share / compare designs — ui/share/ — [claude@ethan] — in PR #18: `<SharePanel state send />` + `designFromHash`; 114 tests pass merged with sim-data; app/ mounts it next
- [x] (medium) [P2] Spacecraft drawing: SVG — ui/spacecraft/ — [claude@ethan] — superseded by the 3D view (decision 003), no PR; the finished, reviewed component stays on branch `ethan-claude/spacecraft` if anyone wants a no-WebGL fallback
- [x] (light) [P1] Glossary + tooltips — ui/learn/ — [cursor@kaipo] — in PR #17; `<Term id="...">` + glossary.ts; screen owners adopt via handoff 20261114-1102
- [x] (light) [P0] Headless playthrough test — tests/ — [claude@jamie] — in PR #12; 4/4 green on ethan-claude/sim-data (starting design loses, reference wins); merge after #7 + sim-data, #8
- [x] (medium) [P1] Role-aware builder — ui/builder/ — [claude@aiden] — in PR #10: role badge per section, other roles locked, "last changed by", launch only by mission planning; needs claude@ethan to fix ROLE_PARAM_KEYS (solar/battery/comms) + pass players/me (handoff role-keys)
- [x] (light) [P0] Shared look: theme tokens + base styles (colors, type, buttons, panels, light/dark) so every screen looks like one game; then handoff to screen owners to adopt — ui/theme/ — [codex@aiden] — in PR #16; dark/light contrast checks and desktop/phone preview pass; adoption handoff to screen/app owners

- [x] (medium) [P1] Lobby screen: room code + copy button, player list, claim/release role buttons, host starts the mission — ui/lobby/ — needs: #9 (net), `useGame()` players/me — [codex@jamie] — in PR #15; app mounting/navigation pending

- [x] (light) [P0] Briefing screen — ui/briefing/ — [claude@aiden] — in PR #14; app/ still has to show it between Start and the builder (handoff to claude@ethan)
- [x] (medium) [P0] Start screen: game title, pick scenario, Solo / Host online / Join with code buttons — ui/start/ — needs: `useGame()` from app/ (build against props until then) — [codex@jamie] — in PR #13; app mounting pending
- [x] Mission split coordination closed — [codex@aiden] — Sarah completed both views in PR #11; her folder ownership preserved.

- [x] (medium) [P0] Align builder with sim + data — ui/builder/ — [claude@aiden] — in PR #10: parts from state.entities, data/ param keys, 7 bars; checked against the real sim + data (bus section waits on claude@ethan's sim-data catalog ids)
- [x] Game plan + full task list on BOARD Open + claim/done workflow rules — docs/GAME_PLAN.md, BOARD.md Open, AGENTS.md "Task workflow", docs/AGENT_SETUP.md — [claude@aiden] — on main (coordination files); peerjs added to PR #4
- [x] Integration audit across pending PR branches; report build/test failures to owners — docs/INTEGRATION_REPORT.md (source read-only) — [codex@jamie] — snapshot report in PR #9; 58 module tests pass, 2 real-data probes fail; follow-up after sim adapter
- [x] (heavy) Mission run view + results screen: draws `SimState`, shows events and the end summary — ui/mission/ — [claude@sarah] — in PR #11 (merge after #4, #5, #7); app/ still has to mount `<MissionScreen>` (handoff to claude@ethan)
- [x] (medium) Mission builder screen: pick parts, live budget bars, sends `set_param` — ui/builder/ — [claude@aiden] — in PR #10 (stacked on #4 + #5); app loop still has to mount it
- [x] Parts catalogs + first scenario — data/ — [claude@jamie] — 6 catalogs + demo scenario + loader + 11 tests; in PR #8 (needs #4, #5 first)
- [x] Sim core: `init` / `step` / `summary` with mass, power, cost, data and schedule budgets + success/failure rules, Vitest tests — sim/ — [claude@ethan] — in PR #7 (19 tests pass); usage notes in sim/README.md and handoff 20261114-1027
- [x] (light) Pitch + demo script + NASA data sources list — docs/ (not CHALLENGE.md, that's claude@jamie's) — [codex@jamie] — docs drafted; integrated demo rehearsal still pending

- [x] Pick challenge + fill in README — docs/CHALLENGE.md, README.md — [claude@jamie] — Space Mission Design Game; in PR #6
- [x] Turn CONTRACTS.md shapes into TS types — shared/ — [claude@ethan] — in PR #5; typecheck + test + build pass inside the PR #4 scaffold
- [x] Scaffold Vite + TS + React project + GitHub Pages deploy workflow — package.json, vite.config.ts, tsconfig.json, index.html, app/, .github/workflows/ — [claude@aiden] — in PR #4; needs Pages turned on (Settings → Pages → Source: GitHub Actions)
- [x] Choose engine/stack, write decision record — .agents/decisions/002-stack.md — [claude@aiden] — TS + Vite + React, static, no backend; in PR #3
- [x] Define module contracts (sim core ↔ UI ↔ data) — .agents/CONTRACTS.md — [claude@ethan] — v0.1 in PR #2, stack-neutral until stack is picked
