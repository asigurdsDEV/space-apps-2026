// The 3D game loop (decision 007), behind `?world=3d` until it plays start → debrief, then the default.
// Design phase: mission control you walk around in (ui/hangar). After launch: today's launch view and
// flight screen (2D) until claude@ethan's walk-in spacecraft lands. Mission over: back to mission
// control for the debrief. Same Session and Commands as the 2D screens, so co-op works unchanged.

import { useMemo, useState } from 'react'
import { getDatasets } from '../data'
import type { Config, SimEvent, Summary } from '../shared'
import { choicesOf, whatIf } from '../sim'
import { SoundToggle } from '../ui/audio'
import { MissionControl, type Debrief } from '../ui/hangar'
import { outcomeLabel } from '../ui/mission/format'
import { GameScreen, withCards, type Active } from './App'
import { StoryLayer } from './StoryLayer'
import { useSession } from './useSession'
import { hasWebGL } from './Walk'

/** `?world=3d` in the address, and a browser that can draw it. */
export const WORLD_3D = typeof location !== 'undefined' && new URLSearchParams(location.search).get('world') === '3d' && hasWebGL()

function finalSummary(events: readonly SimEvent[]): Summary | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!
    if (e.type === 'scenario_ended') return e.payload.summary
  }
  return undefined
}

export interface WorldProps {
  active: Active
  config: Config
  onExit: () => void
}

export function World({ active, config, onExit }: WorldProps) {
  const { session, roomCode, daily } = active
  const { state, events, players, me } = useSession(session)
  const [classic, setClassic] = useState(false)
  const [cutscene, setCutscene] = useState(false)
  /** The arrival cutscene has played: CAPCOM moves on from the mission call to the design. */
  const [arrived, setArrived] = useState(false)
  const phase = state.metrics.phase
  const ended = state.status === 'ended'

  // "What would have fixed it": the flown mission rerun with every single change, once, when it ends.
  const fixes = useMemo(
    () => (ended ? whatIf({ ...withCards(config), seed: daily?.seed ?? config.seed }, getDatasets(config.datasets), state.params, choicesOf(events)) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ended],
  )
  const summary = ended ? finalSummary(events) : undefined
  const debrief = useMemo((): Debrief | undefined => {
    if (!ended) return undefined
    const best = fixes?.[0]
    const score = Number(summary?.score ?? 0)
    return {
      grade: String(summary?.grade ?? '?'),
      score,
      outcome: outcomeLabel(String(summary?.outcome ?? '')),
      fix:
        best && best.score > score
          ? {
              change: best.change,
              run: () => {
                session.send({ type: 'reset', payload: {} })
                for (const [key, value] of Object.entries(best.params)) session.send({ type: 'set_param', payload: { key, value } })
              },
            }
          : undefined,
      again: () => session.send({ type: 'reset', payload: {} }),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, fixes])

  const flying = !ended && phase !== 'design'
  if (classic || flying) {
    // Flight stays 2D until the walk-in spacecraft (ui/scene3d/interior) lands.
    return <GameScreen session={session} config={config} onExit={onExit} roomCode={roomCode} daily={daily} />
  }

  const onCutscene = (playing: boolean) => {
    setCutscene(playing)
    if (!playing) setArrived(true)
  }
  return (
    <div className="app-world game-theme" data-theme="dark">
      <MissionControl
        className="app-world-view"
        state={state}
        send={session.send}
        players={players}
        me={me}
        title={config.title}
        debrief={debrief}
        enabled={!cutscene}
        onFailed={() => setClassic(true)}
      />
      <div className="app-world-bar">
        <SoundToggle />
        <button type="button" className="game-button app-small" onClick={() => setClassic(true)}>
          Classic view
        </button>
        <button type="button" className="game-button app-small" onClick={onExit}>
          Main menu
        </button>
      </div>
      <StoryLayer
        screen={ended ? 'flight' : arrived ? 'design' : 'briefing'}
        events={ended ? events : undefined}
        scenarioId={state.scenario_id}
        onCutscene={onCutscene}
      />
    </div>
  )
}
