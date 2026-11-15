// The walk-in spacecraft (decision 007): fly the mission from inside a full-size model of your own
// spacecraft. Gauges on the dashboard, time on the lever, anomaly cards answered at the module that
// raised the alarm. Same Commands as the 2D mission screen. Loaded lazily from index.tsx.

import { useEffect, useMemo, useRef, useState } from 'react'
import { playSound } from '../audio'
import { caution, useAmbience } from '../audio/ambience'
import { FpsPrompt } from '../fps/Prompt'
import { flightHelp } from '../fps/help'
import type { Interactable } from '../fps/model'
import { sceneSpec } from '../scene3d/model'
import type { Command, Decision, SimState } from '../../shared'
import { createCabin, type Cabin } from './control'
import { gauges, interactables, modules, obstacles, START } from './layout'
import type { CrewPose } from '../crew/crew'

export interface SpacecraftRoomProps {
  state: SimState
  send: (command: Command) => void
  paused: boolean
  speed: number
  /** The anomaly card waiting for an answer (sim `pendingDecision(state)`), if any. */
  decision: Decision | null
  /** Co-op: why this player can't answer it ("Sam's call"); undefined if they may. */
  decisionBlocked?: string
  /** False during cutscenes: no walking, mouse released. */
  enabled?: boolean
  onFailed?: () => void
  className?: string
  /** Co-op: send where this player is standing. */
  reportPose?: (pose: { x: number; z: number; yaw: number }) => void
  /** Co-op: the other players, so they can be drawn. */
  subscribeCrew?: (listener: (crew: readonly CrewPose[]) => void) => () => void
  /** Which crew member this browser is (0 is the host). Spreads spawn points so bodies do not stack. */
  seat?: number
  /** Earth or Moon: E on the gold floor hatch opens the surface. */
  onProbe?: () => void
}

const media = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches

export function SpacecraftRoom({ state, send, paused, speed, decision, decisionBlocked, enabled = true, onFailed, className, reportPose, subscribeCrew, seat = 0, onProbe }: SpacecraftRoomProps) {
  const host = useRef<HTMLDivElement>(null)
  const cabin = useRef<Cabin | null>(null)
  const [failed, setFailed] = useState(false)
  const [aimed, setAimed] = useState<Interactable>()
  const [locked, setLocked] = useState(false)
  useAmbience('cabin')

  const poseRef = useRef(reportPose)
  const crewRef = useRef(subscribeCrew)
  poseRef.current = reportPose
  crewRef.current = subscribeCrew

  useEffect(() => {
    let stopCrew: (() => void) | undefined
    try {
      cabin.current = createCabin(host.current!, {
        reducedMotion: media('(prefers-reduced-motion: reduce)'),
        onAim: setAimed,
        onLock: setLocked,
        onPose: (pose) => poseRef.current?.(pose),
      })
      if (seat > 0) cabin.current.fps.teleport([Math.min(seat, 3) * 0.7, 0, START.pos[2]], START.yaw)
      stopCrew = crewRef.current?.((members) => cabin.current?.setCrew(members))
    } catch {
      setFailed(true)
      onFailed?.()
    }
    return () => {
      stopCrew?.()
      cabin.current?.dispose()
      cabin.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const list = useMemo(() => modules(state), [state.entities, state.params])
  const walls = useMemo(() => obstacles(list), [list])
  const craft = useMemo(() => sceneSpec(state).craft, [state.entities, state.params])
  const body = useMemo(() => {
    const orbit = state.entities.find((e) => e.kind === 'orbit' && e.id === state.params.orbit)
    return String(orbit?.props.central_body ?? 'earth')
  }, [state.entities, state.params])

  // An alarm: a sound once per card.
  const lastCard = useRef<string | null>(null)
  useEffect(() => {
    if (decision && decision.decision_id !== lastCard.current) caution()
    lastCard.current = decision?.decision_id ?? null
  }, [decision])

  useEffect(() => {
    const c = cabin.current
    if (!c) return
    const m = state.metrics
    const storage = typeof m.storage_gb === 'number' && m.storage_gb > 0 ? Math.min(1, Number(m.data_stored_gb ?? 0) / m.storage_gb) : 0
    c.show({ modules: list, gauges: gauges(m), craft, body, day: Number(m.mission_day ?? 0), paused, speed, decision, storage })
    const sendWithSound = (command: Command) => {
      playSound('click')
      send(command)
    }
    c.fps.setPlace(interactables(list, { send: sendWithSound, paused, speed, decision, decisionBlocked, onProbe }), walls)
  }, [state, list, walls, craft, body, paused, speed, decision, decisionBlocked, send, onProbe])

  useEffect(() => cabin.current?.setActive(enabled), [enabled])

  return (
    <div className={`sc${className ? ` ${className}` : ''}`}>
      <div ref={host} className="sc-canvas" role="application" aria-label="Your spacecraft. W A S D to walk, arrow keys or mouse to look, E to use what you face." tabIndex={0} />
      {failed ? <p className="sc-fallback">This view needs WebGL, which is off in this browser.</p> : enabled && <FpsPrompt aimed={aimed} locked={locked}
        help={flightHelp(aimed?.id, decision)} objective={decision ? 'Alarm · Walk to the red choice panels · Look to inspect · E to choose' : onProbe ? 'Gold hatch · E to survey the ground' : 'Read the gauges · E on the clock or speed control'} />}
    </div>
  )
}
