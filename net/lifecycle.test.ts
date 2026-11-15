import { expect, it, vi } from 'vitest'
import { PeerTransport, type DataChannel, type PeerEndpoint } from './peer-transport'
import { isNetMessage, type NetMessage } from '../shared'
import { createGame } from '../app/game'
import { createGuestSession, createHostSession } from '../app/session'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets } from '../sim/testing/fixtures'

// Real transports and app sessions; only PeerJS's browser/network surface is replaced.
class Emitter {
  handlers = new Map<string, ((...args: any[]) => void)[]>()
  on(event: string, handler: (...args: any[]) => void): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]); return this
  }
  emit(event: string, ...args: unknown[]) { for (const handler of this.handlers.get(event) ?? []) handler(...args) }
}
class Channel extends Emitter implements DataChannel {
  open = false
  other?: Channel
  constructor(readonly peer: string) { super() }
  send(message: unknown) { this.other?.emit('data', JSON.parse(JSON.stringify(message))) }
  close() { this.open = false; this.emit('close') }
  start() { this.open = true; this.emit('open') }
}
class Peer extends Emitter implements PeerEndpoint {
  outgoing?: Channel
  connect(id: string) { return this.outgoing = new Channel(id) }
  destroy() { this.emit('close') }
}

it.each(['throw', 'close'])('keeps app rosters aligned on a synchronous %s during broadcast, then permits rejoin', async failure => {
  const peer = new Peer()
  const wire = new PeerTransport<NetMessage>(peer, { validate: isNetMessage })
  peer.emit('open', 'host'); await wire.ready
  const game = createGame({ config: demoConfig, datasets: fixtureDatasets, sim: simCore })
  const host = createHostSession(game, wire, 'Host')
  const broken = new Channel('departing')
  peer.emit('connection', broken); broken.start()
  broken.emit('data', { type: 'join', payload: { name: 'Departing' } })
  broken.emit('data', { type: 'claim_role', payload: { role: 'science' } })

  const guestPeer = new Peer()
  const guestWire = new PeerTransport<NetMessage>(guestPeer, { validate: isNetMessage, hostId: 'host' })
  guestPeer.emit('open', 'healthy')
  const incoming = new Channel('healthy')
  incoming.other = guestPeer.outgoing; guestPeer.outgoing!.other = incoming
  peer.emit('connection', incoming); incoming.start(); guestPeer.outgoing!.start()
  await guestWire.ready
  const guest = createGuestSession(guestWire, 'Healthy')
  try {
    expect(guest.getSnapshot().players.map(p => p.player_id)).toEqual(['host', 'departing', 'healthy'])
    vi.spyOn(broken, 'send').mockImplementation(() => {
      if (failure === 'throw') throw new Error('connection lost')
      broken.close()
    })
    guest.claimRole!('spacecraft') // broadcasts a roster; first recipient fails
    expect(host.getSnapshot().players.map(p => p.player_id)).toEqual(['host', 'healthy'])
    expect(guest.getSnapshot().players).toEqual(host.getSnapshot().players)
    guest.claimRole!('science')
    expect(guest.getSnapshot().me.role).toBe('science')

    const replacement = new Channel('departing')
    peer.emit('connection', replacement); replacement.start()
    replacement.emit('data', { type: 'join', payload: { name: 'Rejoined' } })
    broken.emit('close') // a stale close must not evict the replacement
    expect(guest.getSnapshot().players.map(p => p.name)).toEqual(['Host', 'Healthy', 'Rejoined'])
    expect(wire.players).toContain('departing')
    expect(wire.status).toBe('ready')
    host.claimRole!('mission-planning')
    guest.claimRole!('science')
    replacement.emit('data', { type: 'claim_role', payload: { role: 'comms-resources' } })
    await Promise.resolve()
    host.start!()
    expect(guest.getSnapshot().stage).toBe('playing')
    expect(guest.getSnapshot().state).toEqual(expect.objectContaining({ scenario_id: demoConfig.scenario_id }))
  } finally {
    guest.close(); host.close()
  }
})
