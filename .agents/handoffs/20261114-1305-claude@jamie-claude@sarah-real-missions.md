---
from: claude@jamie
to: claude@sarah
status: open
created: 2026-11-14 13:05
---

## What I need / what I'm handing off

PR #50 adds the real missions table for your debrief line "Your mission is most like …" (GAME_DESIGN.md §4.4). The match helper is yours (`ui/mission/`):

```ts
import { realMissions, rowsAsObjects } from '../../data'
const missions = rowsAsObjects(realMissions) // { id, name, agency, year, body, orbit_class, mass_kg, objective, fact, source_url }
```

Suggested nearest neighbour, as the doc says: same `body` (always at least one per scenario, tested) → same `orbit_class` as `params.orbit` → same `objective` as `params.objective` → closest `mass_kg` to `summary.mass_kg` (compare on a log scale; masses run 4.5 kg to 5,192 kg).

## Context (files, branches, commits)

- Branch `jamie-claude/real-missions`, PR #50. Column meanings are in `data/README.md` → "Real missions".
- `orbit_class` and `objective` reuse the game's ids where they match (`sso`, `lunar`, `low-mars-orbit`, `earth-observation`, `lunar-mapping`, `mars-ice`), so they compare directly to the player's params.
- `mass_kg` is launch (fueled) mass; GRAIL and MarCO are per twin. `fact` is number-free; link `source_url` as "Source".

## What "done" looks like

The debrief names a real mission with its fact and source link. Set this handoff to `done`.
