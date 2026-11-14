import { describe, expect, it } from 'vitest'
import { startRequest } from './model'
describe('start requests', () => {
  it('normalizes name and routes solo/host with the selected scenario', () => {
    for (const mode of ['solo', 'host'] as const) expect(startRequest(mode, ' Jamie ', 'demo', '')).toEqual({ mode, name: 'Jamie', scenarioId: 'demo', difficulty: 'normal' })
  })
  it('preserves full case-sensitive room codes and ignores local scenario when joining', () => {
    expect(startRequest('join', ' Jamie ', 'ignored', ' Peer-ABC-123 ')).toEqual({ mode: 'join', name: 'Jamie', code: 'Peer-ABC-123' })
    expect(startRequest('join', 'Jamie', '', 'host')).not.toBeNull()
  })
  it('passes the selected difficulty only on new missions', () => {
    expect(startRequest('host', 'Jamie', 'moon', '', 'hard')).toEqual({ mode: 'host', name: 'Jamie', scenarioId: 'moon', difficulty: 'hard' })
    expect(startRequest('join', 'Jamie', '', 'peer', 'easy')).toEqual({ mode: 'join', name: 'Jamie', code: 'peer' })
    expect(startRequest('solo', 'Jamie', 'demo', '', 'invalid' as never)).toBeNull()
  })
  it('rejects missing or oversized names, missing scenarios and blank codes', () => {
    expect(startRequest('solo', ' ', 'demo', '')).toBeNull()
    expect(startRequest('host', 'x'.repeat(41), 'demo', '')).toBeNull()
    expect(startRequest('solo', 'Jamie', '', '')).toBeNull()
    expect(startRequest('join', 'Jamie', 'demo', ' ')).toBeNull()
  })
})
