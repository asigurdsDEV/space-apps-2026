import type { Entity, Params } from '../../shared'

/** The design slots shown on the spacecraft page, in build order, with a plain name for each. */
const SLOTS = [
  ['orbit', 'Orbit'],
  ['launch_vehicle', 'Rocket'],
  ['bus', 'Spacecraft bus'],
  ['solar', 'Power'],
  ['battery', 'Battery'],
  ['comms', 'Radio'],
  ['instruments', 'Instruments'],
] as const

export interface SpacecraftRow { label: string; name: string; detail: string }

/** The scenario's starting design, part by part, from its params and catalog rows. Missing picks are left out. */
export function spacecraftRows(params: Params, entities: readonly Entity[]): SpacecraftRow[] {
  return SLOTS.flatMap(([key, label]) => {
    const ids = String(params[key] ?? '').split(',').map(id => id.trim()).filter(Boolean)
    return ids.flatMap(id => {
      const part = entities.find(e => e.id === id)
      if (!part) return []
      const detail = typeof part.props.description === 'string' ? part.props.description : ''
      return [{ label, name: String(part.name ?? id), detail }]
    })
  })
}
