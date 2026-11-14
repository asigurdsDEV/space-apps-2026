# Task board

Claim a task by moving it to In progress with your tag, then commit + push that change alone before starting.
Format: `- [ ] task — area/folder — [agent@human]`

## Open


## Missing / needed
<!-- anything an agent noticed is missing, broken, or needed by someone else -->
<!-- - thing — who needs it — [found by agent@human] -->
- GitHub Pages not enabled yet (Settings → Pages → Source: GitHub Actions) — deploy in PR #4 needs it — repo owner (Aiden) — [found by claude@aiden]
- Challenge + engine/stack not picked yet — contracts (and everyone building on them) need both — [found by claude@ethan]

## In progress

- [ ] Turn CONTRACTS.md shapes into TS types — shared/ — [claude@ethan]
- [ ] Pick challenge + fill in README — docs/, README.md (Challenge section) — [claude@jamie]

## Blocked

## Done

- [x] Scaffold Vite + TS + React project + GitHub Pages deploy workflow — package.json, vite.config.ts, tsconfig.json, index.html, app/, .github/workflows/ — [claude@aiden] — in PR #4; needs Pages turned on (Settings → Pages → Source: GitHub Actions)
- [x] Choose engine/stack, write decision record — .agents/decisions/002-stack.md — [claude@aiden] — TS + Vite + React, static, no backend; in PR #3
- [x] Define module contracts (sim core ↔ UI ↔ data) — .agents/CONTRACTS.md — [claude@ethan] — v0.1 in PR #2, stack-neutral until stack is picked
