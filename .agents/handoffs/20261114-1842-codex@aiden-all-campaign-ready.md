---
from: codex@aiden
to: all
status: open
created: 2026-11-14 18:42
---

## What I need / what I'm handing off

**PR #156** https://github.com/asigurdsDEV/space-apps-2026/pull/156 implements Aiden's guided missions with success-funded next assignments. First Light Easy$12M → Moon Normal$300M → Mars Normal$500M. Win-only unlock; fixed grant per attempt, failure/replay cannot stack money. Browser-local progress, with in-memory fallback. Free play/Daily/online unchanged behind their original Start flow; world=classic URLs preserve the legacy free-play landing. New helper/board/result code in ui/campaign. No new sim/net commands or catalog values.

- **Ethan:** review/merge green current head before rebasing the1840 realistic redesign onto it. Thank you for preserving the optional MissionControl guide prop in your new hall. No edits to your claimed hall/model/launch/CSS files after that handoff. Keep App's campaign observer/session remount, World next-result callback, and WorldMenu disabled/open interlock (prevents ending + funding dialogs overlapping). #153 one-screen children + latest models/motion are preserved. Existing e2e entry URLs keep working; no e2e source touched.
- **Kaipo:** after merge, deploy latest main to existing kimchispacemission project using your authenticated account. Verify ordinary URL Download→Continue→campaign board,12M Earth funded, Moon/Mars locked; success unlocks300M Moon and survives reload. world=classic still starts the existing menu. Preserve TURN env/API; report deployed SHA. No new account permissions required for manual deploy.
- **Caleb:** physical laptop/zoom acceptance on the guided route; check ending cutscene then exactly one funding menu, actual retry resets launch/room. Own QA file only; model look remains Ethan's claim.
- **Jamie:** existing new Start UI/source retained, now free-play/Daily/online entry. Guided solo is the default as Aiden requested; demos should show Earth win→Moon grant. Any entry-point adaptation goes through a separate scoped claim.
- **Sarah:** check mission/award explanations for scientific clarity; grants are gameplay assignments, not authoritative NASA procurement estimates. No source task claimed on your behalf.

## Context (files, branches, commits)

Branch aiden-codex/guided-campaign. Claim lock9038356; source commit04eae4e plus integration and Classic compatibility. Decision011/CONTRACTS record app-only metadata and local browser completion IDs; no SimState/NetMessage changes. Claude Aiden prefix/branches untouched, unrelated untracked doc untouched. Local screenshots available on Aiden's machine (guided-campaign-preview.jpg in workspace root).

Executed:578tests/76files, typecheck/build/size72.0kB. Real browser reference Earth design → launch/decisions → win →300M grant → new Moon arrival → reload1/3 with Mars locked. Separate-origin starter fails →same12M →fresh retryarrival and actual W/E launch →second loss still0/3. Exactly one Cutscene dialog at ending, then one Mission menu. Production download/Continue/board/free-play smoke passes. All three real configs fly to success in sim tests. Details and limits: docs/qa/guided-campaign.md.

## What "done" looks like

Coordinator merges passing current head; deployed ordinary URL offers guided progression and matching grants; failed attempts keep funding; later assignments require actual campaign success. No claim of new physical-laptop, no-WebGL hardware or cross-device verification. Campaign remains solo/browser-local; no cloud save or shared co-op economy.
