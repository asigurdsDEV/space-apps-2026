// Renders the shell to a string (no browser): which screen shows in which phase.

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Command, Config, Player } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { DIFFICULTIES, scenarios } from '../data'
import { App, GameScreen, Room, roomError, SCENARIOS, weatherStart, withCards } from './App'
import { createGame } from './game'
import { createSoloSession, type Session, type SessionSnapshot } from './session'
import { DailyEventDialog } from './DailyEventDialog'
import { eventMission, withEvent, type DailyEvent } from './dailyEvent'

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

  it('opens the guided mission board inside the shared theme', () => {
    expect(html).toContain('class="game-theme app"')
    expect(html).toContain('Build your space program')
    expect(html).toContain('Start guided mission')
  })

  it('shows only the first funded assignment as available to new players', () => {
    expect(html).toContain('Funded · Ready to fly')
    expect(html).toContain('Complete mission 1 to unlock')
    expect(html).not.toContain('<option')
  })

  it('keeps free play, Daily and online accessible through the original Start flow', () => {
    expect(html).toContain('Free play, Daily &amp; online')
  })

  it('preserves explicit Classic links and their solo/co-op automation landing', () => {
    vi.stubGlobal('location', { search: '?world=classic', hash: '' })
    try {
      const classic = renderToStaticMarkup(<App />)
      expect(classic).toContain('ss-root')
      expect(classic).toContain('>Start</button>')
      expect(classic).toContain('Play daily mission')
      expect(classic).toContain('Play on one screen')
      expect(classic).toContain('Guided missions')
      expect(classic).not.toContain('Start guided mission')
    } finally { vi.unstubAllGlobals() }
  })

  it('knows every scenario at every difficulty by id, the scenario as written first', () => {
    expect(SCENARIOS).toHaveLength(scenarios.length * Object.keys(DIFFICULTIES).length)
    expect(SCENARIOS[0]).toBe(scenarios[0])
    expect(SCENARIOS.map((scenario) => scenario.scenario_id)).toContain('mars-hard')
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

  it('opens on the mission, with a way back, when switched from the walkable game', () => {
    const { session } = soloSession()
    designCommands.forEach(session.send)
    session.send({ type: 'launch', payload: {} })
    const html = renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} skipLaunch onFirstPerson={() => {}} />)
    expect(html).not.toContain('s3d-launch')
    expect(html).toContain('mv-hud')
    expect(html).toContain('First person')
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
    const button = /<button[^>]*>Survey the planet<\/button>/
    expect(screen(session)).not.toMatch(button) // the builder
    for (const command of designCommands) session.send(command)
    session.send({ type: 'launch', payload: {} })
    expect(screen(session)).not.toMatch(button) // the launch
    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100 && session.getSnapshot().state.t_s <= 86400; i++) game.advance(1000)
    const flying = screen(session)
    expect(flying).toMatch(button)
    expect(flying).toMatch(/<button[^>]*>Live Earth<\/button>/)
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
      reportPose() {},
      subscribeCrew(listener) {
        listener([])
        return () => {}
      },
      reportSurvey() {},
      subscribeSurvey(listener) {
        listener({ lat: 0, lon: 0, placed: false, landed: false }, [])
        return () => {}
      },
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

  it('lets the host continue to the briefing once every player has a role', () => {
    const html = room(frozen({ stage: 'lobby', me: players[0] }))
    expect(html).toContain('Continue to briefing')
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Continue to briefing<\/button>/)
  })

  it('holds the host until every player has a role', () => {
    const waiting = [players[0], { ...players[1], role: null }]
    const html = room(frozen({ stage: 'lobby', me: waiting[0], players: waiting }))
    expect(html).toContain('Every player needs a role')
    expect(html).toContain(`Waiting for ${players[1].name} to pick a role`)
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Continue to briefing<\/button>/)
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
    expect(online).toContain('Crew (2)<span class="app-crew-mine"> · Science + Comms and resources</span>')
    expect(online).toContain('ABC234')
    expect(online).toContain('Only Hana (Spacecraft)')
    expect(online).toContain('aria-label="Dismiss message"')
    expect(screen(session)).not.toContain('app-crew-menu')
  })
})

describe('a daily built on a real event', () => {
  const event = (kind: DailyEvent['kind'], card: DailyEvent['card']): DailyEvent =>
    ({ kind, card, title: 'Severe storm: Typhoon <b>A</b>', text: 'NASA’s event tracker lists Typhoon A.', source: 'NASA EONET', asOf: '2026-11-12T06:00:00.000Z' })
  const daily = { date: '2026-11-15', scenarioId: 'mars', seed: 20261115, difficulty: 'normal' as const, name: 'Ada' }

  it('shows the event, its source and time, and three real buttons before it starts', () => {
    const html = renderToStaticMarkup(
      <DailyEventDialog event={event('severe-storm', 'station-bumped')} mission="First Light" onStart={() => {}} onCancel={() => {}} />,
    )
    expect(html).toMatch(/^<dialog class="game-theme app-world-menu app-daily-event" data-theme="dark" aria-labelledby="[^"]+">/)
    expect(html).toContain('Today’s event</h1>')
    expect(html).toContain('<h2>Severe storm: Typhoon &lt;b&gt;A&lt;/b&gt;</h2>') // feed text is text, never markup
    expect(html).toContain('NASA’s event tracker lists Typhoon A.')
    expect(html).toContain('Today’s daily mission is First Light.')
    expect(html).toContain('Source: NASA EONET, as of <time dateTime="2026-11-12T06:00:00.000Z">12 Nov 2026, 06:00 UTC</time>.')
    expect(html.match(/<button type="button" class="game-button"[^>]*>([^<]+)/g)?.map((b) => b.replace(/.*>/, ''))).toEqual(['Start daily mission', 'See it live', 'Cancel'])
  })

  it('flies First Light with the event’s card as the first alarm, through the same params every game gets', () => {
    const cases = [['solar-storm', 'geomagnetic-storm'], ['severe-storm', 'station-bumped'], ['debris', 'debris-pass']] as const
    for (const [kind, card] of cases) {
      const mission = eventMission(daily, event(kind, card))
      const flown = withCards(withEvent({ ...SCENARIOS.find((s) => s.scenario_id === mission.scenarioId)!, seed: mission.seed }, mission.event))
      expect(flown.title).toContain('First Light')
      expect(flown.params.anomaly_cards).toBe(DIFFICULTIES.normal.anomaly_cards)
      const game = createGame({ config: flown, datasets: fixtureDatasets, sim: simCore })
      const session = createSoloSession(game)
      // A 12U bus has the thruster the debris card needs.
      for (const [key, value] of Object.entries({ ...goodDesign, bus: 'cubesat-12u' })) session.send({ type: 'set_param', payload: { key, value } })
      session.send({ type: 'launch', payload: {} })
      session.send({ type: 'set_speed', payload: { multiplier: 60 } })
      for (let i = 0; i < 400 && !session.getSnapshot().state.metrics.decision_card; i++) game.advance(1000)
      expect(session.getSnapshot().state.metrics.decision_card).toBe(card)
      expect(session.getSnapshot().state.metrics.cards_drawn).toBe(card)
    }
  })

  it('keeps its record in a slot of its own, and its share card still says Daily', () => {
    const mission = eventMission(daily, event('severe-storm', 'station-bumped'))
    expect(mission.seed).not.toBe(daily.seed)
    const { game, session } = soloSession()
    session.send({ type: 'launch', payload: {} })
    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100; i++) game.advance(1000)
    const html = renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} daily={mission} />)
    expect(html).toContain('Daily 2026-11-15')
  })
})
