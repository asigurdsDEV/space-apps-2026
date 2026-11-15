// Keeps the frame rate steady on slower graphics chips by drawing fewer pixels. No three.js here.

/** Frames averaged before each decision. */
const WINDOW = 40
/** A window slower than this (ms per frame, about 48 fps) counts as slow. */
const SLOW_MS = 21

/**
 * Call the result once per frame with the seconds since the last one. After two slow windows in a row it lowers the
 * pixel ratio by a fifth, down to `min`. It never raises it again: a rate that goes up and down is worse than a soft
 * picture. If a cut does not make frames at least a tenth faster, the pixels were not the problem (a 30 fps
 * battery saver, a busy processor), so the cut is undone and the ratio is left alone from then on.
 */
export function steadyResolution(setRatio: (ratio: number) => void, max: number, min = Math.min(max, 0.75)): (dt_s: number) => void {
  let ratio = max
  let frames = 0
  let total = 0
  let slow = 0
  /** After a cut: the ratio and frame time before it, to judge whether it helped. */
  let trial: { ratio: number; ms: number } | null = null
  let locked = false
  return (dt_s) => {
    // A long gap is a tab switch or a stall, not the frame rate.
    if (locked || dt_s <= 0 || dt_s > 0.1) return
    total += dt_s
    if (++frames < WINDOW) return
    const ms = (total / frames) * 1000
    frames = total = 0
    if (trial) {
      const helped = ms < trial.ms * 0.9
      if (!helped) {
        ratio = trial.ratio
        locked = true
        setRatio(ratio)
      }
      trial = null
      slow = 0
      return
    }
    slow = ms > SLOW_MS ? slow + 1 : 0
    if (slow < 2 || ratio <= min) return
    trial = { ratio, ms }
    ratio = Math.max(min, ratio * 0.8)
    slow = 0
    setRatio(ratio)
  }
}
