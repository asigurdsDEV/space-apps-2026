import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalTransport } from './transport'
import { PeerTransport, type DataChannel, type PeerEndpoint } from './peer-transport'

class Emitter {
  handlers = new Map<string, ((...args: any[]) => void)[]>()
  on(event: string, handler: (...args: any[]) => void): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]); return this
  }
  emit(event: string, ...args: unknown[]): void { for (const handler of this.handlers.get(event) ?? []) handler(...args) }
}
class Channel extends Emitter implements DataChannel {
  open = false
  sent: unknown[] = []
  constructor(readonly peer: string) { super() }
  send(data: unknown): void { this.sent.push(data) }
  close(): void { this.open = false; this.emit('close') }
  start(): void { this.open = true; this.emit('open') }
}
class Peer extends Emitter implements PeerEndpoint {
  destroyed = false
  outgoing?: Channel
  connect(id: string): Channel { this.outgoing = new Channel(id); return this.outgoing }
  destroy(): void { this.destroyed = true; this.emit('close') }
}
type Message = { text: string }
const validate = (data: unknown): data is Message => typeof data === 'object' && data !== null && typeof (data as Message).text === 'string'
const hosts: PeerTransport<Message>[] = []
function host() {
  const peer = new Peer(); const transport = new PeerTransport(peer, { validate }); hosts.push(transport)
  peer.emit('open', 'host'); return { peer, transport }
}
function guest() {
  const peer = new Peer(); const transport = new PeerTransport(peer, { validate, hostId: 'host' }); hosts.push(transport)
  peer.emit('open', 'guest'); return { peer, transport, channel: peer.outgoing! }
}
afterEach(() => { for (const transport of hosts.splice(0)) transport.close(); vi.useRealTimers() })

describe('LocalTransport', () => {
  it('isolates queued messages from sender mutation and supports unsubscribe', async () => {
    const transport = new LocalTransport<Message>(); const received = vi.fn(); const unsubscribe = transport.onMessage(received)
    const message = { text: 'before' }; transport.send(message); message.text = 'after'
    expect(received).not.toHaveBeenCalled(); await Promise.resolve()
    expect(received).toHaveBeenCalledWith({ text: 'before' }, 'local')
    unsubscribe(); transport.send(message); await Promise.resolve(); expect(received).toHaveBeenCalledTimes(1)
    transport.close(); expect(() => transport.send(message)).toThrow('closed')
  })
  it('drops queued delivery after close', async () => {
    const transport = new LocalTransport<Message>(); const received = vi.fn(); transport.onMessage(received)
    transport.send({ text: 'hi' }); transport.close(); await Promise.resolve(); expect(received).not.toHaveBeenCalled()
  })
})

describe('PeerTransport', () => {
  it('settles a failed synchronous connect and releases its timer', async () => {
    vi.useFakeTimers()
    const peer = new Peer()
    vi.spyOn(peer, 'connect').mockImplementation(() => { throw new Error('WebRTC unavailable') })
    const transport = new PeerTransport(peer, { validate, hostId: 'host' }); hosts.push(transport)
    expect(() => peer.emit('open', 'guest')).not.toThrow()
    await expect(transport.ready).rejects.toThrow('WebRTC unavailable')
    expect(peer.destroyed).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('closes late opens from an expired channel without disturbing its replacement', async () => {
    vi.useFakeTimers()
    const { peer, transport } = host()
    const expired = new Channel('guest'); peer.emit('connection', expired)
    await vi.advanceTimersByTimeAsync(15_000)
    const replacement = new Channel('guest'); peer.emit('connection', replacement); replacement.start()
    const players = vi.fn(); transport.onPlayers(players); players.mockClear()
    const receive = vi.fn(); transport.onMessage(receive)
    expired.start()
    expect(expired.open).toBe(false)
    expired.emit('data', { text: 'stale' }); expired.close()
    expect(players).not.toHaveBeenCalled()
    expect(receive).not.toHaveBeenCalled()
    transport.send({ text: 'current' })
    expect(replacement.sent).toEqual([{ text: 'current' }])
  })
  it('makes host ready with shareable peer id and broadcasts only to open guests', async () => {
    const { peer, transport } = host(); expect(await transport.ready).toBe('host'); expect(transport.roomCode).toBe('host')
    const first = new Channel('first'); const pending = new Channel('pending')
    peer.emit('connection', first); peer.emit('connection', pending); first.start()
    transport.send({ text: 'snapshot' }); expect(first.sent).toEqual([{ text: 'snapshot' }]); expect(pending.sent).toEqual([])
    expect(transport.players).toEqual(['host', 'first'])
  })
  it('counts pending connections toward the four-player cap and frees disconnected slots', () => {
    const { peer, transport } = host()
    const channels = Array.from({ length: 4 }, (_, i) => new Channel(`guest-${i}`))
    for (const channel of channels) peer.emit('connection', channel)
    channels[3].start(); channels[3].emit('data', { text: 'ignored' })
    const receive = vi.fn(); transport.onMessage(receive); channels[3].emit('data', { text: 'ignored' }); expect(receive).not.toHaveBeenCalled()
    channels[0].close(); const replacement = new Channel('replacement'); peer.emit('connection', replacement); replacement.start()
    expect(transport.players).toContain('replacement')
  })
  it('attributes sender from channel identity and discards malformed messages', () => {
    const { peer, transport } = host(); const channel = new Channel('actual-sender'); peer.emit('connection', channel); channel.start()
    const receive = vi.fn(); transport.onMessage(receive)
    channel.emit('data', { type: 'bad' }); channel.emit('data', { text: 'hi', player_id: 'forged-host' })
    expect(receive).toHaveBeenCalledTimes(1); expect(receive.mock.calls[0][1]).toBe('actual-sender')
  })
  it('does not replace an existing channel with a duplicate identity', () => {
    const { peer, transport } = host(); const first = new Channel('guest'); const duplicate = new Channel('guest')
    peer.emit('connection', first); first.start(); peer.emit('connection', duplicate)
    transport.send({ text: 'hi' }); expect(first.sent).toHaveLength(1); expect(duplicate.sent).toHaveLength(0)
  })
  it('waits for the host data channel and rejects unexpected guest connections', async () => {
    const { peer, transport, channel } = guest(); expect(transport.status).toBe('connecting')
    expect(() => transport.send({ text: 'early' })).toThrow('not ready'); channel.start(); await transport.ready
    const stranger = new Channel('stranger'); const close = vi.spyOn(stranger, 'close'); peer.emit('connection', stranger); expect(close).toHaveBeenCalled()
    transport.send({ text: 'command' }); expect(channel.sent).toEqual([{ text: 'command' }]); expect(transport.players).toEqual(['guest', 'host'])
  })
  it('ends guests when host disconnects and publishes error for fallback', async () => {
    const { transport, channel } = guest(); channel.start(); await transport.ready
    const status = vi.fn(); transport.onStatus(status); channel.close()
    expect(transport.status).toBe('error'); expect(status).toHaveBeenLastCalledWith('error', expect.any(Error))
    expect(() => transport.send({ text: 'late' })).toThrow()
  })
  it('times out stalled signaling and destroys the peer', async () => {
    vi.useFakeTimers(); const peer = new Peer(); const transport = new PeerTransport(peer, { validate, timeoutMs: 10 }); hosts.push(transport)
    const rejection = expect(transport.ready).rejects.toThrow('timed out'); await vi.advanceTimersByTimeAsync(10); await rejection
    expect(peer.destroyed).toBe(true); expect(transport.status).toBe('error'); expect(vi.getTimerCount()).toBe(0)
  })
  it('releases a pending host slot on timeout', async () => {
    vi.useFakeTimers(); const { peer, transport } = host(); peer.emit('connection', new Channel('stalled'))
    await vi.advanceTimersByTimeAsync(15_000)
    expect(transport.status).toBe('ready'); expect(transport.players).toEqual(['host'])
  })
  it('cleans timers and does not reopen after explicit close', async () => {
    vi.useFakeTimers(); const peer = new Peer(); const transport = new PeerTransport(peer, { validate }); hosts.push(transport)
    transport.close(); peer.emit('open', 'late'); await expect(transport.ready).rejects.toThrow('closed')
    expect(transport.status).toBe('closed'); expect(peer.destroyed).toBe(true); expect(vi.getTimerCount()).toBe(0)
  })
  it('rejects malformed outgoing messages and contains a failed guest send', () => {
    const { peer, transport } = host(); const broken = new Channel('broken'); const healthy = new Channel('healthy')
    peer.emit('connection', broken); peer.emit('connection', healthy); broken.start(); healthy.start()
    vi.spyOn(broken, 'send').mockImplementation(() => { throw new Error('closed') })
    expect(() => transport.send({ text: 4 } as unknown as Message)).toThrow('Invalid')
    transport.send({ text: 'state' }); expect(healthy.sent).toHaveLength(1); expect(transport.players).not.toContain('broken')
  })
})
