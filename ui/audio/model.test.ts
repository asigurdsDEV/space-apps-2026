import { describe, expect, it } from 'vitest'
import { MUTE_KEY, SOUNDS, VOLUME_KEY, loadMuted, loadVolume, saveMuted, saveVolume, soundLength, type SoundName } from './model'

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
    // Interface sounds stay short; only the alarm and the two results run longer.
    for (const name of ['click', 'go', 'no-go', 'radio-in', 'radio-out', 'join'] as SoundName[]) expect(soundLength(name), name).toBeLessThan(0.4)
    expect(soundLength('alarm')).toBeLessThan(1.5)
    expect(SOUNDS['radio-in'][0]).toMatchObject({ freq: 2525, dur: 0.25, hold: true })
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

describe('volume', () => {
  it('is full by default, keeps a saved level from 0 to 1 and survives blocked storage', () => {
    const saved: Record<string, string> = {}
    saveVolume({ setItem: (k, v) => { saved[k] = v } }, 0.35)
    expect(loadVolume({ getItem: (k) => saved[k] ?? null })).toBe(0.35)
    expect(loadVolume({ getItem: () => '0' })).toBe(0)
    expect(loadVolume({ getItem: () => null })).toBe(1)
    expect(loadVolume({ getItem: () => 'loud' })).toBe(1)
    expect(loadVolume({ getItem: () => { throw new Error('blocked') } })).toBe(1)
    expect(saved[VOLUME_KEY]).toBe('0.35')
  })
})
