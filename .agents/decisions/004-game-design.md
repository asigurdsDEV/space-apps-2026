---
id: 004
title: Game design "GO / NO-GO": Flight Director loop with a launch poll, anomaly cards and a what-if debrief
by: claude@sarah
date: 2026-11-14
status: proposed   # becomes accepted when the team's humans agree (Sarah to raise it)
---

## Decision

Make the existing screens (start → briefing → builder → mission → results) into a game with one loop, described in `docs/game-design/GAME_DESIGN.md`:

- **GO / NO-GO poll** before launch: four consoles (PLAN, SPACECRAFT, SCIENCE, COMMS = the four co-op roles) vote from `state.issues`. New pure view `ui/gonogo/`.
- **Anomaly cards** during operations: the sim pauses on a real-history anomaly, and the player chooses a response.
- **"What would have fixed it" debrief + risk meter**: pure reruns of the sim.
- **Daily mission + share card**, **stars and a mission program**, **real mission match**, **role priorities** in co-op (P1/P2).

P0 = poll (solo), anomaly cards, what-if debrief, daily mission. Everything else is P1/P2.

## Why

Today the player fills in a form and then watches. Nothing happens after launch, failure is a dead end, and co-op players never have to talk. The brief explicitly rewards feedback that explains why, collaboration, negotiating priorities, random events, and replaying the mission. Each piece above answers one of those, reuses what's already built, and stays accurate: the poll uses the sim's issues, cards cite real events, and the what-if is the real sim rerun. Full reasoning and the 12 options scored: `docs/game-design/BRAINSTORM.md`.

## Options we didn't pick

Tech tree / agency economy (too much balance work, less accurate), arcade piloting (not mission design), quizzes between screens (feel like school), competitive sabotage (works against the brief's collaboration goal), a full proposal review panel (too heavy; its best part is folded into the poll).

## What this changes (update CONTRACTS.md if needed)

All additive (CONTRACTS.md rule 7). claude@ethan owns CONTRACTS.md and `shared/`, so this record proposes and Ethan writes:

- **SimEvent `decision_required`:** `{ decision_id, card_id, title, body, console: Role, options: [{ id, label, effect_text }], story: { mission, year, text, source_url } }`, emitted by the sim during operations.
- **Command `resolve_decision`:** `{ decision_id, option_id }`, ui → sim. Owning role = the card's `console`. If that console is unclaimed, anyone can send it. While a decision is pending, `step` doesn't advance time.
- **Command `go_vote`:** `{ go: boolean }`, ui → app only (no sim effect, like `select_entity`). Owning role = the sender's own console.
- **Scenario params (data/):** optional `bonus_goal` (string id, e.g. `no_data_lost`, `budget_left_20`, `mass_margin_10`) and the optional part prop `tier` (`basic` | `advanced`).
- **New pure helper** next to the sim (`sim/analysis.ts`): `whatIf(...)` and `successRate(...)`. Not part of the three-function sim contract. The app passes results to the UI.
