# Game plan: Space Mission Design Game

The whole game on one page: what the player sees, which folder builds each part, and what's left. **Every unfinished piece is a task in `.agents/BOARD.md` → Open.** Claim tasks with the workflow in `AGENTS.md` → "Task workflow".

Challenge brief: `docs/CHALLENGE.md`. Stack: `.agents/decisions/002-stack.md`. Interfaces: `.agents/CONTRACTS.md`.

## What the player does

```
Start ──► Lobby (online only) ──► Briefing ──► Build ──► Fly ──► Results ──┐
  │  solo / host / join     room code,      objective,   pick parts,  watch the  score, grade,   │
  │  pick scenario          claim a role    budget,      live budget  mission,   "why it failed" │
  │                                         key terms    bars         events                     │
  └──────────────────────────────── edit the design and fly again ◄──────────────────────────────┘
```

| Screen | Folder | Status |
|---|---|---|
| Start (solo / host / join, pick scenario) | `ui/start/` | **Open** |
| Lobby (room code, players, roles) | `ui/lobby/` | **Open** (needs `net/`, PR #9) |
| Briefing (objective, budget, how to win, key terms) | `ui/briefing/` | **Open** |
| Build (mission builder) | `ui/builder/` | Built, PR #10. **Open:** align with sim/data, then role-aware |
| Fly (mission run view) | `ui/mission/` | Built, PR #11 (claude@sarah) |
| Results (score, grade, why) | `ui/mission/` | Built, PR #11 (claude@sarah) |

## How the code fits together

```
data/ (catalogs, scenarios) ──► sim/ (pure init/step/summary, runs on the host only)
                                   ▲ Commands          │ SimState + SimEvents
                                   │                   ▼
net/ (rooms, PeerJS/Local) ◄──► app/ (loop + store: useGame() → state, events, send, players, me)
                                                       │
                                                       ▼
                                 ui/* screens (pure views: read state, call send)
shared/ = the types everyone imports (CONTRACTS.md in code)
```

Rules that keep six agents from colliding:
- **UI screens are pure views.** They take `state` and `send` (from `useGame()` once `app/` lands, or props until then), and never compute budgets or import `sim/` or `data/`.
- **Only `app/` mounts screens and switches between them** (claude@ethan). A screen owner hands `app/` one exported component.
- **The sim is the only rulebook.** Want a rule or number changed? Hand off to claude@ethan (sim) or claude@jamie (data).
- One owner per folder. Tasks inside an owned folder say `owner:` on the board.

## MVP (what "done" means for judging)

**P0 — one player can play start → results on the live GitHub Pages link:**
data + sim + app loop + start, briefing, builder, mission, results screens, deployed, with a playthrough test proving the demo scenario can be both lost and won.

**P1 — the brief's extras:** online co-op for up to 4 with roles, the lobby, teaching (tooltips/glossary), more scenarios and difficulty levels, and a rehearsal on real wifi.

**P2 — nice-to-haves from the brief:** spacecraft drawing, save/share/compare designs, leaderboard, accessibility pass, polish.

## Owners right now

| Folder | Owner | PR |
|---|---|---|
| `shared/`, `sim/`, `app/`, CONTRACTS.md | claude@ethan | #5, #7, #2; app loop in progress |
| `data/` | claude@jamie | #8 |
| `net/`, `docs/PITCH.md`, `docs/DEMO.md`, `docs/NASA_SOURCES.md` | codex@jamie | #9 |
| `ui/mission/` | claude@sarah | #11 |
| `ui/scene3d/` (3D view, models, launch, fly scene) | claude@ethan (Fable) | #22 (built by claude@aiden) |
| `ui/builder/`, scaffold (`package.json`, configs, workflow), this plan | claude@aiden | #10, #4, #3 |
| everything marked Open on the board | whoever claims it first | |

## Human checklist (people, not agents)

1. **Aiden:** turn on GitHub Pages: repo Settings → Pages → Source: **GitHub Actions**.
2. **Aiden (repo owner): merge PRs in this order.** Each one builds on the ones before it:
   #3 stack → #2 contracts → #4 scaffold → #5 shared types → #6 challenge docs → #7 sim → #8 data → #9 net → #16 theme → #22 3D view → #10 builder → #11 mission view → #13 start → #14 briefing → #15 lobby (#12 playthrough test once it is green).
3. **Everyone:** fill in your Role in the README Team table.
4. **Sarah, Caleb:** set up your agent with `docs/AGENT_SETUP.md` if you haven't yet.
5. **Before judging:** someone plays the live link on a phone and a laptop, and the team tests online co-op on the venue wifi (board task).
