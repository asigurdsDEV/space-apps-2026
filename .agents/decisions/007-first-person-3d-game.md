---
id: 007
title: The game is a first-person 3D game; the 2D screens are retired from play
by: claude@aiden
date: 2026-11-14
status: accepted
---

## Decision

Aiden, 14:50: "get rid of the 2D game design". The whole mission is played first-person in 3D with keyboard and mouse: you walk, look, and press **E** on things. No screen of text between you and the game.

**Two places, one loop:**

1. **Mission control** (design phase, `ui/hangar/`). Arrival cutscene, then you stand in the hall.
   - **Mission call wall:** mission name and three numbers (budget, science goal, mission length). That is the whole briefing.
   - **Assembly bay:** part racks around the stand (orbit globe, launch vehicles, bus, solar, battery, instruments, radio, ground stations). Look at a part, **E** fits it (`set_param`). The spacecraft on the stand changes. A bay screen shows gauges (mass, power, money, data), bars not sentences.
   - **Flight consoles:** four desks light GO / NO-GO; walk up to one and it says its one-line concern. The flight director's **launch button** sends `launch`.
   - **Launch:** the pad window / launch cutscene.
2. **Your spacecraft** (flight, after launch). Real robotic spacecraft have no inside, so for scientific validity you walk into a **full-size walk-in model of your own spacecraft** (a "digital twin", the way NASA teams rehearse) in the operations room, with a window showing where the real one is (`ui/scene3d` space view). Every module on its walls is a part you chose: solar arrays, battery bank, radio, data storage, instruments. Gauges are the sim's metrics.
   - **Time:** a lever / dial (`pause`, `resume`, `set_speed`).
   - **Anomaly cards:** an alarm and the affected module flashes. Walk to it, **E**, pick one of 2 or 3 physical choices (the card's options, short labels) → `resolve_decision`. Time is held until you do (as now).
3. **Debrief** (back in mission control): ending cutscene, then the grade on the wall; the "change one thing" fix glows on the spacecraft on the stand, **E** = try it (`reset` + `set_param`, as now); your best score on a board.

**Words budget:** on screen at once at most one CAPCOM line, one interact prompt ("E · Fit 6U bus") and numbers on in-world gauges. Longer explanations only behind a "?" (`ui/learn` glossary). Part and option labels ≤ 4 words.

**Controls:** WASD walk, mouse look (pointer lock; click the view to start, Esc releases), E interact with what you face within reach, Shift faster. Phones/tablets: left-thumb move pad, drag to look, an E button. Reduced motion: no head bob, cuts instead of walks.

**Unchanged:** `sim/`, `shared/`, `net/` and every contract in CONTRACTS.md. Every interaction sends a Command that already exists, so solo, same-screen and online co-op keep working. In co-op each player walks their own view; things owned by another player's role show that player's name and do nothing for you (`canSend`).

**The 2D screens** (briefing, builder, poll, mission, results) stay in the repo only as the fallback for no WebGL and for screen-reader players (a "Classic view" link). Start screen and lobby stay as menus.

## Why

The guided walk (decision 005) still put a text-heavy 2D page in front of the player at every station. Aiden wants an immersive game with a storyline, very few words, and real controls. All the hard parts already exist: the sim with anomaly cards, 3D part models, the hall, cutscenes, NASA space views, pilot input. This decision only changes how the player touches them.

## Options we didn't pick

- **A cabin inside the spacecraft as if crewed:** wrong for robotic CubeSats/orbiters; judges score scientific validity.
- **3D walk with the 2D panels kept** (today): not immersive, too many words.
- **New sim commands for 3D:** not needed; would break co-op contracts with a day to go.
- **Avatars of teammates in co-op:** needs a new net message; P2 after the loop works.

## What this changes (update CONTRACTS.md if needed)

- New in CONTRACTS.md: **Interactables** (what a 3D world exposes to the first-person controller in `ui/fps/`).
- The game loop moves from `app/` screens to `app/` mounting the two 3D places by sim phase; integrated behind `?world=3d` until it plays start → debrief, then made the default.
- Board: section "First-person 3D game (decision 007)" with one task per owner, milestones Sat 20:00 (each piece alone in its preview), Sun 02:00 (whole loop behind `?world=3d`), Sun 08:00 (default), Sun 10:00 code freeze, Sun 12:00 demo recorded.
