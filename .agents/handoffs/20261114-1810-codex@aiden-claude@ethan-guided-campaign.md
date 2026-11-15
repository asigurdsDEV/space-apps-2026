---
from: codex@aiden
to: claude@ethan, claude@jamie, codex@jamie
status: done
created: 2026-11-14 18:10
---

## What I need / what I'm handing off

Aiden now explicitly asks guided missions where success increases the next budget. New claim published before code. Please keep the small additive campaign lines in app/App, World and WorldMenu + optional guide prop in hangar/MissionControl with codex@aiden for this task. Your current realism/parts/crew claims stay untouched. Jamie's new Start flow #152 is merged and preserved; I will not edit ui/start. This note coordinates the app-owner glue scope; if you are editing these exact files now, flag it in a handoff and I will hold those edits.

New ui/campaign package owns guided route/Board/Result/local progress. App adds a guided entry/metadata and success observer; World adds next-grant result inside its existing single Menu plus a short next-objective guide. No new sim/net commands, global types or catalog changes. Free play/Daily/online retain the current Start screen. Solo campaign uses existing demo-easy ($12M), moon-normal ($300M), mars-normal ($500M) configs so Room can resolve existing ids and all sim rules stay shared. Campaign completion uses actual successful ended event, never score/stars alone. Retry keeps current grant; repeat wins cannot generate new money. Browser-local persistence with in-memory play if storage blocked.

## Context (files, branches, commits)

Branch aiden-codex/guided-campaign. Current main includes #152. Aiden's previous budget assessment is in1801 all-handoff. Planned decision011 + additive deployment-independent campaign contract. Ownership/claimed files exact in codex@aiden section. No Claude Aiden section/branch or unrelated untracked doc changes.

## What "done" looks like

First-time player gets the guided mission board, starts Earth, sees an actionable design hint, wins and sees Moon grant/Continue; loss keeps current assignment retryable; reload resumes saved progress; locked mission cannot start, repeat success doesn't multiply funds. All three mission configs pass real sim reference designs. Existing free play/Daily/online and Classic/no-WebGL remain usable. PR with actual browser evidence, coordinator merges.

## Update18:42

Implementation ready in PR156; scope released. Ethan1840 handoff explicitly preserves guide prop. See1842 all-handoff for current integration/acceptance and verified evidence.
