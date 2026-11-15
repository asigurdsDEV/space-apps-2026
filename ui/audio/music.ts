// Quiet background music for the menus, the lobby and the rooms: a slow ambient pad made in Web Audio, no files.
// Starts after the player's first click or key, obeys mute and volume, stops in a hidden tab, and never plays during
// the launch (the climb and the spacecraft's release): ambience.ts holds it with holdMusic().
import { context, isMuted, onMuteChange, volumeBus } from './audio'

/** One chord every BAR seconds, looped: soft, open voicings in C (Cmaj9, Am9, Fmaj7#11, G6sus). Hz, low to high. */
export const CHORDS: readonly (readonly number[])[] = [
  [65.41, 196.0, 246.94, 293.66, 329.63],
  [55.0, 164.81, 196.0, 246.94, 261.63],
  [43.65, 174.61, 220.0, 246.94, 329.63],
  [49.0, 146.83, 196.0, 220.0, 329.63],
]
export const BAR = 9
/** Peak level at the output: under the room beds and well under every sound effect. */
export const LEVEL = 0.05

export interface Music {
  out: GainNode
  stop(): void
}

export function startMusic(ctx: BaseAudioContext, dest: AudioNode): Music {
  const out = ctx.createGain()
  out.gain.value = 0
  // A dark, wide pad: low-passed, with a slow echo for space.
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 1100
  const echo = ctx.createDelay(2)
  echo.delayTime.value = 0.61
  const feedback = ctx.createGain()
  feedback.gain.value = 0.35
  tone.connect(out)
  tone.connect(echo).connect(feedback).connect(echo)
  feedback.connect(out)
  out.connect(dest)

  let bar = 0
  let next = ctx.currentTime + 0.1
  const voices = new Set<OscillatorNode>()
  // Each chord swells in over 3 s, holds, and fades while the next one comes in.
  const play = (chord: readonly number[], at: number) => {
    chord.forEach((freq, i) => {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator()
        osc.type = i === 0 ? 'sine' : 'triangle'
        osc.frequency.value = freq
        osc.detune.value = detune
        const env = ctx.createGain()
        const peak = (i === 0 ? 0.5 : 0.22) / chord.length
        env.gain.setValueAtTime(0, at)
        env.gain.linearRampToValueAtTime(peak, at + 3)
        env.gain.setValueAtTime(peak, at + BAR - 1)
        env.gain.linearRampToValueAtTime(0, at + BAR + 2.5)
        osc.connect(env).connect(tone)
        osc.start(at)
        osc.stop(at + BAR + 2.6)
        voices.add(osc)
        osc.onended = () => voices.delete(osc)
      }
    })
  }
  // Schedule a bar ahead, so a busy main thread never leaves a gap.
  const plan = () => {
    while (next < ctx.currentTime + BAR) {
      play(CHORDS[bar++ % CHORDS.length]!, next)
      next += BAR
    }
  }
  plan()
  const timer = setInterval(plan, 2000)
  return {
    out,
    stop() {
      clearInterval(timer)
      for (const osc of voices) osc.stop()
      out.disconnect()
    },
  }
}

let music: Music | null = null
let held = false
let gesture = false

function sync() {
  const on = !held && !isMuted() && !document.hidden && (gesture || !!navigator.userActivation?.hasBeenActive)
  const ctx = on ? context() : null
  if (music && !on) {
    const old = music
    music = null
    old.out.gain.setTargetAtTime(0, old.out.context.currentTime, 0.4)
    setTimeout(() => old.stop(), 2500)
  }
  if (!on || music || !ctx) return
  music = startMusic(ctx, volumeBus()!)
  music.out.gain.setTargetAtTime(LEVEL, ctx.currentTime, 1.5)
}

/** True while the launch plays: the music fades out, and comes back after. */
export function holdMusic(on: boolean): void {
  held = on
  sync()
}

if (typeof window !== 'undefined' && typeof AudioContext !== 'undefined') {
  onMuteChange(sync)
  document.addEventListener('visibilitychange', sync)
  const unlock = () => {
    if (gesture && music) return
    gesture = true
    sync()
  }
  for (const type of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(type, unlock, true)
  if (import.meta.env.DEV) Object.assign(window, { __music: () => ({ playing: !!music, held }) })
}
