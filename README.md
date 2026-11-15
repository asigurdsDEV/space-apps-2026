# First Flight

**Play it now: https://nasaspacemission.vercel.app** (browser only, works on a phone, solo or co-op for up to 4; mirror: https://asigurdsdev.github.io/space-apps-2026/)

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
| Aiden | Repo and team workflow, mission builder, story layer, the first-person 3D game | Claude Code + Codex |
| Ethan | Simulation core, 3D planets, rockets and launch, merge coordinator | Claude Code |
| Jamie | Data catalogs and scenarios, real missions, multiplayer, start screen | Claude Code + Codex |
| Sarah | Mission run + results screens, real NASA space weather, game design | Claude Code |
| Caleb | 3D cutscenes, accessibility, QA, submission | Cursor |
| Kaipo | Player guide and glossary, 3D props, Vercel host + online relay | Cursor |

## Challenge

**[Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)**: team **Kimchi Trenchers**, Seattle, WA local event.

We're building an interactive game where students design, manage and simulate a full space mission (objective → spacecraft → instruments → launch vehicle → orbit → operations). They juggle mass, power, budget, data, communications and time, and see how each choice shapes whether the mission succeeds. Up to 4 players can work as one mission team.

Full brief, design hints and NASA resources: [`docs/CHALLENGE.md`](docs/CHALLENGE.md).

## How to play

Play **First Light**, a student mission from design to result. You pick the parts, the game runs the mission, and the score explains why it worked or failed.

**Play it:** [https://nasaspacemission.vercel.app](https://nasaspacemission.vercel.app). Or from a checkout: `npm ci` then `npm run dev`.

You play in first person: **W A S D** to walk, the mouse to look, **E** to use what you face. On a phone, the thumb pads do the same.

1. **Mission board.** Start the guided campaign (First Light, then the Moon, then Mars), or open free play, the daily mission and online rooms (host or join with a room code, up to 4 players in roles).
2. **Mission control.** Walk to the hologram stations and fit a bus, instruments, power, battery, radio, rocket and orbit. The wall shows mass, power, budget and data as you go.
3. **GO / NO-GO.** Four consoles call GO or NO-GO. A red NO-GO blocks launch.
4. **Launch, then fly from inside the spacecraft.** Change the speed at the console. When an alarm sounds, walk to its panels and choose.
5. **Debrief.** Back in mission control: the grade, why, and the one change that would have saved it. A win unlocks the next mission.

**Classic view** in the menu (or `?world=classic`) plays the same game on 2D screens: Briefing, Build, GO/NO-GO, Fly, Results.

Science only counts after the data reaches the ground. A better instrument can lose if it is too heavy for the rocket, too expensive, or makes more data than the radio can send. Dashed words in the game open a short definition. Hover or tab to them.
