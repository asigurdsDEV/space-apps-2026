// The sound of the place the player is in: one bed at a time, crossfaded, with a rare small detail.
// Obeys the mute toggle, waits for a click or key before making any sound, and stops when the tab is hidden.
import { useEffect, useMemo } from 'react'
import type { LaunchTimeline } from '../scene3d/launch/timeline'
import type { RocketSpec } from '../scene3d/launch/vehicles'
import { context, heard, isMuted, onMuteChange, playSound, volumeBus } from './audio'
import { buildPlace, output, type PlaceSound } from './engine'
import { holdMusic } from './music'
import { DETAILS, detailGap, launchScore, type LaunchScore, type Place } from './places'

interface Want { place: Place; score?: LaunchScore }
interface Live { want: Want; sound: PlaceSound; detail?: ReturnType<typeof setTimeout> }
let wanted: Want | null = null
let live: Live | null = null
let ctx: AudioContext | null = null
let out: AudioNode | null = null
let gesture = false
let pending = false
let graphs = 0

function drop(seconds: number) {
  if (!live || !ctx) return
  const { sound, detail } = live
  live = null
  clearTimeout(detail)
  sound.out.gain.setTargetAtTime(0, ctx.currentTime, seconds / 4)
  setTimeout(() => {
    sound.stop()
    graphs--
  }, seconds * 1000 + 30)
}

function sync() {
  pending = false
  holdMusic(wanted?.place === 'launch')
  const hidden = document.hidden
  // Browsers only let sound start after the player has clicked, tapped or pressed a key.
  const on = !!wanted && !isMuted() && !hidden && (gesture || !!navigator.userActivation?.hasBeenActive)
  if (live && (!on || live.want.place !== wanted!.place || live.want.score !== wanted!.score)) drop(hidden ? 0 : on ? 1 : 0.06)
  if (!on || live) return
  ctx = context()
  if (!ctx) return
  out ??= output(ctx, volumeBus()!)
  const want = wanted!
  const sound = buildPlace(ctx, out, want.place, want.score)
  graphs++
  sound.out.gain.setTargetAtTime(1, ctx.currentTime, want.place === 'launch' ? 0.03 : 0.3)
  const here: Live = (live = { want, sound })
  if (want.place !== 'launch') {
    const list = DETAILS[want.place]
    const again = () => {
      here.detail = setTimeout(() => {
        const name = list[Math.floor(Math.random() * list.length)]!
        // Keys come as a short uneven run; everything else is a single event.
        let at = ctx!.currentTime
        // A held or interrupted context keeps everything scheduled and would play it all at once when it wakes.
        if (ctx!.state === 'running') for (let n = name === 'tap' ? 3 + Math.floor(Math.random() * 4) : 1; n > 0; n--, at += 0.09 + 0.16 * Math.random()) sound.cue(name, at)
        again()
      }, detailGap(Math.random()) * 1000)
    }
    again()
  }
}

if (typeof window !== 'undefined') {
  onMuteChange(sync)
  document.addEventListener('visibilitychange', sync)
  const unlock = () => {
    gesture = true
    // Some browsers leave a context that was made outside a gesture suspended until the next one.
    if (!live) sync()
    else if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {})
  }
  // A touch counts as a gesture only when the finger lifts, and some phones only take a tap or a click.
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(type, unlock, true)
  // Dev builds only: QA reads what is sounding (`__sound()`), next to `__fps`.
  if (import.meta.env.DEV) Object.assign(window, { __sound: () => ({ place: live?.want.place ?? null, graphs, state: ctx?.state ?? 'none' }) })
}

/** Makes `place` the one that sounds. Returns the function that leaves it. */
export function enter(place: Place, score?: LaunchScore): () => void {
  const mine = (wanted = { place, score })
  // Decided after React has run this commit's effects, so moving from one place to another is a crossfade, not a stop and a start.
  const later = () => {
    if (!pending) queueMicrotask(sync)
    pending = true
  }
  later()
  return () => {
    if (wanted !== mine) return
    wanted = null
    later()
  }
}

/** The room has not yet heard about the alarm that last sounded, so its own caution tone stays quiet for it. */
let unheard = false

/** An emergency starts (with its cutscene): the alarm, once, never looping. moments.ts calls it once per card. */
export function alarm(): void {
  unheard = true
  playSound('alarm')
}

/** The caution tone for a waiting alarm in the spacecraft room: a few pulses, once. */
export function caution(): void {
  // After this commit's effects, so an alarm already waiting when the room mounts still sounds.
  queueMicrotask(() => {
    // The room calls this once per new card; the card whose alarm already sounded is not announced twice.
    if (unheard) return void (unheard = false)
    if (live?.want.place !== 'cabin' || !ctx) return
    live.sound.cue('caution', ctx.currentTime + 0.01)
    if (import.meta.env.DEV) heard.push({ name: 'caution (room)', at: Math.round(performance.now()) })
  })
}

/** The bed of a walk-in room, for as long as the component is mounted. */
export function useAmbience(place: 'control' | 'cabin'): void {
  useEffect(() => enter(place), [place])
}

/** The launch's sound while `playing`. Call the returned function with the scene's screen time on every frame. */
export function useLaunchSound(rocket: RocketSpec, timeline: LaunchTimeline, playing: boolean): (t: number) => void {
  const score = useMemo(() => launchScore(rocket, timeline), [rocket, timeline])
  useEffect(() => (playing ? enter('launch', score) : undefined), [score, playing])
  return frame
}

function frame(t: number) {
  // Not while the context is held: its clock stands still, and every cue passed meanwhile would sound together later.
  if (live?.want.place === 'launch' && ctx?.state === 'running') live.sound.frame(t, ctx.currentTime)
}
