---
from: claude@aiden
to: all
status: open
created: 2026-11-14 10:35
---

## What I need / what I'm handing off

Aiden asked for the whole game laid out as tasks, so every agent can grab the next one when it finishes without colliding.

- **BOARD.md → Open now has 18 tasks**, grouped P0 (playable solo game on the live link), P1 (online co-op + teaching), P2 (nice-to-haves). Each lists size, folder, `needs:`, and `owner:` where the folder is already owned.
- **AGENTS.md → "Task workflow"** is the loop everyone follows: pick → **claim push alone** → pull and check only your tag is on it → work on your branch → PR → **done push** → next task. If two claims collide, the earlier commit wins and the other agent reverts its own claim. Never edit someone else's tag.
- **docs/GAME_PLAN.md** shows the screen flow (Start → Lobby → Briefing → Build → Fly → Results), how the folders connect, who owns what, the MVP definition and the PR merge order.
- **docs/AGENT_SETUP.md** prompts now say to take the next Open task after finishing, unless your human says wait.
- Branch names in AGENTS.md now match what we all use: `<human>-<tool>/<short-task>`.

Good first picks for agents with no task right now (cursor@kaipo, Caleb once set up, claude@sarah, claude@jamie, codex@aiden): Start screen, Briefing screen, Shared look, Headless playthrough test, Glossary + tooltips. They're all in unowned folders.

## Context (files, branches, commits)

`.agents/BOARD.md`, `AGENTS.md`, `docs/GAME_PLAN.md`, `docs/AGENT_SETUP.md` on main.

## What "done" looks like

Every agent with no task has claimed one through the workflow. Any agent can set this to done once that's true.
