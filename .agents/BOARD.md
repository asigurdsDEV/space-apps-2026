# Task board

Claim a task by moving it to In progress with your tag, then commit + push that change alone before starting.
Format: `- [ ] task — area/folder — [agent@human]`

## Open

<!-- The six build tasks below are proposed by claude@ethan (one folder each so nobody collides). Rename or split them if your human disagrees. -->
- [ ] Parts catalogs + first scenario: launch vehicles, instruments, bus/power/comms parts as `table` Datasets, plus `data/scenarios/demo.json` — data/
- [ ] Sim core: `init` / `step` / `summary` with mass, power, cost and comms budgets + success/failure rules, Vitest tests — sim/
- [ ] App loop + state store: load data, run the sim, hand state to the UI, handle pause/reset/speed — app/
- [ ] Mission builder screen: pick parts, live budget bars, sends `set_param` — ui/builder/
- [ ] Mission run view + results screen: draws `SimState`, shows events and the end summary — ui/mission/
- [ ] Pitch + demo script + NASA data sources list — docs/ (not CHALLENGE.md, that's claude@jamie's)

## Missing / needed
<!-- anything an agent noticed is missing, broken, or needed by someone else -->
<!-- - thing — who needs it — [found by agent@human] -->
- GitHub Pages not enabled yet (Settings → Pages → Source: GitHub Actions) — deploy in PR #4 needs it — repo owner (Aiden) — [found by claude@aiden]
- ~~Challenge + engine/stack not picked yet~~ resolved 10:07: Space Mission Design Game, TS + Vite + React (decision 002) — [found by claude@ethan]
- Setup PRs #3, #2, #4, #5 need a human review + merge, in that order; `main` has no package.json until then — everyone — [found by claude@ethan]
- PR #1 (jamie/setup) conflicts with main and is out of date — Jamie — [found by claude@ethan]
- Sarah and Caleb have no agent set up yet (blank status files) — Sarah, Caleb — [found by claude@ethan]
- README Team table: every Role is blank — everyone — [found by claude@ethan]

## In progress

## Blocked

## Done

- [x] Pick challenge + fill in README — docs/CHALLENGE.md, README.md — [claude@jamie] — Space Mission Design Game; PR from jamie-claude/challenge-readme
- [x] Turn CONTRACTS.md shapes into TS types — shared/ — [claude@ethan] — in PR #5; typecheck + test + build pass inside the PR #4 scaffold
- [x] Scaffold Vite + TS + React project + GitHub Pages deploy workflow — package.json, vite.config.ts, tsconfig.json, index.html, app/, .github/workflows/ — [claude@aiden] — in PR #4; needs Pages turned on (Settings → Pages → Source: GitHub Actions)
- [x] Choose engine/stack, write decision record — .agents/decisions/002-stack.md — [claude@aiden] — TS + Vite + React, static, no backend; in PR #3
- [x] Define module contracts (sim core ↔ UI ↔ data) — .agents/CONTRACTS.md — [claude@ethan] — v0.1 in PR #2, stack-neutral until stack is picked
