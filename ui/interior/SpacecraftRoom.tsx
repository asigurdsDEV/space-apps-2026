// The walk-in spacecraft (decision 007): fly the mission from inside a full-size model of your own
// spacecraft. Gauges on the dashboard, time on the lever, anomaly cards answered at the module that
// raised the alarm. Same Commands as the 2D mission screen. Loaded lazily from index.tsx.

import { useEffect, useMemo, useRef, useState } from 'react'
import { playSound } from '../audio'
import { FpsPrompt } from '../fps/Prompt'
import { flightHelp } from '../fps/help'
import type { Interactable } from '../fps/model'
import { sceneSpec } from '../scene3d/model'
import type { Command, Decision, SimState } from '../../shared'
import { createCabin, type Cabin } from './control'
import { gauges, interactables, modules, obstacles } from './layout'

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
}

const media = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches

export function SpacecraftRoom({ state, send, paused, speed, decision, decisionBlocked, enabled = true, onFailed, className }: SpacecraftRoomProps) {
  const host = useRef<HTMLDivElement>(null)
  const cabin = useRef<Cabin | null>(null)
  const [failed, setFailed] = useState(false)
  const [aimed, setAimed] = useState<Interactable>()
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    try {
      cabin.current = createCabin(host.current!, { reducedMotion: media('(prefers-reduced-motion: reduce)'), onAim: setAimed, onLock: setLocked })
    } catch {
      setFailed(true)
      onFailed?.()
    }
    return () => {
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
    if (decision && decision.decision_id !== lastCard.current) playSound('no-go')
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
    c.fps.setPlace(interactables(list, { send: sendWithSound, paused, speed, decision, decisionBlocked }), walls)
  }, [state, list, walls, craft, body, paused, speed, decision, decisionBlocked, send])

  useEffect(() => cabin.current?.setActive(enabled), [enabled])

  return (
    <div className={`sc${className ? ` ${className}` : ''}`}>
      <div ref={host} className="sc-canvas" role="application" aria-label="Your spacecraft. W A S D to walk, arrow keys or mouse to look, E to use what you face." tabIndex={0} />
      {failed ? <p className="sc-fallback">This view needs WebGL, which is off in this browser.</p> : enabled && <FpsPrompt aimed={aimed} locked={locked}
        help={flightHelp(aimed?.id, decision)} objective={decision ? 'Alarm · Walk to the red choice panels · Look to inspect · E to choose' : 'Read the gauges · E on the clock or speed control'} />}
    </div>
  )
}
