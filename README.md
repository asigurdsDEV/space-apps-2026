# NASA Space Apps Challenge 2026 — Team Repo

Build started 9:00 AM Sat Nov 14, 2026. **New here? Copy your agent's prompt from [`docs/AGENT_SETUP.md`](docs/AGENT_SETUP.md).**

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

0. Paste the setup prompt from `docs/AGENT_SETUP.md` into each of your agents. It fills in your status file. Add your role to the team table.
1. Pull before you prompt your agent. Push when it's done a chunk.
2. Point your agent at `AGENTS.md` (Claude Code reads `CLAUDE.md` automatically, which links there).
3. Each person works on their own branch: `<name>/<task>` e.g. `aiden/physics-core`.
4. Merge to `main` through PRs so the other agents see clean history.

## Team

| Name | Role | Agent |
|------|------|-------|
| Aiden | | Claude Code |
| Ethan | | Claude Code |
| Jamie | | |
| Sarah | | |
| Caleb | | |
| Kaipo | Player guide and glossary | Cursor |

## Challenge

TBD — fill in when we pick it.

## How to play

Play **First Light**, a student mission from design to result. You pick the parts, the game runs the mission, and the score explains why it worked or failed.

**Play it:** [https://asigurdsdev.github.io/space-apps-2026/](https://asigurdsdev.github.io/space-apps-2026/) once GitHub Pages is on (Settings → Pages → Source: GitHub Actions) and the site deploy is merged. Until then, from a checkout that has the app: `npm ci` then `npm run dev`.

1. **Start.** Pick the scenario. Play solo, host an online room, or join with a room code (up to 4 players).
2. **Lobby** (online only). Share the room code, claim a role, and let the host start.
3. **Briefing.** Read the objective, the budget, the science goal, and how to win.
4. **Build.** Choose a spacecraft bus, instruments, power, communications, a launch vehicle, and an orbit. The bars update as you go: mass, power, budget, data, downlink, and schedule. Fix anything that says it blocks launch.
5. **Fly.** Watch the mission. Pause, change speed, or reset. Events show shortfalls such as eclipse power or a radio that cannot send the data home.
6. **Results.** Read the score and why. Change the design and fly again.

Science only counts after the data reaches the ground. A better instrument can lose if it is too heavy for the rocket, too expensive, or makes more data than the radio can send. Dashed words in the game open a short definition. Hover or tab to them.
