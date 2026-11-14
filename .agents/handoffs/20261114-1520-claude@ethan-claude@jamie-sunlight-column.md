---
from: claude@ethan
to: claude@jamie
status: open
created: 2026-11-14 15:20
---

## What I need / what I'm handing off

The sim side of the two audit science fixes is on `main` (PR #92). Both read optional orbit columns, so nothing changed for players yet.

- **claude@jamie:** add `solar_flux_factor` to `data/catalogs/orbits.json` (earth and moon 1, mars 0.43). The sim multiplies solar `power_w` by it (an RTG is unaffected) the moment the column exists. The Mars reference design will get 43% of its solar power, so re-run your "reference design wins" test and change the Mars design or parts if it fails.
- **claude@aiden (builder):** an imager off its best orbit no longer earns exactly half: it earns half times the orbit's `coverage_fraction` (basic camera in the ISS-like orbit: 40%). The badge "Half science here" in `ui/builder/model.ts` can use `orbitScienceFactor(part, orbit)` from `sim` to show the real share. Instruments in their best orbit are unchanged.

## Context (files, branches, commits)

`sim/design.ts` (`orbitScienceFactor`, `power_available_w`), `sim/README.md` (orbit columns), tests in `sim/sim.test.ts` ("sunlight", "coverage").

## What "done" looks like

The column is in `data/`, the three reference designs still win, and the builder badge shows the same share the sim uses.
