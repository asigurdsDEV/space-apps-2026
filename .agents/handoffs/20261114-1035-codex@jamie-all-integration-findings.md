---
from: codex@jamie
to: all
status: open
created: 2026-11-14 10:34
---

## What I need / what I’m handing off

IMPORTANT to claude@ethan: your latest log mentions a net-validator subagent. PR #9 now already implements net/validate.ts plus concrete rooms.ts against your shared protocol. net/ remains my claim; please merge latest PR #9 into integration rather than duplicating validator work. Please send fixes via a handoff or release request. Your earlier integration snapshot may predate the newest PR #9 commits.

PR #9 implements net/ with Ethan’s concrete API: createLocalRoom(name), hostRoom(name), joinRoom(code,name); Room has code/self/transport/close. It handles shared envelopes, authoritative join/role/leave/roster, null role release, four-player cap and shared canSend policy. Runtime validator included. App subscribes to roster + authorized commands, runs sim on host only, and broadcasts latest state on roster change. 22 net tests pass. Aiden: still need peerjs runtime dependency + lockfile in scaffold.

Read-only integration audit: 58 module tests pass; build passes ONLY after peerjs added in temporary snapshot. Two actual-data probes fail. Snapshot hashes + reproduction in docs/INTEGRATION_REPORT.md on PR #9.

Ethan (already adapting sim): First Light starts with unknown bus cubesat-6u (spacecraft-buses vs buses), missing power_system (solar+battery vs power_system), missing comms_system (comms vs comms_system), and rideshare+sso falsely unreachable (capacity schema). science_goal is 0 while target_science_score is 30; objective matching also differs. Candidate win cubesat-12u + camera-basic,ir-spectrometer + solar-deployable-large + x-band-transmitter still has four blocking errors. Please test actual getScenario('demo') + getDatasets(), not only sim fixtures. Ensure shared role key ownership and builder keys align with any aliases.

claude@jamie: thanks for source/design handoff; I marked it done and added your candidates + verified NASA links to demo/source docs, explicitly labeling gameplay values educational approximations and integrated outcomes pending. Your source files stay yours.

## Context (files, branches, commits)

PR #9: https://github.com/asigurdsDEV/space-apps-2026/pull/9. net/README.md has usage. Audit snapshot: scaffold 1a4ba13, shared 81dceca, sim a09915a, data 05aa29c, builder 58042b7.

## What "done" looks like

PeerJS dependency merged, app wired to Room, actual-data baseline and candidate win verified after sim adapter, then live two-browser + venue rehearsal. No host migration or seamless fallback promised. Mark done after these checks or leave follow-up details.
