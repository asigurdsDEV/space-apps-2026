// Real NASA space weather drives the storm card (data/space-weather/storms + app/ withCards).
// claude@sarah, with Sarah's approval to touch sim/ (claude@ethan's folder): storm scheduling only.

import { describe, expect, it } from 'vitest'
import type { Command, Config, SimEvent, SimState } from '../shared'
import { getDatasets, getScenario } from '../data'
import { realStorms } from '../data/space-weather/storms'
import { pendingDecision, realDate, realStormList } from './cards'
import { init, step } from './index'

const demo = getScenario('demo')!
const datasets = getDatasets(demo.datasets)

/** Fly First Light until the first card (or the end), answering nothing. */
function flyUntilCard(params: Config['params']) {
  const config: Config = { ...demo, params: { ...demo.params, random_failures: false, anomaly_cards: 0, ...params } }
  let state: SimState = init(config, datasets)
  const events: SimEvent[] = []
  const run = (commands: Command[]) => {
    const r = step(state, commands, config.dt_s)
    state = r.state
    events.push(...r.events)
  }
  run([{ type: 'launch', payload: {} }])
  for (let i = 0; state.status !== 'ended' && !state.metrics.decision_id && i < 2000; i++) run([])
  return { state, card: events.find((e) => e.type === 'decision_required') }
}

describe('real storm days from NASA OMNI', () => {
  it('maps a real date window onto mission days', () => {
    // 1 Oct 2003 launch: G3 on 14 Oct (day 13), G5 on 29 and 30 Oct (days 28, 29).
    const list = realStorms('2003-10-01', 40)
    expect(list.split(',')).toEqual(expect.arrayContaining(['13:3', '28:5', '29:5', '30:4']))
    expect(realStorms('2019-06-01', 60)).toBe('') // solar minimum: no strong storms
    expect(realStormList({ real_storms: '13:3,28:5' })).toEqual([{ day: 13, g: 3 }, { day: 28, g: 5 }])
    expect(realDate({ weather_start: '2003-10-01' }, 28)).toBe('2003-10-29')
  })

  it('fires the storm card on the first real storm day, naming the real date', () => {
    const start = '2003-10-01'
    const { state, card } = flyUntilCard({ weather_start: start, real_storms: realStorms(start, 365) })
    expect(card?.type).toBe('decision_required')
    if (card?.type !== 'decision_required') return
    expect(card.payload.card_id).toBe('geomagnetic-storm')
    expect(Math.floor(card.t_s / 86400)).toBe(13)
    expect(card.payload.story?.year).toBe('2003-10-14')
    expect(card.payload.story?.text).toContain('G3 geomagnetic storm on 2003-10-14')
    expect(card.payload.story?.source_url).toContain('spdf.gsfc.nasa.gov')
    // A reload rebuilds the same real story from the state alone.
    expect(pendingDecision(state)?.story?.year).toBe('2003-10-14')
  })

  it('brings no storm card in a quiet stretch, and never a random one when the weather is real', () => {
    const quiet = flyUntilCard({ weather_start: '2019-06-01', real_storms: '', anomaly_cards: 8 })
    const drawn = String(quiet.state.metrics.cards_drawn ?? '').split(',')
    expect(drawn).not.toContain('geomagnetic-storm')
  })
})
