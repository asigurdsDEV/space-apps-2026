// Pure: what each place sounds like (the launch, the spacecraft room, mission control).
// The Web Audio graph that plays it is in engine.ts; the live player and the React hooks are in ambience.ts.
import type { Tone } from './model'
import { altitudeM } from '../scene3d/launch/flight'
import { EVENT_AT, missionTime, stageAt, type LaunchTimeline, type StageId } from '../scene3d/launch/timeline'
import type { Propellant, RocketSpec } from '../scene3d/launch/vehicles'

export type Place = 'control' | 'cabin' | 'launch'

/** A short burst of filtered noise: a click, a thud, a hiss. Times in seconds from the cue's start. */
export interface Burst {
  kind: 'burst'
  filter: 'lowpass' | 'bandpass' | 'highpass'
  freq: number
  q?: number
  at: number
  dur: number
  attack: number
  gain: number
}

/** A note; `hold` keeps it at full level to the end (a beep) instead of dying away (a ping). */
export type Note = Tone & { hold?: boolean }
export type CuePart = Note | Burst
export type CueName = 'whoomp' | 'light' | 'thud' | 'click' | 'clunk' | 'crack' | 'relay' | 'valve' | 'caution' | 'tap' | 'tone'

const tone = (freq: number, at: number, dur: number, gain: number, wave: OscillatorType = 'sine', to?: number): Tone => ({ kind: 'tone', wave, freq, to, at, dur, gain })
const burst = (filter: Burst['filter'], freq: number, at: number, dur: number, gain: number, attack = 0.002, q?: number): Burst => ({ kind: 'burst', filter, freq, q, at, dur, attack, gain })

const beep = (freq: number, at: number, dur: number, gain: number, wave: OscillatorType = 'sine'): Note => ({ ...tone(freq, at, dur, gain, wave), hold: true })

/** One-shot events. Gains are peak levels at the output (1 is full scale); noise bursts come out lower, the narrower their band. */
export const CUES: Record<CueName, CuePart[]> = {
  // Liquid engines light: the fuel-rich start-up cloud catches with a soft, deep "whoomp".
  whoomp: [tone(85, 0, 0.5, 0.2, 'sine', 36), burst('lowpass', 500, 0, 0.4, 0.5, 0.03)],
  // A solid motor lights all at once: a hard bang with a deep kick under it.
  light: [burst('highpass', 900, 0, 0.09, 0.16, 0.001), burst('lowpass', 1400, 0, 0.5, 0.9, 0.002), tone(74, 0, 0.45, 0.3, 'sine', 34)],
  // A separation in vacuum, heard only through the structure: one dull thud, no ring. The 400 Hz knock is what small speakers carry.
  thud: [tone(82, 0, 0.16, 0.04, 'sine', 46), burst('lowpass', 240, 0, 0.07, 0.12, 0.004), burst('bandpass', 400, 0, 0.06, 0.2, 0.003, 1.2)],
  // The spacecraft's release springs: a small soft click through the adapter.
  click: [burst('lowpass', 900, 0, 0.03, 0.12), tone(170, 0, 0.05, 0.02)],
  // The carrier aircraft's hooks let go.
  clunk: [tone(196, 0, 0.11, 0.05, 'triangle', 150), tone(318, 0, 0.07, 0.025, 'triangle'), burst('lowpass', 900, 0, 0.05, 0.14)],
  // Range safety blows the vehicle up: the shock's crack, the blast, a chest-deep boom with a sub-bass kick under it,
  // the tanks going up one after another, burning debris popping and fizzing, the fire's roar, and the boom rolling
  // back off the ground and the clouds for seconds. The engine also sends it through a long echo and a hard limiter.
  crack: [
    burst('highpass', 1800, 0, 0.05, 0.9, 0.0005),
    burst('lowpass', 7000, 0, 0.3, 1.1, 0.001),
    burst('lowpass', 1300, 0.004, 1.1, 2.4, 0.002),
    burst('lowpass', 190, 0.01, 4.8, 7, 0.01),
    tone(58, 0.006, 2.4, 0.75, 'sine', 21),
    tone(96, 0.006, 0.9, 0.4, 'triangle', 38),
    // Secondary blasts: the other tanks rupture.
    ...[0.38, 0.86, 1.45].flatMap((at, i) => [burst('lowpass', 1100 - i * 250, at, 0.8, 1.5 - i * 0.35, 0.003), tone(72 - i * 8, at, 1.2, 0.35 - i * 0.08, 'sine', 30)]),
    // The fire roars, then dies down.
    burst('bandpass', 380, 0.08, 5.5, 2.2, 0.25, 0.5),
    // The boom rolls back: low thunder off the ground and the cloud deck, later and duller each time.
    burst('bandpass', 85, 0.35, 6.5, 7, 0.3, 0.7),
    burst('lowpass', 320, 0.9, 4, 2.4, 0.15),
    burst('lowpass', 230, 2.1, 4.5, 1.9, 0.2),
    // Burning debris: sharp pops and crackles scattered over a few seconds, thinning out.
    ...Array.from({ length: 26 }, (_, i) => {
      const at = 0.25 + 3.6 * Math.pow((i + ((i * 0.618) % 1)) / 26, 1.5)
      return burst(i % 3 ? 'bandpass' : 'highpass', 900 + ((i * 1777) % 2600), at, 0.025 + 0.03 * ((i * 0.37) % 1), 0.5 * (1 - i / 32), 0.0008, 1.4)
    }),
  ],
  // Spacecraft room: a relay closes behind a panel.
  relay: [burst('bandpass', 3000, 0, 0.02, 0.07, 0.001), burst('bandpass', 1500, 0.012, 0.03, 0.07, 0.001), tone(150, 0, 0.03, 0.006)],
  // Spacecraft room: a valve ticks over, with a breath of gas.
  valve: [burst('bandpass', 3800, 0, 0.01, 0.07, 0.001, 3), burst('bandpass', 3800, 0.07, 0.01, 0.04, 0.001, 3), burst('highpass', 5000, 0.08, 0.14, 0.012, 0.02)],
  // Caution tone (our own design, in the style of spacecraft caution-and-warning tones): four pulses, low-high-low-high, then quiet.
  caution: [0, 1, 2, 3].flatMap((i) => [beep(i % 2 ? 932 : 622, i * 0.26, 0.19, 0.08, 'triangle'), beep(i % 2 ? 1864 : 1244, i * 0.26, 0.19, 0.014)]),
  // Mission control: one soft key press. The engine plays a short irregular run of them.
  tap: [burst('bandpass', 3100, 0, 0.02, 0.07, 0.001), burst('lowpass', 320, 0, 0.02, 0.035, 0.001)],
  // Mission control: a console acknowledges something, two soft notes.
  tone: [beep(784, 0, 0.1, 0.006), beep(988, 0.1, 0.14, 0.006)],
}

/** Seconds until a cue has fully finished. */
export const cueLength = (name: CueName) => Math.max(...CUES[name].map((p) => p.at + p.dur))

/** The small details a room may add to its bed, one at a time. */
export const DETAILS: Record<Exclude<Place, 'launch'>, CueName[]> = { control: ['tap', 'tap', 'tone'], cabin: ['relay', 'valve'] }

/** Seconds to the next small detail in a room: 8 to 20, never regular. `r` is a random number from 0 to 1. */
export const detailGap = (r: number) => 8 + 12 * r

// ---- The launch.

// Thrust from a cubic meter of stage, next to kerosene and liquid oxygen. Hydrogen is very light; solid propellant is dense and burns fast.
const DENSITY: Record<Propellant, number> = { kerolox: 1, methalox: 0.8, hydrolox: 0.15, solid: 2.2 }
// How strongly shock pops ("crackle") ride on the roar: strongest for solids, clear for kerosene, soft for hydrogen.
const CRACKLE: Record<Propellant, number> = { solid: 1, kerolox: 0.6, methalox: 0.5, hydrolox: 0.3 }

/** Strap-ons much thinner than the core are solid motors; equal ones are extra liquid cores (as on the real vehicles in vehicles.ts). */
const solidBoosters = (spec: RocketSpec) => !!spec.boosters && spec.boosters.radius < 0.8 * spec.s1.radius

/** Lift-off thrust in kilonewtons, estimated from how much propellant the first stage and boosters hold. Within 3 dB of the real vehicles. */
export function thrustKN(spec: RocketSpec): number {
  const volume = (radius: number, length: number) => Math.PI * radius * radius * length
  const boosters = spec.boosters ? spec.boosters.count * volume(spec.boosters.radius, spec.boosters.length) * (solidBoosters(spec) ? DENSITY.solid : DENSITY[spec.s1.propellant]) : 0
  return 17.5 * (volume(spec.s1.radius, spec.s1.length) * DENSITY[spec.s1.propellant] + boosters)
}

export interface LaunchScore {
  timeline: LaunchTimeline
  air: boolean
  maxq: number
  /** Level of the lift-off roar; 1 is a medium rocket (Falcon 9). Loudness follows thrust. */
  loudness: number
  /** Where the roar has most of its energy, Hz: bigger nozzles rumble lower. */
  peakHz: number
  /** Crackle on the roar at lift-off, and before T0 when only a liquid core is lit. 0 to 1. */
  crackle: number
  coreCrackle: number
  /** Roar on the pad before T0 (0 to 1 of lift-off): liquid engines start early, solids only at T0. */
  padPower: number
  /** Screen times: first-stage cut-off, upper-stage start and cut-off, the drop, the loss of the vehicle. Infinity when they do not happen. */
  meco: number
  ses: number
  seco: number
  dropAt: number
  lostAt: number
  /** One-shot events in screen time, in order. */
  cues: { t: number; cue: CueName }[]
}

/** Engines light this long into the ignition shot (the scene's flame appears then). */
const IGNITE_S = 0.15

/** Everything the launch sound needs to know about one vehicle and its timeline. */
export function launchScore(spec: RocketSpec, timeline: LaunchTimeline): LaunchScore {
  const thrust = thrustKN(spec)
  const liquid = spec.s1.propellant !== 'solid'
  const solids = solidBoosters(spec)
  const score: LaunchScore = {
    timeline, air: spec.airLaunch, maxq: spec.events.maxq,
    // Real sound power grows with thrust; here the range is squeezed so a small rocket is still heard and a heavy one is still comfortable.
    loudness: Math.min(1.3, Math.max(0.6, Math.pow(thrust / 7600, 0.12))),
    // In thin air a motor makes less low rumble.
    peakHz: Math.min(150, Math.max(40, 55 * Math.pow(7600 / thrust, 0.25))) * (spec.airLaunch ? 1.5 : 1),
    crackle: solids ? 1 : CRACKLE[spec.s1.propellant],
    coreCrackle: CRACKLE[spec.s1.propellant],
    padPower: !liquid ? 0 : solids ? 0.4 : 0.6,
    meco: Infinity, ses: Infinity, seco: Infinity, dropAt: Infinity, lostAt: Infinity,
    cues: [],
  }
  for (const s of timeline.stages) {
    const event = (at: number) => s.start + at * (s.end - s.start)
    if (s.id === 'ignition' && liquid) score.cues.push({ t: s.start + IGNITE_S, cue: 'whoomp' })
    if (s.id === 'liftoff' && (solids || !liquid)) score.cues.push({ t: s.start, cue: 'light' })
    if (s.id === 'drop') score.cues.push({ t: (score.dropAt = event(EVENT_AT.drop)), cue: 'clunk' })
    if (s.id === 'airstart') score.cues.push({ t: s.start, cue: 'light' })
    if (s.id === 'boosters') score.cues.push({ t: event(EVENT_AT.boosters), cue: 'thud' })
    if (s.id === 'staging') {
      const t = event(EVENT_AT.staging)
      // The scene shuts the first stage down just before the stages part and lights the next engine just after.
      score.meco = t - 0.2
      score.ses = t + 0.7
      score.cues.push({ t, cue: 'thud' })
    }
    if (s.id === 'fairing') score.cues.push({ t: event(EVENT_AT.fairing), cue: 'thud' })
    if (s.id === 'burn') score.seco = event(EVENT_AT.burn)
    if (s.id === 'deploy') score.cues.push({ t: event(EVENT_AT.deploy), cue: 'click' })
    if (s.id === 'failure') score.cues.push({ t: (score.lostAt = event(EVENT_AT.failure)), cue: 'crack' })
  }
  return score
}

/** Levels of the launch's continuous layers at one moment. All 0 to 1 except `cutoff`. */
export interface LaunchMix {
  /** Engine roar heard through the air. */
  roar: number
  /** Low-pass on the roar, Hz: air soaks up the highs first as the rocket gets far away. */
  cutoff: number
  crackle: number
  /** Water flooding the pad; after a failure, debris falling. */
  hiss: number
  /** The air beating on the rocket around max-Q. */
  buffet: number
  /** Engine heard through the structure, in vacuum. */
  hum: number
  /** The carrier aircraft's engines. */
  jet: number
  wind: number
}

// Above the air there is nothing to carry sound to an outside listener.
const SPACE: ReadonlySet<StageId> = new Set<StageId>(['boosters', 'staging', 'fairing', 'burn', 'deploy'])
const ramp = (x: number, from: number, to: number) => Math.min(1, Math.max(0, (x - from) / (to - from)))

/** The mix at screen time `t`. Pass `out` to reuse one object every frame. */
export function mixAt(score: LaunchScore, t: number, out: LaunchMix = { roar: 0, cutoff: 0, crackle: 0, hiss: 0, buffet: 0, hum: 0, jet: 0, wind: 0 }): LaunchMix {
  const { timeline, air } = score
  const stage = stageAt(timeline, t)
  const id = stage.id
  const s = t - stage.start
  const met = missionTime(timeline, t)
  const km = altitudeM(met, air) / 1000
  const space = SPACE.has(id)
  const lost = t >= score.lostAt

  // Engines heard through the air, 0 to 1 of lift-off power.
  let power = 1
  if (space || lost || id === 'countdown' || id === 'carry' || id === 'drop') power = 0
  else if (id === 'ignition') power = score.padPower * ramp(s, IGNITE_S, IGNITE_S + 0.5)
  else if (id === 'liftoff') power = score.padPower + (1 - score.padPower) * (score.padPower === 0.6 ? ramp(s, 0, 0.6) : 1) // solids are at full power at once

  // Thinner air carries less sound: the level falls with the air's density as the rocket climbs.
  out.roar = power * Math.exp(-km / 18)
  out.cutoff = 9000 / (1 + 2.5 * Math.max(0, km - (air ? 12 : 0)))
  out.crackle = met < 0 ? score.coreCrackle : score.crackle
  out.hiss = lost ? 0.7 * Math.exp(-(t - score.lostAt) / 1.4) : id === 'ignition' ? ramp(s, 0, 0.3) : id === 'liftoff' && !air ? 1 - ramp(s, 0.6, 2.4) : 0
  // The push of the air peaks at max-Q and is gone on either side of it.
  out.buffet = power * Math.exp(-(((met - score.maxq) / 18) ** 2))
  out.hum = !space ? 0 : t < score.meco ? 0.85 : t >= score.ses && t < score.seco ? 0.6 : 0
  out.jet = id === 'carry' ? 1 : id === 'drop' ? Math.exp(-Math.max(0, t - score.dropAt) / 0.35) : 0
  out.wind = space || lost ? 0 : air ? (t < score.dropAt ? 0.6 : Math.min(1, Math.exp(-(km - 12) / 4))) : id === 'countdown' || id === 'ignition' ? 0.3 : 0
  return out
}
