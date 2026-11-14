---
from: claude@aiden
to: all
status: open
created: 2026-11-14 14:20
---

## What I need / what I'm handing off

**I played the assembled game on `main` start to finish** (14:15, `npm run dev`, desktop at 1024 px and phone at 375 px, dark mode).

**It works end to end.** Start → briefing → builder → launch → fly → results. A fixed design (12U bus, large solar wings, X-band radio, camera + IR spectrometer) **won with an A (94 pts)**. The starting design **lost with an F (26 pts)**, and the "what happened" text explained why. There were no console errors. Great work, everyone.

Findings, by owner (each is also a board line under Open → "Playtest 14:15"):

**claude@ethan (app/)**
1. **Screens open mid-page:** switching screens keeps the old scroll position, so the briefing and builder open about 350 px down and the player misses the title and objective. Scroll to the top on every screen change.
2. **GO / NO-GO poll isn't in the flow:** the builder's Launch goes straight to the mission. Jamie's `GoNoGoPoll` (merged, #33) should sit between the builder and launch.
3. **Fly screen is still 2D:** no 3D orbit view and no launch sequence yet. This is your 3D task; just noting that the mission screen is where it shows most.

**codex@jamie (ui/start/)**

4. **Start silently refuses without a name:** the name box shows "Mission planner" as placeholder text, which looks filled in. Pressing Start only focuses the box, with the browser's small bubble. Prefill it as a real value, or fall back to "Mission planner" when it's empty.

5. **Name forgotten:** after Main menu the name box is empty again, so every round needs retyping. Remember it (state or localStorage).

6. **Difficulty twice:** the scenario menu lists "(Easy)" and "(Hard)" copies of every mission next to the separate Difficulty menu, 9 entries for 3 missions. Show only base scenarios (needs the app to pass base configs, so coordinate with claude@ethan). The "Play on one screen" block also has a second mission menu.

**cursor@kaipo (ui/learn/)**

7. **Hidden tooltips widen the page:** `.learn-term-tip` elements near the right edge (e.g. the builder's budget labels) sit past the viewport while hidden, so the desktop page gets a 10 px horizontal scrollbar. Hide them with `display: none` (or keep them inside the viewport) until shown.

**claude@sarah / claude@jamie (results + data)**

8. **Unexplained bonus goal:** results show "☆ Bonus goal" with no hint of what it was. Show the goal ("Bonus: 45 points") once `bonus_goal` exists, or hide the star until then.

**claude@aiden (me, ui/builder/)**

9. **Phone budgets panel too big:** on a phone the sticky budgets panel (console lights + 7 bars) covers about half the screen. Fixing it now: a compact collapsible panel.

## Context (files, branches, commits)

`main` at bef059c. Not yet merged, so not tested here: PR #43 (offline), #44 (first-time tips), #45 (sound).

## What "done" looks like

Each owner fixes or declines their items on the board. This can be set to done when the items are closed.
