// Renders the shell to a string (no browser): which screen shows in which phase.

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Command, Config } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { App, GameScreen, Shell } from './App'
import { createGame } from './game'
import { createSoloSession } from './session'
import { BUILDER_SLOTS } from './slots'

const config: Config = { ...demoConfig, params: { ...demoConfig.params, random_failures: false } }

function soloSession() {
  const game = createGame({ config, datasets: fixtureDatasets, sim: simCore })
  return { game, session: createSoloSession(game) }
}

const designCommands: Command[] = Object.entries(goodDesign).map(([key, value]) => ({
  type: 'set_param',
  payload: { key, value },
}))

const screen = (session: ReturnType<typeof soloSession>['session']) =>
  renderToStaticMarkup(<GameScreen session={session} config={config} datasets={fixtureDatasets} onExit={() => {}} />)

describe('start screen', () => {
  it('shows the scenario title, Play solo, and co-op as coming soon', () => {
    const html = renderToStaticMarkup(<Shell config={config} datasets={fixtureDatasets} />)
    expect(html).toContain(config.title)
    expect(html).toContain('Play solo')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Host a game/)
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Join a game/)
    expect(html).toContain('Coming soon')
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>\s*Play solo/)
  })

  it('shows the objective text from the scenario', () => {
    const withText: Config = { ...config, params: { ...config.params, objective_text: 'Map every crop field.' } }
    expect(renderToStaticMarkup(<Shell config={withText} datasets={fixtureDatasets} />)).toContain('Map every crop field.')
  })

  it('renders with the real scenario from data/', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Play solo')
  })
})

describe('game screen', () => {
  it('shows the builder in the design phase', () => {
    const { session } = soloSession()
    const html = screen(session)
    expect(html).toContain('class="mb"')
    expect(html).not.toContain('mv-root')
    expect(html).toContain('Main menu')
  })

  it('offers every part of the good design in the builder', () => {
    const { session } = soloSession()
    const html = screen(session)
    for (const [key, value] of Object.entries(goodDesign)) {
      if (typeof value !== 'string') continue
      for (const id of value.split(',')) expect(html).toContain(`id="mb-${key}-${id}"`)
    }
  })

  it('has a slot for every part choice the sim reads', () => {
    const keys = BUILDER_SLOTS.map((slot) => slot.key)
    for (const [key, value] of Object.entries(goodDesign)) {
      if (typeof value === 'string') expect(keys).toContain(key)
    }
  })

  it('shows the mission screen after launch and the results at the end', () => {
    const { game, session } = soloSession()
    for (const command of designCommands) session.send(command)
    session.send({ type: 'launch', payload: {} })
    const flying = screen(session)
    expect(flying).toContain('mv-root')
    expect(flying).not.toContain('class="mb"')

    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100; i++) game.advance(1000)
    expect(session.getSnapshot().state.status).toBe('ended')
    expect(screen(session)).toContain('mv-root')
  })

  it('goes back to the builder on reset', () => {
    const { session } = soloSession()
    for (const command of designCommands) session.send(command)
    session.send({ type: 'launch', payload: {} })
    session.send({ type: 'reset', payload: {} })
    expect(screen(session)).toContain('class="mb"')
  })

  it('shows the notice when a command is refused', () => {
    const { session } = soloSession()
    session.send({ type: 'set_param', payload: { key: 'bus', value: 'no-such-bus' } })
    session.send({ type: 'launch', payload: {} })
    expect(screen(session)).toContain('app-notice')
  })
})
