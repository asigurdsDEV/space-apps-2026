import { describe, expect, it } from 'vitest'
import type { Player } from '../../shared'
import { roleChoices } from './model'
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
  it('releases a departed player’s role from the next authoritative roster', () => {
    expect(roleChoices([host], 'host').find(choice => choice.role === 'spacecraft')?.taken).toBe(false)
    expect(guest.role).toBe('spacecraft')
  })
})
