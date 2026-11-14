import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_NAME, NAME_KEY, readName, rememberName } from './name'

describe('player name preference', () => {
  it('uses the saved name and writes only its own key', () => {
    const store = { getItem: vi.fn(() => ' Jamie '), setItem: vi.fn() } as unknown as Storage
    expect(readName(store)).toBe('Jamie')
    rememberName('Jamie', store)
    expect(store.setItem).toHaveBeenCalledWith(NAME_KEY, 'Jamie')
  })
  it('defaults malformed preferences and survives blocked storage', () => {
    for (const value of [null, '  ', 'x'.repeat(41)]) expect(readName({ getItem: () => value })).toBe(DEFAULT_NAME)
    const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') } } as unknown as Storage
    expect(readName(blocked)).toBe(DEFAULT_NAME)
    expect(() => rememberName('Jamie', blocked)).not.toThrow()
  })
})
