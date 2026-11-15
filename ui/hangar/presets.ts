// The rocket preset wall: a screen on the back wall beside the door with one ready-made design per rocket
// (data/presets.ts). Face one and press E to load the whole design. It shows names and rockets only, never scores.
// Pure: no three.js, so control.ts hangs it and MissionControl.tsx adds its interactables.

import type { Preset } from '../../data/presets'
import { getPart } from '../../data'
import type { Interactable, Vec3 } from '../fps/model'
import type { Command, Params } from '../../shared'
import { ROOM } from './layout'

/** Between the pilasters right of the door (x 2.25…5.75 m) as you look back at it; faces into the room. */
export const PRESET_WALL = { x: 4, y: 1.65, w: 3.4, h: 1.7, z: ROOM.max[2] - 0.085 }
export const PRESET_CANVAS = { w: 1024, h: 512 }
const COLS = 4
/** Canvas fractions: the header band, then up to two rows of four tiles. */
const TOP = 0.18
export const CELL = { w: 0.23, h: 0.39 }

export interface PresetTile {
  name: string
  rocket: string
  /** The current design is exactly this preset. */
  loaded: boolean
}

/** Centre of tile `i` of `n`, as fractions of the canvas from its top left. */
export function presetCell(i: number, n: number): [u: number, v: number] {
  const rows = Math.ceil(n / COLS)
  const row = Math.floor(i / COLS)
  const inRow = Math.min(COLS, n - row * COLS)
  const u = 0.5 + (i % COLS - (inRow - 1) / 2) * CELL.w
  return [u, rows === 1 ? (TOP + 1) / 2 : TOP + CELL.h * (row + 0.5)]
}

const rocketName = (id: unknown) => String(getPart('launch-vehicles', String(id))?.short_label ?? id)
// ground_stations is 1 until someone changes it (sim DEFAULT_PARAMS).
const loaded = (p: Preset, params: Params) => Object.entries(p.design).every(([k, v]) => (params[k] ?? (k === 'ground_stations' ? 1 : undefined)) === v)

export function presetTiles(presets: readonly Preset[], params: Params): PresetTile[] {
  return presets.map((p) => ({ name: p.name, rocket: rocketName(p.design.launch_vehicle), loaded: loaded(p, params) }))
}

/**
 * One interactable per tile, where it is drawn on the wall. `may` says whether this player may set a slot
 * (co-op: each console's owner sets its own), so in a crew everyone presses the same preset to load all of it.
 */
export function presetSpots(presets: readonly Preset[], send: (commands: Command[]) => void, may: (key: string) => boolean = () => true): Interactable[] {
  return presets.map((p, i) => {
    const [u, v] = presetCell(i, presets.length)
    // Facing the wall (+z) your right hand is −x, so the canvas's left edge is at +x.
    const at: Vec3 = [PRESET_WALL.x + (0.5 - u) * PRESET_WALL.w, PRESET_WALL.y + (0.5 - v) * PRESET_WALL.h, PRESET_WALL.z]
    return {
      id: `preset:${i}`,
      at,
      reach: 2.8,
      label: `Load ${rocketName(p.design.launch_vehicle)} preset`, // the rocket: Sandbox repeats a name
      use: () => send(Object.entries(p.design).filter(([key]) => may(key)).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }))),
    }
  })
}
