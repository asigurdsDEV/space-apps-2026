import { describe, expect, it } from 'vitest'
import type { Command, NetMessage, Player } from './index'
import { canSend, ownerRole, ROLES } from './index'

const set = (key: string): Command => ({ type: 'set_param', payload: { key, value: 'x' } })
const launch: Command = { type: 'launch', payload: {} }

describe('role permissions', () => {
  it('maps each design choice to one role', () => {
    expect(ownerRole(set('instruments'))).toBe('science')
    expect(ownerRole(set('bus'))).toBe('spacecraft')
    expect(ownerRole(set('comms'))).toBe('comms-resources')
    expect(ownerRole(set('orbit'))).toBe('mission-planning')
    expect(ownerRole(set('something_else'))).toBe('mission-planning')
    expect(ownerRole(launch)).toBe('mission-planning')
    expect(ownerRole({ type: 'select_entity', payload: { id: null } })).toBeNull()
  })

  it('lets only the owning role send a command when that role is taken', () => {
    expect(canSend('science', set('instruments'), ROLES)).toBe(true)
    expect(canSend('spacecraft', set('instruments'), ROLES)).toBe(false)
    expect(canSend('science', launch, ROLES)).toBe(false)
    expect(canSend(null, { type: 'select_entity', payload: { id: 'spacecraft' } }, ROLES)).toBe(true)
  })

  it('lets anyone cover a role nobody has claimed', () => {
    expect(canSend('science', set('bus'), ['science', 'mission-planning'])).toBe(true)
    expect(canSend('science', launch, ['science'])).toBe(true)
    expect(canSend(null, launch, [])).toBe(true)
    expect(canSend('science', launch, ['science', 'mission-planning'])).toBe(false)
  })

  it('types the message envelope', () => {
    const host: Player = { player_id: 'p1', name: 'Ethan', role: 'mission-planning', is_host: true }
    const messages: NetMessage[] = [
      { type: 'join', payload: { name: 'Sarah' } },
      { type: 'claim_role', payload: { role: 'science' } },
      { type: 'command', payload: { command: launch } },
      { type: 'roster', payload: { players: [host] } },
      { type: 'rejected', payload: { player_id: 'p2', reason: 'Only mission planning can launch.', command: launch } },
    ]
    expect(messages).toHaveLength(5)
  })
})
