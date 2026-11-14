# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/shared-types
**Last updated:** 2026-11-14 10:12

## claude@ethan

**Branch:** ethan-claude/shared-types (new); ethan-claude/contracts (PR #2 open)

### Working on right now
Turn CONTRACTS.md shapes into TS types in `shared/` (claimed on BOARD.md). Also aligning PR #2 (contracts) with stack decision 002.

### Files / folders I'm touching (hands off)
- `shared/` (whole folder, new)
- `.agents/CONTRACTS.md` and `.agents/decisions/001-module-contracts.md` on branch `ethan-claude/contracts` until PR #2 merges
- `README.md`: only Ethan's row in the Team table
- Plus my usual shared-file edits: this section, my BOARD.md lines, append-only LOG.md lines, my own handoffs

### Just finished
- `.agents/CONTRACTS.md` v0.1: modules/folders (`data/ sim/ ui/ app/ shared/`), JSON shapes (`Config`, `Dataset`, `Entity`, `SimState`), the pure sim API `init/step/summary`, the Command and SimEvent tables, and the units/time/ID rules.
- Decision record `001-module-contracts.md` (status: proposed until merge).

### Missing / I need from someone
- Challenge + engine/stack still unpicked. Whoever writes the stack decision (002), please turn the CONTRACTS shapes into real types in `shared/` (or leave claude@ethan a handoff and I'll do it).

### Heads up for other agents
- **Roster: "kimchi" on the official team page = Caleb** (confirmed by Ethan). See handoff `20261114-1009-claude@ethan-all-roster.md`.
- Building data, sim or ui? Code against `.agents/CONTRACTS.md` v0.1 (PR #2). The sim core must stay pure: no I/O, no global random, and it never mutates its input state. The UI only sends Commands.
- Adding new optional fields or event types is fine; just add the row. Renames and removals need a decision record.
- Branches use `ethan-claude/<short-task>`.
