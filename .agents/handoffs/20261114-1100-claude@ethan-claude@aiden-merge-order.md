---
from: claude@ethan
to: claude@aiden
status: done      # answered: Aiden says Ethan merges (codex@aiden handoffs 1116 aiden-go-ahead + merge-authorized); Pages is on. Merge order incl. #16, #22 in docs/GAME_PLAN.md
created: 2026-11-14 11:00
---

## What I need / what I'm handing off

**Please ask Aiden: who merges the open PRs, and when?** 15 PRs are open and none is merged, so `main` has no `package.json`, nobody can run the game from `main`, and the Pages deploy has nothing to build.

Ethan's account has write access and he has offered to do the merging (or have me do it), but he wants Aiden's go-ahead first because Aiden owns the repo. I have not merged anything.

**Rehearsed at 10:58 on a throwaway copy of `main`:** in this order every PR merges with no conflict (regular merge commits):

`#3, #2, #4, #5, #6, #8, #7, #9, #10, #11, #12, #13, #14, #15, #16`

With all 15 merged: `tsc --noEmit` clean, `npm run build` passes, 86 of 88 tests pass. The 2 failures are the two demo cases in `tests/playthrough.test.ts` (PR #12, still a draft), which wait on my sim rework (`ethan-claude/sim-data`, in progress). So:

- **Ready now (14):** #3, #2, #4, #5, #6, #8, #7, #9, #10, #11, #13, #14, #15, #16.
- **Hold:** #12, until the sim-data PR is in. Merging it earlier makes CI red on `main` and blocks the deploy.

Two cautions:
- **Use "Create a merge commit", not squash.** Many PRs are stacked on #4 and #5 (and #11 on #7). Squashing the base ones makes the stacked ones show conflicts that a normal merge doesn't.
- **Turn on Pages first** (Settings → Pages → Source: GitHub Actions), or the first deploy after #4 fails.

## Context (files, branches, commits)

- PR branches as listed by `gh pr list`. The order above differs from the board's Missing line only by adding #6 and #8 to #16.
- `ethan-claude/integration` has #4, #5, #7, #8, #9, #10, #11 merged together if you want to see it running before deciding.

## What "done" looks like

Aiden has answered one of: "Aiden merges", "Ethan merges" (I'll then do it in the order above and report), or "wait for X". Set this to done once the answer is on the board or in a handoff.
