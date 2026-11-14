import { describe, expect, it } from 'vitest'
import { HostRoom } from './room'
const roles = ['mission-planning', 'spacecraft', 'science', 'comms-resources'] as const
type Role = typeof roles[number]
const create = () => new HostRoom<Role, { role: Role }>('host', 'Jamie', roles, (role, command) => role === command.role)

describe('HostRoom', () => {
  it('limits room to host plus three and does not replace an existing identity', () => {
    const room = create()
    for (const id of ['a', 'b', 'c']) expect(room.join(id, id)).toEqual({ ok: true })
    expect(room.join('d', 'd').ok).toBe(false); expect(room.join('host', 'spoof').ok).toBe(false)
    expect(room.players[0].name).toBe('Jamie'); expect(room.players).toHaveLength(4)
  })
  it('claims roles atomically, permits switching, and releases them on leave', () => {
    const room = create(); room.join('a', 'A'); room.join('b', 'B')
    expect(room.claimRole('a', 'science').ok).toBe(true); expect(room.claimRole('b', 'science').ok).toBe(false)
    expect(room.claimRole('a', 'spacecraft').ok).toBe(true); expect(room.claimRole('b', 'science').ok).toBe(true)
    room.leave('b'); expect(room.claimRole('host', 'science').ok).toBe(true)
    expect(room.claimRole('stranger', 'science').ok).toBe(false)
    expect(room.claimRole('host', 'admin' as Role).ok).toBe(false)
  })
  it('uses authoritative assigned roles to authorize commands', () => {
    const room = create(); room.join('guest', 'Guest')
    expect(room.authorize('guest', { role: 'science' }).ok).toBe(false)
    room.claimRole('guest', 'science')
    expect(room.authorize('guest', { role: 'science' }).ok).toBe(true)
    expect(room.authorize('guest', { role: 'spacecraft' }).ok).toBe(false)
    expect(room.authorize('stranger', { role: 'science' }).ok).toBe(false)
  })
  it('returns defensive roster copies and ends permanently when host leaves', () => {
    const room = create(); room.players[0].name = 'Changed'; expect(room.players[0].name).toBe('Jamie')
    room.leave('host'); expect(room.players).toEqual([]); expect(room.join('a', 'A').ok).toBe(false)
    expect(room.claimRole('host', 'science').ok).toBe(false); expect(room.authorize('host', { role: 'science' }).ok).toBe(false)
  })
})
