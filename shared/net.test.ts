import { describe, expect, it } from 'vitest'
import type { Command, NetMessage, Player } from './index'
import { canSend, isCommand, isNetMessage, ownerRole, ROLES } from './index'

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

describe('runtime validators', () => {
  const state = {
    contract_version: '0.1', scenario_id: 'demo', tick: 0, t_s: 0, utc: '2026-11-14T09:00:00Z', frame: 'scene',
    status: 'running', entities: [{ id: 'sat', kind: 'spacecraft', name: 'Sat', position: [1, 2, 3], props: { mass_kg: 4 } }],
    metrics: { phase: 'design', mass_kg: 12 }, params: { bus: 'smallsat', ground_stations: 2, armed: true },
    issues: [{ code: 'mass_over_limit', severity: 'error', resource: 'mass', message: 'Too heavy.' }], rng_state: 7,
  }
  const events = [
    { tick: 0, t_s: 0, type: 'scenario_started', payload: { scenario_id: 'demo' } },
    { tick: 1, t_s: 60, type: 'threshold_crossed', payload: { metric: 'mass_kg', value: 9, threshold: 8, direction: 'up' } },
    { tick: 2, t_s: 120, type: 'scenario_ended', payload: { reason: 'success', summary: { science_score: 80 } } },
  ]
  const player = { player_id: 'p1', name: 'Ethan', role: 'science', is_host: true }
  const good: unknown[] = [
    { type: 'join', payload: { name: 'Sarah' } },
    { type: 'claim_role', payload: { role: 'science' } },
    { type: 'claim_role', payload: { role: null } },
    { type: 'command', payload: { command: launch } },
    { type: 'command', payload: { command: { type: 'set_speed', payload: { multiplier: 5 } } } },
    { type: 'command', payload: { command: { type: 'select_entity', payload: { id: null } } } },
    { type: 'leave', payload: {} },
    { type: 'roster', payload: { players: [player] } },
    { type: 'state', payload: { state, events } },
    { type: 'rejected', payload: { player_id: 'p2', reason: 'No.', command: set('bus') } },
    { type: 'rejected', payload: { player_id: 'p2', reason: 'Room is full' } },
    { type: 'ended', payload: {} },
  ]

  it('accepts every well-formed message, before and after a JSON round trip', () => {
    for (const message of good) {
      expect(isNetMessage(message), JSON.stringify(message)).toBe(true)
      expect(isNetMessage(JSON.parse(JSON.stringify(message)))).toBe(true)
    }
    const unsetMetric = { ...state, metrics: { phase: 'design', mass_kg: undefined } }
    expect(isNetMessage({ type: 'state', payload: { state: unsetMetric, events: [] } })).toBe(true)
  })

  it('lets an event type it does not know through, so a new sim event cannot stop co-op (CONTRACTS rule 7)', () => {
    const added = { tick: 3, t_s: 3, type: 'eclipse_started', payload: { orbit: 'sso', depth: 0.4 } }
    expect(isNetMessage({ type: 'state', payload: { state, events: [added] } })).toBe(true)
  })

  it('refuses anything else without throwing', () => {
    const hostile = new Proxy({}, { get() { throw new Error('boom') } })
    const bad: unknown[] = [
      null, undefined, 42, 'join', [], {},
      { type: 'nope', payload: {} },
      { type: 'join' },
      { type: 'join', payload: { name: 7 } },
      { type: 'join', payload: { name: 'x'.repeat(500) } },
      { type: 'claim_role', payload: { role: 'captain' } },
      { type: 'claim_role', payload: {} },
      { type: 'leave', payload: { extra: 1 } },
      { type: 'command', payload: {} },
      { type: 'command', payload: { command: { type: 'self_destruct', payload: {} } } },
      { type: 'command', payload: { command: { type: 'set_speed', payload: { multiplier: Infinity } } } },
      { type: 'command', payload: { command: { type: 'set_speed', payload: { multiplier: '5' } } } },
      { type: 'command', payload: { command: { type: 'set_param', payload: { key: 'bus', value: NaN } } } },
      { type: 'command', payload: { command: { type: 'set_param', payload: { key: 'bus', value: { deep: 1 } } } } },
      { type: 'command', payload: { command: { type: 'set_param', payload: { key: '', value: 1 } } } },
      { type: 'command', payload: { command: { type: 'set_param', payload: { value: 1 } } } },
      { type: 'command', payload: { command: { type: 'launch' } } },
      { type: 'roster', payload: { players: [{ ...player, role: 'pilot' }] } },
      { type: 'roster', payload: { players: [{ ...player, is_host: 'yes' }] } },
      { type: 'roster', payload: { players: Array(5).fill(player) } },
      { type: 'roster', payload: { players: 'everyone' } },
      { type: 'state', payload: { state: { ...state, tick: NaN }, events: [] } },
      { type: 'state', payload: { state: { ...state, status: 'exploded' }, events: [] } },
      { type: 'state', payload: { state: { ...state, entities: [{ id: 'sat' }] }, events: [] } },
      { type: 'state', payload: { state: { ...state, metrics: { mass_kg: null } }, events: [] } },
      { type: 'state', payload: { state, events: [{ tick: 0, t_s: 0, type: 'warning', payload: {} }] } },
      { type: 'state', payload: { state, events: [{ tick: 0, t_s: 0, type: 'mystery', payload: { nested: { deep: 1 } } }] } },
      { type: 'state', payload: { state, events: [{ tick: 0, t_s: 0, type: 7, payload: {} }] } },
      { type: 'state', payload: { state } },
      { type: 'rejected', payload: { player_id: 'p2' } },
      { type: 'rejected', payload: { player_id: 'p2', reason: 'No.', command: { type: 'nope' } } },
      { type: 'ended', payload: null },
    ]
    for (const message of bad) expect(isNetMessage(message), JSON.stringify(message)).toBe(false)
    expect(isNetMessage(hostile)).toBe(false)
    expect(isCommand(hostile)).toBe(false)
  })

  it('checks a bare Command the same way', () => {
    expect(isCommand(launch)).toBe(true)
    expect(isCommand(set('bus'))).toBe(true)
    expect(isCommand({ type: 'set_param', payload: { key: 'ground_stations', value: 3 } })).toBe(true)
    expect(isCommand({ type: 'launch', payload: { now: true } })).toBe(false)
    expect(isCommand({ type: 'set_speed', payload: { multiplier: -Infinity } })).toBe(false)
    expect(isCommand('launch')).toBe(false)
  })
})
