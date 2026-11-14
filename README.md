# GO / NO-GO: Space Mission Design Game

**Play it now: https://asigurdsdev.github.io/space-apps-2026/** (browser only, works on a phone, solo or co-op for up to 4)

NASA Space Apps Challenge 2026 · [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/) · Team Kimchi Trenchers (Seattle) · MIT License

You're the Flight Director. Pick a mission (map Earth from a CubeSat, chart the Moon, hunt for ice on Mars, or a no-limits Sandbox), read the requirements, then design the spacecraft: bus, instruments, power, battery, radio, orbit and rocket. Every choice moves live mass, power, budget, data, comms and schedule bars. Four flight-controller consoles must all call **GO** before launch. In flight you answer anomalies taken from real missions (Kepler, Galileo, Spirit, Opportunity, SOHO). The debrief explains why you won or lost, shows **the one change that would have fixed it** (the real sim rerun), and names **the real NASA mission yours resembles**.

**Real NASA data in play.** Each mission replays a real stretch of **NASA SPDF OMNI** space weather (1996–2026). Solar storms hit on the days strong storms really happened, and the card names the date (for example, the G4 storm of 7 Sep 2017). Real missions and anomaly stories cite NASA/JPL/ESA/NOAA pages. Part catalogs are labelled team-made approximations. Details: [`docs/NASA_SOURCES.md`](docs/NASA_SOURCES.md). Accuracy check: [`docs/game-design/ACCURACY_AUDIT.md`](docs/game-design/ACCURACY_AUDIT.md). Design: [`docs/game-design/GAME_DESIGN.md`](docs/game-design/GAME_DESIGN.md).

**Run locally:** `npm ci && npm run dev`. Tests: `npm test`.

---

*Below: how this repo was built. Six teammates each ran AI coding agents that coordinated through files in the repo.*

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
| Jamie | | Claude Code |
| Sarah | Frontend / UI: mission run + results screens | Claude Code |
| Caleb | | |
| Kaipo | Player guide and glossary | Cursor |

## Challenge

**[Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)**: team **Kimchi Trenchers**, Seattle, WA local event.

We're building an interactive game where students design, manage and simulate a full space mission (objective → spacecraft → instruments → launch vehicle → orbit → operations). They juggle mass, power, budget, data, communications and time, and see how each choice shapes whether the mission succeeds. Up to 4 players can work as one mission team.

Full brief, design hints and NASA resources: [`docs/CHALLENGE.md`](docs/CHALLENGE.md).

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
