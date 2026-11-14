// The first-person story (decision 005): which story beat is playing, read from the screen the
// player is on and the SimEvents so far. Pure: no React, no sim, no 3D.

import type { SimEvent } from '../../shared'

/** The stations of decision 005, named after the screens app/ already switches between. */
export type StoryScreen = 'briefing' | 'design' | 'poll' | 'flight' | 'results'

/** The cutscenes of decision 005. ui/scene3d draws them; `Cutscene` frames them. */
export type CutsceneId = 'arrival' | 'launch' | 'orbit' | 'anomaly' | 'ending-success' | 'ending-loss'

export type World = 'earth' | 'moon' | 'mars'

export interface StoryBeat {
  /** Unique per moment (an anomaly beat includes its decision id), so app/ can play each cutscene once. */
  key: string
  /** Which line in LINES. */
  line: LineId
  /** Play this cutscene when the beat starts. */
  cutscene?: CutsceneId
}

/**
 * CAPCOM's lines, one sentence or two, never a paragraph (GAME_DESIGN.md §4.8).
 * The script is docs/game-design/STORY.md (claude@sarah); change it there first.
 * Only real-world claim: Earth–Mars radio delay of minutes (NASA: about 4 to 20 minutes one way,
 * https://www.nasa.gov/missions/tech-demonstration/deep-space-atomic-clock/how-an-atomic-clock-will-get-humans-to-mars-on-time/).
 */
export const LINES = {
  'call-earth': "Flight, CAPCOM. Your first shift: small satellite, small budget. Bring pictures home.",
  'call-moon': 'Good work on First Light, Flight. Now map the Moon, and watch its shadow on every orbit.',
  'call-mars': 'Flight, the big one: radar to find ice under Mars. Out there, messages take minutes.',
  design: 'Your spacecraft is on the stand. Every part costs mass, power and money. Choose well.',
  poll: "Flight, the call is yours. Poll the room: every console has to say GO before we fly.",
  launch: 'Lift-off. Clear of the tower, and all the work from the clean room is riding on it now.',
  'orbit-earth': "Orbit confirmed. Instruments on. Remember, data only counts once it's on the ground.",
  'orbit-moon': "Lunar orbit confirmed. Watch the battery: in the Moon's shadow, it's all you've got.",
  'orbit-mars': 'Mars orbit confirmed. Radar on. Every pass over a ground station counts now.',
  anomaly: 'Flight, CAPCOM: we have an anomaly. The clock is stopped. Take your time.',
  'anomaly-resolved': 'Copy, Flight. Executing. Back to the mission.',
  'ending-success': 'The data is home. Science team is cheering. Nice flying, Flight.',
  'ending-loss': "Signal's quiet, Flight. Every mission teaches us something. Let's go find out what.",
  'debrief-success': "Good flight. Here's the full report, and one change that would have made it even better.",
  'debrief-loss': "Here's what happened, and the one change that would have saved it. Fix it and fly again.",
} as const

export type LineId = keyof typeof LINES

/** Longest each cutscene may run (decision 005: 10 s at most). */
export const CUTSCENE_MS: Record<CutsceneId, number> = {
  arrival: 6000,
  launch: 8000,
  orbit: 5000,
  anomaly: 3000,
  'ending-success': 6000,
  'ending-loss': 5000,
}

/** The world a scenario flies to, from its id (`demo`, `moon-hard`, `mars`…). */
export function worldOf(scenarioId: string): World {
  return scenarioId.startsWith('moon') ? 'moon' : scenarioId.startsWith('mars') ? 'mars' : 'earth'
}

function ending(events: readonly SimEvent[]): 'success' | 'loss' | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!
    if (e.type === 'scenario_ended') return e.payload.summary.outcome === 'success' ? 'success' : 'loss'
  }
  return null
}

/** The beat playing now: the newest story moment on this screen. */
export function storyBeat(screen: StoryScreen, events: readonly SimEvent[], scenarioId: string): StoryBeat {
  const world = worldOf(scenarioId)
  switch (screen) {
    case 'briefing':
      return { key: `call-${scenarioId}`, line: `call-${world}`, cutscene: 'arrival' }
    case 'design':
      return { key: 'design', line: 'design' }
    case 'poll':
      return { key: 'poll', line: 'poll' }
    case 'results': {
      const end = ending(events)
      return { key: `debrief-${end ?? 'loss'}`, line: end === 'success' ? 'debrief-success' : 'debrief-loss' }
    }
    case 'flight':
      for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i]!
        if (e.type === 'scenario_ended') {
          const won = e.payload.summary.outcome === 'success'
          return { key: 'ending', line: won ? 'ending-success' : 'ending-loss', cutscene: won ? 'ending-success' : 'ending-loss' }
        }
        if (e.type === 'decision_resolved') return { key: `resolved-${e.payload.decision_id}`, line: 'anomaly-resolved' }
        if (e.type === 'decision_required') return { key: `anomaly-${e.payload.decision_id}`, line: 'anomaly', cutscene: 'anomaly' }
        // Earth orbit comes right after lift-off, so only the Moon and Mars get an arrival cutscene (decision 005).
        if (e.type === 'phase_changed' && e.payload.to === 'operations')
          return world === 'earth' ? { key: 'orbit', line: 'orbit-earth' } : { key: 'orbit', line: `orbit-${world}`, cutscene: 'orbit' }
      }
      return { key: 'launch', line: 'launch', cutscene: 'launch' }
  }
}
