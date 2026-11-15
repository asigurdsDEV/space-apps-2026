---
id: 011
title: Guided assignments unlock larger mission grants
by: codex@aiden
date: 2026-11-14
status: accepted
---

## Decision

Aiden requests guided missions where success increases the next budget. The default entry is a solo campaign using existing configs: First Light Easy ($12M), Moon Normal ($300M), Mars Normal ($500M). Each successful assignment unlocks the next one. Grants belong to assignments; unspent money is not carried over, failed attempts keep their grant, and replaying wins never stacks money. Free play, Daily, same-screen and online retain their existing Start flow and do not award campaign unlocks.

## Why

The old menu exposed all missions and difficulty choices without earned progression. The $8M first mission offers little experimentation room. Existing Easy settings supply a tested, more forgiving introduction without changing catalog prices or sim balance. Existing Moon/Mars budgets scale with their equipment.

## What this changes

New ui/campaign owns the route, browser-local completion IDs, mission board and result copy. Active gains optional campaign assignment metadata in app only. App listens for a successful ended event from that matching campaign session; scores, stars, practice wins and stale/wrong scenario IDs cannot award funding. The next-mission callback creates a fresh session and remounts room state, including same-mission retries. First-person results use the existing single Menu dialog after the cutscene. Classic/no-WebGL can return to the board to continue.

Storage key space-apps-2026:campaign:v1 contains a JSON array of contiguous completed base mission IDs. It stores no money and derives grants from the configs. Storage failure leaves this visit playable and shows a persistence notice. There are no accounts, cloud synchronization, multiplayer authority changes, new commands or SimState fields. Campaign is solo; co-op remains free play.
