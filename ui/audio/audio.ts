// Plays the sounds in model.ts with Web Audio. No files, no dependencies.
// Browsers only allow audio after the player has clicked or tapped, which is always true here
// because every sound answers something the player did.
import { MIN_GAP_S, SOUNDS, loadMuted, loadVolume, saveMuted, saveVolume, type Noise, type SoundName, type Tone } from './model'

const storage = typeof window !== 'undefined' ? window.localStorage : undefined
const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let muted = loadMuted(storage, reducedMotion)
const listeners = new Set<() => void>()
let ctx: AudioContext | null = null
let master: GainNode | null = null
/** The player's volume, after every sound (one-shots and places alike). */
let bus: GainNode | null = null
let volume = loadVolume(storage)
let last = -Infinity
let noiseBuffer: AudioBuffer | null = null

/** The one AudioContext, created and resumed on demand. Also used by ambience.ts. */
export function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    bus = ctx.createGain()
    bus.gain.value = volume
    bus.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(bus)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function envelope(c: BaseAudioContext, dest: AudioNode, start: number, attack: number, dur: number, peak: number, hold = false): GainNode {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + Math.max(attack, 0.005))
  if (hold) g.gain.setValueAtTime(peak, start + dur - 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  g.connect(dest)
  return g
}

function playTone(c: BaseAudioContext, dest: AudioNode, t0: number, p: Tone) {
  const start = t0 + p.at
  const osc = c.createOscillator()
  osc.type = p.wave
  osc.frequency.setValueAtTime(p.freq, start)
  if (p.to) osc.frequency.exponentialRampToValueAtTime(p.to, start + p.dur)
  osc.connect(envelope(c, dest, start, 0.01, p.dur, p.gain, p.hold))
  osc.start(start)
  osc.stop(start + p.dur + 0.05)
}

function playNoise(c: BaseAudioContext, dest: AudioNode, t0: number, p: Noise) {
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
  filter.connect(envelope(c, dest, start, p.attack, p.dur, p.gain * 6)) // brown noise is quiet; boost to match the tones
  src.start(start)
  src.stop(start + p.dur + 0.05)
}

/** Plays a sound unless muted. Safe to call anywhere: does nothing without Web Audio. */
export function playSound(name: SoundName): void {
  if (muted) return
  const now = performance.now() / 1000
  // An emergency or a mission's result is never swallowed by a click just before it.
  if (now - last < MIN_GAP_S && name !== 'alarm' && name !== 'success' && name !== 'failure') return
  last = now
  const c = context()
  if (!c) return
  if (import.meta.env.DEV) heard.push({ name, at: Math.round(now * 1000) })
  scheduleSound(c, master!, name, c.currentTime + 0.01)
}

/** Schedules one sound into `dest` at context time `t0`. Also used to render a sound offline for measuring. */
export function scheduleSound(c: BaseAudioContext, dest: AudioNode, name: SoundName, t0: number): void {
  for (const p of SOUNDS[name]) {
    if (p.kind === 'tone') playTone(c, dest, t0, p)
    else playNoise(c, dest, t0, p)
  }
}

export const isMuted = () => muted

/** Where places connect, so the volume reaches them too. Null before the first sound. */
export const volumeBus = (): AudioNode | null => bus

export const getVolume = () => volume

/** Master volume, 0 to 1, remembered on this device. Works under the mute toggle, not instead of it. */
export function setVolume(next: number): void {
  volume = Math.min(1, Math.max(0, next))
  saveVolume(storage, volume)
  if (bus && ctx) bus.gain.setTargetAtTime(volume, ctx.currentTime, 0.02)
}

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

// Dev builds only: QA reads which one-shots (and the room's caution tone) played (`__sounds`), next to `__sound`.
export const heard: { name: string; at: number }[] = []
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __sounds: heard })
