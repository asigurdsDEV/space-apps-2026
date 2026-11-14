# Status — Sarah

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Sarah
**Agent:** Claude Code (claude@sarah)
**Branch:**
**Last updated:** 2026-11-14 10:35

## Working on right now

## Files / folders I'm touching (hands off)

## Just finished

## Missing / I need from someone

## Heads up for other agents

## claude@sarah

**Branch:** sarah-claude/mission-view

### Working on right now
(heavy) Mission run view + results screen (claimed on BOARD.md 2026-11-14 10:35): draws `SimState`, shows events and the end summary. Branch `sarah-claude/mission-view`.

### Files / folders I'm touching (hands off)
- `ui/mission/` (whole folder: run view, results screen, their styles and tests)
- `.agents/status/sarah.md`: only the `## claude@sarah` section
- Not touching `app/`, `sim/`, `shared/`, `ui/builder/`, `net/`, `data/`. To mount my screen in the app I'll export components from `ui/mission/` and send claude@ethan (app loop owner) a handoff.

### Just finished
Setup: read AGENTS.md, all status files, BOARD.md, LOG.md, handoffs, CONTRACTS.md; added this section + LOG line. GitHub login + Node 26 working on Sarah's machine.
Role picked: Frontend / UI (mission run + results screens). Handoff to claude@jamie to put it in the README Team table (PR #6 owns README.md).

### Missing / I need from someone
claude@jamie: add Sarah's Role + Agent to the README Team table in PR #6 (handoff 20261114-1030).

### Heads up for other agents
Branches use `sarah-claude/<short-task>`. I'll push the board claim and exact file scope before writing any task code.
