---
from: claude@aiden
to: all
status: open
created: 2026-11-14 14:50
---

## What I need / what I'm handing off

**From Aiden: this simulator is a first-person storyline game. You walk through the simulation's tasks, and there are cutscenes and pop-outs in the game.**

It's recorded as **decision 005** (`.agents/decisions/005-first-person-story.md`, accepted) and **GAME_DESIGN.md §4.9**. In short:

- **First person, as the Flight Director.** You walk (guided: tap the next station, the camera takes you) through mission control: wall screen (briefing) → assembly bay (builder) → four consoles (GO / NO-GO) → launch pad (cutscene) → ops room (mission + anomaly cards) → debrief room (results).
- **Each station's task pops out as a panel over the room.** Your screens keep working as they are, so please don't rebuild them. Keep them as pure views that fit in a panel.
- **Cutscenes:** arrival, launch, Moon/Mars arrival, anomaly alarm, ending. Each is 10 s at most, skippable, captioned, and a still image under reduced motion.
- **Storyline + CAPCOM:** one line at a time, in pop-outs, across First Light → Moon → Mars.
- **Safety net:** the story wraps the game and never replaces it. Without WebGL, or before the rooms exist, the same pop-outs and panels show over a plain background.

**Who does what** (board → Open, "First-person story"):
- **claude@ethan (Fable):** 3D rooms + guided walking camera, and the cutscenes (launch goes in the `LaunchView` seam in `app/App.tsx`). Then app/ walks between stations. If you're still at your limit, I'll take the app/ part.
- **claude@sarah:** the story script and CAPCOM lines, `docs/game-design/STORY.md`, facts sourced per §7.
- **claude@aiden (me):** `ui/story/`: the pop-out shell, CAPCOM dialogue, fact pop-outs, cutscene frame (Skip, captions, reduced motion) and `storyBeat(screen, events)`. Starting now.
- **cursor@kaipo:** glossary terms can show as fact pop-outs; I'll use `glossaryEntry` from `ui/learn/`, so no work needed unless you want to own the "did you know" wording.
- **codex@jamie / claude@jamie:** the Start screen and program order are the story's chapters; nothing to change yet.
- **cursor@caleb:** the demo/submission text should say "first-person story" once the first cutscene is in.

## Context (files, branches, commits)

Decision 005, GAME_DESIGN.md §4.9 and the build map, BOARD Open "First-person story". No contract change: story beats use SimEvents we already have.

## What "done" looks like

Start → walk the stations in first person → launch cutscene → ops room with anomaly pop-outs → ending cutscene → debrief room, on the live site. Set this to done then.

## Update 15:10 (claude@aiden)

`ui/story/` is in PR #70: `storyBeat(screen, events, scenarioId)`, `CapcomPopout`, `FactPopout`, `TaskPanel` and `Cutscene` (pass your 3D scene as children; it shows a still without one). API in `ui/story/README.md`. claude@ethan: a cutscene scene only needs to fill its parent and animate for `CUTSCENE_MS[id]`; the frame handles Skip/Esc/captions/onDone. claude@sarah: replace `LINES` in `ui/story/model.ts` from your STORY.md (keep the ids).
