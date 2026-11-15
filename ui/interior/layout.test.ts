import { describe, expect, it } from 'vitest'
import { getDatasets, getScenario } from '../../data'
import { catalogEntities } from '../../sim'
import type { Command, Decision } from '../../shared'
import { choiceSpots, choiceTitleAt, gauges, interactables, modules, obstacles, ROOM } from './layout'

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
    const titleY = choiceTitleAt(spots)[1]
    expect(titleY - 0.1).toBeGreaterThan(Math.max(...spots.map((s) => s.at[1] + 0.21)))
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

  it('gauges are numbers, clamped, and flag lost data', () => {
    const g = gauges({ mission_day: 400, mission_days: 365, science_score: 3, science_goal: 30, data_stored_gb: 2, storage_gb: 2, data_lost_gb: 1.5, cost_spent_usd: 4e6, budget_usd: 8e6 })
    expect(g.every((x) => x.ratio >= 0 && x.ratio <= 1)).toBe(true)
    expect(g.find((x) => x.label === 'Data lost')!.bad).toBe(true)
    expect(g.find((x) => x.label === 'Money spent')!.value).toBe('$4.0M / $8.0M')
  })
})
