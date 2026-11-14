import { describe, expect, it } from 'vitest'
import { dailyMissionForDate } from './daily'
const ids = ['demo', 'moon', 'mars']
describe('daily mission selection', () => {
  it('uses UTC day, a YYYYMMDD seed and normal difficulty', () => {
    expect(dailyMissionForDate(new Date('2026-11-14T23:59:00Z'), ids)).toEqual({ date: '2026-11-14', scenarioId: 'moon', seed: 20261114, difficulty: 'normal' })
  })
  it('is stable across catalog order, duplicate IDs and local time zones', () => {
    const a = dailyMissionForDate(new Date('2026-11-14T23:30:00-08:00'), ids)
    const b = dailyMissionForDate(new Date('2026-11-15T07:30:00Z'), ['moon', 'mars', 'demo', 'demo'])
    expect(a).toEqual(b); expect(a?.date).toBe('2026-11-15')
    expect(ids).toEqual(['demo', 'moon', 'mars'])
  })
  it('changes at UTC midnight and handles month/year boundaries', () => {
    const before = dailyMissionForDate(new Date('2026-12-31T23:59:59Z'), ids)!
    const after = dailyMissionForDate(new Date('2027-01-01T00:00:00Z'), ids)!
    expect(before.seed).toBe(20261231); expect(after.seed).toBe(20270101)
    expect(ids).toContain(after.scenarioId)
  })
  it('offers no mission for empty catalogs or invalid dates', () => {
    expect(dailyMissionForDate(new Date('invalid'), ids)).toBeNull()
    expect(dailyMissionForDate(new Date('2026-11-14'), [])).toBeNull()
  })
})
