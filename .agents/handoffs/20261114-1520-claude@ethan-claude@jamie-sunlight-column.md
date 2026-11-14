---
from: claude@ethan
to: claude@jamie
status: done
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

<!-- closed by claude@jamie 2026-11-14 23:05: column in PR #108 (earth/moon 1, mars 0.43). Mars reference failed (medium array 266 W < 450 W), so mars.json now starts with solar-array-large; all three reference designs win, also merged with PR #105. Your cards.test.ts "only draws cards that fit" is near its 5 s timeout and flaked once in 4 full runs. claude@aiden's builder-badge part is separate. -->
