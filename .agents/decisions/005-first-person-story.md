---
id: 005
title: The game is a first-person story: you walk through the mission's tasks, with cutscenes and pop-outs
by: claude@aiden
date: 2026-11-14
status: accepted
---

## Decision

Aiden's call (14:45): **the simulator is a first-person storyline game.** You walk through the simulation's tasks yourself, and there are **cutscenes** and **pop-outs** along the way.

What that means for the game we already have:

1. **First person, as the Flight Director.** The camera is your eyes. You are the new Flight Director (the pitch in GAME_DESIGN.md §1). You walk from station to station, and each station is one task the sim already has:

   | Station (a place you walk to) | The task there (screen we already built) |
   |---|---|
   | Mission control, big wall screen | The mission call: briefing (`ui/briefing/`) |
   | Assembly bay / clean room, the spacecraft on a stand | Design: the builder (`ui/builder/`) |
   | Flight control room, four consoles | GO / NO-GO poll (`ui/gonogo/`) |
   | Launch pad | Launch, as a **cutscene** |
   | Operations room, the orbit on the main screen | Operations, anomaly cards (`ui/mission/`) |
   | Debrief room | Results, what-if, real mission match |

2. **Walking is guided, not free roam.** You click or tap the next station (or press Enter or →) and the camera walks you there. Arrow keys and WASD can look around. You can't get lost, and it works the same with a phone, a mouse and a keyboard.
3. **Storyline.** A short story runs across the mission program (First Light → Moon Mapper → Red Planet Radar). **CAPCOM** (GAME_DESIGN.md §4.8) is the voice that talks to you: one line at a time, in a pop-out.
4. **Cutscenes** at the big moments, each **10 s at most and always skippable** (Skip button, Esc): arriving at mission control, launch (pad → lift-off → fairing → orbit), arrival at the Moon or Mars, the anomaly alarm, and the ending (first data comes home, or the signal is lost). Every cutscene has captions. With reduced motion on, each one is a still image with its caption.
5. **Pop-outs** over the first-person view: CAPCOM's lines, "did you know" fact pop-outs (glossary terms and real NASA facts with a source), the anomaly cards, and **each station's task opening as a panel** over the room. So the builder, poll and mission screens keep working exactly as they do today, just framed by the room.

**Rules that don't change:** the sim is still the only rulebook; story, cutscenes and rooms only show what `SimState` and `SimEvent`s say. The screens stay pure views. Every number stays sourced (GAME_DESIGN.md §7). Pillar 2 still holds ("never just watching for more than ~20 seconds"), which is why cutscenes are short and skippable.

**Safety net for judging:** the story layer **wraps** the game, it never replaces it. If the 3D rooms or a cutscene aren't ready (or WebGL is off), the same pop-outs and task panels show over a plain background, and the game plays exactly as it does now.

## Why

Aiden wants it to feel like a game you're *in*, not a set of forms: you are the Flight Director walking your mission from the call to the debrief. A first-person walk turns our six screens into one journey, and cutscenes give the launch and the ending the weight a judge remembers. It also fits what's built: every station is a screen that already works.

## Options we didn't pick

- **Free-roam first person (walk anywhere, collide with walls):** more "game", but players get lost, phones need virtual joysticks, and it's a lot of 3D work for a weekend. Guided walking gives the same view with none of that.
- **Pre-rendered video cutscenes:** pretty, but megabytes to download, they break offline mode (PR #43) and they can't show *your* spacecraft. Cutscenes are rendered live in three.js from the real design.
- **Story only in text between screens:** cheap, but it's not what Aiden asked for.

## What this changes (update CONTRACTS.md if needed)

- **No contract change.** Story beats are picked from the current screen plus SimEvents that already exist (`scenario_started`, `phase_changed`, `decision_required`, `decision_resolved`, `scenario_ended`).
- **New folder `ui/story/`** (claude@aiden): the pop-out shell, CAPCOM dialogue, fact pop-outs, the cutscene frame (Skip, captions, reduced motion) and `storyBeat(screen, events)`. It has no 3D: cutscene visuals come from `ui/scene3d/`.
- **`ui/scene3d/`** (claude@ethan, on Fable): the first-person rooms, the guided walking camera and the cutscene scenes. The `LaunchView` seam in `app/App.tsx` is where the launch cutscene goes.
- **Story script** (claude@sarah, game design owner): `docs/game-design/STORY.md`, with beats and CAPCOM lines per mission, real facts with sources.
- **`app/`** (claude@ethan, or claude@aiden by takeover): walks between stations instead of switching screens, and plays the cutscenes.
- GAME_DESIGN.md gets §4.9 (this decision, short form) and the build map rows.
