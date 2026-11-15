// Regression tests for the review of app/ and shared/: the real demo scenario from data/,
// played solo and in a room wired like PeerTransport (which refuses messages of 16,300 bytes).

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDatasets, getScenario } from '../data'
import { LocalTransport, type MessageHandler } from '../net'
import { canSend, isCommand, isNetMessage, ownerRole, ROLES, type Command, type Entity, type NetMessage, type Player } from '../shared'
import { simCore } from '../sim'
import { DEFAULT_SLOTS } from '../ui/builder'
import { BASELINE, GameScreen, SCENARIOS } from './App'
import { startDriver, timerClock } from './driver'
import { createGame } from './game'
import { createGuestSession, createHostSession, createSoloSession, type SessionTransport } from './session'

const config = getScenario('demo')!
const datasets = getDatasets(config.datasets)
const baseline = BASELINE
const newGame = () => createGame({ config, datasets, sim: simCore })

const set = (key: string, value: string | number): Command => ({ type: 'set_param', payload: { key, value } })
const launch: Command = { type: 'launch', payload: {} }

/** Well under PeerJS's 16,300-byte limit for one JSON message. */
const MAX_MESSAGE_BYTES = 12000

type Handler = MessageHandler<NetMessage>

/** Host and guests on LocalTransports. `sent` is every message the host put on the wire. */
function room() {
  const inboxes = new Map<string, Set<Handler>>()
  const sent: NetMessage[] = []
  let hostStatus: ((status: 'error', error?: Error) => void) | undefined
  function endpoint(id: string): SessionTransport {
    const wire = new LocalTransport<NetMessage>(id)
    const handlers = new Set<Handler>()
    inboxes.set(id, handlers)
    wire.onMessage((message, from) => {
      for (const [other, inbox] of inboxes) {
        if (other !== id && (id === 'host' || other === 'host')) for (const handler of [...inbox]) handler(message, from)
      }
    })
    return {
      playerId: id,
      send(message) {
        if (id === 'host') sent.push(message)
        wire.send(message)
      },
      onMessage(handler) {
        handlers.add(handler)
        return () => void handlers.delete(handler)
      },
      onStatus(handler) {
        if (id === 'host') hostStatus = handler
        return () => {}
      },
      close: () => wire.close(),
    }
  }
  return { endpoint, sent, loseRoom: () => hostStatus?.('error', new Error('x')) }
}

/** What a value looks like after the JSON trip over the wire (-0 becomes 0). */
const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Guests rebuild the entity list from their own catalog copy, so only its order may differ from the host's. */
const byId = (entities: readonly Entity[]) => [...entities].sort((a, b) => a.id.localeCompare(b.id))

async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

function lobbyRoles(host: { claimRole?: (role: (typeof ROLES)[number]) => void }, guests: { claimRole?: (role: (typeof ROLES)[number]) => void }[]) {
  const seats = [host, ...guests]
  seats.forEach((seat, index) => seat.claimRole?.(ROLES[index % ROLES.length]!))
}

/** The seat holding `command`'s role: with fewer than four players the roles nobody picked are shared out (decision 013). */
const holderOf = <S extends { getSnapshot(): { players: Player[]; me: Player } }>(seats: S[], command: Command): S =>
  seats.find((seat) => canSend(seat.getSnapshot().players, seat.getSnapshot().me.player_id, command))!

async function startRoom(...names: string[]) {
  const r = room()
  const game = newGame()
  const host = createHostSession(game, r.endpoint('host'), 'Hana', { baseline })
  const guests = names.map((name) => createGuestSession(r.endpoint(name.toLowerCase()), name, { baseline }))
  await settle()
  lobbyRoles(host, guests)
  await settle()
  host.start!()
  await settle()
  host.claimRole!(null)
  for (const guest of guests) guest.claimRole!(null)
  await settle()
  return { ...r, game, host, guests }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('the real demo scenario', () => {
  it('launches from the scenario’s own design and flies to the results', () => {
    const game = newGame()
    const session = createSoloSession(game)
    session.send(launch)
    expect(session.getSnapshot().notice).toBeNull()
    expect(session.getSnapshot().state.metrics.phase).not.toBe('design')
    session.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100; i++) game.advance(1000)
    expect(session.getSnapshot().state.status).toBe('ended')
    const html = renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} />)
    expect(html).toContain('mv-root')
    expect(html).not.toContain('undefined')
  })

  it('shows a catalog for every slot, with the scenario’s parts picked', () => {
    const session = createSoloSession(newGame())
    const html = renderToStaticMarkup(<GameScreen session={session} config={config} onExit={() => {}} />)
    expect(html).not.toContain('catalog loaded yet')
    expect(html).toContain('id="mb-bus-cubesat-12u"')
    for (const key of ['orbit', 'bus', 'solar', 'battery', 'comms', 'launch_vehicle']) {
      const id = `mb-${key}-${String(config.params[key])}`
      expect(html).toMatch(new RegExp(`<input(?=[^>]*id="${id}")(?=[^>]*checked)`))
    }
    // Batteries and power sources are separate lists.
    expect(html).not.toContain(`id="mb-solar-${String(config.params.battery)}"`)
    expect(html).not.toContain(`id="mb-battery-${String(config.params.solar)}"`)
  })

  it('lets a player pick a bigger bus and another battery without losing the solar panel', () => {
    const session = createSoloSession(newGame())
    session.send(set('bus', 'cubesat-12u'))
    session.send(set('battery', 'battery-medium'))
    const { params } = session.getSnapshot().state
    expect(params).toMatchObject({ bus: 'cubesat-12u', battery: 'battery-medium', solar: config.params.solar })
  })

  it('gives every builder slot to the role that should own it', () => {
    const owners = Object.fromEntries(DEFAULT_SLOTS.map((slot) => [slot.key, ownerRole(set(slot.key, 'x'))]))
    expect(owners).toEqual({
      orbit: 'mission-planning',
      launch_vehicle: 'mission-planning',
      bus: 'spacecraft',
      solar: 'spacecraft',
      battery: 'spacecraft',
      instruments: 'science',
      comms: 'comms-resources',
    })
  })
})

describe('state messages', () => {
  it('can leave the catalogs out in every scenario and difficulty the Start screen offers', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(9)
    for (const scenario of SCENARIOS) {
      const ids = new Set(simCore.init(scenario, getDatasets(scenario.datasets)).entities.map((entity) => entity.id))
      expect(BASELINE.filter((entity) => !ids.has(entity.id))).toEqual([])
    }
  })

  it('tells a guest which scenario the host picked, and stays small in the biggest one', async () => {
    const r = room()
    const mars = SCENARIOS.find((scenario) => scenario.scenario_id === 'mars-hard')!
    const host = createHostSession(createGame({ config: mars, datasets: getDatasets(mars.datasets), sim: simCore }), r.endpoint('host'), 'Hana', { baseline })
    const guest = createGuestSession(r.endpoint('g'), 'Gus', { baseline })
    await settle()
    host.claimRole!(ROLES[0])
    guest.claimRole!(ROLES[1])
    await settle()
    host.start!()
    await settle()
    expect(guest.getSnapshot().state.scenario_id).toBe('mars-hard')
    expect(byId(guest.getSnapshot().state.entities)).toEqual(byId(wire(host.getSnapshot().state.entities)))
    for (const message of r.sent) expect(JSON.stringify(message).length).toBeLessThan(MAX_MESSAGE_BYTES)
  })

  it('stay small through refused launches, a late joiner, a whole flight and a reset', async () => {
    const { endpoint, sent, game, host, guests } = await startRoom('Gus')
    const [gus] = guests
    const planner = holderOf([host, gus], launch)
    const builder = holderOf([host, gus], set('bus', ''))
    builder.send(set('bus', 'no-such-bus'))
    await settle()
    for (let i = 0; i < 12; i++) planner.send(launch)
    await settle()
    expect(planner.getSnapshot().notice).toBeTruthy()
    expect(game.getSnapshot().events.filter((event) => event.type === 'warning')).toHaveLength(1)

    builder.send(set('bus', String(config.params.bus)))
    await settle()
    planner.send(launch)
    await settle()
    expect(game.getSnapshot().state.metrics.phase).not.toBe('design')
    expect(game.getSnapshot().events.some((event) => event.type === 'warning')).toBe(false)
    expect(gus.getSnapshot().events).toEqual(wire(game.getSnapshot().events))

    const late = createGuestSession(endpoint('late'), 'Lea', { baseline })
    await settle()
    expect(byId(late.getSnapshot().state.entities)).toEqual(byId(wire(game.getSnapshot().state.entities)))
    expect(late.getSnapshot().events).toEqual(wire(game.getSnapshot().events))

    host.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100; i++) game.advance(1000)
    await settle()
    for (const guest of [gus, late]) {
      const seen = guest.getSnapshot()
      expect(seen.state.status).toBe('ended')
      expect(byId(seen.state.entities)).toEqual(byId(wire(game.getSnapshot().state.entities)))
      expect(seen.events).toEqual(wire(game.getSnapshot().events))
    }

    host.send({ type: 'reset', payload: {} })
    await settle()
    expect(gus.getSnapshot().state.metrics.phase).toBe('design')
    expect(gus.getSnapshot().events).toEqual(wire(game.getSnapshot().events))

    expect(sent.filter((message) => message.type === 'state').length).toBeGreaterThan(5)
    for (const message of sent) {
      expect(isNetMessage(message)).toBe(true)
      expect(JSON.stringify(message).length).toBeLessThan(MAX_MESSAGE_BYTES)
    }
  })

  it('closes a guest whose catalogs differ from the host’s instead of drawing half a state', async () => {
    const r = room()
    const host = createHostSession(newGame(), r.endpoint('host'), 'Hana', { baseline })
    const guest = createGuestSession(r.endpoint('g'), 'Gus', { baseline: baseline.slice(1) })
    await settle()
    host.claimRole!(ROLES[0])
    guest.claimRole!(ROLES[1])
    await settle()
    host.start!()
    await settle()
    expect(guest.getSnapshot().stage).toBe('closed')
  })
})

describe('commands from guests', () => {
  it('refuses a set_param value too long for the host to send back out', () => {
    expect(isCommand(set('bus', 'x'.repeat(2000)))).toBe(false)
    expect(isCommand(set('bus', 'x'.repeat(201)))).toBe(false)
    expect(isCommand(set('instruments', 'camera-basic,ir-spectrometer,magnetometer'))).toBe(true)
  })

  it('keeps the state sendable after the longest value a guest may set', async () => {
    const { sent, guests, host } = await startRoom('Gus', 'Ben')
    guests[0].send(set('bus', 'x'.repeat(200)))
    guests[0].send(launch)
    await settle()
    expect(guests[1].getSnapshot().state.params.bus).toBe('x'.repeat(200))
    expect(sent.every((message) => isNetMessage(message))).toBe(true)
    expect(host.getSnapshot().notice).toBeNull()
  })

  it('refuses keys no role owns, such as the budget', async () => {
    const { game, guests, sent } = await startRoom('Gus')
    const keys = Object.keys(game.getSnapshot().state.params).length
    guests[0].send(set('budget_usd', 1e12))
    for (let i = 0; i < 40; i++) guests[0].send(set(`made_up_${i}`, 'x'))
    await settle()
    expect(game.getSnapshot().state.params.budget_usd).toBe(config.params.budget_usd)
    expect(Object.keys(game.getSnapshot().state.params)).toHaveLength(keys)
    expect(guests[0].getSnapshot().notice).toMatch(/not a part of the design/)
    expect(JSON.stringify(sent.at(-1)).length).toBeLessThan(MAX_MESSAGE_BYTES)
  })

  it('refuses design changes in flight without filling the event list', async () => {
    const { game, host, guests } = await startRoom('Gus')
    holderOf([host, ...guests], launch).send(launch)
    await settle()
    const before = game.getSnapshot().events.length
    for (let i = 0; i < 50; i++) guests[0].send(set('bus', 'cubesat-12u'))
    await settle()
    game.advance(5000)
    expect(game.getSnapshot().events.filter((event) => event.type === 'warning')).toHaveLength(0)
    expect(game.getSnapshot().events.length).toBeGreaterThanOrEqual(before)
    expect(guests[0].getSnapshot().notice).toBe('The design is locked after launch.')
  })
})

describe('host', () => {
  it('keeps the room-lost notice through later commands, until it is dismissed', async () => {
    const { host, loseRoom } = await startRoom('Gus')
    loseRoom()
    expect(host.getSnapshot().notice).toContain('The online room was lost')
    host.send(set('bus', 'cubesat-12u'))
    expect(host.getSnapshot().notice).toContain('The online room was lost')
    host.dismissNotice()
    host.send(set('bus', 'cubesat-6u'))
    expect(host.getSnapshot().notice).toBeNull()
  })

  it('has a clock that keeps running without requestAnimationFrame (a hidden tab)', () => {
    vi.useFakeTimers()
    const frame = vi.fn(() => 0) // a hidden tab accepts the request and never calls back
    vi.stubGlobal('requestAnimationFrame', frame)
    const advance = vi.fn()
    const stop = startDriver({ advance }, timerClock())
    vi.advanceTimersByTime(1000)
    stop()
    expect(frame).not.toHaveBeenCalled()
    expect(advance.mock.calls.length).toBeGreaterThanOrEqual(10)
    const total = advance.mock.calls.reduce((sum, [ms]) => sum + (ms as number), 0)
    expect(total).toBeGreaterThan(900)
  })
})
