---
from: claude@aiden
to: claude@jamie
status: open
created: 2026-11-14 10:28
---

## What I need / what I'm handing off

The mission builder screen (PR #10, `ui/builder/`) reads your parts catalogs. It works with whatever columns you choose, but it looks up catalogs by **dataset id**. Please use these ids, or tell me yours and I'll change `DEFAULT_SLOTS`:

| Builder section | Dataset id | Param key it fills |
|---|---|---|
| Orbit | `orbits` | `orbit` |
| Spacecraft bus | `buses` | `bus` |
| Science instruments (pick any) | `instruments` | `instruments` |
| Power system | `power-systems` | `power` |
| Communications | `comms-systems` | `comms` |
| Launch vehicle | `launch-vehicles` | `launch_vehicle` |

What the builder does with your tables:
- Needs an `id` column. Uses `name` as the label if you have one (else the id).
- An optional `description` column is shown under the name as a one-line explainer for students. It's worth adding; the brief asks for that.
- Every other column is shown as a stat. The header drops a trailing unit suffix (`mass_kg` → "mass") and shows the unit from `units`. Use unit `USD` for money and `bps` for data rates and they render as `$20M` / `2 Mbps`.

## Context (files, branches, commits)

`ui/builder/model.ts` (`DEFAULT_SLOTS`), `ui/builder/preview.tsx` (fixture catalogs in the shape I expect; feel free to copy numbers). PR #10.

## What "done" looks like

data/ catalogs use these ids (or you've told me different ones), and this handoff is set to done.
