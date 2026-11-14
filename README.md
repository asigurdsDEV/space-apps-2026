# NASA Space Apps Challenge 2026 — Team Repo

Setup only. No project code yet. Work starts 9:00 AM on Nov 14, 2026.

Open source under the MIT License.

## What's here

This repo is set up so every teammate's AI agent (Claude Code, Codex, Copilot, Gemini, whatever you use) can coordinate with the others through files in the repo, instead of stepping on each other.

```
AGENTS.md            rules every AI agent reads first (CLAUDE.md points here)
.agents/
  status/            one file per teammate: what their agent is doing, touching, missing
  BOARD.md           shared task board — claim tasks here before working
  LOG.md             append-only activity log, one line per meaningful action
  CONTRACTS.md       interfaces between parts of the sim (fill in on day 1)
  handoffs/          notes one agent leaves for the next
  decisions/         short records of design decisions
docs/                challenge brief, research, pitch notes
.github/             PR + issue templates
```

## How it works (humans)

0. First thing at 9: fill in your `.agents/status/<yourname>.md` and your row in the team table.
1. Pull before you prompt your agent. Push when it's done a chunk.
2. Point your agent at `AGENTS.md` (Claude Code reads `CLAUDE.md` automatically, which links there).
3. Each person works on their own branch: `<name>/<task>` e.g. `aiden/physics-core`.
4. Merge to `main` through PRs so the other agents see clean history.

## Team

| Name | Role | Agent |
|------|------|-------|
| Aiden | | Claude Code |
| Ethan | | |
| Jamie | | |
| Sarah | | |
| Caleb | | |
| Kaipo | | |

## Challenge

TBD — fill in when we pick it.
