import { describe, expect, it } from 'vitest'
import { getDatasets, getScenario } from '../../data'
import { catalogEntities } from '../../sim'
import { aimAt, lookDir, step } from '../fps/model'
import type { Command } from '../../shared'
import { DESK, DESK_ROWS, DESK_XS, DESK_Z, deskPoint, interactables, LAUNCH, menu, MENU_RANGE, obstacles, ROOM, shortLabel, STAND, START, stations } from './layout'

const config = getScenario('demo')!
const state = { entities: catalogEntities(getDatasets(config.datasets)), params: config.params }
const EYE = 1.7

describe('mission control layout', () => {
  const list = stations(state)
  const bus = list.find((s) => s.key === 'bus')!
  const instruments = list.find((s) => s.key === 'instruments')!
  /** Standing 1.5 m from a station, on the craft's side of it. */
  const before = (s: (typeof list)[number]): [number, number] => {
    const d = Math.hypot(s.at[0] - STAND[0], s.at[2] - STAND[2])
    return [s.at[0] - ((s.at[0] - STAND[0]) / d) * 1.5, s.at[2] - ((s.at[2] - STAND[2]) / d) * 1.5]
  }

  it('the craft floats dead centre and one station per slot stands around it, in mirrored pairs clear of the centre line', () => {
    expect(STAND[0]).toBe((ROOM.min[0] + ROOM.max[0]) / 2)
    expect(STAND[2]).toBe((ROOM.min[2] + ROOM.max[2]) / 2)
    expect(list.map((s) => s.key)).toEqual(['orbit', 'launch_vehicle', 'bus', 'instruments', 'comms', 'solar', 'battery'])
    const radius = Math.hypot(list[0]!.at[0] - STAND[0], list[0]!.at[2] - STAND[2])
    list.forEach((s, i) => {
      expect(Math.hypot(s.at[0] - STAND[0], s.at[2] - STAND[2])).toBeCloseTo(radius)
      // Seven stations: the first (far left) is the odd one out, the other six are three mirrored pairs.
      const twin = i === 0 ? s : list[list.length - i]!
      expect(Math.abs(s.at[0])).toBeCloseTo(Math.abs(twin.at[0]))
      expect(s.at[2]).toBeCloseTo(twin.at[2])
      // The view from the start to the craft, the launch button and the call wall stays open.
      expect(Math.abs(s.at[0] - STAND[0])).toBeGreaterThan(1.2)
      // Clear of the launch button and the desks, which stay in the open end of the horseshoe.
      expect(Math.hypot(s.at[0] - LAUNCH[0], s.at[2] - LAUNCH[2])).toBeGreaterThan(2.5)
      expect(s.at[2]).toBeGreaterThan(DESK_Z + 2)
    })
  })

  it('pedestals, the craft emitter, the launch button and the desks leave room to walk between them, and none blocks the start', () => {
    const all = obstacles(list).slice(4) // without the outer walls
    const fixed = all.slice(0, 2 + list.length) // emitter, launch button, pedestals
    const desks = all.slice(2 + list.length) // desk pieces and chairs: these stand together in rows
    expect(desks.length).toBeGreaterThan(DESK_ROWS.length * 3)
    // 0.7 m between any two: room for the player (0.6 m wide) to walk through.
    const close = (a: (typeof all)[number], b: (typeof all)[number]) => a.min[0] - 0.7 < b.max[0] && a.max[0] + 0.7 > b.min[0] && a.min[2] - 0.7 < b.max[2] && a.max[2] + 0.7 > b.min[2]
    fixed.forEach((a, i) => {
      fixed.slice(i + 1).forEach((b, j) => expect(close(a, b), `${i} too close to ${i + 1 + j}`).toBe(false))
      desks.forEach((b, j) => expect(close(a, b), `${i} too close to desk piece ${j}`).toBe(false))
    })
    for (const o of desks) {
      expect(o.min[0]).toBeGreaterThanOrEqual(ROOM.min[0])
      expect(o.max[0]).toBeLessThanOrEqual(ROOM.max[0])
      expect(o.min[2]).toBeGreaterThan(ROOM.min[2] + 1) // clear of the video wall
    }
    expect(step(START.pos, 0, { forward: 1, right: 0 }, 0.05, 3.2, obstacles(list))[2]).toBeLessThan(START.pos[2])
  })

  it('the way from the start to the launch button and up to each GO / NO-GO monitor is open', () => {
    const walls = obstacles(list)
    const walk = (from: [number, number, number], to: [number, number]) => {
      let pos = from
      for (let k = 0; k < 600 && Math.hypot(pos[0] - to[0], pos[2] - to[1]) > 0.1; k++) pos = step(pos, Math.atan2(pos[0] - to[0], pos[2] - to[1]), { forward: 1, right: 0 }, 0.05, 3.2, walls)
      return pos
    }
    // Round the craft on the left, then to the launch button, then along the front desk.
    let pos = walk(START.pos, [-2.6, 1.5])
    pos = walk(pos, [-2.6, -5.6])
    pos = walk(pos, [LAUNCH[0], LAUNCH[2] + 0.9])
    expect(Math.hypot(pos[0] - LAUNCH[0], pos[2] - (LAUNCH[2] + 0.9))).toBeLessThan(0.2)
    const front = DESK_ROWS[0]!
    for (const s of DESK_XS) {
      const spot = deskPoint(front, s, DESK.front + 0.45)
      // Straight in from the aisle behind the chairs, as a player would.
      pos = walk(pos, [spot.x, LAUNCH[2] + 0.9])
      pos = walk(pos, [spot.x, spot.z])
      expect(Math.hypot(pos[0] - spot.x, pos[2] - spot.z), `monitor at ${s}`).toBeLessThan(0.2)
    }
  })

  it('a desk curves round its operators: its ends are nearer to them than its middle', () => {
    for (const row of DESK_ROWS) {
      expect(deskPoint(row, 0).x).toBeCloseTo(row.x)
      expect(deskPoint(row, 0).z).toBeCloseTo(row.z)
      const end = deskPoint(row, row.len / 2)
      expect(end.z).toBeGreaterThan(row.z)
      expect(end.x).toBeCloseTo(-deskPoint(row, -row.len / 2).x + 2 * row.x)
      // A chair stands on the operators' side.
      for (const s of row.chairs) expect(deskPoint(row, s, DESK.chair).z).toBeGreaterThan(deskPoint(row, s).z)
    }
  })

  it('a menu has one card per part the builder offers, each in its own spot, inside the room and in reach', () => {
    for (const s of list) {
      const from = before(s)
      const { cards } = menu(s, from, state)
      expect(cards.map((c) => c.part.id)).toEqual(s.parts.map((p) => p.id))
      expect(cards.filter((c) => c.picked).map((c) => c.part.id).sort()).toEqual([...s.picked].sort())
      const items = interactables(list, { send: () => {}, menu: { key: s.key, cards } })
      for (const [i, c] of cards.entries()) {
        expect(c.at[0]).toBeGreaterThan(ROOM.min[0])
        expect(c.at[0]).toBeLessThan(ROOM.max[0])
        expect(c.at[2]).toBeGreaterThan(ROOM.min[2])
        expect(c.at[2]).toBeLessThan(ROOM.max[2])
        expect(c.stats.length).toBeLessThanOrEqual(2)
        for (const other of cards.slice(i + 1)) expect(Math.hypot(c.at[0] - other.at[0], c.at[1] - other.at[1], c.at[2] - other.at[2])).toBeGreaterThan(0.44)
        // Look straight at a card from where the menu was opened: that card is the one E uses.
        const eye: [number, number, number] = [from[0], EYE, from[1]]
        const to = [c.at[0] - eye[0], c.at[1] - eye[1], c.at[2] - eye[2]] as const
        const aimed = aimAt(eye, lookDir(Math.atan2(-to[0], -to[2]), Math.atan2(to[1], Math.hypot(to[0], to[2]))), items)
        expect(aimed?.id).toBe(`rack:${s.key}:${c.part.id}`)
      }
    }
  })

  it('labels are at most 4 words', () => {
    for (const part of list.flatMap((s) => s.parts)) expect(shortLabel(part).split(' ').length).toBeLessThanOrEqual(4)
    expect(shortLabel({ name: 'Space Launch System (Block 1)', props: {} })).toBe('Space Launch System')
    expect(shortLabel({ name: 'Anything', props: { short_label: 'SLS' } })).toBe('SLS')
    for (const it of interactables(list, { send: () => {}, menu: menu(instruments, before(instruments), state) })) expect(it.label.split(' ').length).toBeLessThanOrEqual(5)
  })

  it('E on a station opens its menu; cards only exist for the open one', () => {
    const toggled: string[] = []
    const closed = interactables(list, { send: () => {}, toggle: (k) => toggled.push(k) })
    expect(closed.map((it) => it.id)).toEqual([...list.map((s) => `station:${s.key}`), 'launch'])
    const station = closed.find((it) => it.id === 'station:bus')!
    expect(station.label).toBe('Open Bus')
    station.use()
    expect(toggled).toEqual(['bus'])
    const open = interactables(list, { send: () => {}, menu: menu(bus, before(bus), state) })
    expect(open.find((it) => it.id === 'station:bus')!.label).toBe('Close Bus')
    expect(open.filter((it) => it.id.startsWith('rack:')).every((it) => it.id.startsWith('rack:bus:'))).toBe(true)
    expect(open.filter((it) => it.id.startsWith('rack:')).length).toBe(bus.parts.length)
    // While the menu is still opening only the station answers, so pressing E twice does not pick a card.
    const opening = interactables(list, { send: () => {}, menu: menu(bus, before(bus), state), armed: false })
    expect(opening.map((it) => it.id)).toEqual(closed.map((it) => it.id))
    expect(opening.find((it) => it.id === 'station:bus')!.label).toBe('Close Bus')
  })

  it('E on a card sends the same set_param the builder sends and closes the menu; instruments toggle and stay open', () => {
    const sent: Command[] = []
    const toggled: string[] = []
    const play = { send: (c: Command) => sent.push(c), toggle: (k: string) => toggled.push(k) }
    const other = bus.parts.find((p) => !bus.picked.includes(p.id))!
    interactables(list, { ...play, menu: menu(bus, before(bus), state) }).find((it) => it.id === `rack:bus:${other.id}`)!.use()
    expect(sent.at(-1)).toEqual({ type: 'set_param', payload: { key: 'bus', value: other.id } })
    expect(toggled).toEqual(['bus'])

    const extra = instruments.parts.find((p) => !instruments.picked.includes(p.id))!
    const items = interactables(list, { ...play, menu: menu(instruments, before(instruments), state) })
    items.find((it) => it.id === `rack:instruments:${extra.id}`)!.use()
    expect(sent.at(-1)).toEqual({ type: 'set_param', payload: { key: 'instruments', value: [...instruments.picked, extra.id].join(',') } })
    items.find((it) => it.id === `rack:instruments:${instruments.picked[0]}`)!.use()
    expect(sent.at(-1)).toEqual({ type: 'set_param', payload: { key: 'instruments', value: instruments.picked.slice(1).join(',') } })
    expect(toggled).toEqual(['bus'])
  })

  it('a fitted part says so and the launch button carries its reason', () => {
    const items = interactables(list, { send: () => {}, launchBlocked: 'A console is NO-GO', menu: menu(bus, before(bus), state) })
    expect(items.find((it) => it.id === `rack:bus:${bus.picked[0]}`)!.disabled).toBe('Fitted')
    expect(items.find((it) => it.id === `rack:instruments:${instruments.picked[0]}`)).toBeUndefined()
    expect(items.find((it) => it.id === 'launch')!.disabled).toBe('A console is NO-GO')
  })

  it('a NO-GO the crew may overrule leaves the launch button usable, and it asks instead of launching', () => {
    const sent: unknown[] = []
    let asked = 0
    const items = interactables(list, { send: (c) => sent.push(c), launchBlocked: 'A console says NO-GO', launchAnyway: () => asked++ })
    const launch = items.find((it) => it.id === 'launch')!
    expect([launch.label, launch.disabled]).toEqual(['Launch anyway', undefined])
    launch.use()
    expect([asked, sent]).toEqual([1, []])
    // Without a NO-GO the question is never asked.
    interactables(list, { send: (c) => sent.push(c), launchAnyway: () => asked++ }).find((it) => it.id === 'launch')!.use()
    expect([asked, sent]).toEqual([1, [{ type: 'launch', payload: {} }]])
  })

  it('a card shows at most two of the numbers the builder shows, and the price', () => {
    const rocket = list.find((s) => s.key === 'launch_vehicle')!
    const card = menu(rocket, before(rocket), state).cards.find((c) => c.part.id === 'electron')!
    expect(card.stats).toEqual([['Payload to SSO', '200 kg'], ['Reliability', '92%']])
    expect(card.cost).toBe('$7.5M')
  })

  it('from the start you walk straight to the craft, and a few steps to the side stand at a station you can aim at', () => {
    const walls = obstacles(list)
    let pos = START.pos
    for (let i = 0; i < 300; i++) pos = step(pos, 0, { forward: 1, right: 0 }, 0.02, 3.2, walls)
    // Nothing in the way until the beam under the craft.
    expect(pos[2]).toBeCloseTo(STAND[2] + 1.1 + 0.3, 1)
    const near = list.reduce((a, b) => (Math.hypot(a.at[0] - START.pos[0], a.at[2] - START.pos[2]) < Math.hypot(b.at[0] - START.pos[0], b.at[2] - START.pos[2]) ? a : b))
    // Turn to face it from the start and walk up to it: well inside its menu range, nothing in between.
    const yaw = Math.atan2(-(near.at[0] - START.pos[0]), -(near.at[2] - START.pos[2]))
    const gapFrom = (p: typeof pos) => Math.hypot(p[0] - near.at[0], p[2] - near.at[2])
    pos = START.pos
    for (let i = 0; i < 300 && gapFrom(pos) > 1.2; i++) pos = step(pos, yaw, { forward: 1, right: 0 }, 0.02, 3.2, walls)
    expect(gapFrom(pos)).toBeLessThan(MENU_RANGE / 2)
    const aimed = aimAt([pos[0], EYE, pos[2]], lookDir(Math.atan2(-(near.at[0] - pos[0]), -(near.at[2] - pos[2])), -0.4), interactables(list, { send: () => {} }))
    expect(aimed?.id).toBe(`station:${near.key}`)
  })

  it('the debrief leaves only "design again" and the fix at the craft', () => {
    const items = interactables(list, { send: () => {}, debrief: { grade: 'B', score: 70, outcome: 'Done', again: () => {}, fix: { change: 'Bigger battery', run: () => {} } } })
    expect(items.map((it) => it.id)).toEqual(['again', 'fix'])
  })
})
