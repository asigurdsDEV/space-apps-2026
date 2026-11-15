import { describe, expect, it } from 'vitest'
import { getDatasets, getScenario } from '../../data'
import { catalogEntities } from '../../sim'
import type { Command, Decision } from '../../shared'
import { choiceSpots, choiceTitleAt, DASH, dialAngle, gauges, interactables, modules, obstacles, ROOM, section, SPEEDS, WINDOW } from './layout'

const config = getScenario('demo')!
const state = { entities: catalogEntities(getDatasets(config.datasets)), params: { ...config.params, instruments: 'camera-basic,magnetometer' } as typeof config.params }
const card = (console: string): Decision => ({
  decision_id: 'd1',
  card_id: 'c',
  title: 'Radio fault',
  body: '',
  console,
  options: [
    { id: 'a', label: 'Rent time on commercial ground stations', effect_text: '' },
    { id: 'b', label: 'Wait it out', effect_text: '' },
  ],
})

describe('walk-in spacecraft layout', () => {
  const list = modules(state)

  it('has a module for each system and every picked instrument, inside the room', () => {
    expect(list.map((m) => m.key)).toEqual(['solar', 'battery', 'comms', 'storage', 'instrument:camera-basic', 'instrument:magnetometer'])
    for (const m of list) {
      expect(m.at[0]).toBeGreaterThan(ROOM.min[0])
      expect(m.at[0]).toBeLessThan(ROOM.max[0])
    }
    expect(list.find((m) => m.key === 'solar')!.part?.id).toBe(state.params.solar)
  })

  it('puts an anomaly card’s choices at its console’s module, apart from each other', () => {
    const radio = list.find((m) => m.key === 'comms')!
    const spots = choiceSpots(card('comms-resources'), list)
    expect(spots).toHaveLength(2)
    for (const s of spots) expect(Math.hypot(s.at[0] - radio.at[0], s.at[2] - radio.at[2])).toBeLessThan(1.2)
    expect(Math.hypot(spots[0]!.at[0] - spots[1]!.at[0], spots[0]!.at[2] - spots[1]!.at[2])).toBeGreaterThan(0.4)
    // The radio faces -x, so you face +x and your right is +z: A stands left of B.
    expect(spots[0]!.at[2]).toBeLessThan(spots[1]!.at[2])
  })

  it('choices at a module are not inside its pedestal (planning cards use the dashboard desk)', () => {
    const boxes = obstacles(list).slice(4)
    for (const role of ['spacecraft', 'comms-resources', 'science'])
      for (const s of choiceSpots(card(role), list))
        for (const b of boxes) expect(s.at[0] > b.min[0] && s.at[0] < b.max[0] && s.at[2] > b.min[2] && s.at[2] < b.max[2]).toBe(false)
  })

  it('keeps planning choices to the right of dashboard gauges, with a title above the cards', () => {
    const spots = choiceSpots(card('mission-planning'), list)
    for (const spot of spots) expect(spot.at[0] - 0.21).toBeGreaterThan(0)
    for (const role of ['mission-planning', 'spacecraft', 'comms-resources', 'science']) {
      const cards = choiceSpots(card(role), list)
      expect(choiceTitleAt(cards)[1] - 0.1).toBeGreaterThan(Math.max(...cards.map((s) => s.at[1] + 0.21)))
    }
  })

  it('E on a choice answers the card; E on the lever pauses and speeds up', () => {
    const sent: Command[] = []
    const items = interactables(list, { send: (c) => sent.push(c), paused: false, speed: 5, decision: card('comms-resources') })
    items.find((i) => i.id === 'option:d1:b')!.use()
    expect(sent.at(-1)).toEqual({ type: 'resolve_decision', payload: { decision_id: 'd1', option_id: 'b' } })
    expect(items.find((i) => i.id === 'option:d1:a')!.label).toBe('Rent time on commercial')
    items.find((i) => i.id === 'speed')!.use()
    expect(sent.at(-1)).toEqual({ type: 'set_speed', payload: { multiplier: 20 } })
    expect(items.find((i) => i.id === 'pause')!.disabled).toBeTruthy() // time is held until the alarm is answered
  })

  it('the speed switch has a stop for each speed, left to right, and the controls sit on the console', () => {
    const stops = SPEEDS.map(dialAngle)
    expect(stops).toEqual([...stops].sort((a, b) => a - b))
    expect(new Set(stops).size).toBe(SPEEDS.length)
    expect(stops[0]).toBeCloseTo(-stops.at(-1)!)
    expect(Math.abs(stops[0]!)).toBeLessThan(Math.PI / 2) // every number stays on the far side of the knob, where it can be read
    for (const id of ['pause', 'speed']) {
      const at = interactables(list, { send: () => {}, paused: false, speed: 1, decision: null }).find((i) => i.id === id)!.at
      expect(Math.abs(at[0])).toBeLessThan(DASH.w / 2)
      expect(Math.abs(at[2] - DASH.z)).toBeLessThan(DASH.depth / 2)
    }
  })

  it('instruments stand either side of the hatch, apart from each other and from the wall modules', () => {
    const ids = ['camera-basic', 'magnetometer', 'laser-altimeter', 'subsurface-radar']
    for (let n = 1; n <= ids.length; n++) {
      const all = modules({ ...state, params: { ...state.params, instruments: ids.slice(0, n).join(',') } })
      const back = all.filter((m) => m.key.startsWith('instrument:'))
      expect(back).toHaveLength(n)
      for (const m of back) {
        expect(Math.abs(m.at[0])).toBeGreaterThan(1.4) // the hatch rim is 1 m from the middle, a mount 0.37 m wide each way
        for (const other of all) if (other !== m) expect(Math.hypot(other.at[0] - m.at[0], other.at[2] - m.at[2])).toBeGreaterThan(0.8)
      }
    }
  })

  it('the window is a hole in the front wall, above the console', () => {
    expect(WINDOW.x - WINDOW.w / 2).toBeGreaterThan(ROOM.min[0])
    expect(WINDOW.x + WINDOW.w / 2).toBeLessThan(ROOM.max[0])
    expect(WINDOW.y - WINDOW.h / 2).toBeGreaterThan(DASH.top)
    expect(WINDOW.y + WINDOW.h / 2).toBeLessThan(ROOM.max[1])
  })

  it('the drawn cross-section keeps the walls where the player bumps into them and clears the window frame', () => {
    const half = section()
    for (const [x, y] of half) {
      expect(x).toBeLessThanOrEqual(ROOM.max[0])
      if (y > 0.16 && y < 2.3) expect(x).toBe(ROOM.max[0]) // the straight wall is the obstacle's face
    }
    for (let i = 1; i < half.length; i++) expect(half[i]![1]).toBeGreaterThanOrEqual(half[i - 1]![1]) // no overhangs
    expect(half[0]).toEqual([ROOM.max[0] - 0.16, 0])
    expect(half.at(-1)![0]).toBe(0)
    // Over the window and its 0.19 m frame the ceiling is above the frame's top edge.
    const frame = 0.19
    for (const [x, y] of half) if (y > 2.6 && x < WINDOW.w / 2 + frame) expect(y).toBeGreaterThan(WINDOW.y + WINDOW.h / 2 + frame)
  })

  it('gauges are numbers, clamped, and flag lost data', () => {
    const g = gauges({ mission_day: 400, mission_days: 365, science_score: 3, science_goal: 30, data_stored_gb: 2, storage_gb: 2, data_lost_gb: 1.5, cost_spent_usd: 4e6, budget_usd: 8e6 })
    expect(g.every((x) => x.ratio >= 0 && x.ratio <= 1)).toBe(true)
    expect(g.find((x) => x.label === 'Data lost')!.bad).toBe(true)
    expect(g.find((x) => x.label === 'Money spent')!.value).toBe('$4.0M / $8.0M')
  })
})
