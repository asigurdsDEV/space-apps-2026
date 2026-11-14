import { describe, expect, it } from 'vitest'
import { getDatasets, getScenario } from '../../data'
import { catalogEntities } from '../../sim'
import { aimAt, lookDir, step } from '../fps/model'
import type { Command } from '../../shared'
import { interactables, obstacles, racks, ROOM, shortLabel, START } from './layout'

const config = getScenario('demo')!
const state = { entities: catalogEntities(getDatasets(config.datasets)), params: config.params }

describe('mission control layout', () => {
  const list = racks(state)

  it('puts every part the builder offers on a rack, inside the room, no two in the same spot', () => {
    expect(list.map((r) => r.key).sort()).toEqual(['battery', 'bus', 'comms', 'instruments', 'launch_vehicle', 'orbit', 'solar'])
    const spots = new Set<string>()
    for (const item of list.flatMap((r) => r.items)) {
      expect(item.at[0]).toBeGreaterThan(ROOM.min[0])
      expect(item.at[0]).toBeLessThan(ROOM.max[0])
      expect(item.at[2]).toBeGreaterThan(ROOM.min[2])
      expect(item.at[2]).toBeLessThan(ROOM.max[2])
      spots.add(item.at.map((v) => v.toFixed(2)).join())
    }
    expect(spots.size).toBe(list.flatMap((r) => r.items).length)
  })

  it('racks do not overlap each other or the walkway', () => {
    const boxes = obstacles(list).slice(4) // without the outer walls
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!
        const b = boxes[j]!
        const overlap = a.min[0] < b.max[0] && a.max[0] > b.min[0] && a.min[2] < b.max[2] && a.max[2] > b.min[2]
        expect(overlap, `${i} overlaps ${j}`).toBe(false)
      }
  })

  it('labels are at most 4 words', () => {
    for (const item of list.flatMap((r) => r.items)) expect(shortLabel(item.part).split(' ').length).toBeLessThanOrEqual(4)
    expect(shortLabel({ name: 'Space Launch System (Block 1)', props: {} })).toBe('Space Launch System')
    expect(shortLabel({ name: 'Anything', props: { short_label: 'SLS' } })).toBe('SLS')
  })

  it('E on a part sends the same set_param the builder sends; instruments toggle', () => {
    const sent: Command[] = []
    const items = interactables(list, { send: (c) => sent.push(c) })
    const bus = list.find((r) => r.key === 'bus')!.items.find((i) => !i.picked)!
    items.find((it) => it.id === `rack:bus:${bus.part.id}`)!.use()
    expect(sent.at(-1)).toEqual({ type: 'set_param', payload: { key: 'bus', value: bus.part.id } })

    const inst = list.find((r) => r.key === 'instruments')!
    const picked = inst.items.filter((i) => i.picked).map((i) => i.part.id)
    const extra = inst.items.find((i) => !i.picked)!
    items.find((it) => it.id === `rack:instruments:${extra.part.id}`)!.use()
    expect(sent.at(-1)).toEqual({ type: 'set_param', payload: { key: 'instruments', value: [...picked, extra.part.id].join(',') } })
  })

  it('a fitted part says so and the launch button carries its reason', () => {
    const items = interactables(list, { send: () => {}, launchBlocked: 'A console is NO-GO' })
    const fitted = list.find((r) => r.key === 'bus')!.items.find((i) => i.picked)!
    expect(items.find((it) => it.id === `rack:bus:${fitted.part.id}`)!.disabled).toBe('Fitted')
    expect(items.find((it) => it.id === 'launch')!.disabled).toBe('A console is NO-GO')
  })

  it('from the start you can walk to the bus rack and aim at a part', () => {
    const walls = obstacles(list)
    const bus = list.find((r) => r.key === 'bus')!.items[0]!
    let pos = START.pos
    // walk left to x = -8.4, then down to the bus rack's z, then face the wall (yaw +90° = facing −x)
    for (let i = 0; i < 200 && pos[0] > -8.4; i++) pos = step(pos, Math.PI / 2, { forward: 1, right: 0 }, 0.02, 3.2, walls)
    for (let i = 0; i < 200 && pos[2] > bus.at[2]; i++) pos = step(pos, 0, { forward: 1, right: 0 }, 0.02, 3.2, walls)
    const aimed = aimAt([pos[0], 1.7, pos[2]], lookDir(Math.PI / 2, 0), interactables(list, { send: () => {} }))
    expect(aimed?.id.startsWith('rack:bus:')).toBe(true)
  })
})
