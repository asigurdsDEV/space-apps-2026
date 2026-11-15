// How a crew astronaut moves: pure maths, no three.js. `advance` keeps a small clock for one astronaut and `pose`
// turns it into joint angles and body offsets. On Earth ('walk') it is a walking cycle and a calm idle; in the
// spacecraft ('float') it is a zero-g drift and a hand-over-hand pull along the handrails.
// Angles are radians. A limb's swing is + forwards and its spread is + outwards from the rest pose; a bend is +
// the way the joint folds (knee back, elbow forwards). Pitch is + leaning forwards, roll is + leaning to the +X side.

export type MoveMode = 'walk' | 'float'

export interface Limb {
  swing: number
  spread: number
  bend: number
}

export interface Pose {
  /** Body up from standing, sideways (+X) and forwards, in metres. The body turns about the hips. */
  lift: number
  sway: number
  slide: number
  pitch: number
  roll: number
  /** Index 0 is the -X side, 1 the +X side. */
  legs: [Limb, Limb]
  arms: [Limb, Limb]
}

/**
 * One astronaut's clock and smoothed speed: metres a second in its own frame (forward is the way it faces), turn in
 * radians a second. `move` runs from 0 (still) to 1 (moving) and is what blends the two poses.
 */
export interface Motion {
  t: number
  stride: number
  forward: number
  side: number
  turn: number
  move: number
}

/** The idle clock wraps here (seconds). Every idle wave fits a whole number of times, so the wrap cannot be seen. */
export const LOOP = 120
/** Hip height, thigh length, knee-to-sole length, and how far the sole reaches in front of and behind the ankle (metres). */
export const HIP = 0.935
export const THIGH = 0.44
const SHIN = 0.4955
const TOE = 0.24
const HEEL = 0.1225
/** Hips to chest. */
const CHEST = 0.5
const TAU = Math.PI * 2
/** Seconds for the speed to catch up (poses arrive in steps, so the raw speed is jumpy), and for still to blend into moving. */
const SETTLE = { walk: 0.22, float: 0.4 }
const BLEND = 0.2

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** 0 to 1 with a soft start and stop. */
const ease = (v: number) => {
  const x = clamp(v, 0, 1)
  return x * x * (3 - 2 * x)
}
const mix = (a: number, b: number, k: number) => a + (b - a) * k

export const newMotion = (t = 0): Motion => ({ t: ((t % LOOP) + LOOP) % LOOP, stride: 0, forward: 0, side: 0, turn: 0, move: 0 })

/** Ground speed that drives the legs: walking, plus a shuffle while turning on the spot. */
const pace = (m: Motion) => Math.hypot(m.forward, m.side) + 0.35 * Math.abs(m.turn)
/** How far each leg swings either side of straight down: longer steps when faster. */
const reach = (speed: number) => Math.min(0.58, 0.22 + 0.1 * speed)

/** Moves the clock on by `dt` seconds, given the raw speed (own frame) and turn rate this frame. */
export function advance(m: Motion, mode: MoveMode, dt: number, forward: number, side: number, turn: number): void {
  const step = clamp(dt, 0, 0.1)
  const k = 1 - Math.exp(-step / SETTLE[mode])
  // A jump across the room (a late pose) must not look like a sprint.
  m.forward += (clamp(forward, -7, 7) - m.forward) * k
  m.side += (clamp(side, -7, 7) - m.side) * k
  m.turn += (clamp(turn, -6, 6) - m.turn) * k
  m.t = (m.t + step) % LOOP
  const speed = Math.hypot(m.forward, m.side)
  m.move += (ease(mode === 'walk' ? pace(m) / 0.6 : speed / 0.7) - m.move) * (1 - Math.exp(-step / BLEND))
  // Walk: one full cycle is two steps, so the feet cover the ground the body does. Backwards runs the cycle backwards.
  // Float: nothing touches the floor, so the pull along the rails just gets quicker with speed, up to about one a second.
  const rate = mode === 'walk'
    ? ((m.forward < -0.5 * speed ? -1 : 1) * pace(m)) / (4 * HIP * Math.sin(reach(pace(m))))
    : Math.min(1.05, 0.45 * speed)
  m.stride = (((m.stride + step * rate * TAU) % TAU) + TAU) % TAU
}

/** Height of the lowest point of a foot, measured from the hip (so negative), for a leg `swing` from straight down. */
function sole(swing: number, bend: number): number {
  const shin = swing - bend
  return -THIGH * Math.cos(swing) - SHIN * Math.cos(shin) + Math.min(TOE * Math.sin(shin), -HEEL * Math.sin(shin))
}

export function pose(mode: MoveMode, m: Motion): Pose {
  /** A slow wave that repeats `cycles` times in the clock's loop. */
  const wave = (cycles: number, shift = 0) => Math.sin((m.t / LOOP) * TAU * cycles + shift)
  const sin = Math.sin(m.stride)
  const speed = Math.hypot(m.forward, m.side)
  const side = [-1, 1] as const
  const move = m.move
  let lift: number, sway: number, pitch: number, roll: number
  let slide = 0
  let legs: [Limb, Limb], arms: [Limb, Limb]

  if (mode === 'walk') {
    const still = 1 - move
    // Sideways the legs mostly step on the spot: a full stride would point the wrong way.
    const swing = move * reach(pace(m)) * (0.25 + (0.75 * (Math.abs(m.forward) + 0.05)) / (speed + 0.05))
    const breath = wave(30) // every 4 s
    // Weight moves over the foot that is on the ground; when still it drifts slowly from one foot to the other.
    sway = still * 0.02 * wave(16) - move * 0.014 * Math.cos(m.stride)
    pitch = still * 0.012 * breath + move * Math.min(0.1, 0.028 * speed)
    roll = still * 0.01 * wave(16, 0.6) - move * 0.012 * Math.cos(m.stride)
    legs = side.map((s) => ({
      // The legs undo the body's lean and sway, so the feet stay planted.
      swing: pitch + s * swing * sin,
      spread: s * (roll - sway / HIP),
      // The knee folds while its leg comes forwards, to clear the floor, and is straight again when the heel lands.
      bend: move * 1.0 * Math.max(0, s * Math.cos(m.stride + 0.3)) ** 2,
    })) as [Limb, Limb]
    arms = side.map((s) => ({
      // Each arm swings against the leg on its own side.
      swing: still * (0.04 + 0.012 * wave(16, 1 + s)) - s * swing * 0.8 * sin,
      spread: still * (-0.05 + 0.014 * breath),
      bend: still * (0.2 + 0.03 * breath) + move * (0.38 - s * 0.24 * sin),
    })) as [Limb, Limb]
    // The lower foot stands on the floor, which gives the bob of a walk for free.
    lift = -(THIGH + SHIN) - Math.min(sole(legs[0].swing - pitch, legs[0].bend), sole(legs[1].swing - pitch, legs[1].bend))
  } else {
    const ahead = move * clamp(m.forward / 1.6, -1, 1)
    const across = move * clamp(m.side / 1.6, -1, 1)
    /** How much of the hand-over-hand pull shows: only when travelling forwards. */
    const pull = Math.max(0, ahead)
    // Leans into the direction of travel, and a little into a turn (a positive turn is towards -X).
    pitch = 0.2 + 0.05 * wave(13) + (ahead > 0 ? 0.34 : 0.3) * ahead
    roll = 0.06 * wave(9, 1) + 0.3 * across - 0.07 * clamp(m.turn / 2, -1, 1)
    // The lean turns about the hips; the hips move the other way, so the chest stays where the player is.
    sway = 0.03 * wave(11, 2) - CHEST * Math.sin(roll)
    slide = -CHEST * Math.sin(pitch)
    legs = side.map((s) => ({
      // Still: the relaxed zero-g crouch, thighs forwards and shins trailing. Moving: the legs trail out behind.
      swing: (1 - move) * (0.62 + s * 0.07 + 0.06 * wave(17, s)) - 0.12 * ahead + move * 0.1 * Math.sin(m.stride + s * 1.2),
      spread: 0.07 + 0.025 * wave(7, s * 2),
      bend: mix(1.0 - s * 0.1 + 0.1 * wave(19, 2 + s), 0.5 + 0.18 * Math.sin(m.stride + 1 + s * 1.2), move),
    })) as [Limb, Limb]
    arms = side.map((s) => {
      // 1 when this hand is stretched out to the next rail, 0 when it has pulled back to the chest. The hands take turns.
      const out = 0.5 + 0.5 * Math.sin(m.stride + (s > 0 ? Math.PI : 0))
      return {
        swing: mix(0.5 - s * 0.08 + 0.09 * wave(14, s * 1.5), 0.3 + 1.55 * out, pull),
        spread: mix(0.2 + 0.05 * wave(10, s), 0.1 - 0.28 * out, pull),
        bend: mix(1.2 + s * 0.1 + 0.12 * wave(22, 3 + s), 1.5 - 1.3 * out, pull),
      }
    }) as [Limb, Limb]
    // Floats a hand's width up with a slow bob, and always clear of the floor however the legs hang.
    const lowest = Math.min(sole(legs[0].swing - pitch, legs[0].bend), sole(legs[1].swing - pitch, legs[1].bend))
    lift = Math.max(0.2 + 0.04 * wave(20), 0.07 + 0.13 * Math.abs(roll) - (THIGH + SHIN) - lowest)
  }
  return { lift, sway, slide, pitch, roll, legs, arms }
}
