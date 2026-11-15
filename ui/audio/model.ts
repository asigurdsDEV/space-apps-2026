// Pure: what each sound is made of, and the saved mute choice. The Web Audio engine is in audio.ts.

export type SoundName = 'click' | 'go' | 'no-go' | 'launch' | 'success' | 'failure' | 'radio-in' | 'radio-out' | 'alarm' | 'join'

/** A pitched note. `to` slides the pitch over the note. Times in seconds from the sound's start. */
export interface Tone {
  kind: 'tone'
  wave: OscillatorType
  freq: number
  to?: number
  at: number
  dur: number
  gain: number
  /** Stay at full level to the end (a beep) instead of dying away (a ping). */
  hold?: boolean
}

/** Low-passed noise (rumble, hiss). `cutoffTo` sweeps the filter; `attack` fades it in. */
export interface Noise {
  kind: 'noise'
  cutoff: number
  cutoffTo?: number
  at: number
  dur: number
  attack: number
  gain: number
}

export type Part = Tone | Noise

const tone = (freq: number, at: number, dur: number, gain: number, wave: OscillatorType = 'sine', to?: number): Tone => ({ kind: 'tone', wave, freq, to, at, dur, gain })
const beep = (freq: number, at: number, dur: number, gain: number, wave: OscillatorType = 'sine'): Tone => ({ ...tone(freq, at, dur, gain, wave), hold: true })

export const SOUNDS: Record<SoundName, Part[]> = {
  // A soft tick for picking a part.
  click: [tone(1250, 0, 0.05, 0.06)],
  // Rising two-note chime: a console calls GO.
  go: [tone(660, 0, 0.13, 0.12, 'triangle'), tone(990, 0.12, 0.2, 0.12, 'triangle')],
  // Two low falling buzzes: NO-GO.
  'no-go': [tone(220, 0, 0.17, 0.1, 'sawtooth', 180), tone(200, 0.2, 0.19, 0.1, 'sawtooth', 150)],
  // Engines: a noise rumble that opens up as the rocket climbs, with a deep tone underneath.
  launch: [
    { kind: 'noise', cutoff: 110, cutoffTo: 520, at: 0, dur: 4, attack: 0.7, gain: 0.35 },
    tone(48, 0, 3.2, 0.16, 'sine', 32),
  ],
  // Mission success: a rising major arpeggio.
  success: [tone(523, 0, 0.16, 0.11, 'triangle'), tone(659, 0.13, 0.16, 0.11, 'triangle'), tone(784, 0.26, 0.16, 0.11, 'triangle'), tone(1047, 0.39, 0.4, 0.12, 'triangle')],
  // Mission lost: a slow downward slide.
  failure: [tone(392, 0, 0.7, 0.12, 'triangle', 196), tone(196, 0.65, 0.5, 0.08, 'sine', 140)],
  // CAPCOM keys the voice loop: a quarter-second beep near 2.5 kHz opens the line and a slightly lower one closes it (our own, after the Apollo-era tones).
  'radio-in': [beep(2525, 0, 0.25, 0.03)],
  'radio-out': [beep(2475, 0, 0.25, 0.03)],
  // An emergency starts: the spacecraft room's caution tone, faster and twice as long. Urgent, then it stops.
  alarm: [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [beep(i % 2 ? 932 : 622, i * 0.16, 0.12, 0.09, 'triangle'), beep(i % 2 ? 1864 : 1244, i * 0.16, 0.12, 0.016)]),
  // A crew member joins: two soft rising notes.
  join: [tone(784, 0, 0.12, 0.08, 'triangle'), tone(1175, 0.1, 0.2, 0.08, 'triangle')],
}

/** Seconds until a sound has fully finished. */
export const soundLength = (name: SoundName) => Math.max(...SOUNDS[name].map((p) => p.at + p.dur))

export const MUTE_KEY = 'smdg-sound-muted'

/** Saved choice wins; with none saved, start muted for players who asked for reduced motion. */
export function loadMuted(storage: Pick<Storage, 'getItem'> | undefined, reducedMotion: boolean): boolean {
  try {
    const saved = storage?.getItem(MUTE_KEY)
    if (saved === '1') return true
    if (saved === '0') return false
  } catch {
    // storage blocked (private mode): fall through to the default
  }
  return reducedMotion
}

export function saveMuted(storage: Pick<Storage, 'setItem'> | undefined, muted: boolean): void {
  try {
    storage?.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // not saved; the choice still lasts for this visit
  }
}

export const VOLUME_KEY = 'smdg-sound-volume'

/** The saved master volume, 0 to 1; full when nothing is saved. */
export function loadVolume(storage: Pick<Storage, 'getItem'> | undefined): number {
  try {
    const saved = storage?.getItem(VOLUME_KEY)
    if (saved != null && saved !== '' && Number(saved) >= 0 && Number(saved) <= 1) return Number(saved)
  } catch {
    // storage blocked: full volume
  }
  return 1
}

export function saveVolume(storage: Pick<Storage, 'setItem'> | undefined, volume: number): void {
  try {
    storage?.setItem(VOLUME_KEY, String(volume))
  } catch {
    // not saved; the choice still lasts for this visit
  }
}

/** Interface sounds closer together than this are clutter: the second is dropped. */
export const MIN_GAP_S = 0.06
