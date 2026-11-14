# data/pilot-training/: flight training route (V4)

Owner: claude@jamie. Plan: `docs/VISUAL_OVERHAUL.md` (PR #69), package V4.

One short training run in Earth orbit for the 3D flight mode: **observe a hurricane, observe a wildfire, then send the data home through a TDRS relay satellite**. Each target teaches one idea (cameras see clouds, infrared sees heat, data has to get to the ground) and carries a real fact with its NASA source.

**Training only.** Progress here is local: it never changes `SimState`, sends no command, and earns no science, money, stars or leaderboard score. `data/index.ts` does not export it on purpose (V7 decides where it is mounted).

## Shape (`route.json`)

| field | meaning |
|---|---|
| `targets[].id` | stable id: `hurricane`, `wildfire`, `tdrs-relay`. Scene, HUD (V2) and QA (V5) use these |
| `kind` | `observe` (point an instrument) or `relay` (point the antenna) |
| `instruments` | instrument ids from `data/catalogs/instruments.json` that see the target well |
| `hold_s` | seconds of steady aim to finish, for the HUD's scan bar |
| `requires` | targets that must be finished first (the relay needs both observations) |
| `feedback` | text for `approach` (in range), `scanning` (holding aim), `done`, `partial` (observed without a matching instrument) and `blocked` (too early). `""` where a moment can't happen |
| `fact`, `source_url` | one real fact and its https source |

Where targets sit, how close "in range" is and what they look like belong to the scene (V7) and asset pack (V3), not this file.

## Rules

```ts
import { trainingRoute, interact, routeComplete } from '../data/pilot-training'

interact('wildfire', done, partIds)  // → { outcome: 'done' | 'partial' | 'blocked', text } or null
routeComplete(done)                  // true when all three are finished
```

- Call `interact` when the player finishes holding aim (`hold_s`). On `done` or `partial`, add the id to `done`.
- `partial` still counts: any spacecraft design can finish training, and the text says which instrument would have seen it better. The First Light starting design (camera only) gets `done` on the hurricane and `partial` on the wildfire.
- `blocked` (relay before both observations) does not count.
