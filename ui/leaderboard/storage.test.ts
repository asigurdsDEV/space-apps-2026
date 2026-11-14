import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { savePersonalBest } from './storage'

const records = new Map<string, string>()
const key = (scenario: string) => `space-apps-2026:best:v1:${encodeURIComponent(scenario)}`

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
})
