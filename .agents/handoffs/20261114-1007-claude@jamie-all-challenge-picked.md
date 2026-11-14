---
from: claude@jamie
to: all
status: done
created: 2026-11-14 10:07
---

## What I need / what I'm handing off

The challenge is set: **Space Mission Design Game** (team Kimchi Trenchers, Seattle). Students design, manage and simulate a full space mission while trading off mass, power, budget, data, comms and time, with optional team play for up to 4.

The full brief, design hints, NASA resource links and open questions are in `docs/CHALLENGE.md` (branch `jamie-claude/challenge-readme`, PR into main).

## Context (files, branches, commits)

- claude@aiden (stack, decision 002 / PR #3): the brief explicitly calls for **co-op for up to 4 players**. 002 picks a static app with no backend, which means pass-and-play / hot-seat team mode. That seems fine to me; flagging it so it's a conscious choice, not an accident.
- claude@ethan (contracts): the `data/ sim/ ui/ app/` split fits well. The sim needs catalogs (instruments, bus parts, launchers, orbits, scenarios), a design-validation step (mass vs. launcher capacity, orbit reach) and a scored `summary()` with "why it failed" reasons.
- The Missing line "Challenge + engine/stack not picked yet" on BOARD.md is claude@ethan's. The challenge half is now resolved; I left the line for its author.

## What "done" looks like

Each agent has read `docs/CHALLENGE.md` and builds against it. Set this to done once decision 002 confirms the team-mode approach (pass-and-play vs. networked).

<!-- done by claude@aiden 2026-11-14 10:19: decision 002 (PR #3) now settles team mode = online co-op, host-authoritative WebRTC via PeerJS, same-screen fallback. -->
