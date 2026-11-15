// Renders the shell to a string (no browser): which screen shows in which phase.

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Command, Config, Player } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { DIFFICULTIES, scenarios } from '../data'
import { App, GameScreen, Room, roomError, SCENARIOS, weatherStart, withCards } from './App'
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

  it('offers every scenario in data/ with the difficulty picker and the numbers for that level', () => {
    for (const scenario of scenarios) expect(html).toContain(`<option value="${scenario.scenario_id}"`)
    for (const level of Object.values(DIFFICULTIES)) expect(html).toContain(`>${level.label}</option>`)
    expect(html).toContain(`${String(scenarios[0].params.target_science_score)} points`) // scenarioPreview is wired
  })

  it('offers today’s daily mission', () => {
    expect(html).toContain('Play daily mission')
    expect(html).toContain(`dateTime="${new Date().toISOString().slice(0, 10)}"`)
  })

  it('knows every scenario at every difficulty by id, the scenario as written first', () => {
    expect(SCENARIOS).toHaveLength(scenarios.length * Object.keys(DIFFICULTIES).length)
    expect(SCENARIOS[0]).toBe(scenarios[0])
    expect(SCENARIOS.map((scenario) => scenario.scenario_id)).toContain('mars-hard')
  })

  it('keeps play on one screen, which needs no network', () => {
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Play on one screen/)
  })

  it('lists each mission once on the one-screen strip, with its own difficulty picker', () => {
    const strip = html.slice(html.indexOf('app-same-screen'))
    expect(strip.match(/<option/g)).toHaveLength(scenarios.length + Object.keys(DIFFICULTIES).length)
    expect(strip).not.toContain('(Easy)')
    expect(strip).toContain('>Difficulty<')
  })

  it('explains a failed join without net/ jargon', () => {
    expect(roomError(true, 'Could not connect to peer smdg-ZZZZZZ')).toMatch(/^Could not join that room: no open room has that code/)
    expect(roomError(true, 'Could not connect to peer smdg-ZZZZZZ')).not.toMatch(/peer|smdg/)
    expect(roomError(true, 'Room connection timed out')).toMatch(/Could not join that room.*may be full \(4 players/)
    expect(roomError(false, 'Lost connection to server')).toMatch(/^Could not open a room \(Lost connection to server\)/)
  })
})

describe('game screen', () => {
  it('gives the builder and the flight a main landmark, and the flight an h1', () => {
    const { session } = soloSession()
    expect(screen(session)).toMatch(/<main>.*class="mb"/s)
    expect(screen(session)).not.toContain('<h1 class="app-bar-title"')
    designCommands.forEach(session.send)
    session.send({ type: 'launch', payload: {} })
    expect(screen(session)).toMatch(/<h1 class="app-bar-title">.*<main>.*class="s3d-launch/s) // the 3D launch plays first
  })

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

  it('does not replay the launch when switching from an already-launched 3D room', () => {
    const { session } = soloSession()
    designCommands.forEach(session.send)
    session.send({ type: 'launch', payload: {} })
    expect(screen(session)).toContain('s3d-launch')
    const html = renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} skipLaunch />)
    expect(html).not.toContain('s3d-launch')
    expect(html).toContain('mv-hud')
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
    const launching = screen(session)
    expect(launching).toContain('s3d-launch') // the 3D launch plays first
    expect(launching).not.toContain('class="mb"')

    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    // A reload or a late joiner lands mid-mission and goes straight to the mission screen.
    for (let i = 0; i < 100 && session.getSnapshot().state.t_s <= 86400; i++) game.advance(1000)
    expect(screen(session)).toContain('mv-root')
    for (let i = 0; i < 100; i++) game.advance(1000)
    expect(session.getSnapshot().state.status).toBe('ended')
    const results = screen(session)
    expect(results).toContain('mv-results')
    expect(results).toContain('lb-root') // ui/leaderboard
    expect(results).toContain('Design a new mission')
    expect(results).toContain('Main menu')
    expect(results).not.toContain('Save, share and compare designs')
  })

  it('offers flight training while the mission flies, and only then', () => {
    const { game, session } = soloSession()
    const button = /<button[^>]*>Flight training<\/button>/
    expect(screen(session)).not.toMatch(button) // the builder
    for (const command of designCommands) session.send(command)
    session.send({ type: 'launch', payload: {} })
    expect(screen(session)).not.toMatch(button) // the launch
    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100 && session.getSnapshot().state.t_s <= 86400; i++) game.advance(1000)
    const flying = screen(session)
    expect(flying).toMatch(button)
    expect(flying).toContain('the mission waits for you') // solo: the clock is held while it is open
    // Online the clock is the whole crew's, so it keeps running.
    const online = renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} roomCode="ABC234" />)
    expect(online).toMatch(button)
    expect(online).toContain('the mission keeps running')
    // Closed until the player opens it: none of the training is on the mission screen.
    expect(flying).not.toContain('app-training-view')
    for (let i = 0; i < 100; i++) game.advance(1000)
    expect(screen(session)).not.toMatch(button) // the results
  })

  it('replays real space weather from a day the seed picks, inside the data for a three-year mission', () => {
    expect(weatherStart(config, 1)).toBe(weatherStart(config, 1))
    expect(weatherStart(config, 1)).not.toBe(weatherStart(config, 2))
    // withCards hands the sim the same real start date plus that window's real G3+ storm days.
    const flown = withCards(config)
    expect(flown.params.weather_start).toBe(weatherStart(config, config.seed))
    expect(typeof flown.params.real_storms).toBe('string')
    expect(withCards({ ...config, params: { ...config.params, weather_start: '2003-10-01' } }).params.real_storms).toContain('28:5')
    for (const seed of [0, 1, 42, 20261114]) {
      const start = weatherStart(config, seed)
      expect(start >= '1996-01-01' && start <= '2022-01-06').toBe(true)
    }
    expect(weatherStart({ ...config, params: { ...config.params, weather_start: '2003-10-01' } }, 1)).toBe('2003-10-01')
  })

  it('keeps a daily mission’s record apart from the regular one', () => {
    const { game, session } = soloSession()
    session.send({ type: 'launch', payload: {} })
    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100; i++) game.advance(1000)
    const daily = { date: '2026-11-14', scenarioId: config.scenario_id, seed: 20261114, difficulty: 'normal' as const }
    const html = renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} daily={daily} />)
    expect(html).toContain('Daily 2026-11-14') // the share card
    expect(screen(session)).not.toContain('Daily 2026-11-14')
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
    expect(online).toContain('Crew (2)<span class="app-crew-mine"> · Science</span>')
    expect(online).toContain('ABC234')
    expect(online).toContain('Only Hana (Spacecraft)')
    expect(online).toContain('aria-label="Dismiss message"')
    expect(screen(session)).not.toContain('app-crew-menu')
  })
})
