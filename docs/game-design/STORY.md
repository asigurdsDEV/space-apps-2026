# Story script: CAPCOM lines and pop-outs

Owner: claude@sarah. Decision 005 (first-person story), GAME_DESIGN.md §4.8–4.9. `ui/story/model.ts` (claude@aiden) plays these. The ids below are its `LineId`s, so the block at the bottom drops straight into `LINES`.

## The arc

You're the **new Flight Director**. CAPCOM is the one voice in your ear (in real mission control, CAPCOM is the single person who talks to the crew). Over the program you grow from a first shift on a tiny CubeSat to running a Mars mission:

1. **First Light (Earth):** your first shift. Learn the room. Small, cheap, fast, forgiving.
2. **Moon Mapper:** they trust you with a real science orbit. Eclipses, batteries, a longer trip.
3. **Red Planet Radar (Mars):** the big one. Months of cruise, long radio delays, no second chances.

Rules (GAME_DESIGN.md §4.8, §7): one or two short sentences, spoken to "Flight". No made-up history. Real facts only where a source is listed. Game facts (budgets, odds) come from the sim, never from this script.

## Lines, beat by beat

| Beat (`LineId`) | When | CAPCOM says | Pop-out (glossary `termId`) |
|---|---|---|---|
| `call-earth` | briefing, First Light | Flight, CAPCOM. Welcome to your first shift. Small satellite, small budget: let's bring pictures home. | `orbit` |
| `call-moon` | briefing, Moon Mapper | Flight, CAPCOM. Good work on First Light. Now map the Moon from orbit, where its shadow hides you every orbit. | `eclipse` |
| `call-mars` | briefing, Red Planet Radar | Flight, CAPCOM. The big one: radar to find ice under Mars. Out there, every message takes minutes to arrive. | `delta-v` |
| `design` | builder | Your spacecraft is on the stand. Every part costs mass, power and money, and the rocket has to carry it all. | `payload-capacity` |
| `poll` | GO / NO-GO | Flight, the call is yours. Poll the room: every console has to say GO before we fly. | `power-budget` |
| `launch` | launch cutscene | Lift-off. Clear of the tower, and all the work from the clean room is riding on it now. | `reliability` |
| `orbit-earth` | operations start, Earth | Orbit confirmed. Instruments on. Remember, data only counts once it's on the ground. | `downlink` |
| `orbit-moon` | operations start, Moon | Lunar orbit confirmed. Watch the battery: in the Moon's shadow, it's all you've got. | `eclipse` |
| `orbit-mars` | operations start, Mars | Mars orbit confirmed. Radar on. Every pass over a ground station counts now. | `deep-space-network` |
| `anomaly` | anomaly card opens | Flight, CAPCOM: we have an anomaly. The clock is stopped. Take your time and make the call. | the card's own term (`reaction-wheel`, `high-gain-antenna`, `drag`, `safe-mode`, `south-atlantic-anomaly`, `deep-space-network`) |
| `anomaly-resolved` | after the choice | Copy, Flight. Executing. Back to the mission. | none |
| `ending-success` | ending cutscene, success | The data is home. Science team is cheering. Nice flying, Flight. | none |
| `ending-loss` | ending cutscene, loss | Signal's quiet, Flight. Every mission teaches us something. Let's go find out what. | none |
| `debrief-success` | results, success | Good flight. Here's the full report, and one change that would have made it even better. | none |
| `debrief-loss` | results, loss | Here's what happened, and the one change that would have saved it. Fix it and fly again. | none |

The Mars call's "every message takes minutes to arrive" is the only real-world claim in the lines. Radio signals between Earth and Mars take about 4 to 20 minutes one way, depending on where the planets are. Source: [NASA, Deep Space Atomic Clock](https://www.nasa.gov/missions/tech-demonstration/deep-space-atomic-clock/how-an-atomic-clock-will-get-humans-to-mars-on-time/).

These lines are live in `ui/story/model.ts` `LINES`. Change them here first.

## Optional next step (needs `ui/story` model changes, claude@aiden's call)

Per-world `launch` and `ending-*` lines would make each mission feel different, e.g. `launch-mars`: "Lift-off. Next stop Mars, about seven months from now." That number needs a source. It's not in the block below.

## Drop-in for `ui/story/model.ts`

```ts
export const LINES = {
  'call-earth': "Flight, CAPCOM. Welcome to your first shift. Small satellite, small budget: let's bring pictures home.",
  'call-moon': "Flight, CAPCOM. Good work on First Light. Now map the Moon from orbit, where its shadow hides you every orbit.",
  'call-mars': 'Flight, CAPCOM. The big one: radar to find ice under Mars. Out there, every message takes minutes to arrive.',
  design: 'Your spacecraft is on the stand. Every part costs mass, power and money, and the rocket has to carry it all.',
  poll: "Flight, the call is yours. Poll the room: every console has to say GO before we fly.",
  launch: 'Lift-off. Clear of the tower, and all the work from the clean room is riding on it now.',
  'orbit-earth': "Orbit confirmed. Instruments on. Remember, data only counts once it's on the ground.",
  'orbit-moon': "Lunar orbit confirmed. Watch the battery: in the Moon's shadow, it's all you've got.",
  'orbit-mars': 'Mars orbit confirmed. Radar on. Every pass over a ground station counts now.',
  anomaly: 'Flight, CAPCOM: we have an anomaly. The clock is stopped. Take your time and make the call.',
  'anomaly-resolved': 'Copy, Flight. Executing. Back to the mission.',
  'ending-success': 'The data is home. Science team is cheering. Nice flying, Flight.',
  'ending-loss': "Signal's quiet, Flight. Every mission teaches us something. Let's go find out what.",
  'debrief-success': "Good flight. Here's the full report, and one change that would have made it even better.",
  'debrief-loss': "Here's what happened, and the one change that would have saved it. Fix it and fly again.",
} as const

/** Glossary term (ui/learn) to offer as a "Did you know?" pop-out on each beat. */
export const BEAT_FACT: Partial<Record<LineId, string>> = {
  'call-earth': 'orbit',
  'call-moon': 'eclipse',
  'call-mars': 'delta-v',
  design: 'payload-capacity',
  poll: 'power-budget',
  launch: 'reliability',
  'orbit-earth': 'downlink',
  'orbit-moon': 'eclipse',
  'orbit-mars': 'deep-space-network',
}
```
