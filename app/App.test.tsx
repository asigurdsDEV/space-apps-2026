// Renders the shell to a string (no browser): which screen shows in which phase.

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Command, Config, Player } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { App, GameScreen, Shell } from './App'
import { createGame } from './game'
import { Lobby } from './Lobby'
import { createSoloSession, type Session, type SessionSnapshot } from './session'
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
  it('shows the scenario title and the four ways to play', () => {
    const html = renderToStaticMarkup(<Shell config={config} datasets={fixtureDatasets} />)
    expect(html).toContain(config.title)
    for (const label of ['Play solo', 'Same screen', 'Host a game']) {
      expect(html).toMatch(new RegExp(`<button(?![^>]*disabled)[^>]*>${label}`))
    }
    // Join needs a room code first.
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Join a game/)
    expect(html).toContain('Room code')
    expect(html).not.toContain('Coming soon')
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

describe('co-op screens', () => {
  const players: Player[] = [
    { player_id: 'h', name: 'Hana', role: 'spacecraft', is_host: true },
    { player_id: 'g', name: 'Gus', role: 'science', is_host: false },
  ]
  /** A session frozen on one snapshot, seen by the guest Gus. */
  function frozen(overrides: Partial<SessionSnapshot>): Session {
    const snapshot: SessionSnapshot = { ...soloSession().session.getSnapshot(), players, me: players[1], ...overrides }
    return {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      send() {},
      dismissNotice() {},
      claimRole() {},
      start() {},
      close() {},
    }
  }

  it('shows the room code, the roster and a role picker with taken roles disabled', () => {
    const html = renderToStaticMarkup(<Lobby session={frozen({ stage: 'lobby' })} roomCode="ABC234" onExit={() => {}} />)
    expect(html).toContain('ABC234')
    expect(html).toContain('Copy code')
    expect(html).toContain('Hana')
    expect(html).toContain('Gus (you)')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Spacecraft/) // Hana's
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*aria-pressed="true"[^>]*>Science/) // mine
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*aria-pressed="false"[^>]*>Mission planning/)
    expect(html).toContain('Waiting for Hana to start the mission.')
    expect(html).not.toContain('Start mission')
  })

  it('lets the host start the mission', () => {
    const session = frozen({ stage: 'lobby', me: players[0] })
    expect(renderToStaticMarkup(<Lobby session={session} roomCode="ABC234" onExit={() => {}} />)).toContain('Start mission')
  })

  it('puts the crew menu in the top bar of an online game, and a dismiss button on the notice', () => {
    const session = frozen({ notice: 'Only Hana (Spacecraft) can change that part of the design.' })
    const online = renderToStaticMarkup(
      <GameScreen session={session} config={config} datasets={fixtureDatasets} onExit={() => {}} roomCode="ABC234" />,
    )
    expect(online).toContain('Crew (2) · Science')
    expect(online).toContain('ABC234')
    expect(online).toContain('Only Hana (Spacecraft)')
    expect(online).toContain('aria-label="Dismiss message"')
    expect(screen(session)).not.toContain('app-crew-menu')
  })
})
