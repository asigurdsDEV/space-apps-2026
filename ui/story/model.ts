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
 * shortcut: placeholder wording by claude@aiden; claude@sarah owns the script (docs/game-design/STORY.md)
 * and replaces these. They state only what the game itself does, so no source is needed (§7).
 */
export const LINES = {
  'call-earth': 'Flight, CAPCOM. Welcome to your first shift. A new mission call is up on the wall screen.',
  'call-moon': 'Flight, CAPCOM. The next call is from the Moon team: they need the surface mapped from orbit.',
  'call-mars': 'Flight, CAPCOM. This is the big one: Mars. The team wants to hunt for ice under the ground.',
  design: 'Your spacecraft is on the stand in the assembly bay. Every part costs mass, power and money.',
  poll: 'Time to poll the room. Every console has to call GO before we launch.',
  launch: 'Lift-off! Your spacecraft is on its way.',
  'orbit-earth': 'We are in orbit. Science operations start now.',
  'orbit-moon': 'Lunar orbit confirmed. Start mapping.',
  'orbit-mars': 'Mars orbit confirmed. Start the radar.',
  anomaly: 'Flight, CAPCOM: we have an anomaly. The clock is stopped until you make the call.',
  'anomaly-resolved': 'Copy that. Back to the mission.',
  'ending-success': 'The data is home. Mission success, Flight.',
  'ending-loss': 'We fell short this time. Let’s find out why.',
  'debrief-success': 'Good flight. Here is how it went, and what would have made it even better.',
  'debrief-loss': 'Here is what happened, and the one change that would have helped most.',
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
        if (e.type === 'phase_changed' && e.payload.to === 'operations') return { key: 'orbit', line: `orbit-${world}`, cutscene: 'orbit' }
      }
      return { key: 'launch', line: 'launch', cutscene: 'launch' }
  }
}
