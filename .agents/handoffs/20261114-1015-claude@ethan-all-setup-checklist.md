---
from: claude@ethan
to: all
status: open
created: 2026-11-14 10:15
---

## What I need / what I'm handing off

Ethan asked me to check the whole repo and tell everyone what's left before we can all build. This is the state at 10:15 and what each person still has to do. Tell your human the part with their name on it.

### Where we are

- **Challenge:** Space Mission Design Game (team Kimchi Trenchers, Seattle).
- **Stack:** TypeScript + Vite + React, static site on GitHub Pages, no backend (decision 002).
- **Nothing is merged yet.** Setup is done but sitting in four open PRs. `main` has no `package.json`, so nobody can run the app from `main` until they merge.

### PRs waiting for a human to review and merge (in this order)

| Order | PR | What | Notes |
|---|---|---|---|
| 1 | #3 | Decision 002: stack | docs only |
| 2 | #2 | CONTRACTS.md v0.1 + decision 001 | already contains #3's Stack line; merges cleanly before or after #3 |
| 3 | #4 | Scaffold: Vite + React + Vitest + Pages workflow | CI build passes |
| 4 | #5 | `shared/types.ts`: TS types for every contract shape | typechecked, tested and built inside #4's scaffold; CI only runs on it after #4 is in `main` |
| – | #1 | Jamie's old setup PR | **conflicts with `main`** and is out of date; see Jamie below |

No agent has merged anything. A human should merge these.

### Everyone (every human + agent)

1. `git pull` on `main`, then read the two `all` handoffs (this one and the roster one: **"kimchi" on the team page = Caleb**).
2. Your machine needs **Node 22 or newer** and npm (`node -v`). After #4 merges: `npm ci`, then `npm run dev`, `npm test`, `npm run build`.
3. Your agent can only push if git is logged in to GitHub. If `git push` fails with "could not read Username", run `gh auth login` (HTTPS, authenticate git: yes), then `gh auth setup-git`.
4. Fill in your **Role** in the README Team table (all six are blank) and your Agent column.
5. Build against `.agents/CONTRACTS.md` and import types from `shared/`. The sim stays pure; the UI only sends Commands.
6. Pick one task from **Open** on BOARD.md. I added six proposed build tasks there, one folder each, so six people don't collide. Rename or split them if your human disagrees; they're proposals.

### Aiden

- **Turn on GitHub Pages:** Settings → Pages → Source: **GitHub Actions**. It's off right now (the Pages API returns 404), so the deploy job will fail the first time #4 lands on `main`.
- Review/merge #3, #2, #4, #5 (you're the repo owner; the rest of us only have push access).
- codex@aiden has been idle since 09:36 with no task. claude@aiden is free too.
- `AGENTS.md` says branch names are `<human>/<short-task>`, but every agent is using `<human>-<tool>/<short-task>` from `docs/AGENT_SETUP.md`. Worth making AGENTS.md match so new agents aren't confused.

### Jamie

- Finish **Pick challenge + fill in README** (In progress since 10:00): README `## Challenge` section and `docs/CHALLENGE.md`, then open the PR and set claude@aiden's challenge handoff to `done`.
- In the Team table, keep Caleb. If you cite the team page, write "Caleb (kimchi on the team page)".
- **PR #1 conflicts with `main`.** Its status and log changes are already on `main`. The only thing still unique to it is "Claude Code" in Jamie's README row. Put that in your challenge PR and close #1.
- `jamie.md` still has the five empty template headings above `## claude@jamie`. They can go.

### Kaipo

- cursor@kaipo is online but has no task. Pick one from Open.
- `kaipo.md` has the same five empty template headings above `## cursor@kaipo`.

### Sarah and Caleb

- **Not set up yet.** Your status files are still the blank template and there's no "agent online" line from you in LOG.md.
- Copy the prompt for your tool from `docs/AGENT_SETUP.md` into your agent. It clones the repo, fills in `.agents/status/<you>.md`, adds a LOG line and shows you the board.
- Then do steps 2 to 6 under "Everyone".

### Ethan (me)

- Done: contracts (#2), shared types (#5), Ethan's README row, this checklist.
- Still to do: Ethan's Role in the README, and picking a build task once the PRs merge.

## Context (files, branches, commits)

- PRs: #1 `jamie/setup`, #2 `ethan-claude/contracts`, #3 `aiden-claude/stack`, #4 `aiden-claude/scaffold`, #5 `ethan-claude/shared-types`.
- Roster handoff: `20261114-1009-claude@ethan-all-roster.md`.
- Proposed build tasks: `BOARD.md` → Open.

## What "done" looks like

All four setup PRs are merged, Pages is on and the site loads at the Pages URL, all six status files have an agent section, and every person has one claimed task on the board. Any agent can set this to `done` then.
