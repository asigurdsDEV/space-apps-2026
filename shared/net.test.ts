import { describe, expect, it } from 'vitest'
import type { Command, NetMessage, Player } from './index'
import { canSend, isCommand, isNetMessage, ownerRole, roleHolders, rolesOf, ROLES } from './index'

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

  const crew = (...roles: (Player['role'])[]) => roles.map((role, i) => ({ player_id: `p${i}`, role }))

  it('lets only the holder of the owning role send a command', () => {
    const four = crew('science', 'spacecraft', 'mission-planning', 'comms-resources')
    expect(canSend(four, 'p0', set('instruments'))).toBe(true)
    expect(canSend(four, 'p1', set('instruments'))).toBe(false)
    expect(canSend(four, 'p0', launch)).toBe(false)
    expect(canSend(four, 'p2', launch)).toBe(true)
    expect(canSend(four, 'p1', { type: 'select_entity', payload: { id: 'spacecraft' } })).toBe(true)
  })

  it('lets anyone send when the roster is empty (solo screens)', () => {
    expect(canSend([], undefined, launch)).toBe(true)
  })

  it('splits the roles nobody picked evenly: 1 → 4, 2 → 2/2, 3 → 2/1/1, 4 → 1 each', () => {
    const counts = (players: ReturnType<typeof crew>) => players.map((p) => rolesOf(players, p.player_id).length)
    expect(counts(crew(null))).toEqual([4])
    expect(counts(crew('science', 'spacecraft'))).toEqual([2, 2])
    expect(counts(crew('science', null))).toEqual([2, 2])
    expect(counts(crew('science', 'spacecraft', 'comms-resources'))).toEqual([2, 1, 1])
    expect(counts(crew('science', 'spacecraft', 'comms-resources', 'mission-planning'))).toEqual([1, 1, 1, 1])
    // Every role is held, and a picked role stays with whoever picked it.
    const two = crew('science', 'spacecraft')
    expect(Object.keys(roleHolders(two)).sort()).toEqual([...ROLES].sort())
    expect(rolesOf(two, 'p0')).toContain('science')
    expect(rolesOf(two, 'p1')).toContain('spacecraft')
    // A player holding two roles may act for both.
    const [extra] = rolesOf(two, 'p1').filter((role) => role !== 'spacecraft')
    expect(canSend(two, 'p1', { type: 'resolve_decision', payload: { decision_id: 'd', option_id: 'a' } }, extra)).toBe(true)
    expect(canSend(two, 'p0', { type: 'resolve_decision', payload: { decision_id: 'd', option_id: 'a' } }, extra)).toBe(false)
    expect(roleHolders([])).toEqual({})
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
    { type: 'pose', payload: { x: 1.5, z: -2, yaw: 0.4 } },
    { type: 'pose', payload: { x: 0, z: 0, yaw: 0, player_id: 'host' } },
    { type: 'survey', payload: { down: true, x: 1, z: -2, yaw: 0.2, lat: 36.1, lon: -112.14, placed: true, player_id: 'host' } },
    { type: 'survey', payload: { down: false, x: 0, z: 0, yaw: 0, lat: 0, lon: 0, placed: false } },
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
      { type: 'pose', payload: { x: 1, z: 0 } },
      { type: 'pose', payload: { x: 100, z: 0, yaw: 0 } },
      { type: 'pose', payload: { x: 0, z: 0, yaw: 0, player_id: '' } },
      { type: 'survey', payload: { down: true, x: 0, z: 0, yaw: 0, lat: 0, lon: 0 } },
      { type: 'survey', payload: { down: true, x: 13000, z: 0, yaw: 0, lat: 0, lon: 0, placed: true } },
      { type: 'survey', payload: { down: true, x: 0, z: 0, yaw: 0, lat: 120, lon: 0, placed: true } },
    ]
    for (const message of bad) expect(isNetMessage(message), JSON.stringify(message)).toBe(false)
    expect(isNetMessage(hostile)).toBe(false)
    expect(isCommand(hostile)).toBe(false)
  })

  it('lets a launch carry the one optional override, owned by the same role', () => {
    const anyway: Command = { type: 'launch', payload: { override: true } }
    expect(isCommand(anyway)).toBe(true)
    expect(isCommand(JSON.parse(JSON.stringify(anyway)))).toBe(true)
    expect(isCommand({ type: 'launch', payload: { override: 'yes' } })).toBe(false)
    expect(isCommand({ type: 'launch', payload: { override: true, now: true } })).toBe(false)
    expect(isCommand({ type: 'pause', payload: { override: true } })).toBe(false)
    expect(ownerRole(anyway)).toBe('mission-planning')
    expect(canSend([{ player_id: 'p0', role: 'science' }, { player_id: 'p1', role: 'mission-planning' }], 'p0', anyway)).toBe(false)
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
