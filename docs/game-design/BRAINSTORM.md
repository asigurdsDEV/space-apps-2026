# Brainstorm: how to make it fun without making it wrong

By claude@sarah, 2026-11-14, at Sarah's request. This is the discussion behind [`GAME_DESIGN.md`](GAME_DESIGN.md). Read that file to build. Read this one to see why.

## The problem with what we have

The loop on the board today is **pick a scenario → fill in a form → watch bars fill → read a grade**. It's accurate and it teaches, but it's a spreadsheet with a launch button:

- **No decisions after launch.** The best moment in real spaceflight, when something breaks and the team has to choose, is passive.
- **Nothing pulls you back.** One scenario, no reason to play twice except a better number.
- **Failure is a dead end.** You get a paragraph and a reset button, not "change this one thing and you'd have won."
- **Co-op is four people sharing one form.** The brief asks for teams that "negotiate between competing priorities." Nothing makes them talk.

## What "fun" needs to mean here

Students at a science fair, and judges with 3 minutes, need:

1. **Stakes:** a moment where you hold your breath (launch, an anomaly).
2. **Agency:** your choice changes the outcome, and you can see how.
3. **Fast retry:** losing takes 2 seconds to recover from, and you know what to try next.
4. **A story to tell:** "our antenna didn't open, so we compressed the data like Galileo did" beats "I got a B."
5. **A reason to come back:** stars, a next mission, a daily challenge, beating a friend.

And it must not break the brief's other half: **real trade-offs, real numbers, real reasons.**

## Concepts considered

Scored 1–5. **Fun** = would a 14-year-old play it twice. **Teach** = does it teach the brief's trade-offs and *why*. **Accurate** = can it stay true to real missions. **Fits** = reuses what's built (sim, data, builder, mission view, 3D, net). **Ships** = buildable by Sunday morning.

| # | Concept | Fun | Teach | Accurate | Fits | Ships | Total |
|---|---|---|---|---|---|---|---|
| A | **Anomaly cards during operations**: the mission pauses, you pick how to respond, and each card is based on a real event | 5 | 5 | 5 | 4 | 4 | **23** |
| B | **Go/No-Go launch poll**: four flight-controller consoles must all say GO before launch, each explaining its NO-GO in plain words | 4 | 5 | 5 | 5 | 5 | **24** |
| C | **"What would have fixed it" debrief + risk meter**: rerun the pure sim with one change, or with 50 seeds | 4 | 5 | 5 | 5 | 4 | **23** |
| D | **Mission program (campaign)**: 4–5 calls from CubeSat to Mars, stars unlock harder missions and advanced parts | 5 | 4 | 4 | 4 | 3 | **20** |
| E | **Daily mission + share card**: same scenario and seed for everyone today, emoji result to paste in a group chat | 4 | 2 | 5 | 5 | 5 | **21** |
| F | **Real mission match**: "your design is most like Landsat 9 / Lunar Prospector", with real facts | 4 | 4 | 5 | 5 | 4 | **22** |
| G | **Proposal review panel**: submit your design to a NASA-style review board that scores science, cost risk and feasibility, like real Announcements of Opportunity | 3 | 5 | 5 | 4 | 3 | 20 |
| H | **Tech tree / agency economy**: research parts, run an agency over many years | 4 | 3 | 3 | 2 | 1 | 13 |
| I | **Arcade piloting**: fly the launch or orbit insertion by hand | 4 | 1 | 2 | 1 | 2 | 10 |
| J | **Quiz between screens** | 1 | 3 | 5 | 4 | 5 | 18 |
| K | **Competitive sabotage**: teams mess with each other's missions | 4 | 1 | 1 | 2 | 2 | 10 |
| L | **Role priorities in co-op**: each console has its own goal (science max vs. money saved vs. no data lost), bonus stars when your priority is met | 4 | 5 | 4 | 4 | 4 | 21 |

### Notes on the ones we dropped

- **H, tech tree:** the most "game-y", but it needs balance work we don't have time for, and fake research timelines aren't accurate. D gets most of the fun (unlocking) for a fraction of the work.
- **I, arcade piloting:** fun, but it's not mission design (the brief's subject), and hand-flying a rocket teaches the wrong thing: real launches are automated.
- **J, quizzes:** they interrupt play and feel like school. The same facts work better as anomaly-card stories and Go/No-Go reasons (A, B).
- **K, sabotage:** the brief rewards "successful collaboration". Sabotage teaches the opposite. Competition stays friendly through E (same daily mission, compare scores).
- **G, review panel:** very authentic (it's how NASA actually picks missions) but heavy to build and score fairly. Its best part, someone reviewing your design before launch, is folded into B: the Go/No-Go poll is a review board that talks.

## The pick: one loop, not a pile of features

The winners all hang off the screens we already have, so nobody throws work away:

> **You are the Flight Director.** Answer a mission call, design the spacecraft, get **GO from every console**, launch, then **keep it alive** through real-world anomalies. The debrief shows **what would have fixed it** and **which real NASA mission yours resembles**. Earn **stars** across a **mission program**, and try the **daily mission** against friends.

- **B (Go/No-Go)** turns the dry "issues list" into characters with opinions, and turns co-op into a conversation. It's almost free: it reads `state.issues`.
- **A (anomaly cards)** fixes the biggest gap, nothing to do after launch, and every card teaches a true story.
- **C (what would have fixed it)** makes failure fun: you lose, and in the same breath see the one change that wins.
- **F (real mission match)** is the Webb game's best idea, and the brief lists that game as a reference.
- **D + E + L** are the reasons to come back: stars, unlocks, a daily mission, and roles with their own goals.

Working title: **GO / NO-GO**. The team can rename it.

## Risks and how the design handles them

| Risk | Handling |
|---|---|
| Too much to build by Sunday | P0 is only B (solo), A (4 cards), C (what-if) and E. Everything else is P1/P2. Each feature has one owner folder. |
| Fun features drift from reality | Accuracy rules in `GAME_DESIGN.md` §7: every anomaly card cites a real event with a source, every number is sourced or marked as an approximation. |
| Anomaly cards break determinism | Cards are drawn by the sim's seeded RNG and resolved by a Command. Same seed + same choices = same mission. |
| Contract churn | Two additive shapes (one event, one command). Additive changes are allowed by CONTRACTS.md rule 7. Decision 004 records them. |
| Teams fight over the 3D view vs. cards | Cards are an overlay on the fly screen. The 3D orbit view stays underneath. |
