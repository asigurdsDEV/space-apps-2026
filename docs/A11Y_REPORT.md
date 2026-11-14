# Accessibility pass

**When:** 2026-11-14 12:40, cursor@caleb
**Build played:** https://asigurdsdev.github.io/space-apps-2026/ (the deploy that was live during this pass)
**Source read:** `main` after the tooltip fix in PR #58
**Not done:** a run in NVDA, VoiceOver, or TalkBack. Names below come from the browser accessibility tree plus the source. Node is not installed on this machine, so this was not a local `npm run dev` pass.

## What a keyboard user can do

Solo First Light can be started, briefed, and designed with named controls.

| Screen | What is exposed |
|---|---|
| Start | Buttons for the glossary words, Play solo / Host / Join, a text field named "Your name", selects named "Mission scenario" and "Difficulty", Start mission, Play daily mission. A second form, "One screen, whole crew", has a select named "Mission" and "Play on one screen". Errors use `role="alert"`. The budget line is `aria-live="polite"`. |
| Briefing | "Back" and "Start designing". Regions "How to win" and "Words you'll see". One `h1`. |
| Builder | "Sound on" (`aria-pressed`), "Main menu", the quick-tour buttons, part radios and checkboxes whose names are the part names ("6U CubeSat", "Basic Earth camera", …), "Launch mission", "Design name", "Copy link", "Save design" (disabled until a name exists). Flight consoles and budget warnings are in the tree. |
| GO / NO-GO | Source: each console is `aria-live="polite"`, "Skip the poll" shows the calls at once, and the verdict is `role="status"`. Launch stays disabled until every console has been called. |
| Fly / results | Played earlier the same day. Pause, 1× / 5× / 20× / 60×, and "Start over" are named buttons. Results text states the grade and why. |
| Lobby | Not opened in this pass. Source: "Copy code", role claim buttons, "Leave room", and the host's start button are real `<button>`s inside a `main` with an `h1`. |

Focus rings exist (`:focus-visible`) on the start panel, briefing actions, builder inputs and Launch, lobby, mission buttons, the sound toggle, the tour, and the shared theme.

## Findings

1. **Builder tour is not a dialog** — owner: codex@jamie (`ui/tutorial/`). The tour is the first thing in the builder tree ("Skip tips", "Back", "Next tip") but nothing moves focus there, Tab is not trapped, and Escape does not skip it. A keyboard user can wander into the part tables while the tour is still up. Handoff: `20261114-1240-cursor@caleb-codex@jamie-a11y-tutorial.md`.

2. **Empty name still looks filled in** — owner: codex@jamie (`ui/start/`). Already on the board (playtest): the placeholder is "Mission planner", and Start does not proceed until a name is typed. The field itself is labeled "Your name", which is the right accessible name. No new task.

3. **Glossary tips on the deployed site were still in the layout.** On this pass, focusing "Power budget" put the definition into the paragraph text around it. `main` (PR #58, cursor@kaipo) now uses `display: none` until hover or focus, and `aria-describedby` still points at the tip. Re-check the live link after that deploy. No new task.

4. **Phone screens opened mid-page** on the deploy played at 12:26. PR #53 claims a scroll-to-top fix that landed after that deploy. Re-check after the next Pages build. Already on BOARD Missing.

## Not found

No unlabeled part control in the builder. No click-only `div` standing in for a button on the screens above. No second `h1` on Start or the briefing.
