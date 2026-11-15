import { describe, expect, it } from 'vitest'
import type { Player } from '../../shared'
import { crewReady, roleChoices, waitingForRoles } from './model'
const host: Player = { player_id: 'host', name: 'Jamie', role: 'science', is_host: true }
const guest: Player = { player_id: 'guest', name: 'Ethan', role: 'spacecraft', is_host: false }
describe('lobby role choices', () => {
  it('marks own role releasable, occupied roles taken, and empty roles available', () => {
    const choices = roleChoices([host, guest], 'host')
    expect(choices).toHaveLength(4)
    expect(choices.find(choice => choice.role === 'science')).toMatchObject({ mine: true, taken: false, owner: host })
    expect(choices.find(choice => choice.role === 'spacecraft')).toMatchObject({ mine: false, taken: true, owner: guest })
    expect(choices.find(choice => choice.role === 'mission-planning')).toMatchObject({ mine: false, taken: false, owner: undefined })
  })
  it('is ready only when every player in the room holds a role', () => {
    expect(crewReady([host, guest])).toBe(true)
    expect(crewReady([host, { ...guest, role: null }])).toBe(false)
    expect(crewReady([])).toBe(false)
  })
  it('releases a departed player’s role from the next authoritative roster', () => {
    expect(roleChoices([host], 'host').find(choice => choice.role === 'spacecraft')?.taken).toBe(false)
    expect(guest.role).toBe('spacecraft')
  })
  it('names who the host is still waiting for', () => {
    expect(waitingForRoles([host, guest])).toBeNull()
    expect(waitingForRoles([host, { ...guest, name: 'Sam', role: null }])).toBe('Waiting for Sam to pick a role')
    expect(waitingForRoles([{ ...host, role: null }, { ...guest, role: null }, { ...guest, name: 'Sam', role: null }]))
      .toBe('Waiting for Jamie, Ethan and Sam to pick a role')
  })
})
