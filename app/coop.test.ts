// Co-op sessions over LocalTransport only: no PeerJS, no network.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalTransport, type MessageHandler } from '../net'
import { isNetMessage, type Command, type Config, type NetMessage } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { createGame } from './game'
import { createGuestSession, createHostSession, STATE_INTERVAL_MS, type SessionTransport } from './session'

const config: Config = { ...demoConfig, params: { ...demoConfig.params, random_failures: false } }
const newGame = () => createGame({ config, datasets: fixtureDatasets, sim: simCore })

const set = (key: string, value: string | number = goodDesign[key] as string | number): Command => ({
  type: 'set_param',
  payload: { key, value },
})
const designCommands = Object.keys(goodDesign).map((key) => set(key))
const launch: Command = { type: 'launch', payload: {} }

type Handler = MessageHandler<NetMessage>
type Endpoint = SessionTransport & {
  /** Put anything on the wire, as a broken or hostile client could. */
  raw(message: unknown): void
  /** Every message this endpoint was handed. */
  received: NetMessage[]
  /** Messages a session tried to send that isNetMessage refuses. Must stay empty. */
  invalid: unknown[]
  /** Fire the PeerTransport-only hooks by hand. */
  players(ids: string[]): void
  status(status: 'error' | 'closed', error?: Error): void
}

/**
 * A room made of LocalTransports, wired the way PeerTransport is: what the host sends reaches
 * every guest, what a guest sends reaches only the host, and `from` is the sender's own id.
 */
function localRoom() {
  const inboxes = new Map<string, Set<Handler>>()
  function endpoint(id: string): Endpoint {
    const wire = new LocalTransport<NetMessage>(id)
    const handlers = new Set<Handler>()
    const received: NetMessage[] = []
    const invalid: unknown[] = []
    let onPlayers: ((ids: readonly string[]) => void) | undefined
    let onStatus: ((status: 'error' | 'closed', error?: Error) => void) | undefined
    handlers.add((message) => received.push(message))
    inboxes.set(id, handlers)
    wire.onMessage((message, from) => {
      for (const [other, inbox] of inboxes) {
        if (other !== id && (id === 'host' || other === 'host')) for (const handler of [...inbox]) handler(message, from)
      }
    })
    return {
      playerId: id,
      send(message) {
        // PeerTransport refuses to send anything its validator rejects, so the tests watch for it.
        if (!isNetMessage(message)) invalid.push(message)
        wire.send(message)
      },
      onMessage(handler) {
        handlers.add(handler)
        return () => void handlers.delete(handler)
      },
      onPlayers(handler) {
        onPlayers = handler
        return () => (onPlayers = undefined)
      },
      onStatus(handler) {
        onStatus = handler
        return () => (onStatus = undefined)
      },
      close() {
        wire.close()
        inboxes.delete(id)
      },
      raw: (message) => wire.send(message as NetMessage),
      received,
      invalid,
      players: (ids) => onPlayers?.(ids),
      status: (status, error) => onStatus?.(status, error),
    }
  }
  return { endpoint }
}

/** Let queued messages (microtasks) arrive. Works under fake timers too. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

/** A started room: a host called Hana and one guest per name. */
async function startRoom(...guestNames: string[]) {
  const room = localRoom()
  const game = newGame()
  const hostWire = room.endpoint('host')
  const host = createHostSession(game, hostWire, 'Hana')
  const wires = guestNames.map((name) => room.endpoint(name.toLowerCase()))
  const guests = guestNames.map((name, i) => createGuestSession(wires[i], name))
  await settle()
  host.start!()
  await settle()
  return { room, game, host, hostWire, guests, wires }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('lobby', () => {
  it('lists everyone, host first, and keeps guests waiting until the host starts', async () => {
    const room = localRoom()
    const host = createHostSession(newGame(), room.endpoint('host'), 'Hana')
    const guest = createGuestSession(room.endpoint('g1'), 'Gus')
    expect(guest.getSnapshot().stage).toBe('lobby')
    await settle()

    const names = (s: typeof host) => s.getSnapshot().players.map((p) => `${p.name}${p.is_host ? '*' : ''}`)
    expect(names(host)).toEqual(['Hana*', 'Gus'])
    expect(names(guest)).toEqual(['Hana*', 'Gus'])
    expect(guest.getSnapshot().me).toMatchObject({ player_id: 'g1', name: 'Gus', role: null, is_host: false })
    expect(host.getSnapshot().me.is_host).toBe(true)
    expect(guest.getSnapshot().stage).toBe('lobby')

    host.start!()
    await settle()
    expect(host.getSnapshot().stage).toBe('playing')
    expect(guest.getSnapshot().stage).toBe('playing')
    expect(guest.getSnapshot().state.metrics.phase).toBe('design')
    expect(guest.getSnapshot().state.params).toEqual(host.getSnapshot().state.params)
  })

  it('gives each role to one player and lets them give it up', async () => {
    const { host, guests } = await startRoom('Gus')
    const [guest] = guests
    host.claimRole!('science')
    guest.claimRole!('science')
    await settle()
    expect(guest.getSnapshot().me.role).toBeNull()
    expect(guest.getSnapshot().notice).toBe('Role is already taken')

    guest.claimRole!('spacecraft')
    await settle()
    expect(guest.getSnapshot().me.role).toBe('spacecraft')
    expect(guest.getSnapshot().notice).toBeNull()
    expect(host.getSnapshot().players.map((p) => p.role)).toEqual(['science', 'spacecraft'])

    host.claimRole!(null)
    guest.claimRole!('science')
    await settle()
    expect(host.getSnapshot().players.map((p) => [p.name, p.role])).toEqual([['Hana', null], ['Gus', 'science']])
    guest.claimRole!(null)
    await settle()
    expect(guest.getSnapshot().me.role).toBeNull()
    expect(guest.getSnapshot().players.map((p) => p.name)).toEqual(['Hana', 'Gus'])
  })

  it('refuses a fifth player', async () => {
    const { room, host, guests } = await startRoom('Ana', 'Ben', 'Cy')
    expect(host.getSnapshot().players).toHaveLength(4)
    const fifth = createGuestSession(room.endpoint('late'), 'Dee')
    await settle()
    expect(fifth.getSnapshot().stage).toBe('closed')
    expect(fifth.getSnapshot().notice).toBe('Room is full')
    expect(host.getSnapshot().players).toHaveLength(4)
    for (const guest of guests) {
      expect(guest.getSnapshot().players).toHaveLength(4)
      expect(guest.getSnapshot().notice).toBeNull()
    }
  })

  it('frees a role when its guest leaves, by message or by dropped connection', async () => {
    const { room, host, hostWire, guests } = await startRoom('Ana', 'Ben')
    const [ana, ben] = guests
    ana.claimRole!('science')
    ben.claimRole!('spacecraft')
    await settle()
    ana.close()
    await settle()
    expect(host.getSnapshot().players.map((p) => p.name)).toEqual(['Hana', 'Ben'])
    expect(ben.getSnapshot().players.map((p) => p.name)).toEqual(['Hana', 'Ben'])
    host.claimRole!('science')
    expect(host.getSnapshot().me.role).toBe('science')

    hostWire.players(['host']) // Ben's connection is gone, with no `leave` message
    expect(host.getSnapshot().players.map((p) => p.name)).toEqual(['Hana'])
    const cy = createGuestSession(room.endpoint('cy'), 'Cy')
    cy.claimRole!('spacecraft')
    await settle()
    expect(cy.getSnapshot().me.role).toBe('spacecraft')
  })

  it('sends a late joiner straight into the running game', async () => {
    const { room, host } = await startRoom()
    host.send(set('bus'))
    const late = createGuestSession(room.endpoint('late'), 'Lee')
    await settle()
    expect(late.getSnapshot().stage).toBe('playing')
    expect(late.getSnapshot().state.params.bus).toBe(goodDesign.bus)
  })
})

describe('commands', () => {
  it("runs a guest's command in the host's sim and sends the new state back", async () => {
    const { game, host, guests } = await startRoom('Gus')
    const [guest] = guests
    const before = guest.getSnapshot()
    guest.send(set('bus'))
    await settle()
    expect(game.getSnapshot().state.params.bus).toBe(goodDesign.bus)
    expect(host.getSnapshot().state.params.bus).toBe(goodDesign.bus)
    const after = guest.getSnapshot()
    expect(after).not.toBe(before)
    expect(after.state.params.bus).toBe(goodDesign.bus)
    expect(after.state.metrics.mass_kg).toBe(game.getSnapshot().state.metrics.mass_kg)
    expect(after.state.issues).toEqual(game.getSnapshot().state.issues)
    expect(after.notice).toBeNull()
  })

  it('refuses a command owned by another role, with a reason, and leaves the state alone', async () => {
    const { game, host, guests } = await startRoom('Gus')
    const [guest] = guests
    host.claimRole!('spacecraft')
    guest.claimRole!('science')
    await settle()

    const before = game.getSnapshot()
    guest.send(set('bus'))
    await settle()
    expect(game.getSnapshot()).toBe(before)
    expect(guest.getSnapshot().notice).toBe('Only Hana (Spacecraft) can change that part of the design.')
    expect(guest.getSnapshot().state.params.bus).toBe(before.state.params.bus)
    expect(host.getSnapshot().notice).toBeNull()

    // The host's own commands go through the same check.
    host.send(set('instruments'))
    expect(game.getSnapshot()).toBe(before)
    expect(host.getSnapshot().notice).toBe('Only Gus (Science) can change that part of the design.')
    host.dismissNotice()
    expect(host.getSnapshot().notice).toBeNull()

    // Each still controls their own part.
    guest.send(set('instruments'))
    host.send(set('bus'))
    await settle()
    expect(game.getSnapshot().state.params).toMatchObject({ bus: goodDesign.bus, instruments: goodDesign.instruments })
    expect(guest.getSnapshot().notice).toBeNull()
  })

  it('lets anyone send the commands of a role nobody holds', async () => {
    const { game, guests } = await startRoom('Ana', 'Ben')
    const [ana, ben] = guests
    ana.claimRole!('science')
    await settle()
    ana.send(set('orbit')) // mission planning: unclaimed
    ben.send(set('comms')) // Ben has no role at all
    await settle()
    expect(game.getSnapshot().state.params).toMatchObject({ orbit: goodDesign.orbit, comms: goodDesign.comms })
    ben.send(set('instruments')) // science is Ana's
    await settle()
    expect(game.getSnapshot().state.params.instruments).not.toBe(goodDesign.instruments)
    expect(ben.getSnapshot().notice).toMatch(/^Only Ana \(Science\)/)
    expect(ana.getSnapshot().notice).toBeNull()
  })

  it('sends a launch the sim refuses back to the guest who asked', async () => {
    const { game, guests } = await startRoom('Gus')
    guests[0].send(set('bus', 'no-such-bus'))
    guests[0].send(launch)
    await settle()
    expect(game.getSnapshot().state.metrics.phase).toBe('design')
    expect(guests[0].getSnapshot().notice).toBeTruthy()
  })

  it('takes launch, speed, pause and reset from a guest', async () => {
    const { game, host, guests } = await startRoom('Gus')
    const [guest] = guests
    for (const command of designCommands) guest.send(command)
    guest.send(launch)
    guest.send({ type: 'set_speed', payload: { multiplier: 5 } })
    guest.send({ type: 'pause', payload: {} })
    guest.send({ type: 'select_entity', payload: { id: 'spacecraft' } }) // local: never sent
    await settle()
    await new Promise((resolve) => setTimeout(resolve, STATE_INTERVAL_MS + 20))
    await settle()
    expect(game.getSnapshot()).toMatchObject({ paused: true, speed: 5 })
    expect(game.getSnapshot().state.metrics.phase).not.toBe('design')
    expect(guest.getSnapshot()).toMatchObject({ paused: true, speed: 5 })
    expect(guest.getSnapshot().state.metrics.phase).toBe(game.getSnapshot().state.metrics.phase)
    expect(host.getSnapshot()).toMatchObject({ paused: true, speed: 5 })

    guest.send({ type: 'reset', payload: {} })
    await settle()
    expect(guest.getSnapshot().state.metrics.phase).toBe('design')
    expect(guest.getSnapshot()).toMatchObject({ paused: false, speed: 1 })
    expect(guest.getSnapshot().events).toEqual(game.getSnapshot().events)
  })

  it('ignores malformed and misdirected messages', async () => {
    const { game, host, hostWire, guests, wires } = await startRoom('Gus')
    const before = game.getSnapshot()
    const roster = host.getSnapshot().players
    const hostile: unknown[] = [
      'launch',
      null,
      { type: 'command' },
      { type: 'command', payload: { command: { type: 'set_param', payload: { key: 'bus', value: { x: 1 } } } } },
      { type: 'command', payload: { command: { type: 'set_speed', payload: { multiplier: null } } } },
      { type: 'command', payload: { command: { type: 'self_destruct', payload: {} } } },
      { type: 'claim_role', payload: { role: 'captain' } },
      // Well-formed, but only the host may send these:
      { type: 'state', payload: { state: { ...before.state, params: { bus: 'hacked' } }, events: [] } },
      { type: 'roster', payload: { players: [{ player_id: 'gus', name: 'Gus', role: null, is_host: true }] } },
      { type: 'ended', payload: {} },
    ]
    for (const message of hostile) wires[0].raw(message)
    await settle()
    expect(game.getSnapshot()).toBe(before)
    expect(host.getSnapshot().players).toEqual(roster)
    expect(host.getSnapshot().stage).toBe('playing')

    // A guest ignores junk too, and never treats guest-to-host messages as its own.
    const guestBefore = guests[0].getSnapshot()
    for (const message of ['junk', { type: 'state', payload: { state: 1, events: [] } }, { type: 'join', payload: { name: 'x' } }]) {
      hostWire.raw(message)
    }
    await settle()
    expect(guests[0].getSnapshot()).toBe(guestBefore)

    // Identity is the connection, never the payload: a rejection for someone else is not shown.
    hostWire.raw({ type: 'rejected', payload: { player_id: 'someone-else', reason: 'No.' } })
    await settle()
    expect(guests[0].getSnapshot().notice).toBeNull()
  })

  it('refuses commands from someone who never joined', async () => {
    const { room, game } = await startRoom()
    const before = game.getSnapshot()
    const stranger = room.endpoint('stranger')
    stranger.raw({ type: 'command', payload: { command: set('bus') } })
    await settle()
    expect(game.getSnapshot()).toBe(before)
    expect(stranger.received.at(-1)).toMatchObject({ type: 'rejected', payload: { player_id: 'stranger' } })
  })
})

describe('flight', () => {
  it('sends state about ten times a second in flight, and always the ending', async () => {
    vi.useFakeTimers()
    const { game, host, hostWire, guests, wires } = await startRoom('Gus')
    const [guest] = guests
    for (const command of designCommands) host.send(command)
    host.send(launch)
    await settle()
    expect(guest.getSnapshot().state.metrics.phase).not.toBe('design')

    const states = () => wires[0].received.filter((m) => m.type === 'state').length
    const start = states()
    // One real second of 60 fps frames at 20x: twenty sim steps.
    host.send({ type: 'set_speed', payload: { multiplier: 20 } })
    for (let frame = 0; frame < 60; frame++) {
      game.advance(1000 / 60)
      await vi.advanceTimersByTimeAsync(1000 / 60)
    }
    await vi.advanceTimersByTimeAsync(STATE_INTERVAL_MS) // the last held-back update goes out
    await settle()
    const sent = states() - start
    expect(sent).toBeGreaterThanOrEqual(5)
    expect(sent).toBeLessThanOrEqual(12)
    expect(guest.getSnapshot().state.tick).toBe(game.getSnapshot().state.tick)
    expect(guest.getSnapshot().speed).toBe(20)

    host.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 200 && game.getSnapshot().state.status !== 'ended'; i++) game.advance(1000)
    await settle() // no timer has run: the ending is not throttled
    expect(game.getSnapshot().state.status).toBe('ended')
    expect(guest.getSnapshot().state.status).toBe('ended')
    // Through JSON, as on the wire (-0 arrives as 0).
    expect(guest.getSnapshot().events).toEqual(JSON.parse(JSON.stringify(game.getSnapshot().events)))
    expect(guest.getSnapshot().events.at(-1)?.type).toBe('scenario_ended')
    expect(hostWire.invalid).toEqual([])
    expect(wires[0].invalid).toEqual([])
    expect(guest.getSnapshot().events.length).toBeLessThan(200) // the whole list rides on every state message
  })
})

describe('closing', () => {
  it('tells guests when the host closes the room', async () => {
    const { host, guests, wires } = await startRoom('Gus')
    host.close()
    await settle()
    expect(guests[0].getSnapshot().stage).toBe('closed')
    expect(guests[0].getSnapshot().notice).toBe('The host closed the room.')
    guests[0].send(set('bus'))
    await settle()
    expect(wires[0].received.at(-1)).toMatchObject({ type: 'ended' })
  })

  it('reports a lost connection to the host', async () => {
    const { guests, wires } = await startRoom('Gus')
    wires[0].status('error', new Error('Host left the room'))
    expect(guests[0].getSnapshot().stage).toBe('closed')
    expect(guests[0].getSnapshot().notice).toBe('Host left the room')
  })

  it('lets the host keep playing alone when the online room is lost', async () => {
    const { game, host, hostWire } = await startRoom('Gus')
    hostWire.status('error', new Error('Signaling disconnected'))
    expect(host.getSnapshot().players.map((p) => p.name)).toEqual(['Hana'])
    expect(host.getSnapshot().notice).toContain('Signaling disconnected')
    host.send(set('bus'))
    expect(game.getSnapshot().state.params.bus).toBe(goodDesign.bus)
  })
})

describe('where people stand', () => {
  it('relays a pose so the other players can see who moved', async () => {
    const { host, guests } = await startRoom('Gus', 'Sam')
    const onHost: { name: string; x: number }[][] = []
    const onSam: { name: string; x: number }[][] = []
    host.subscribeCrew((crew) => onHost.push(crew.map((p) => ({ name: p.name, x: p.x }))))
    guests[1].subscribeCrew((crew) => onSam.push(crew.map((p) => ({ name: p.name, x: p.x }))))
    guests[0].reportPose({ x: 1.5, z: -2, yaw: 0.4 })
    await settle()
    expect(onHost.at(-1)).toEqual([{ name: 'Gus', x: 1.5 }])
    expect(onSam.at(-1)).toEqual([{ name: 'Gus', x: 1.5 }])
    host.reportPose({ x: -1, z: 3, yaw: 1 })
    await settle()
    expect(onSam.at(-1)).toEqual([{ name: 'Gus', x: 1.5 }, { name: 'Hana', x: -1 }])
    expect(guests[0].getSnapshot().players.map((p) => p.name)).toEqual(['Hana', 'Gus', 'Sam'])
    guests[0].close()
    host.close()
    guests[1].close()
  })
})

describe('same screen', () => {
  it('plays a whole design on one LocalTransport, every role open to the one seat', async () => {
    const game = newGame()
    const session = createHostSession(game, new LocalTransport<NetMessage>(), 'Crew')
    session.start!()
    for (const command of designCommands) session.send(command)
    session.send(launch)
    await settle() // the host's own broadcasts loop back and are ignored
    expect(session.getSnapshot().players).toHaveLength(1)
    expect(session.getSnapshot().stage).toBe('playing')
    expect(session.getSnapshot().notice).toBeNull()
    expect(game.getSnapshot().state.metrics.phase).not.toBe('design')
    session.close()
  })
})
