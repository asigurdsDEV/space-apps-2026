# UX declutter + fun pass

By claude@sarah for Sarah, 2026-11-14 22:50. Sarah's ask: **much less text, easier to use, more engaging, more fun.** Measured on `main` at 1280×800 by counting the words each screen shows:

| Screen | Words now | Budget | Owner |
|---|---|---|---|
| Start | 350 | **≤ 120** | codex@jamie (`ui/start/`) |
| Briefing | 385 | **≤ 90** | claude@aiden (`ui/briefing/`) |
| **Builder** | **1,394** (61 controls, 6,119 px ≈ 8 screens tall) | **≤ 250 on first view, no page scroll on desktop** | claude@aiden (`ui/builder/`) |
| GO / NO-GO | 171 | ≤ 80 | claude@jamie (`ui/gonogo/`) |
| Fly | 307 → **~126** ✓ | ≤ 130 | claude@sarah (`ui/mission/`, PR #112) |
| Results | ~300 → **116 visible** ✓ | ≤ 120 visible | claude@sarah (PR #112) |

## Rules for every screen

1. **One decision per view.** If the player has to scroll to find the button that moves them forward, the screen is too long.
2. **Numbers beat sentences.** Show a bar, ring or icon plus a short number. The explanation sits behind ⓘ or a `<details>` fold, or is the glossary `<Term>` tooltip that already exists.
3. **The next action is the biggest, brightest thing** (one primary button per screen, at least 44 px tall).
4. **Every change gets instant feedback:** a bar moves, a light changes, a short animation plays. Respect `prefers-reduced-motion`.
5. **Keep the teaching, move the words.** Nothing true gets deleted. Long text moves into folds so curious players can still read it.
6. **Phone first:** 375 px wide, no sideways scroll, thumb-sized targets.

## Per screen

### Start (`ui/start/`, codex@jamie)
- Replace the mission `<select>` with **3–4 big mission cards** (art you already have + one line + budget/goal chips). Tapping a card selects it. Difficulty becomes a 3-way segmented control on the card row.
- Cut helper sentences under every field. Keep one line under the title.
- The Play solo / Host / Join choice stays, as three big tiles with no paragraph.
- Fixes the known "(Easy)/(Hard) repeated in the list" issue too, because cards show base missions only.

### Briefing (`ui/briefing/`, claude@aiden)
- Keep: title, the one-line objective, 3 fact chips (💰 budget, 🔬 goal, ⏱ length / deadline), the ★ bonus goal as one chip.
- "How to win": 5 paragraphs → **3 icon rows**, each ≤ 8 words ("📡 Data only counts when it gets home", "💰 The rocket is often the biggest bill", "🔋 Keep power on in the shadow"). The rest goes in a fold.
- "Words you'll see" glossary wall → **tap-to-learn chips** (the `<Term>` component already exists).

### Builder (`ui/builder/`, claude@aiden): the biggest win
- **Replace the spreadsheet tables with cards, one slot at a time.** Tabs or a stepper: Orbit → Rocket → Bus → Instruments → Power → Battery → Radio. Each tab shows the parts as **cards** with the name, a one-line description, **2 key stats as chips** (the ones that slot is about, e.g. radio = data rate + mass), and cost. Tap to pick.
- **The resource bars stay pinned** (they already exist): sticky on desktop, a compact strip on phone. When you hover or tap a card, show **ghost deltas** on the bars ("+12 kg, +30 W"), which is the brief's "see how decisions affect other parts" made visible.
- The full stat table moves behind a "Compare all ⓘ" fold for nerds.
- Console lights (GO/NO-GO preview) and the 3D craft stay as the hero.
- Issue messages show as **one short line + ⓘ**, not a paragraph.

### GO / NO-GO (`ui/gonogo/`, claude@jamie)
- Each console: name, big GO / NO-GO light, **one short line** (the first sentence of the issue). The rest goes behind ⓘ.
- Add each console's **priority** chip (GAME_DESIGN §4.7, still open on the board).
- The poll animation (consoles calling in turn) is the fun part. Keep it, with sounds (already there).

### Story pop-outs (`ui/story/`, claude@aiden)
- CAPCOM pop-outs auto-dismiss after ~6 s unless hovered/focused, so they don't stack over buttons. On the results screen it covered the leaderboard card.

## Done on the fly + results screens (PR #112)

- **Fly:** the 3D scene is the stage. Over it: a slim top bar (phase pill, day, compact pause/speed/start-over), the real-storm pill, the newest event as a fading toast, and three **ring gauges** (science, storage, money). The anomaly card is a modal with its story behind "ⓘ The real story". Data stats and the full log fold away.
- **Results:** a hero with the grade popping in, stars popping in turn, a one-line reason and **Design a new mission**. Then "Change one thing" with big **Try it ▸** buttons and a one-line real-mission match. Team, why, numbers and share sit in "Full report". A small **confetti burst** plays on success.
