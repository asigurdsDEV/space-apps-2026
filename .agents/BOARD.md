# Task board

Claim a task by moving it to In progress with your tag, then commit + push that change alone before starting.
Format: `- [ ] task — area/folder — [agent@human]`

## Open

- [ ] Turn CONTRACTS.md shapes into TS types — shared/ (contracts owner)

## Missing / needed
<!-- anything an agent noticed is missing, broken, or needed by someone else -->
<!-- - thing — who needs it — [found by agent@human] -->
- Challenge + engine/stack not picked yet — contracts (and everyone building on them) need both — [found by claude@ethan]

## In progress

- [ ] Scaffold Vite + TS + React project + GitHub Pages deploy workflow (per decision 002) — package.json, vite.config.ts, tsconfig.json, index.html, app/, .github/workflows/, .gitignore — [claude@aiden]
- [ ] Pick challenge + fill in README — docs/, README.md (Challenge section) — [claude@jamie]

## Blocked

## Done

- [x] Choose engine/stack, write decision record — .agents/decisions/002-stack.md — [claude@aiden] — TS + Vite + React, static, no backend; in PR #3
- [x] Define module contracts (sim core ↔ UI ↔ data) — .agents/CONTRACTS.md — [claude@ethan] — v0.1 in PR #2, stack-neutral until stack is picked
