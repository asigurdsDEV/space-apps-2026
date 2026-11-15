// The walk-in spacecraft (decision 007): a full-size working model of the player's own spacecraft in
// the operations room ("digital twin"), walked into after launch. Pure: no three.js, so it is cheap to
// test. control.ts draws it; SpacecraftRoom.tsx wires it to the game.
//
// Seen from above (you start at the back, facing the window):
//
//   z=-3    [        WINDOW: where your spacecraft is        ]
//   z=-2.1  [ DASHBOARD: gauges · time lever ]
//   x=-4    power  battery                    radio  storage   x=+4
//   z=+3    [ instruments along the back wall ]

import type { Interactable, Obstacle, Vec3 } from '../fps/model'
import { parseIds } from '../builder/model'
import type { Command, Decision, Entity, Metrics, Role, SimState } from '../../shared'

export const ROOM = { min: [-4, 0, -3] as Vec3, max: [4, 3.2, 3] as Vec3 }
export const START: { pos: Vec3; yaw: number } = { pos: [0, 0, 1.6], yaw: 0 }
export const WINDOW = { x: 0, y: 1.9, w: 5, h: 1.6 }
export const DASH = { z: -2.15, w: 4.4, depth: 0.6, top: 0.95 }
export const SPEEDS = [1, 5, 20, 60] as const

export type ModuleKey = 'solar' | 'battery' | 'comms' | 'storage' | 'bus' | `instrument:${string}`

export interface Module {
  key: ModuleKey
  /** Short name on its plate, ≤ 3 words. */
  name: string
  part?: Entity
  /** Where the module stands (floor), and the direction it faces (towards the middle of the room). */
  at: Vec3
  face: [number, number]
}

const find = (entities: readonly Entity[], kind: string, id: unknown) => (typeof id === 'string' ? entities.find((e) => e.kind === kind && e.id === id) : undefined)

/** Every module of this spacecraft, on its wall. */
export function modules(state: Pick<SimState, 'entities' | 'params'>): Module[] {
  const { entities, params } = state
  const out: Module[] = [
    { key: 'solar', name: 'Power', part: find(entities, 'power_system', params.solar), at: [-3.5, 0, -0.9], face: [1, 0] },
    { key: 'battery', name: 'Battery', part: find(entities, 'power_system', params.battery), at: [-3.5, 0, 1.2], face: [1, 0] },
    { key: 'comms', name: 'Radio', part: find(entities, 'comms_system', params.comms), at: [3.5, 0, -0.9], face: [-1, 0] },
    { key: 'storage', name: 'Data storage', at: [3.5, 0, 1.2], face: [-1, 0] },
  ]
  const instruments = parseIds(params.instruments).map((id) => find(entities, 'instrument', id)).filter((e): e is Entity => !!e)
  const n = instruments.length
  instruments.forEach((part, i) => {
    const x = n === 1 ? 0 : -2.4 + (4.8 * i) / (n - 1)
    out.push({ key: `instrument:${part.id}`, name: 'Instrument', part, at: [x, 0, 2.5], face: [0, -1] })
  })
  return out
}

/** The module an anomaly card's console points at: where its choices appear. */
export function moduleFor(console: string, list: readonly Module[]): Module | undefined {
  const role = console as Role
  if (role === 'spacecraft') return list.find((m) => m.key === 'solar')
  if (role === 'comms-resources') return list.find((m) => m.key === 'comms')
  if (role === 'science') return list.find((m) => m.key.startsWith('instrument:')) ?? list.find((m) => m.key === 'storage')
  return undefined // mission planning: mid-room
}

/** Where the choice buttons for a card stand: in front of its module, or (mission planning) floating mid-room in front of the dashboard. */
export function choiceSpots(decision: Decision, list: readonly Module[]): { at: Vec3; along: [number, number] }[] {
  const m = moduleFor(decision.console, list)
  const n = decision.options.length
  return decision.options.map((_, i) => {
    const off = (i - (n - 1) / 2) * 0.45
    if (!m) return { at: [1.5 + off, 1.45, -1.1] as Vec3, along: [1, 0] as [number, number] }
    const along: [number, number] = [-m.face[1], m.face[0]]
    return { at: [m.at[0] + m.face[0] * 0.75 + along[0] * off, 1.2, m.at[2] + m.face[1] * 0.75 + along[1] * off] as Vec3, along }
  })
}

/** Keep the header physically above the choice planes, never coplanar with their top edges. */
export function choiceTitleAt(spots: readonly { at: Vec3 }[]): Vec3 {
  const count = Math.max(1, spots.length)
  return [
    spots.reduce((sum, s) => sum + s.at[0], 0) / count,
    Math.max(1.2, ...spots.map((s) => s.at[1])) + 0.39,
    spots.reduce((sum, s) => sum + s.at[2], 0) / count,
  ]
}

export interface Gauge {
  label: string
  value: string
  /** 0..1 filled. */
  ratio: number
  bad: boolean
}

const n = (m: Metrics, k: string) => (typeof m[k] === 'number' ? (m[k] as number) : 0)
const money = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}k`)

/** The dashboard: five gauges, numbers not sentences. */
export function gauges(m: Metrics): Gauge[] {
  const day = n(m, 'mission_day')
  const days = n(m, 'mission_days') || 1
  const sci = n(m, 'science_score')
  const goal = n(m, 'science_goal') || 1
  const stored = n(m, 'data_stored_gb')
  const storage = n(m, 'storage_gb') || 1
  const spent = n(m, 'cost_spent_usd')
  const budget = n(m, 'budget_usd') || 1
  const lost = n(m, 'data_lost_gb')
  return [
    { label: 'Day', value: `${Math.floor(day)} / ${Math.round(days)}`, ratio: day / days, bad: false },
    { label: 'Science home', value: `${sci.toFixed(1)} / ${Math.round(goal)} pts`, ratio: sci / goal, bad: false },
    { label: 'Storage', value: `${stored.toFixed(1)} / ${storage.toFixed(0)} GB`, ratio: stored / storage, bad: stored / storage > 0.9 },
    { label: 'Data lost', value: `${lost.toFixed(1)} GB`, ratio: Math.min(1, lost / Math.max(storage, 1)), bad: lost > 0 },
    { label: 'Money spent', value: `${money(spent)} / ${money(budget)}`, ratio: spent / budget, bad: spent > budget },
  ].map((g) => ({ ...g, ratio: Math.max(0, Math.min(1, g.ratio)) }))
}

/** At most `words` words. */
export const words = (text: string, max: number) => text.split(/\s+/).slice(0, max).join(' ').replace(/[,;:.–-]+$/, '')

/** Room walls and module pedestals, so the player walks around them. */
export function obstacles(list: readonly Module[]): Obstacle[] {
  const [x0, , z0] = ROOM.min
  const [x1, , z1] = ROOM.max
  const t = 0.2
  return [
    { min: [x0 - t, 0, z0], max: [x0, 3.2, z1] },
    { min: [x1, 0, z0], max: [x1 + t, 3.2, z1] },
    { min: [x0, 0, z0 - t], max: [x1, 3.2, z0] },
    { min: [x0, 0, z1], max: [x1, 3.2, z1 + t] },
    { min: [-DASH.w / 2, 0, DASH.z - DASH.depth / 2], max: [DASH.w / 2, DASH.top, DASH.z + DASH.depth / 2] },
    ...list.map((m): Obstacle => ({ min: [m.at[0] - 0.35, 0, m.at[2] - 0.35], max: [m.at[0] + 0.35, 1, m.at[2] + 0.35] })),
  ]
}

export interface FlightOptions {
  send: (command: Command) => void
  paused: boolean
  speed: number
  /** The anomaly card waiting for an answer, if any. */
  decision: Decision | null
  /** Why this player can't answer it (co-op: another role holds that console). */
  decisionBlocked?: string
}

/** What E does in the spacecraft: the time lever, and the anomaly card's choices when one is waiting. */
export function interactables(list: readonly Module[], { send, paused, speed, decision, decisionBlocked }: FlightOptions): Interactable[] {
  const next = SPEEDS.find((s) => s > speed) ?? SPEEDS[0]
  const out: Interactable[] = [
    { id: 'pause', at: [1.4, 1.1, DASH.z + 0.05], label: paused ? 'Resume time' : 'Pause time', disabled: decision ? 'Answer the alarm first' : undefined, use: () => send({ type: paused ? 'resume' : 'pause', payload: {} }) },
    { id: 'speed', at: [1.9, 1.1, DASH.z + 0.05], label: `Speed ${next}×`, use: () => send({ type: 'set_speed', payload: { multiplier: next } }) },
  ]
  if (decision) {
    const spots = choiceSpots(decision, list)
    decision.options.forEach((o, i) =>
      out.push({
        id: `option:${decision.decision_id}:${o.id}`,
        at: spots[i]!.at,
        reach: 2.4,
        label: words(o.label, 4),
        disabled: decisionBlocked,
        use: () => send({ type: 'resolve_decision', payload: { decision_id: decision.decision_id, option_id: o.id } }),
      }),
    )
  }
  return out
}
