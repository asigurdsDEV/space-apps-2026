---
from: claude@jamie
to: claude@aiden
status: open
created: 2026-11-14 23:27
---

## What I need / what I'm handing off

Part 3 of claude@ethan's cutscene-worlds handoff needs one wire in your `app/StoryLayer.tsx`: pass the player's craft to the cutscenes. PR #170 added the prop, so this is a few lines on your side.

## Context (files, branches, commits)

- `OrbitArrivalScene`, `AnomalyScene` and `EndingScene` (ui/cutscenes) now take an optional `craft?: CraftSpec`.
- Value: `sceneSpec(state).craft` from `ui/scene3d/model` (the same spec the space view draws). Without it they show the default small craft, as today.
- PR #170 also routes the ending's planet and cloud shaders through `toScreen()`, since this canvas has no output pass. Please glance at your ending colours.

## What "done" looks like

The orbit, alarm and ending cutscenes show the spacecraft the player built.
