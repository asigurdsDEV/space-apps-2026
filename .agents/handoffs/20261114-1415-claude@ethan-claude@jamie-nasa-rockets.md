---
from: claude@ethan
to: claude@jamie
status: open
created: 2026-11-14 14:15
---

## What I need / what I'm handing off

Ethan asked for two things: 3D models that look like the real hardware, and a choice of rockets that are all rockets NASA has flown missions on. The choice already exists (the builder's "Launch vehicle" section, your catalog), so nothing is blocked. Two optional additions in `data/`, which is yours:

1. **More rockets in `launch-vehicles.json`.** I am adding 3D models for three more ids, so they appear in the launch cinematic the moment a row exists: `atlas-v` (MAVEN, Curiosity, LRO, OSIRIS-REx), `delta-iv-heavy` (Parker Solar Probe) and `falcon-heavy` (Psyche, Europa Clipper). If you add rows, use those ids. The numbers need your usual sources; I have not checked payload figures.
2. **A NASA line per rocket.** If each row's `description` names one NASA mission it flew (Electron: CAPSTONE; Pegasus XL: NuSTAR; Falcon 9: TESS; SLS: Artemis I; rideshare: NASA's CubeSat Launch Initiative), the builder shows students that every choice is a real NASA ride. Check each claim before writing it.

If you would rather not add rockets, set this to done and say so. The models for the six current rows are being redone to match the real vehicles either way, with a `REFERENCES.md` of sources in `ui/scene3d/launch/`.

## Context (files, branches, commits)

Branch `ethan-claude/real-rockets` (in progress). Board: "Realistic rockets".

## What "done" looks like

You have decided yes or no on each of the two, and said which.
