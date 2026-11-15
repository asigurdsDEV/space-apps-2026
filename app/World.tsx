// The game (decision 007): played first-person in 3D. `?world=classic`, the Classic view button or a
// browser without WebGL get the 2D screens instead.
// Design phase: mission control you walk around in (ui/hangar). After launch: the launch sequence
// (ui/scene3d), then you fly the mission from inside the walk-in spacecraft (ui/interior). Mission
// over: back to mission control for the debrief. Same Session and Commands as the 2D screens, so
// co-op works unchanged.

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { getDatasets } from '../data'
import type { Config, SimEvent, SimState, Summary } from '../shared'
import { canSend, ROLES } from '../shared'
import { choicesOf, pendingDecision, whatIf } from '../sim'
import { playSound } from '../ui/audio'
import { savePersonalBest } from '../ui/leaderboard/storage'
import { stars } from '../ui/mission'
import { MissionControl, type Debrief } from '../ui/hangar'
import { SpacecraftRoom } from '../ui/interior'
import { LaunchView as SceneLaunchView } from '../ui/scene3d'
import { outcomeLabel } from '../ui/mission/format'
import { GameScreen, withCards, type Active } from './App'
import { StoryLayer } from './StoryLayer'
import { fitCallout } from '../ui/story'
import { useSession } from './useSession'
import { hasWebGL } from './Walk'
import { WorldMenu } from './WorldMenu'

/** First-person 3D, unless the address says `?world=classic` or the browser can't draw it. */
export const WORLD_3D = typeof location !== 'undefined' && new URLSearchParams(location.search).get('world') !== 'classic' && hasWebGL()


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

const LaunchView = SceneLaunchView as ComponentType<{ state: SimState; onDone: () => void; className?: string }>
const Training = lazy(() => import('./Training'))

export function World({ active, config, onExit }: WorldProps) {
  const { session, roomCode, daily } = active
  const { state, events, players, me, paused, speed } = useSession(session)
  const [classic, setClassic] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [training, setTraining] = useState(false)
  const [cutscene, setCutscene] = useState(false)
  // CAPCOM answers every design choice in the hall (ui/story fitCallout).
  const [callout, setCallout] = useState<{ key: string; text: string } | null>(null)
  const before = useRef(state)
  useEffect(() => {
    const prev = before.current
    before.current = state
    if (prev === state || state.metrics.phase !== 'design' || prev.metrics.phase !== 'design') return
    const text = fitCallout(prev, state)
    if (text) setCallout({ key: `${state.tick}:${text}`, text })
  }, [state])
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
  const bonusGoal = typeof config.params.bonus_goal === 'string' ? config.params.bonus_goal : undefined
  useEffect(() => {
    if (summary && typeof summary.score === 'number') {
      savePersonalBest(state.scenario_id, summary.score, state.params, {
        dailySeed: daily?.seed,
        stars: stars(summary, bonusGoal).filter((star) => star.earned).length,
      })
    }
  }, [summary, state.scenario_id, state.params, daily?.seed, bonusGoal])
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

  // Cutscenes and the launch hold the mission clock in solo, so nothing happens unseen (as the 2D flight does).
  // Online the clock is shared by the whole crew, so it keeps running there.
  const heldClock = useRef(false)
  /** A late joiner skips the launch sequence. */
  const [launched, setLaunched] = useState(() => session.getSnapshot().state.t_s > 86400)
  const canTrain = flying && launched && !cutscene && !pendingDecision(state)
  const hold = !classic && (menuOpen || cutscene || (training && canTrain) || (flying && !launched))
  useEffect(() => {
    if (roomCode !== null) return
    if (hold && !session.getSnapshot().paused) {
      heldClock.current = true
      session.send({ type: 'pause', payload: {} })
    } else if (!hold && heldClock.current) {
      heldClock.current = false
      session.send({ type: 'resume', payload: {} })
    }
  }, [hold, roomCode, session])
  useEffect(() => {
    if (!flying) setLaunched(session.getSnapshot().state.t_s > 86400)
    else if (!launched) playSound('launch')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying])

  useEffect(() => {
    if (training && !canTrain) setTraining(false)
  }, [training, canTrain])

  if (classic) return <GameScreen session={session} config={config} onExit={onExit} roomCode={roomCode} daily={daily} skipLaunch={launched} />

  const onCutscene = (playing: boolean) => {
    setCutscene(playing)
    if (playing) setMenuOpen(false)
    if (!playing) setArrived(true)
  }
  const menu = (
    <WorldMenu open={menuOpen} disabled={cutscene} onOpenChange={setMenuOpen}
      online={roomCode !== null}
      onTraining={canTrain ? () => { setMenuOpen(false); setTraining(true) } : undefined}
      onClassic={() => { setMenuOpen(false); setClassic(true) }}
      onExit={onExit} />
  )
  const enabled = !cutscene && !menuOpen

  if (flying && !launched) {
    return (
      <LaunchView
        className="app-world-launch"
        state={state}
        onDone={() => {
          setLaunched(true)
        }}
      />
    )
  }

  if (training && canTrain) {
    return (
      <div className="app-world app-world-training game-theme" data-theme="dark">
        <Suspense fallback={<p className="app-training-loading" aria-busy="true">Loading flight training…</p>}>
          <Training state={state} onClose={() => setTraining(false)} />
        </Suspense>
      </div>
    )
  }

  if (flying) {
    const decision = pendingDecision(state)
    const console = ROLES.find((role) => role === decision?.console) ?? null
    const may = canSend(me.role, { type: 'resolve_decision', payload: { decision_id: '', option_id: '' } }, players.map((p) => p.role), console)
    const holder = players.find((p) => p.role === console)
    return (
      <div className={`app-world game-theme${menuOpen ? ' is-menu-open' : ''}`} data-theme="dark">
        <SpacecraftRoom
          className="app-world-view"
          state={state}
          send={session.send}
          paused={paused}
          speed={speed}
          decision={decision}
          decisionBlocked={may ? undefined : `${holder?.name ?? 'Another player'}'s call`}
          enabled={enabled}
          onFailed={() => setClassic(true)}
        />
        {menu}
        <StoryLayer immersive screen="flight" events={events} scenarioId={state.scenario_id} onCutscene={onCutscene} shown={['launch']} />
      </div>
    )
  }

  return (
    <div className={`app-world game-theme${menuOpen ? ' is-menu-open' : ''}`} data-theme="dark">
      <MissionControl
        className="app-world-view"
        state={state}
        send={session.send}
        players={players}
        me={me}
        title={config.title}
        debrief={debrief}
        enabled={enabled}
        onFailed={() => setClassic(true)}
      />
      {menu}
      <StoryLayer
        immersive
        screen={ended ? 'flight' : arrived ? 'design' : 'briefing'}
        events={ended ? events : undefined}
        scenarioId={state.scenario_id}
        onCutscene={onCutscene}
        callout={ended ? null : callout}
      />
    </div>
  )
}
