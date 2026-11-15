// The 3D game's shell rendered to a string (no browser, so no WebGL): what its top bar offers in which phase.

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Command, Config } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { createGame } from './game'
import { createSoloSession } from './session'
import { World } from './World'

const config: Config = { ...demoConfig, params: { ...demoConfig.params, random_failures: false, anomaly_cards: 0 } }
const design: Command[] = Object.entries(goodDesign).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }))

describe('World', () => {
  it('offers flight training while the mission flies, and only then', () => {
    const game = createGame({ config, datasets: fixtureDatasets, sim: simCore })
    const session = createSoloSession(game)
    const bar = () => renderToStaticMarkup(<World active={{ session, roomCode: null }} config={config} onExit={() => {}} />)
    const button = /<button[^>]*>Flight training<\/button>/
    expect(bar()).not.toMatch(button) // mission control, designing
    for (const command of design) session.send(command)
    session.send({ type: 'launch', payload: {} })
    expect(bar()).not.toMatch(button) // the launch sequence
    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100 && session.getSnapshot().state.t_s <= 86400; i++) game.advance(1000)
    expect(bar()).toMatch(button) // inside the spacecraft, mission running
    for (let i = 0; i < 100; i++) game.advance(1000)
    expect(session.getSnapshot().state.status).toBe('ended')
    expect(bar()).not.toMatch(button) // back in mission control for the debrief
  })
})
