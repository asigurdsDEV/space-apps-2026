// Mission control you play in (decision 007): where everything stands and what E does on it.
// Pure: no three.js, so it is cheap to test. control.ts draws it; MissionControl.tsx wires it up.
//
// The room, seen from above (x right, z towards you; you start at the bottom facing the call wall):
//
//   z=-12            [ MISSION CALL WALL ]   [ gauges ]
//   z=-8.5             desk desk desk desk
//   z=-6.5       o       (launch button)                  o = hologram station, one per slot, on a
//   z=-3      o        ( floating craft )        o            horseshoe around the craft; the centre
//               o                              o              line stays clear, so from the start you
//   z=1.4            o                    o                   see the craft, the launch button, the wall
//   z=4.5               you start here

import { DEFAULT_SLOTS, columnLabel, formatValue, parseIds, slotColumns, slotParts, toggleId, unitOf, type Slot } from '../builder/model'
import { REACH, type Interactable, type Obstacle, type Vec3 } from '../fps/model'
import type { Command, Entity, SimState } from '../../shared'

export const ROOM = { min: [-10, 0, -12] as Vec3, max: [10, 5, 6] as Vec3 }
export const START: { pos: Vec3; yaw: number } = { pos: [0, 0, 4.5], yaw: 0 }
/** Dead centre of the room: the craft floats here above its emitter. */
export const STAND: Vec3 = [0, 0, -3]
/** How high the middle of the floating craft is. */
export const CRAFT_Y = 2.3
export const LAUNCH: Vec3 = [0, 1.05, -6.5]
/** High on the back wall, so the console screens in front of it never cover its numbers. */
export const CALL_WALL = { x: 0, y: 3.3, w: 6, h: 3 }
export const GAUGES = { x: 6.6, y: 2.4, w: 5.2, h: 2.9 }
export const DESK_Z = -8.5
export const DESK_XS = [-2.4, -0.8, 0.8, 2.4] as const

/** The horseshoe of stations around the craft: its radius, and the angle between neighbours. It opens towards the desks and the launch button. */
const RING = 4.6
const RING_STEP = (34 * Math.PI) / 180
/** A station's emitter pedestal: half its width and its height, and how high its hologram floats. */
export const PEDESTAL = { r: 0.36, h: 0.6 }
export const HOLO_Y = 1.12
/** The menu: cards on an arc around the player, this far apart, on one or two rows. */
const CARD_GAP = 0.68
const CARD_ROWS = [2.04, 1.58] as const
const CARD_ROW = 1.74
/** Walk further than this from a station and its menu closes. */
export const MENU_RANGE = 3.6

/** A station's name: the slot's name in at most 2 words, in the order they stand around the craft (left to right). */
export const STATION_NAMES: Record<string, string> = {
  orbit: 'Orbit',
  launch_vehicle: 'Rocket',
  bus: 'Bus',
  instruments: 'Instruments',
  comms: 'Radio',
  solar: 'Power',
  battery: 'Battery',
}

/** At most 4 words: data's `short_label` when it has one, else the name without brackets. */
export function shortLabel(part: Pick<Entity, 'name' | 'props'>): string {
  const short = part.props.short_label
  if (typeof short === 'string' && short.trim()) return short.trim()
  return String(part.name ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ')
}

export interface Station {
  key: string
  name: string
  slot: Slot
  /** The middle of its hologram, above the pedestal. */
  at: Vec3
  parts: Entity[]
  /** The fitted part ids (several for a multi slot, none when nothing is fitted). */
  picked: string[]
}

/** One hologram station per slot the sim offers parts for, evenly spaced on the horseshoe. */
export function stations(state: Pick<SimState, 'entities' | 'params'>, slots: readonly Slot[] = DEFAULT_SLOTS): Station[] {
  const order = Object.keys(STATION_NAMES)
  const rank = (key: string) => (order.indexOf(key) + 1 || order.length + 1)
  const list = slots
    .map((slot) => ({ slot, parts: slotParts(state.entities, slot) }))
    .filter((s) => s.parts.length > 0)
    .sort((a, b) => rank(a.slot.key) - rank(b.slot.key))
  return list.map(({ slot, parts }, i): Station => {
    // Angle from "towards the player". Stations stand in mirrored pairs either side of the centre line, never on it
    // (it would hide the craft from the start); with an odd number the left side has one more, at the far end.
    const a = (i - Math.ceil(list.length / 2) + 0.5) * RING_STEP
    const ids = slot.multi ? parseIds(state.params[slot.key]) : [String(state.params[slot.key] ?? '')]
    return {
      key: slot.key,
      name: STATION_NAMES[slot.key] ?? slot.label,
      slot,
      at: [STAND[0] + Math.sin(a) * RING, HOLO_Y, STAND[2] + Math.cos(a) * RING],
      parts,
      picked: ids.filter((id) => parts.some((p) => p.id === id)),
    }
  })
}

export interface MenuCard {
  /** Its Interactable's id: `rack:<slot>:<part>`, as the racks' plates had. */
  id: string
  part: Entity
  at: Vec3
  /** Turn about y that makes the card face the player. */
  yaw: number
  picked: boolean
  /** At most two key numbers and the price: [label, value]. */
  stats: [string, string][]
  cost?: string
}

export interface Menu {
  key: string
  cards: MenuCard[]
}

/**
 * The open station's menu: one card per part on an arc around where the player stood (`from`: x, z) when
 * they opened it, so every card faces them and neighbours are a clear turn of the head apart.
 */
export function menu(station: Station, from: readonly [number, number], state: Pick<SimState, 'entities' | 'params'>): Menu {
  const dx = station.at[0] - from[0]
  const dz = station.at[2] - from[1]
  const r = Math.min(2.3, Math.max(1.7, Math.hypot(dx, dz) + 0.25))
  const mid = Math.atan2(dx, dz)
  const n = station.parts.length
  const rows = n > 3 ? 2 : 1
  const cols = Math.ceil(n / rows)
  const columns = slotColumns(station.slot, state).filter((c) => c !== 'cost_usd')
  const cards = station.parts.map((part, i): MenuCard => {
    const a = mid + ((cols - 1) / 2 - Math.floor(i / rows)) * (CARD_GAP / r)
    const at: Vec3 = [from[0] + Math.sin(a) * r, rows === 1 ? CARD_ROW : CARD_ROWS[i % rows]!, from[1] + Math.cos(a) * r]
    const stats = columns.flatMap((c): [string, string][] => {
      const v = part.props[c]
      const label = columnLabel(c)
      return typeof v === 'number' ? [[label.charAt(0).toUpperCase() + label.slice(1), formatValue(v, unitOf(c))]] : []
    })
    const cost = part.props.cost_usd
    return { id: `rack:${station.key}:${part.id}`, part, at, yaw: Math.atan2(from[0] - at[0], from[1] - at[2]), picked: station.picked.includes(part.id), stats: stats.slice(0, 2), cost: typeof cost === 'number' ? formatValue(cost, 'USD') : undefined }
  })
  return { key: station.key, cards }
}

/** Walls, the station pedestals, the craft's emitter, the desks and the launch pedestal. */
export function obstacles(stationList: readonly Station[]): Obstacle[] {
  const [x0, , z0] = ROOM.min
  const [x1, , z1] = ROOM.max
  const t = 0.2
  const box = (min: Vec3, max: Vec3): Obstacle => ({ min, max })
  return [
    box([x0 - t, 0, z0], [x0, 5, z1]),
    box([x1, 0, z0], [x1 + t, 5, z1]),
    box([x0, 0, z0 - t], [x1, 5, z0]),
    box([x0, 0, z1], [x1, 5, z1 + t]),
    // The beam under the craft: you walk round it, not through the spacecraft.
    box([STAND[0] - 1.1, 0, STAND[2] - 1.1], [STAND[0] + 1.1, 0.6, STAND[2] + 1.1]),
    box([LAUNCH[0] - 0.35, 0, LAUNCH[2] - 0.35], [LAUNCH[0] + 0.35, 1, LAUNCH[2] + 0.35]),
    ...DESK_XS.map((x) => box([x - 0.7, 0, DESK_Z - 0.4], [x + 0.7, 0.8, DESK_Z + 0.4])),
    ...stationList.map((s) => box([s.at[0] - PEDESTAL.r, 0, s.at[2] - PEDESTAL.r], [s.at[0] + PEDESTAL.r, PEDESTAL.h, s.at[2] + PEDESTAL.r])),
  ]
}

/** After the flight: what the call wall shows and what you can do at the stand and the launch button. */
export interface Debrief {
  grade: string
  score: number
  /** e.g. "Science goal missed". */
  outcome: string
  /** The one change that would have done best: shown on the wall (`change`), tried at the stand (reset + set_param). */
  fix?: { change: string; run: () => void }
  /** Back to designing with the same parts. */
  again: () => void
}

export interface PlayOptions {
  send: (command: Command) => void
  /** Why the launch button can't be pressed now (an `error` issue is open), ≤ 6 words. */
  launchBlocked?: string
  debrief?: Debrief
  /** The open station's menu, if one is open. */
  menu?: Menu
  /** False while the menu is still flying open: its cards cannot be used yet, so a double press of E does not pick one by accident. */
  armed?: boolean
  /** Open this station's menu, or close it if it is the open one. */
  toggle?: (key: string) => void
}

/** What E does on everything in the room right now. */
export function interactables(stationList: readonly Station[], { send, launchBlocked, debrief, menu: open, armed = true, toggle }: PlayOptions): Interactable[] {
  if (debrief) {
    const out: Interactable[] = [{ id: 'again', at: LAUNCH, label: 'Design again', use: debrief.again }]
    if (debrief.fix) out.push({ id: 'fix', at: [STAND[0], 1.4, STAND[2] + 1.4], reach: 2.6, label: 'Try the fix', use: debrief.fix.run })
    return out
  }
  const out = stationList.map((s): Interactable => ({
    id: `station:${s.key}`,
    at: s.at,
    label: `${open?.key === s.key ? 'Close' : 'Open'} ${s.name}`,
    use: () => toggle?.(s.key),
  }))
  const station = stationList.find((s) => s.key === open?.key)
  if (open && station && armed) {
    const { slot } = station
    for (const { id, part, at, picked } of open.cards) {
      const name = shortLabel(part)
      const single = !slot.multi
      out.push({
        id,
        at,
        // The arc is wider than arm's length: every card of the open menu stays in reach while you stand at the station.
        reach: REACH + 1.2,
        label: single ? `Fit ${name}` : picked ? `Remove ${name}` : `Add ${name}`,
        disabled: single && picked ? 'Fitted' : undefined,
        use: () => {
          send({ type: 'set_param', payload: { key: slot.key, value: slot.multi ? toggleId(station.picked.join(','), part.id) : part.id } })
          // A slot that holds several parts stays open, so you can add or remove more than one.
          if (single) toggle?.(slot.key)
        },
      })
    }
  }
  out.push({ id: 'launch', at: LAUNCH, label: 'Launch mission', disabled: launchBlocked, use: () => send({ type: 'launch', payload: {} }) })
  return out
}

/** The `set_param` key a menu card changes, for role checks (undefined for stations and the launch button: anyone may look). */
export const paramOf = (id: string): string | undefined => (id.startsWith('rack:') ? id.split(':')[1] : undefined)
