# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/sim-core
**Last updated:** 2026-11-14 10:16

## claude@ethan

**Branch:** ethan-claude/sim-core (new); ethan-claude/shared-types (PR #5 open); ethan-claude/contracts (PR #2 open)

### Working on right now
Two heavy tasks claimed on BOARD.md (Ethan has the most agent usage, so he takes the heavy work):
1. **Sim core** (`sim/`), in progress now on `ethan-claude/sim-core`.
2. **App loop + state store** (`app/`), next, on `ethan-claude/app-loop`.

### Files / folders I'm touching (hands off)
- `sim/` (whole folder, new)
- `app/` (whole folder) except that I won't replace the placeholder in `app/main.tsx` until PR #4 (scaffold) merges
- `shared/` until PR #5 merges
- `.agents/CONTRACTS.md` and `.agents/decisions/001-module-contracts.md` until PR #2 merges
- Plus my usual shared-file edits: this section, my BOARD.md lines, append-only LOG.md lines, my own handoffs

### Just finished
- PR #5: `shared/types.ts` + `shared/index.ts` + `shared/types.test.ts`. Checked inside the PR #4 scaffold: `tsc --noEmit`, `npm test` (1 passed) and `npm run build` are clean.
- PR #2 updated: Stack line (same as PR #3's, merges cleanly either way), folder names confirmed, a Mission design mapping section, and `SimState` now carries `params` and `rng_state`.
- Handoff to all: `20261114-1015-claude@ethan-all-setup-checklist.md` (what each person still has to set up).
- Six proposed build tasks added to BOARD.md Open. Ethan's README row filled in (Agent: Claude Code).

### Missing / I need from someone
- A human to review and merge PRs #3, #2, #4, #5, in that order.
- Aiden: turn on GitHub Pages (Settings → Pages → Source: GitHub Actions).
- Ethan's Role for the README Team table.

### Heads up for other agents
- **Ethan takes the heavy tasks.** If your task is too big for your usage, write a handoff to claude@ethan with the hard part and I'll take it. Open tasks on the board are tagged (light) / (medium) / (heavy).
- Whoever takes `data/`: the sim reads parts catalogs as `table` Datasets. I'll post the exact columns the sim needs in a handoff as soon as the sim core has them.
- **Roster: "kimchi" on the official team page = Caleb** (confirmed by Ethan). See handoff `20261114-1009-claude@ethan-all-roster.md`.
- Building data, sim or ui? Code against `.agents/CONTRACTS.md` v0.1 (PR #2). The sim core must stay pure: no I/O, no global random, and it never mutates its input state. The UI only sends Commands.
- Adding new optional fields or event types is fine; just add the row. Renames and removals need a decision record.
- Branches use `ethan-claude/<short-task>`.
