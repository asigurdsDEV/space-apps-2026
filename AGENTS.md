# Rules for AI agents working in this repo

Six people are each running their own AI agent on this repo at the same time. You are one of them. These files are how you talk to the others. Read this whole file before doing anything.

## Before you start any work (every single session)

1. `git pull` on `main`, then rebase your branch.
2. Read **every** file in `.agents/status/` — this is what each of the other 5 agents is doing right now and which files they're touching. Don't edit files someone else lists under "Files / folders I'm touching".
3. Read `.agents/BOARD.md` — see what's claimed, open, and listed under Missing.
4. Read the last ~30 lines of `.agents/LOG.md`.
5. Check `.agents/handoffs/` for any open note addressed to you, your human, or `all`.
6. Read `.agents/CONTRACTS.md` — never break an interface listed there without a decision record.

## Your status file

Your human owns exactly one file: `.agents/status/<their-name>.md`. No other human's agents edit it, so it never merge-conflicts. If your human runs more than one agent (e.g. Claude Code + Codex), each agent gets its own `## agent@human` section in that file and only edits its own section.

Setup and per-session prompts are in `docs/AGENT_SETUP.md`.

- Update it and push **when you start a task** (what, branch, which files you'll touch) and **when you finish** (what's done, what's still missing).
- If you notice something missing, broken, or not built yet that someone else needs, put it under "Missing / I need from someone" in your file **and** add it to the Missing section of `BOARD.md`.
- If you stop mid-task, say exactly where you left off so another agent can pick it up.

## Aiden's repo-level go-ahead (2026-11-14)

Aiden asked codex@aiden to unblock the team and give permission for non-overlapping tasks. Repo-lead approval is granted for agents to continue their owned tasks, handle integration/adoption handoffs inside their own files, and claim the next unowned task using the lock workflow below. They do not need to wait for another task choice from Aiden. Each teammate's own explicit human instructions still apply.

- **One merge coordinator: claude@ethan**, accepting the role offered in its 11:00 merge-order handoff. It may review and merge ready PRs into main after checking current heads, dependency order, typecheck/tests/build and required GitHub checks. Use regular merge commits; preserve source branches. Hold drafts, failing/unreviewed heads and unresolved source conflicts; ask the relevant owner to fix/release scope. This is merge authority, not blanket approval of every PR.
- **Ownership still applies.** Never edit another owner's source without a released scope. Package/config changes stay with claude@aiden while its scaffold work is active; Ethan hands over its e2e dependency/script request instead of editing the same files concurrently. README changes stay within claimed sections/individual team rows.
- **Pages is enabled** with GitHub Actions, verified by codex@aiden; first successful app deployment is still pending merges. No collaborator access settings were changed.
- **Nudges use handoffs.** Pull main and read the all-handoff `20261114-1116-codex@aiden-all-aiden-go-ahead.md` plus notes addressed to your tag. A nudge does not transfer a file claim.

## Task workflow (claim → work → done)

Every task on `.agents/BOARD.md` goes through these steps. The two pushes (claim and done) are how the other agents know what you're doing, so never skip them. The game plan behind the task list is `docs/GAME_PLAN.md`.

1. **Pick.** `git pull` on `main`. In BOARD.md → Open, take the highest-priority task (P0 before P1 before P2) that has **no agent tag** and whose `needs:` are merged or can be built against their branches. Skip tasks marked `owner: X` unless you are X, or X released it in a handoff.
2. **Claim push (before any code).** Move that one line from Open to **In progress** and add your tag at the end, e.g. `— [claude@aiden]`. In your status section, list the exact files/folders under "Files / folders I'm touching". Add a LOG line (`claimed: <task>`). Commit **only those changes** as `[agent@human] board: claim <task>`, `git pull --rebase`, `git push`. That push is the lock.
3. **Check the lock.** `git pull` again and look at the line. If another agent's tag is on that task, or they claimed it in an earlier commit, **they have it**. Undo your claim with `git revert` (never edit or delete their tag), log it, and go back to step 1.
4. **Work** on your branch (`<human>-<tool>/<short-task>`, e.g. `aiden-claude/builder`). Touch only the files you listed. Need a change somewhere else? Write a handoff to that owner.
5. **Done push.** Open a PR into `main` (PR template). Then on `main`, move the line to **Done** with `— in PR #N` and anything still missing. Update your status (Just finished, files released, what's left), add a LOG line (`done: <task>, PR #N`) and handoffs for anyone waiting. Commit as `[agent@human] board: <task> done, PR #N`, then pull --rebase and push.
6. **Next.** Go back to step 1 and take the next Open task, unless your human told you to wait for them to pick. If nothing in Open fits, tell your human and add what you think is missing to Open or Missing.

**Stopping mid-task:** write exactly where you stopped in your status and leave the line In progress. If you're giving it up, move it back to Open with a note (`— released by agent@human: where it stands`) and push.

**Adding tasks:** anyone may add a line to Open (size, priority, folder, `needs:`, `owner:` if the folder is owned). Never edit another agent's line except to move your own claim.

**Folder ownership:** only edit files inside the area your task owns. If you need to change something outside it, write a handoff to whoever owns it.

## While working

- Branch name: `<human>-<tool>/<short-task>`, e.g. `jamie-codex/transport-demo`.
- Small commits. Commit message format: `[agent@human] area: what changed`.
- Append one line to `.agents/LOG.md` for each meaningful step:
  `YYYY-MM-DD HH:MM | agent@human | task | what you did`
- Never rewrite or delete other agents' log lines, board entries, handoffs, or status files.
- If `LOG.md` or `BOARD.md` merge-conflicts, keep **both** sides' lines. Never pick one side.
- Pull again before every push. If your push is rejected, pull --rebase and retry, don't force.

## Talking to another agent

Write a file in `.agents/handoffs/` named `YYYYMMDD-HHMM-from-to-topic.md` using `_TEMPLATE.md`. Push it. The other agent picks it up on its next pull. When you've handled one addressed to you, set its status to `done` (don't delete it).

## Decisions

Anything that changes how parts fit together (data formats, engine choice, folder layout, a contract) gets a short record in `.agents/decisions/` from `_TEMPLATE.md`, then update `CONTRACTS.md`.

## When you finish a task

Follow steps 5 and 6 of the Task workflow above: PR, then the done push (Done + PR #, status, LOG, handoffs), then take the next Open task.

## Don'ts

- Don't force-push `main`.
- Don't commit secrets, API keys, or `.env` files.
- Don't reformat files you didn't otherwise change.
- Don't mark something done if it doesn't run.
