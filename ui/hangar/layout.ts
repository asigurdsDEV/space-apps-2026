// Mission control you play in (decision 007): where everything stands and what E does on it.
// Pure: no three.js, so it is cheap to test. control.ts draws it; MissionControl.tsx wires it up.
//
// The room, seen from above (x right, z towards you; you start at the bottom facing the call wall):
//
//   z=-12  [instruments rack]   [ MISSION CALL WALL ]   [ bay gauges ]
//   z=-8.5                       desk desk desk desk
//   z=-6.5                          (launch button)
//   z=-2.5  orbit rack   ( spacecraft stand )                     solar rack
//           launch-vehicle rack                                   battery rack
//           bus rack                                              radio rack
//   z=4.5                              you start here

import { DEFAULT_SLOTS, parseIds, slotParts, toggleId, type Slot } from '../builder/model'
import type { Interactable, Obstacle, Vec3 } from '../fps/model'
import type { Command, Entity, SimState } from '../../shared'

export const ROOM = { min: [-10, 0, -12] as Vec3, max: [10, 5, 6] as Vec3 }
export const START: { pos: Vec3; yaw: number } = { pos: [0, 0, 4.5], yaw: 0 }
/** Off the centre line, so the spacecraft never hides the call wall. */
export const STAND: Vec3 = [-4.2, 0, -2.5]
export const LAUNCH: Vec3 = [0, 1.05, -6.5]
export const CALL_WALL = { x: 0, y: 2.7, w: 6.4, h: 3.2 }
export const GAUGES = { x: 6.6, y: 2.4, w: 5.2, h: 2.9 }
export const DESK_Z = -8.5
export const DESK_XS = [-2.4, -0.8, 0.8, 2.4] as const

/** Shelf spacing along a rack, and its two shelf heights. */
const STEP = 0.8
const SHELVES = [1.05, 1.6] as const
/** How far a part sits out from the wall it's mounted on. */
const INSET = 0.55

/** Where each rack starts, which way it runs and which wall it's on. `face` is the direction the parts face (towards the player). */
const RACKS: Record<string, { start: [number, number]; along: [number, number]; face: [number, number] }> = {
  orbit: { start: [ROOM.min[0] + INSET, 3], along: [0, -1], face: [1, 0] },
  launch_vehicle: { start: [ROOM.min[0] + INSET, -0.4], along: [0, -1], face: [1, 0] },
  bus: { start: [ROOM.min[0] + INSET, -3.8], along: [0, -1], face: [1, 0] },
  solar: { start: [ROOM.max[0] - INSET, 3], along: [0, -1], face: [-1, 0] },
  battery: { start: [ROOM.max[0] - INSET, -0.4], along: [0, -1], face: [-1, 0] },
  comms: { start: [ROOM.max[0] - INSET, -2.8], along: [0, -1], face: [-1, 0] },
  instruments: { start: [ROOM.min[0] + 0.7, ROOM.min[2] + INSET], along: [1, 0], face: [0, 1] },
}

/** A rack's sign: the slot's name in at most 2 words. */
export const RACK_NAMES: Record<string, string> = {
  orbit: 'Orbit',
  launch_vehicle: 'Rocket',
  bus: 'Bus',
  solar: 'Power',
  battery: 'Battery',
  comms: 'Radio',
  instruments: 'Instruments',
}

/** At most 4 words: data's `short_label` when it has one, else the name without brackets. */
export function shortLabel(part: Pick<Entity, 'name' | 'props'>): string {
  const short = part.props.short_label
  if (typeof short === 'string' && short.trim()) return short.trim()
  return String(part.name ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ')
}

export interface RackItem {
  slot: Slot
  part: Entity
  at: Vec3
  /** Unit vector the part faces (towards where the player stands). */
  face: [number, number]
  picked: boolean
}

export interface Rack {
  key: string
  name: string
  /** Middle of the rack at sign height, and the direction it faces. */
  sign: Vec3
  face: [number, number]
  /** Rack length along its wall, metres. */
  length: number
  items: RackItem[]
}

/** Every rack and every part on it, for the parts the sim offers in this scenario. */
export function racks(state: Pick<SimState, 'entities' | 'params'>, slots: readonly Slot[] = DEFAULT_SLOTS): Rack[] {
  return slots.flatMap((slot) => {
    const spot = RACKS[slot.key]
    if (!spot) return []
    const parts = slotParts(state.entities, slot)
    const picked = slot.multi ? parseIds(state.params[slot.key]) : [String(state.params[slot.key] ?? '')]
    const columns = Math.ceil(parts.length / 2)
    const items = parts.map((part, i): RackItem => {
      const col = Math.floor(i / 2)
      const d = STEP * (col + 0.5)
      return {
        slot,
        part,
        at: [spot.start[0] + spot.along[0] * d, SHELVES[i % 2]!, spot.start[1] + spot.along[1] * d],
        face: spot.face,
        picked: picked.includes(part.id),
      }
    })
    const mid = (STEP * columns) / 2
    return [{ key: slot.key, name: RACK_NAMES[slot.key] ?? slot.label, sign: [spot.start[0] + spot.along[0] * mid, 2.3, spot.start[1] + spot.along[1] * mid] as Vec3, face: spot.face, length: STEP * columns, items }]
  })
}

/** Walls, rack cabinets, the stand, the desks and the launch pedestal. */
export function obstacles(rackList: readonly Rack[]): Obstacle[] {
  const [x0, , z0] = ROOM.min
  const [x1, , z1] = ROOM.max
  const t = 0.2
  const box = (min: Vec3, max: Vec3): Obstacle => ({ min, max })
  const out: Obstacle[] = [
    box([x0 - t, 0, z0], [x0, 5, z1]),
    box([x1, 0, z0], [x1 + t, 5, z1]),
    box([x0, 0, z0 - t], [x1, 5, z0]),
    box([x0, 0, z1], [x1, 5, z1 + t]),
    box([STAND[0] - 1.3, 0, STAND[2] - 1.3], [STAND[0] + 1.3, 0.6, STAND[2] + 1.3]),
    box([LAUNCH[0] - 0.35, 0, LAUNCH[2] - 0.35], [LAUNCH[0] + 0.35, 1, LAUNCH[2] + 0.35]),
    ...DESK_XS.map((x) => box([x - 0.7, 0, DESK_Z - 0.4], [x + 0.7, 0.8, DESK_Z + 0.4])),
  ]
  // Each rack is a cabinet reaching from its wall to just behind its parts.
  for (const r of rackList) {
    const spot = RACKS[r.key]!
    const a: [number, number] = spot.start
    const b: [number, number] = [a[0] + spot.along[0] * r.length, a[1] + spot.along[1] * r.length]
    const wall: [number, number] = [a[0] - spot.face[0] * INSET, a[1] - spot.face[1] * INSET]
    const front: [number, number] = [a[0] - spot.face[0] * 0.05, a[1] - spot.face[1] * 0.05]
    const xs = [a[0], b[0], wall[0], front[0]]
    const zs = [a[1], b[1], wall[1], front[1]]
    out.push(box([Math.min(...xs), 0, Math.min(...zs)], [Math.max(...xs), 2.1, Math.max(...zs)]))
  }
  return out
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
}

/** What E does on everything in the room right now. */
export function interactables(rackList: readonly Rack[], { send, launchBlocked, debrief }: PlayOptions): Interactable[] {
  if (debrief) {
    const out: Interactable[] = [{ id: 'again', at: LAUNCH, label: 'Design again', use: debrief.again }]
    if (debrief.fix) out.push({ id: 'fix', at: [STAND[0], 1.4, STAND[2] + 1.4], reach: 2.6, label: 'Try the fix', use: debrief.fix.run })
    return out
  }
  const parts = rackList.flatMap((r) =>
    r.items.map(({ slot, part, at, picked }): Interactable => {
      const name = shortLabel(part)
      const single = !slot.multi
      return {
        id: `rack:${slot.key}:${part.id}`,
        at,
        label: single ? `Fit ${name}` : picked ? `Remove ${name}` : `Add ${name}`,
        disabled: single && picked ? 'Fitted' : undefined,
        use: () =>
          send({ type: 'set_param', payload: { key: slot.key, value: slot.multi ? toggleId(r.items.filter((i) => i.picked).map((i) => i.part.id).join(','), part.id) : part.id } }),
      }
    }),
  )
  return [...parts, { id: 'launch', at: LAUNCH, label: 'Launch mission', disabled: launchBlocked, use: () => send({ type: 'launch', payload: {} }) }]
}

/** The `set_param` key a rack interactable changes, for role checks (undefined for the launch button). */
export const paramOf = (id: string): string | undefined => (id.startsWith('rack:') ? id.split(':')[1] : undefined)
