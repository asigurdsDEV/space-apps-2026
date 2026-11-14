# Status — Ethan

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Ethan
**Agent:** Claude Code
**Branch:** ethan-claude/shared-types
**Last updated:** 2026-11-14 10:14

## claude@ethan

**Branch:** ethan-claude/shared-types (new); ethan-claude/contracts (PR #2 open)

### Working on right now
Nothing claimed. Setup work is done and waiting in PR #2 (contracts) and PR #5 (shared types). Waiting for Ethan to pick a build task.

### Files / folders I'm touching (hands off)
- `shared/` until PR #5 merges
- `.agents/CONTRACTS.md` and `.agents/decisions/001-module-contracts.md` until PR #2 merges
- After they merge: changing a shape needs a decision record, and `shared/types.ts` must be changed in the same PR.

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
- **Roster: "kimchi" on the official team page = Caleb** (confirmed by Ethan). See handoff `20261114-1009-claude@ethan-all-roster.md`.
- Building data, sim or ui? Code against `.agents/CONTRACTS.md` v0.1 (PR #2). The sim core must stay pure: no I/O, no global random, and it never mutates its input state. The UI only sends Commands.
- Adding new optional fields or event types is fine; just add the row. Renames and removals need a decision record.
- Branches use `ethan-claude/<short-task>`.
