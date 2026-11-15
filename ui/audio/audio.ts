// Plays the sounds in model.ts with Web Audio. No files, no dependencies.
// Browsers only allow audio after the player has clicked or tapped, which is always true here
// because every sound answers something the player did.
import { SOUNDS, loadMuted, saveMuted, type Noise, type SoundName, type Tone } from './model'

const storage = typeof window !== 'undefined' ? window.localStorage : undefined
const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let muted = loadMuted(storage, reducedMotion)
const listeners = new Set<() => void>()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

/** The one AudioContext, created and resumed on demand. Also used by ambience.ts. */
export function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function envelope(c: AudioContext, start: number, attack: number, dur: number, peak: number): GainNode {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + Math.max(attack, 0.005))
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  g.connect(master!)
  return g
}

function playTone(c: AudioContext, t0: number, p: Tone) {
  const start = t0 + p.at
  const osc = c.createOscillator()
  osc.type = p.wave
  osc.frequency.setValueAtTime(p.freq, start)
  if (p.to) osc.frequency.exponentialRampToValueAtTime(p.to, start + p.dur)
  osc.connect(envelope(c, start, 0.01, p.dur, p.gain))
  osc.start(start)
  osc.stop(start + p.dur + 0.05)
}

function playNoise(c: AudioContext, t0: number, p: Noise) {
  const start = t0 + p.at
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    let last = 0
    // Brown noise: a random walk, deeper than white noise, like engine roar.
    for (let i = 0; i < data.length; i++) data[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
  }
  const src = c.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(p.cutoff, start)
  if (p.cutoffTo) filter.frequency.exponentialRampToValueAtTime(p.cutoffTo, start + p.dur)
  src.connect(filter)
  filter.connect(envelope(c, start, p.attack, p.dur, p.gain * 6)) // brown noise is quiet; boost to match the tones
  src.start(start)
  src.stop(start + p.dur + 0.05)
}

/** Plays a sound unless muted. Safe to call anywhere: does nothing without Web Audio. */
export function playSound(name: SoundName): void {
  if (muted) return
  const c = context()
  if (!c) return
  const t0 = c.currentTime + 0.01
  for (const p of SOUNDS[name]) {
    if (p.kind === 'tone') playTone(c, t0, p)
    else playNoise(c, t0, p)
  }
}

export const isMuted = () => muted

export function setMuted(next: boolean): void {
  if (next === muted) return
  muted = next
  saveMuted(storage, muted)
  if (!muted) context() // unlock audio inside the click that turned sound on
  for (const l of [...listeners]) l()
}

/** For useSyncExternalStore. */
export function onMuteChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
