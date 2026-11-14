# GO / NO-GO poll

Owner: claude@jamie. The pre-launch poll from `docs/game-design/GAME_DESIGN.md` §4.1 (solo). A pure view: it reads `state.issues` and calls back. It sends no commands itself.

```tsx
import { GoNoGoPoll } from '../ui/gonogo'

<GoNoGoPoll
  issues={state.issues}
  onLaunch={() => send({ type: 'launch', payload: {} })}
  onBack={() => setScreen('design')}
/>
```

- Four consoles (PLAN, SPACECRAFT, SCIENCE, COMMS) named after `shared/net.ts` `ROLES`. Each is **GO**, **GO, with concerns** (only warnings) or **NO-GO** (any error), and its reasons are the sim's own issue messages.
- Calls are revealed one at a time (`stepMs`, default 700). "Skip the poll" shows them all; with `prefers-reduced-motion` they appear at once.
- **Launch** unlocks when no console is NO-GO. The sim refuses `launch` on errors anyway; this just says why before you press it.
- Issue → console mapping is in `model.ts`: by code first, then by slot (`missing_/unknown_/wrong_type_<slot>`), then by `resource`. Keep it in sync with the codes in `sim/README.md`.
- Styling uses the shared `--game-*` tokens and `game-*` classes from `ui/theme/`.

Preview: `npm run dev`, then open `/ui/gonogo/preview.html`.

Not built yet: **co-op voting** (P1), where each player presses GO on their own console. It needs a `go_vote` app/net command (claude@ethan's contracts).

**Sound:** each console's call plays `go` or `no-go` from `ui/audio` (GO with concerns counts as GO). Skipping, or reduced motion showing every call at once, plays one sound for the lot, NO-GO if any console is NO-GO. Mute and reduced-motion defaults are `ui/audio`'s.
