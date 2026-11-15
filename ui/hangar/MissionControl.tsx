// Mission control you play in (decision 007): walk with WASD, look with the mouse, E fits a part,
// presses launch, tries the fix at the debrief. Sends the same Commands as the 2D builder.
// Loaded lazily from index.tsx so three.js stays out of the first download.

import { useEffect, useMemo, useRef, useState } from 'react'
import { playSound } from '../audio'
import { budgetBars, commandAccess, formatValue, slotAccess } from '../builder/model'
import { FpsPrompt } from '../fps/Prompt'
import { partHelp } from '../fps/help'
import type { Interactable } from '../fps/model'
import { poll } from '../gonogo'
import { sceneSpec } from '../scene3d/model'
import type { Command, Player, SimState } from '../../shared'
import { createControlRoom, type ControlRoom } from './control'
import { interactables, obstacles, paramOf, racks, type Debrief } from './layout'

export interface MissionControlProps {
  state: SimState
  send: (command: Command) => void
  /** Co-op: who holds which role, and this player. */
  players?: readonly Player[]
  me?: Player
  title: string
  /** After the flight: the grade on the wall, "Design again" at the launch button, the fix at the stand. */
  debrief?: Debrief
  /** False during cutscenes and pop-outs: no walking, mouse released. */
  enabled?: boolean
  /** No WebGL: the app shows the classic screens instead. */
  onFailed?: () => void
  className?: string
}

const NO_PLAYERS: readonly Player[] = []
const media = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches

function lengthText(days: unknown): string {
  if (typeof days !== 'number') return '—'
  return days >= 330 ? `${Math.round(days / 365)} year${Math.round(days / 365) === 1 ? '' : 's'}` : `${Math.round(days)} days`
}

export function MissionControl({ state, send, players = NO_PLAYERS, me, title, debrief, enabled = true, onFailed, className }: MissionControlProps) {
  const host = useRef<HTMLDivElement>(null)
  const room = useRef<ControlRoom | null>(null)
  const [failed, setFailed] = useState(false)
  const [aimed, setAimed] = useState<Interactable>()
  const [locked, setLocked] = useState(false)
  const coop = players.length > 1
  const who = useRef({ players, me, coop })
  who.current = { players, me, coop }

  /** Co-op only: why this player can't use it ("Sam's call"), the same rule the host enforces. */
  const blocked = (it: Interactable): string | undefined => {
    const { players: ps, me: m, coop: c } = who.current
    if (!c) return undefined
    const key = paramOf(it.id)
    const access = key ? slotAccess(key, ps, m) : it.id === 'launch' ? commandAccess({ type: 'launch', payload: {} }, ps, m) : null
    if (!access || access.canEdit) return undefined
    return `${access.holder?.name ?? 'Another player'}'s call`
  }

  useEffect(() => {
    try {
      room.current = createControlRoom(host.current!, {
        reducedMotion: media('(prefers-reduced-motion: reduce)'),
        onAim: setAimed,
        onLock: setLocked,
        blocked,
      })
    } catch {
      setFailed(true)
      onFailed?.()
    }
    return () => {
      room.current?.dispose()
      room.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rackList = useMemo(() => racks(state), [state.entities, state.params])
  const calls = useMemo(() => poll(state.issues), [state.issues])
  const walls = useMemo(() => obstacles(rackList), [rackList])
  const sendWithSound = useRef(send)
  sendWithSound.current = (command: Command) => {
    playSound('click')
    send(command)
  }

  useEffect(() => {
    const r = room.current
    if (!r) return
    const m = state.metrics
    r.show({
      title,
      numbers: [
        ['Budget', typeof m.budget_usd === 'number' ? formatValue(m.budget_usd, 'USD') : '—'],
        ['Science goal', typeof m.science_goal === 'number' ? `${Math.round(m.science_goal)} pts` : '—'],
        ['Mission', lengthText(m.mission_days)],
      ],
      bars: budgetBars(m),
      calls,
      racks: rackList,
      craft: sceneSpec(state).craft,
      debrief: debrief && { grade: debrief.grade, score: debrief.score, outcome: debrief.outcome, fix: debrief.fix?.change },
    })
    const launchBlocked = calls.some((c) => c.call === 'no-go') ? 'A console says NO-GO' : undefined
    r.fps.setPlace(interactables(rackList, { send: (c) => sendWithSound.current(c), launchBlocked, debrief }), walls)
  }, [state, rackList, calls, walls, title, debrief])

  useEffect(() => room.current?.setActive(enabled), [enabled])

  const part = aimed?.id.startsWith('rack:') ? state.entities.find((e) => e.id === aimed.id.split(':')[2]) : undefined
  const help = partHelp(part) ?? (aimed?.id === 'launch'
    ? { title: 'Launch mission', text: 'Check all four consoles. A red NO-GO blocks launch; warnings may still reduce the science you bring home.' }
    : aimed?.id === 'fix' ? { title: 'Try the fix', text: 'Try the best single change on a fresh design. Your finished mission record is kept.' }
    : aimed?.id === 'again' ? { title: 'Design again', text: 'Return to the parts racks and build another mission.' } : undefined)

  return (
    <div className={`mc${className ? ` ${className}` : ''}`}>
      <div ref={host} className="mc-canvas" role="application" aria-label="Mission control. W A S D to walk, arrow keys or mouse to look, E to use what you face." tabIndex={0} />
      {failed ? (
        <p className="mc-fallback">This view needs WebGL, which is off in this browser.</p>
      ) : (
        enabled && <FpsPrompt aimed={aimed} blocked={aimed && blocked(aimed)} locked={locked} help={help}
          objective={debrief ? 'Read the debrief · Try the fix at the spacecraft stand' : 'Fit parts at the racks · Check GO / NO-GO · Walk to Launch'} />
      )}
    </div>
  )
}
