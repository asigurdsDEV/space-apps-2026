// Mission control you play in (decision 007): walk with WASD, look with the mouse, E opens a hologram
// station's menu, fits a part from it, presses launch, tries the fix at the debrief. Sends the same
// Commands as the 2D builder.
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
import { interactables, menu, MENU_RANGE, obstacles, paramOf, STAND, START, stations, type Debrief } from './layout'
import type { CrewPose } from '../crew/crew'

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
  /** Co-op: send where this player is standing. */
  reportPose?: (pose: { x: number; z: number; yaw: number }) => void
  /** Co-op: the other players, so they can be drawn. */
  subscribeCrew?: (listener: (crew: readonly CrewPose[]) => void) => () => void
}

const NO_PLAYERS: readonly Player[] = []
const media = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches

function lengthText(days: unknown): string {
  if (typeof days !== 'number') return '—'
  return days >= 330 ? `${Math.round(days / 365)} year${Math.round(days / 365) === 1 ? '' : 's'}` : `${Math.round(days)} days`
}

export function MissionControl({ state, send, players = NO_PLAYERS, me, title, debrief, enabled = true, onFailed, className, reportPose, subscribeCrew }: MissionControlProps) {
  const host = useRef<HTMLDivElement>(null)
  const room = useRef<ControlRoom | null>(null)
  const [failed, setFailed] = useState(false)
  const [aimed, setAimed] = useState<Interactable>()
  const [locked, setLocked] = useState(false)
  /** The station whose menu is open, and where the player stood when they opened it (the cards face that spot). */
  const [open, setOpen] = useState<{ key: string; from: [number, number] } | null>(null)
  const coop = players.length > 1
  const who = useRef({ players, me, coop })
  who.current = { players, me, coop }
  const poseRef = useRef(reportPose)
  const crewRef = useRef(subscribeCrew)
  poseRef.current = reportPose
  crewRef.current = subscribeCrew

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
    let stopCrew: (() => void) | undefined
    try {
      room.current = createControlRoom(host.current!, {
        reducedMotion: media('(prefers-reduced-motion: reduce)'),
        onAim: setAimed,
        onLock: setLocked,
        blocked,
        onPose: (pose) => {
          poseRef.current?.(pose)
          const { at } = menuRef.current
          if (at && Math.hypot(pose.x - at[0], pose.z - at[2]) > MENU_RANGE) setOpen(null) // walked away
        },
      })
      const mine = who.current.players.findIndex((p) => p.player_id === who.current.me?.player_id)
      if (mine > 0) room.current.fps.teleport([mine * 1.15, 0, START.pos[2]], START.yaw)
      stopCrew = crewRef.current?.((members) => room.current?.setCrew(members))
    } catch {
      setFailed(true)
      onFailed?.()
    }
    return () => {
      stopCrew?.()
      room.current?.dispose()
      room.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stationList = useMemo(() => stations(state), [state.entities, state.params])
  const calls = useMemo(() => poll(state.issues), [state.issues])
  const walls = useMemo(() => obstacles(stationList), [stationList])
  const openStation = debrief ? undefined : stationList.find((s) => s.key === open?.key)
  const openMenu = useMemo(() => (openStation && open ? menu(openStation, open.from, state) : undefined), [openStation, open, state.entities, state.params])
  // Cards answer E once the menu has flown open (control.ts takes 0.45 s), at once under reduced motion.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    setArmed(false)
    if (!open) return
    const timer = setTimeout(() => setArmed(true), media('(prefers-reduced-motion: reduce)') ? 0 : 450)
    return () => clearTimeout(timer)
  }, [open?.key])
  const menuRef = useRef<{ at?: readonly number[] }>({})
  menuRef.current = { at: openStation?.at }
  const toggle = (key: string) => {
    playSound('click')
    const feet = room.current?.fps.feet()
    setOpen((now) => (now?.key === key || !feet ? null : { key, from: [feet.x, feet.z] }))
  }
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
      stations: stationList,
      menu: openMenu,
      craft: sceneSpec(state).craft,
      debrief: debrief && { grade: debrief.grade, score: debrief.score, outcome: debrief.outcome, fix: debrief.fix?.change },
    })
    const launchBlocked = calls.some((c) => c.call === 'no-go') ? 'A console says NO-GO' : undefined
    r.fps.setPlace(interactables(stationList, { send: (c) => sendWithSound.current(c), launchBlocked, debrief, menu: openMenu, armed, toggle }), walls)
    // Dev builds only: QA reads the stations and the open menu from the console (`__hall()`), next to `__fps`.
    if (import.meta.env.DEV) Object.assign(window, { __hall: () => ({ centre: [STAND[0], STAND[2]], stations: stationList.map((s) => ({ key: s.key, at: s.at, picked: s.picked })), open: openMenu?.key ?? null, cards: (openMenu?.cards ?? []).map((c) => ({ id: c.id, at: c.at, picked: c.picked })), params: state.params }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stationList, calls, walls, title, debrief, openMenu, armed])

  useEffect(() => room.current?.setActive(enabled), [enabled])

  const part = aimed?.id.startsWith('rack:') ? state.entities.find((e) => e.id === aimed.id.split(':')[2]) : undefined
  const aimedStation = aimed?.id.startsWith('station:') ? stationList.find((s) => `station:${s.key}` === aimed.id) : undefined
  const help = partHelp(part) ?? (aimedStation ? { title: aimedStation.slot.label, text: aimedStation.slot.hint ?? 'Open the menu to see the parts on offer.' }
    : aimed?.id === 'launch'
    ? { title: 'Launch mission', text: 'Check all four consoles. A red NO-GO blocks launch; warnings may still reduce the science you bring home.' }
    : aimed?.id === 'fix' ? { title: 'Try the fix', text: 'Try the best single change on a fresh design. Your finished mission record is kept.' }
    : aimed?.id === 'again' ? { title: 'Design again', text: 'Return to the hologram stations and build another mission.' } : undefined)

  return (
    <div className={`mc${className ? ` ${className}` : ''}`}>
      <div ref={host} className="mc-canvas" role="application" aria-label="Mission control. W A S D to walk, arrow keys or mouse to look, E to use what you face." tabIndex={0} />
      {failed ? (
        <p className="mc-fallback">This view needs WebGL, which is off in this browser.</p>
      ) : (
        enabled && <FpsPrompt aimed={aimed} blocked={aimed && blocked(aimed)} locked={locked} help={help}
          objective={debrief ? 'Read the debrief · Try the fix at the spacecraft' : 'Open a hologram station to fit parts · Check GO / NO-GO · Walk to Launch'} />
      )}
    </div>
  )
}
