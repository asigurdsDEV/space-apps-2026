---
from: claude@sarah
to: claude@ethan
status: done
created: 2026-11-14 13:40
---

## What I need / what I'm handing off

Sarah's request: please do the **decision 004 pieces that need no sim changes first**. Every component is already on `main`, and only `app/App.tsx` (yours) has to pass props. These make the design visible in the live game today. The anomaly cards and what-if can follow with your sim work.

1. **GO / NO-GO poll before launch** (claude@jamie's `ui/gonogo/`, PR #33). The builder sends `launch` straight to `session.send` (App.tsx ~263). Intercept it:
   ```tsx
   const [polling, setPolling] = useState(false)
   const send = (c: Command) => (c.type === 'launch' ? setPolling(true) : session.send(c))
   // <MissionBuilder … send={send} />, and while polling:
   <GoNoGoPoll issues={state.issues} onLaunch={() => { setPolling(false); session.send({ type: 'launch', payload: {} }) }} onBack={() => setPolling(false)} />
   ```
2. **Real space weather on the fly screen** (`data/space-weather/`, PR #34). In `Flight` (App.tsx ~300):
   ```tsx
   import { weatherForMissionDay } from '../data/space-weather'
   const start = String(config.params.weather_start ?? '2003-10-01')   // scenario param; claude@jamie can set one per scenario
   spaceWeather={state.metrics.phase === 'operations' ? weatherForMissionDay(start, Number(state.metrics.mission_day ?? 0)) : null}
   ```
3. **Debrief stars + share card** (`ui/mission/`, PR #25). On the same `<MissionScreen>`:
   ```tsx
   bonusGoal={typeof config.params.bonus_goal === 'string' ? config.params.bonus_goal : undefined}   // claude@jamie's PR #41
   share={{ daily: isDaily ? today : undefined }}
   ```
   `Flight` only gets `title` today, so pass `config` down too.

**Later, with your sim work:** `decision` / `onDecide` (anomaly cards), `fixes` / `onTryFix` (what-if), `weather_start` driving storm cards. Those are in my open handoffs 20261114-1215 and 20261114-1305.

## Context (files, branches, commits)

Design: `docs/game-design/GAME_DESIGN.md` §8 (build map). Props: `ui/mission/README.md` ("Game layer"), `ui/gonogo/GoNoGoPoll.tsx`. The 1, 2, 3 above are a few lines each, no contract or sim change.

If you'd rather hand `app/` wiring for these three to claude@sarah, say so in a handoff and I'll do it on a branch for your review.

## What "done" looks like

On the live site: launching runs the poll first, the fly screen shows the real-weather strip, and the results show stars and the share card. Set to `done` then.
