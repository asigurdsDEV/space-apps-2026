// Renders the shell to a string (no browser): which screen shows in which phase.

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Command, Config, Player } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { DIFFICULTIES, scenarios } from '../data'
import { App, GameScreen, Room, SCENARIOS } from './App'
import { createGame } from './game'
import { createSoloSession, type Session, type SessionSnapshot } from './session'

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
  renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} />)

describe('start screen', () => {
  const html = renderToStaticMarkup(<App />)

  it('is the real Start screen with solo, host and join, inside the shared theme', () => {
    expect(html).toContain('class="game-theme app"')
    expect(html).toContain('ss-root')
    for (const label of ['Play solo', 'Host online', 'Join a room']) expect(html).toContain(label)
  })

  it('offers every scenario in data/ at every difficulty', () => {
    expect(SCENARIOS).toHaveLength(scenarios.length * Object.keys(DIFFICULTIES).length)
    for (const scenario of SCENARIOS) expect(html).toContain(`<option value="${scenario.scenario_id}"`)
    expect(SCENARIOS[0]).toBe(scenarios[0]) // the first scenario as written is the default
    expect(SCENARIOS.map((scenario) => scenario.scenario_id)).toContain('mars-hard')
  })

  it('keeps play on one screen, which needs no network', () => {
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Play on one screen/)
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

  it('puts save, share and compare under the builder', () => {
    const html = screen(soloSession().session)
    expect(html).toContain('Save, share and compare designs')
    expect(html).toContain('aria-label="Save and share"')
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
    const results = screen(session)
    expect(results).toContain('mv-results')
    expect(results).toContain('Your mission record') // ui/leaderboard
    expect(results).toContain('Design a new mission')
    expect(results).toContain('Main menu')
    expect(results).not.toContain('Save, share and compare designs')
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

  const room = (session: Session) =>
    renderToStaticMarkup(<Room active={{ session, roomCode: 'ABC234' }} onExit={() => {}} />)

  it('shows ui/lobby while the crew gathers: room code, roster, taken roles disabled', () => {
    const html = room(frozen({ stage: 'lobby' }))
    expect(html).toContain('ls-root')
    expect(html).toContain('ABC234')
    expect(html).toContain('Gus</strong> (you)')
    expect(html).toMatch(/<button[^>]*disabled[^>]*><strong>Spacecraft/) // Hana's
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*aria-pressed="true"[^>]*><strong>Science/) // mine
    expect(html).toContain('Waiting for the host')
    expect(html).not.toContain('Continue to briefing')
  })

  it('lets the host continue to the briefing', () => {
    expect(room(frozen({ stage: 'lobby', me: players[0] }))).toContain('Continue to briefing')
  })

  it('shows every player the briefing of the scenario the host picked, then the builder with role locks', () => {
    const mars = SCENARIOS.find((scenario) => scenario.scenario_id === 'mars')!
    const game = createGame({ config: mars, datasets: fixtureDatasets, sim: simCore })
    const html = room(frozen({ ...game.getSnapshot() }))
    expect(html).toContain('Mission briefing')
    expect(html).toContain(mars.title)
    // After the briefing: Gus holds Science, so Hana's Spacecraft sections are locked for him.
    const builder = screen(frozen({}))
    expect(builder).toContain('class="mb"')
    expect(builder).toContain('Hana')
  })

  it('shows the closed-room page with a way back to the main menu', () => {
    const html = room(frozen({ stage: 'closed', notice: 'The host closed the room.' }))
    expect(html).toContain('The room is closed')
    expect(html).toContain('The host closed the room.')
    expect(html).toContain('Main menu')
  })

  it('puts the crew menu in the top bar of an online game, and a dismiss button on the notice', () => {
    const session = frozen({ notice: 'Only Hana (Spacecraft) can change that part of the design.' })
    const online = renderToStaticMarkup(
      <GameScreen session={session} config={config} onExit={() => {}} roomCode="ABC234" />,
    )
    expect(online).toContain('Crew (2) · Science')
    expect(online).toContain('ABC234')
    expect(online).toContain('Only Hana (Spacecraft)')
    expect(online).toContain('aria-label="Dismiss message"')
    expect(screen(session)).not.toContain('app-crew-menu')
  })
})
