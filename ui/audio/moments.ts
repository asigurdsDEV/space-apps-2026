// Sounds for story moments: CAPCOM's voice loop, the alarm and the result stingers, a count that rises.
// Each screen calls one of these from one line; the rules for when a sound plays live here.
import { useEffect, useRef } from 'react'
import { playSound } from './audio'
import type { SoundName } from './model'
import { alarm } from './ambience'

/** CAPCOM answers a beat after the click that caused it, so the tone is not lost under the click (see MIN_GAP_S). */
const REPLY_MS = 200

let air: string | null = null
let reply: ReturnType<typeof setTimeout> | undefined

/** The radio line on screen now (null: none). A new line opens with the voice loop's tone, the last one closes with the other. */
export function radio(line: string | null): void {
  if (line === air) return
  clearTimeout(reply)
  const name: SoundName = line ? 'radio-in' : 'radio-out'
  // One line replacing another is one key-up, not a close and an open.
  if (line || air) reply = setTimeout(() => playSound(name), REPLY_MS)
  air = line
}

let scene: string | undefined

/**
 * The story layer's moment: `cutscene` playing for beat `key`, and `line` on the radio.
 * An emergency's cutscene starts the alarm and an ending's starts its stinger; those lines open quietly.
 */
export function story(cutscene: string | undefined, key: string, line: string | null): void {
  // Keyed by the beat (an alarm's carries its decision id), so a re-render never repeats it and a replayed mission still sounds.
  const start = !!cutscene && key !== scene
  scene = cutscene ? key : undefined
  const sound: SoundName | undefined = cutscene === 'ending-success' ? 'success' : cutscene === 'ending-loss' ? 'failure' : undefined
  if (start && cutscene === 'anomaly') alarm()
  else if (start && sound) playSound(sound)
  if (cutscene === 'anomaly' || sound) {
    if (line !== air) clearTimeout(reply)
    air = line
  } else radio(line)
}

/** Plays `name` each time `count` goes up (not on the first render): a crew member joins, a limit is passed. */
export function useRisingSound(count: number, name: SoundName): void {
  const was = useRef(count)
  useEffect(() => {
    // After the click that caused it, which would otherwise swallow it. Not cancelled: the moment happened.
    if (count > was.current) setTimeout(() => playSound(name), REPLY_MS)
    was.current = count
  }, [count, name])
}
