import { describe, expect, it, vi } from 'vitest'
import { createLocalRoom, createRoomSession } from './rooms'
import { isNetMessage } from './validate'
import type { NetMessage } from '../shared'
import type { MessageHandler, Transport } from './transport'
class Wire implements Transport<NetMessage> {
  sent: NetMessage[] = []
  handler?: MessageHandler<NetMessage>
  send(message: NetMessage) { this.sent.push(message) }
  onMessage(handler: MessageHandler<NetMessage>) { this.handler = handler; return () => { this.handler = undefined } }
  receive(message: NetMessage, from: string) { this.handler?.(message, from) }
  close() {}
}
describe('shared-protocol rooms', () => {
  it('allows solo commands without requiring a claimed role', async () => {
    const room = createLocalRoom('Jamie'); const receive = vi.fn(); room.transport.onMessage(receive)
    room.transport.send({ type: 'command', payload: { command: { type: 'launch', payload: {} } } })
    expect(receive).toHaveBeenCalledWith(expect.objectContaining({ type: 'command' }), 'local')
    await Promise.resolve(); room.close(); room.close()
  })
  it('handles join, exclusive role claims, null unclaim and authoritative command permissions', () => {
    const wire = new Wire(); const room = createRoomSession(wire, 'host', 'Jamie', 'host'); const receive = vi.fn(); room.transport.onMessage(receive)
    wire.receive({ type: 'join', payload: { name: 'A' } }, 'a')
    wire.receive({ type: 'join', payload: { name: 'B' } }, 'b')
    wire.receive({ type: 'claim_role', payload: { role: 'science' } }, 'a')
    wire.receive({ type: 'claim_role', payload: { role: 'science' } }, 'b')
    expect(wire.sent.at(-1)?.type).toBe('rejected')
    wire.receive({ type: 'command', payload: { command: { type: 'set_param', payload: { key: 'instruments', value: 'camera' } } } }, 'b')
    expect(wire.sent.at(-1)?.type).toBe('rejected')
    wire.receive({ type: 'claim_role', payload: { role: null } }, 'a')
    wire.receive({ type: 'command', payload: { command: { type: 'set_param', payload: { key: 'instruments', value: 'camera' } } } }, 'b')
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'command' }), 'b')
    room.close()
  })
  it('ignores host-only envelopes from guests and commands from unknown senders', () => {
    const wire = new Wire(); const room = createRoomSession(wire, 'host', 'Jamie', 'host'); const receive = vi.fn(); room.transport.onMessage(receive)
    wire.receive({ type: 'roster', payload: { players: [] } }, 'stranger')
    expect(receive).not.toHaveBeenCalled()
    wire.receive({ type: 'command', payload: { command: { type: 'reset', payload: {} } } }, 'stranger')
    expect(wire.sent.at(-1)?.type).toBe('rejected'); room.close()
  })
  it('guests update self from host roster and cannot send state/roster', () => {
    const wire = new Wire(); const room = createRoomSession(wire, 'guest', 'A', 'host', 'host')
    expect(wire.sent[0]).toEqual({ type: 'join', payload: { name: 'A' } })
    const roster: NetMessage = { type: 'roster', payload: { players: [{ player_id: 'guest', name: 'A', role: 'science', is_host: false }] } }
    wire.receive(roster, 'spoof'); expect(room.self.role).toBe(null)
    wire.receive(roster, 'host'); expect(room.self.role).toBe('science')
    expect(() => room.transport.send(roster)).toThrow('Only host'); room.close()
  })
  it('contains send failures during cleanup after disconnection', () => {
    const wire = new Wire(); const room = createRoomSession(wire, 'host', 'Jamie', 'host')
    vi.spyOn(wire, 'send').mockImplementation(() => { throw new Error('closed') })
    expect(() => room.close()).not.toThrow()
  })
  it('validates discriminants, payloads, roles and finite numeric values', () => {
    expect(isNetMessage(null)).toBe(false)
    expect(isNetMessage({ type: 'claim_role', payload: { role: 'admin' } })).toBe(false)
    expect(isNetMessage({ type: 'claim_role', payload: { role: null } })).toBe(true)
    expect(isNetMessage({ type: 'command', payload: { command: { type: 'set_speed', payload: { multiplier: Infinity } } } })).toBe(false)
    expect(isNetMessage({ type: 'state', payload: { state: {}, events: [] } })).toBe(false)
    expect(isNetMessage({ type: 'roster', payload: { players: Array(5).fill({ player_id: 'a', name: 'A', role: null, is_host: false }) } })).toBe(false)
    expect(isNetMessage({ type: 'command', payload: { command: { type: 'set_param', payload: { key: 'orbit', value: 'sso' } } } })).toBe(true)
  })
})
