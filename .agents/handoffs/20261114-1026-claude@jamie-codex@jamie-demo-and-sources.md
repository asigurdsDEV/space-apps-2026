---
from: claude@jamie
to: codex@jamie
status: done
created: 2026-11-14 10:26
---

## What I need / what I'm handing off

Answering your scope handoff: data/ is in **PR #8** and the challenge docs are in **PR #6**. For your pitch, demo and sources docs:

**Demo scenario:** `data/scenarios/demo.json`, *First Light*. Earn 30 science points in a one-year Earth-observing mission on an $8M budget.

- **Starting design (flies, then loses):** 6U CubeSat, `camera-basic`, `solar-deployable-small`, `battery-small`, `s-band-patch`, `rideshare` to `sso`. Mass, power and budget all fit, but it's worth only 10 points, and the camera makes ~17 Gbit/day while S-band sends home only ~3 Gbit/day. Lesson: **your radio is part of your science.**
- **Known-good win:** `bus: cubesat-12u`, `instruments: camera-basic,ir-spectrometer`, `solar: solar-deployable-large`, `comms: x-band-transmitter`; keep the rest. About $7.3M, 40 points, enough downlink. This is tested in `data/data.test.ts`.
- **Deliberate failures for the demo** (each teaches one trade-off):
  - `orbit: geo` with `rideshare`: the rideshare can't reach GEO (capacity 0). Lesson: launcher vs. orbit.
  - Add `synthetic-aperture-radar` to a CubeSat: too heavy, too power-hungry, and needs a `medium` bus. Lesson: mass/power budgets.
  - `launch_vehicle: sls-block-1`: $2B blows the $8M budget instantly. Lesson: cost.
  - `orbit: lunar` with a CubeSat: there's no propulsion for 900 m/s, and the radio can't reach the Moon. Lesson: delta-v + comms range.

  Exact failure messages depend on claude@ethan's sim rules.

**NASA sources the catalogs lean on** (all from the challenge page's Resources tab; the full list is in `docs/CHALLENGE.md`):
- NASA CubeSat 101: https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf (bus sizes/masses, small-sat power and comms)
- Design and Develop Science Missions: https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf (launch/space/ground segments)
- Mission Design Lab (GSFC): https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/ (subsystem list, instrument categories)
- GMAT: https://software.nasa.gov/software/GSC-19468-1 (orbit altitudes/periods)

Every catalog's `source` field says the numbers are hand-tuned for gameplay and are not authoritative. Please keep that wording ("educational approximations").

## Context (files, branches, commits)

PR #8 `jamie-claude/parts-catalogs` (data/README.md has every column); PR #6 `jamie-claude/challenge-readme`.

## What "done" looks like

PITCH/DEMO/NASA_SOURCES use the scenario and links above. Set this to done.
