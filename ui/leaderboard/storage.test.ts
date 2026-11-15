import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { savePersonalBest } from './storage'

const records = new Map<string, string>()
const key = (scenario: string) => `space-apps-2026:best:v2:${encodeURIComponent(scenario)}`

beforeEach(() => {
  records.clear()
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => records.get(name) ?? null,
    setItem: (name: string, value: string) => { records.set(name, value) },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('personal bests', () => {
  it('keeps the highest score and its original design across repeated visits', () => {
    const design = { bus: 'cubesat-6u', ground_stations: 1 }
    expect(savePersonalBest('demo', 50, design).stored).toBe(true)
    design.bus = 'changed-after-saving'
    expect(savePersonalBest('demo', 20, { bus: 'lower' }).best).toEqual({ score: 50, design: { bus: 'cubesat-6u', ground_stations: 1 } })
    expect(savePersonalBest('demo', 50, { bus: 'tied' }).best?.design.bus).toBe('cubesat-6u')
    expect(savePersonalBest('demo', 90, { bus: 'cubesat-12u' }).best?.score).toBe(90)
    expect(JSON.parse(records.get(key('demo'))!).design.bus).toBe('cubesat-12u')
  })

  it('isolates scenarios and leaves unrelated storage untouched', () => {
    records.set('another-app', 'keep me')
    savePersonalBest('demo', 99, { bus: 'earth' })
    expect(savePersonalBest('moon / one', 30, { bus: 'moon' }).best?.score).toBe(30)
    expect(JSON.parse(records.get(key('demo'))!).score).toBe(99)
    expect(records.get('another-app')).toBe('keep me')
  })

  it.each(['broken JSON', 'null', '[]', '{"score":"99","design":{}}', '{"score":99,"design":[]}', '{"score":99,"design":{"nested":{}}}'])('recovers from invalid stored data: %s', (value) => {
    records.set(key('demo'), value)
    expect(savePersonalBest('demo', 40, { bus: 'valid' })).toEqual({ best: { score: 40, design: { bus: 'valid' } }, stored: true })
  })

  it('continues when reads or writes are blocked', () => {
    const write = vi.fn()
    vi.stubGlobal('localStorage', { getItem() { throw new Error('blocked') }, setItem: write })
    expect(savePersonalBest('demo', 40, {})).toEqual({ best: { score: 40, design: {} }, stored: false })
    expect(write).not.toHaveBeenCalled()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() { throw new Error('quota') } })
    expect(savePersonalBest('demo', 40, {}).stored).toBe(false)
  })

  it('rejects invalid scores/designs without replacing a saved best', () => {
    savePersonalBest('demo', 10, {})
    for (const score of [NaN, Infinity, -Infinity]) expect(savePersonalBest('demo', score, {}).best).toBeNull()
    expect(savePersonalBest('demo', 20, { cost: NaN }).best).toBeNull()
    expect(savePersonalBest(' ', 20, {}).best).toBeNull()
    expect(JSON.parse(records.get(key('demo'))!).score).toBe(10)
  })

  it('keeps each daily seed separate from other days, scenarios and regular records', () => {
    savePersonalBest('demo', 95, { bus: 'regular' })
    savePersonalBest('demo', 80, { bus: 'today' }, { dailySeed: 20261114, stars: 2 })
    savePersonalBest('demo', 30, { bus: 'tomorrow' }, { dailySeed: 20261115, stars: 1 })
    savePersonalBest('moon', 25, { bus: 'moon' }, { dailySeed: 20261114, stars: 0 })
    expect(records.size).toBe(4)
    expect(savePersonalBest('demo', 0, {}, { dailySeed: 20261114 }).best).toEqual({ score: 80, design: { bus: 'today' }, stars: 2 })
    expect(savePersonalBest('demo', 0, {}, { dailySeed: 20261115 }).best?.score).toBe(30)
    expect(savePersonalBest('moon', 0, {}, { dailySeed: 20261114 }).best?.stars).toBe(0)
    expect(savePersonalBest('demo', 0, {}).best?.design.bus).toBe('regular')
  })

  it('keeps stars attached to the winning design, including tied/lower runs', () => {
    const dailySeed = 20261114
    savePersonalBest('demo', 80, { bus: 'first-best' }, { dailySeed, stars: 2 })
    for (const score of [60, 80]) {
      expect(savePersonalBest('demo', score, { bus: 'different' }, { dailySeed, stars: 3 }).best)
        .toEqual({ score: 80, design: { bus: 'first-best' }, stars: 2 })
    }
    expect(savePersonalBest('demo', 90, { bus: 'new-best' }, { dailySeed, stars: 3 }).best)
      .toEqual({ score: 90, design: { bus: 'new-best' }, stars: 3 })
  })

  it('reads legacy records without assigning another run\'s star count', () => {
    const legacy = JSON.stringify({ score: 95, design: { bus: 'legacy' } })
    records.set(key('demo'), legacy)
    expect(savePersonalBest('demo', 80, { bus: 'new' }, { stars: 3 }).best)
      .toEqual({ score: 95, design: { bus: 'legacy' } })
    expect(records.get(key('demo'))).toBe(legacy)
    expect(savePersonalBest('demo', 99, { bus: 'higher' }, { stars: 3 }).best?.stars).toBe(3)
  })

  it.each([-1, 4, 1.5, '3', null])('rejects malformed stars in storage: %s', (stars) => {
    records.set(key('demo'), JSON.stringify({ score: 99, design: {}, stars }))
    expect(savePersonalBest('demo', 40, { bus: 'valid' }, { stars: 1 }).best)
      .toEqual({ score: 40, design: { bus: 'valid' }, stars: 1 })
  })

  it('rejects invalid supplied seed/stars without overwriting or falling back to regular records', () => {
    savePersonalBest('demo', 70, { bus: 'keep' }, { stars: 2 })
    const saved = records.get(key('demo'))
    for (const dailySeed of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(savePersonalBest('demo', 99, {}, { dailySeed }).best).toBeNull()
    }
    for (const stars of [NaN, Infinity, -1, 1.5, 4]) {
      expect(savePersonalBest('demo', 99, {}, { stars }).best).toBeNull()
    }
    expect(records.size).toBe(1)
    expect(records.get(key('demo'))).toBe(saved)
  })

  it('retains the daily result and its stars when persistence fails', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() { throw new Error('quota') } })
    expect(savePersonalBest('demo', 80, { bus: 'today' }, { dailySeed: 20261114, stars: 2 }))
      .toEqual({ best: { score: 80, design: { bus: 'today' }, stars: 2 }, stored: false })
  })
})
