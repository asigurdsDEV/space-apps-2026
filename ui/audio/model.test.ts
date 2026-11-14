import { describe, expect, it } from 'vitest'
import { MUTE_KEY, SOUNDS, loadMuted, saveMuted, soundLength, type SoundName } from './model'

describe('sounds', () => {
  it('are short, quiet and well formed', () => {
    for (const [name, parts] of Object.entries(SOUNDS)) {
      expect(parts.length, name).toBeGreaterThan(0)
      for (const p of parts) {
        expect(p.dur, name).toBeGreaterThan(0)
        expect(p.gain, name).toBeGreaterThan(0)
        expect(p.gain, name).toBeLessThanOrEqual(0.35) // never blasts a classroom
        if (p.kind === 'tone') expect(p.freq, name).toBeGreaterThan(20)
      }
    }
    expect(soundLength('click')).toBeLessThan(0.2)
    expect(soundLength('launch' as SoundName)).toBeLessThanOrEqual(4.1)
  })
})

describe('mute choice', () => {
  const store = (value: string | null) => ({ getItem: () => value })

  it('uses the saved choice, else mutes for reduced motion', () => {
    expect(loadMuted(store('1'), false)).toBe(true)
    expect(loadMuted(store('0'), true)).toBe(false)
    expect(loadMuted(store(null), true)).toBe(true)
    expect(loadMuted(store(null), false)).toBe(false)
    expect(loadMuted(undefined, false)).toBe(false)
  })

  it('survives blocked storage', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadMuted(blocked, false)).toBe(false)
    expect(() => saveMuted(blocked, true)).not.toThrow()
    const saved: Record<string, string> = {}
    saveMuted({ setItem: (k, v) => { saved[k] = v } }, true)
    expect(saved[MUTE_KEY]).toBe('1')
  })
})
