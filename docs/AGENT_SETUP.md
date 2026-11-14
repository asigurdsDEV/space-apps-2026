# Agent setup prompts

The build is live as of 9:00 AM Sat Nov 14, 2026. Each person copies the prompt below, swaps in their own name and agent, and pastes it into their AI agent (Claude Code, Codex, Copilot, Gemini, Cursor, anything). Run it again for every extra agent you use.

Fill in these 3 things before pasting:

- `NAME`: your name as it is in `.agents/status/`. Use `Aiden`, `Ethan`, `Jamie`, `Sarah`, `Caleb` or `Kaipo`.
- `TAG`: your agent's tag, `<agent>@<name>` in lowercase, for example `claude@ethan`, `codex@sarah` or `copilot@kaipo`.
- `BRANCH`: your branch prefix, `<name>-<agent>` in lowercase, for example `ethan-claude`.

---

## Prompt: first-time setup

```
You're my AI agent for our NASA Space Apps 2026 team. I'm NAME. Your tag is TAG. The hackathon has STARTED (Sat Nov 14, 9:00 AM), so we're building now. Six of us each run our own agents on the same repo, and the repo files are how all the agents coordinate.

1. Clone https://github.com/asigurdsDEV/space-apps-2026 (if it's not already cloned) and cd into it. Run git pull on main.
2. Read AGENTS.md all the way through. Follow it for the rest of this session, every session.
3. Read EVERY file in .agents/status/, plus .agents/BOARD.md, the last 30 lines of .agents/LOG.md, any open notes in .agents/handoffs/ addressed to me, my agent or "all", and .agents/CONTRACTS.md. Give me a short summary: what each teammate's agents are doing, which files are claimed, what's open, and what's listed as Missing.
4. Open .agents/status/<my name in lowercase>.md. This file is mine only. Give your agent its own section headed "## TAG" with these fields: Working on right now, Files / folders I'm touching (hands off), Just finished, Missing / I need from someone, Heads up for other agents. If another of my agents already has a section in that file, add yours below it and never touch theirs. Update Agent and Last updated at the top.
5. Add one line to .agents/LOG.md: "<date time> | TAG | setup | agent online".
6. Commit "[TAG] setup: status + log". Run git pull --rebase, then push to main. Never force-push. If LOG.md or BOARD.md conflicts, keep both sides' lines.
7. Your branches from now on are BRANCH/<short-task>.
8. Show me the open tasks on BOARD.md and ask which one I want you to take. Don't claim anything until I pick.

After I pick: claim it on BOARD.md (In progress + TAG), fill in your status section with the task and the exact files and folders you'll touch, then commit and push that change BY ITSELF before writing any code. That push is the lock. Then work on your branch, and open a PR into main when it runs.
```

---

## Prompt: start of every later session

```
You're TAG on our NASA Space Apps team repo. Follow AGENTS.md. Pull main, then read every file in .agents/status/, BOARD.md, the tail of LOG.md, my open handoffs and CONTRACTS.md. Tell me in a few lines what changed since my last session and whether anyone is touching files near my task. Then carry on with my current task from my status section. If I don't have one, show me the open tasks and ask.
```

## Prompt: wrapping up a chunk of work

```
Wrap up as TAG. Pull first, then update your status section (Just finished, anything still Missing, exactly where you stopped), move the task on BOARD.md, add a LOG.md line, leave a handoff for anyone waiting on this, commit, push, and open a PR into main with the PR template. Before you finish, list anything you noticed is missing or broken that another teammate needs, and add it to BOARD.md under Missing.
```
