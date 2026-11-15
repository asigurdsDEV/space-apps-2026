// The Web Audio graph for each place in places.ts. Everything is synthesised: filtered noise, oscillators,
// wave shaping and slow random drift. It runs on any BaseAudioContext, so the same code renders offline for measuring.
import { CUES, mixAt, type CueName, type LaunchMix, type LaunchScore, type Place } from './places'

export interface PlaceSound {
  /** The place's own fader. */
  out: GainNode
  /** One-shot event at context time `when`. */
  cue(name: CueName, when: number, rand?: () => number): void
  /** Launch only: move the continuous layers to screen time `t` and fire the cues passed since the last call. */
  frame(t: number, when: number): void
  /** Stops every source and releases the nodes. */
  stop(): void
}

const buffers = new WeakMap<BaseAudioContext, AudioBuffer>()
function whiteNoise(ctx: BaseAudioContext): AudioBuffer {
  let buffer = buffers.get(ctx)
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let seed = 0x2f6e2b1 // fixed, so an offline render gives the same numbers every time
    for (let i = 0; i < data.length; i++) data[i] = (seed = (Math.imul(seed, 1664525) + 1013904223) | 0) / 2147483648
    buffers.set(ctx, buffer)
  }
  return buffer
}

function curve(f: (x: number) => number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(4097)
  for (let i = 0; i < out.length; i++) out[i] = f(i / 2048 - 1)
  return out
}
// Soft saturation: turns deep rumble into harmonics that small speakers can play.
const SATURATE = curve((x) => Math.tanh(2.2 * x))
// Crackle: only the tallest pressure peaks get through, as sharp one-sided pops, like the shock fronts in a rocket's roar.
const POPS = curve((x) => (x > 0.6 ? Math.pow((x - 0.6) / 0.4, 1.5) : 0))
// Safety ceiling: straight up to 0.6, then bends over and can never pass 0.86 (-1.3 dBFS).
const CEILING = curve((x) => (Math.abs(x) < 0.6 ? x : Math.sign(x) * (0.6 + 0.29 * Math.tanh((Math.abs(x) - 0.6) / 0.29))))
// The compressor adds make-up gain for its settings; this takes it off again, so quiet sound passes at about its own level (measured: 1.7 dB under).
const TRIM = 0.5

/** The shared output: a limiter, then the ceiling. Returns the node to connect places to. */
export function output(ctx: BaseAudioContext): AudioNode {
  const input = ctx.createGain()
  input.gain.value = TRIM
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -10
  limiter.knee.value = 6
  limiter.ratio.value = 12
  limiter.attack.value = 0.003
  limiter.release.value = 0.15
  const ceiling = ctx.createWaveShaper()
  ceiling.curve = CEILING
  input.connect(limiter).connect(ceiling).connect(ctx.destination)
  return input
}

function kit(ctx: BaseAudioContext, dest: AudioNode) {
  const nodes: AudioNode[] = []
  const sources: AudioScheduledSourceNode[] = []
  const add = <T extends AudioNode>(node: T): T => {
    nodes.push(node)
    return node
  }
  const gain = (value: number) => {
    const g = add(ctx.createGain())
    g.gain.value = value
    return g
  }
  const filter = (type: BiquadFilterType, hz: number, q = 0.707) => {
    const f = add(ctx.createBiquadFilter())
    f.type = type
    f.frequency.value = hz
    f.Q.value = q
    return f
  }
  const shape = (c: Float32Array<ArrayBuffer>) => {
    const w = add(ctx.createWaveShaper())
    w.curve = c
    return w
  }
  const loop = (rate: number, offset: number) => {
    const s = add(ctx.createBufferSource())
    s.buffer = whiteNoise(ctx)
    s.loop = true
    s.playbackRate.value = rate
    s.start(0, offset)
    sources.push(s)
    return s
  }
  const osc = (type: OscillatorType, hz: number) => {
    const o = add(ctx.createOscillator())
    o.type = type
    o.frequency.value = hz
    o.start()
    sources.push(o)
    return o
  }
  const chain = (...line: AudioNode[]) => {
    for (let i = 1; i < line.length; i++) line[i - 1]!.connect(line[i]!)
    return line[line.length - 1]!
  }
  const out = gain(0)
  out.connect(dest)
  // White noise that never repeats: two loops of different lengths multiplied together, so no loop point can be heard.
  const white = gain(0)
  loop(1, 0).connect(white)
  loop(0.8731, 1.7).connect(white.gain)
  // Scales the noise so a band `hz` wide comes out near level 1 whatever the band and sample rate.
  const level = (hz: number) => 1 / Math.sqrt((0.074 * hz) / (ctx.sampleRate / 2))
  /** A slow random drift between -1 and 1 that changes about `hz` times a second, scaled by `depth`, added to `param`. */
  const drift = (hz: number, depth: number, param: AudioParam, offset: number) => chain(loop((2 * hz) / ctx.sampleRate, offset), gain(depth)).connect(param)

  function cue(name: CueName, when: number, rand: () => number = Math.random, to: AudioNode = out) {
    for (const p of CUES[name]) {
      const start = when + p.at
      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, start)
      env.gain.exponentialRampToValueAtTime(p.gain, start + Math.max(p.kind === 'burst' ? p.attack : 0.01, 0.001))
      if (p.kind === 'tone' && p.hold) env.gain.setValueAtTime(p.gain, start + p.dur - 0.03)
      env.gain.exponentialRampToValueAtTime(0.0001, start + p.dur)
      env.connect(to)
      let src: AudioScheduledSourceNode
      if (p.kind === 'tone') {
        const o = (src = ctx.createOscillator())
        o.type = p.wave
        o.frequency.setValueAtTime(p.freq, start)
        if (p.to) o.frequency.exponentialRampToValueAtTime(p.to, start + p.dur)
        o.connect(env)
        o.start(start)
      } else {
        const b = (src = ctx.createBufferSource())
        b.buffer = whiteNoise(ctx)
        const f = ctx.createBiquadFilter()
        f.type = p.filter
        f.frequency.value = p.freq
        f.Q.value = p.q ?? 0.707
        b.connect(f).connect(env)
        b.start(start, rand() * 3)
      }
      src.stop(start + p.dur + 0.05)
      src.onended = () => env.disconnect()
    }
  }

  const sound: PlaceSound = {
    out,
    cue,
    frame() {},
    stop() {
      for (const s of sources) s.stop()
      for (const n of nodes) n.disconnect()
    },
  }
  return { ctx, sound, cue, out, white, gain, filter, shape, osc, chain, level, drift }
}
type Kit = ReturnType<typeof kit>

/** The spacecraft room. A station module is never silent: steady ventilation, a few faint fan tones, a pump whine. */
function cabin(k: Kit) {
  // Ventilation: a steady broadband whoosh, strongest in the low mids, with a little air hiss at the grilles.
  k.chain(k.white, k.filter('lowpass', 650, 0.5), k.filter('highpass', 110), k.gain(0.0075 * k.level(650)), k.out)
  k.chain(k.white, k.filter('bandpass', 2000, 0.7), k.filter('lowpass', 2500), k.gain(0.0042 * k.level(4000)), k.out)
  // Fans: blade tones between 100 and 400 Hz. Their levels drift a little so they never beat in a pattern.
  for (const [i, hz] of [118, 236, 331].entries()) {
    const g = k.gain(0.0016 / (i + 1))
    k.chain(k.osc('sine', hz), g, k.out)
    k.drift(0.3, 0.0004 / (i + 1), g.gain, 0.6 + i)
  }
  // Coolant pump: a thin high whine that wanders by a few cents.
  const pump = k.osc('sine', 1420)
  k.chain(pump, k.gain(0.0005), k.out)
  k.drift(0.5, 6, pump.detune, 3.3)
}

/** Mission control. A quiet room: air conditioning, equipment fans, a faint voice-loop hiss with nobody talking. */
function control(k: Kit) {
  // Air conditioning: low room tone and a soft rush from the vents.
  k.chain(k.white, k.filter('lowpass', 200), k.filter('lowpass', 260), k.filter('highpass', 70), k.gain(0.0045 * k.level(200)), k.out)
  k.chain(k.white, k.filter('bandpass', 900, 0.5), k.gain(0.0011 * k.level(1800)), k.out)
  // Console power supplies and their small fans.
  k.chain(k.osc('sine', 120), k.gain(0.0007), k.out)
  k.chain(k.white, k.filter('bandpass', 1650, 2.5), k.gain(0.0005 * k.level(660)), k.out)
  // Voice loop left open on a headset: telephone-band static that breathes irregularly. No speech.
  const loopGain = k.gain(0.0009 * k.level(2700))
  k.chain(k.white, k.filter('highpass', 400), k.filter('lowpass', 3000), loopGain, k.out)
  k.drift(0.4, 0.0004 * k.level(2700), loopGain.gain, 2.2)
}

/** The launch: layers that follow places.ts's mix, plus its cues. */
function launch(k: Kit, score: LaunchScore) {
  const p = score.peakHz
  const roarIn = k.gain(1)
  // Deep rumble around the rocket's own peak, saturated for harmonics, with true sub-bass taken out afterwards.
  k.chain(k.white, k.filter('lowpass', p * 1.5, 0.8), k.filter('lowpass', p * 3), k.gain(0.4 * k.level(p * 1.5)), k.shape(SATURATE), k.filter('highpass', 35), k.filter('highpass', 35), roarIn)
  // The rougher band above it, falling away towards the highs as real rocket noise does. It moves less with size than the rumble.
  const mid = 250 * Math.sqrt(p / 55)
  k.chain(k.white, k.filter('bandpass', mid, 0.7), k.filter('lowpass', 2500), k.gain(0.28 * score.loudness * k.level(mid * 2.25)), roarIn)
  // Crackle rides on the roar: the tallest pressure peaks steepen into shocks. They come irregularly, in bursts.
  const drive = k.gain(0.3 * k.level(320))
  const pops = k.chain(k.white, k.filter('bandpass', 160, 0.8), drive, k.shape(POPS))
  k.drift(3, 0.05 * k.level(320), drive.gain, 0.9)
  const crackle = k.gain(0)
  // Each pop is a sharp tick (the shock front) with a short thump under it.
  const tick = k.gain(0)
  pops.connect(tick.gain)
  k.chain(k.white, k.filter('bandpass', 2200, 0.5), k.gain(k.level(7000)), tick, crackle, roarIn)
  k.chain(pops, k.filter('highpass', 350), k.gain(0.5), crackle)
  // Distance: air soaks up the highs. Then the level, which flutters like real turbulence.
  const air = k.filter('lowpass', 9000, 0.5)
  const flutter = k.gain(1)
  const roar = k.gain(0)
  k.chain(roarIn, air, flutter, roar, k.out)
  k.drift(8, 0.22, flutter.gain, 0.3)

  // Max-Q: air rushing over the skin, shaking hard and unevenly.
  const shake = k.gain(1)
  const buffet = k.gain(0)
  k.chain(k.white, k.filter('bandpass', 420, 0.5), k.filter('lowpass', 1200), k.gain(k.level(840)), shake, buffet, k.out)
  k.drift(13, 0.7, shake.gain, 1.1)

  // Water on the pad (and debris after a failure): a wide rushing hiss.
  const hiss = k.gain(0)
  k.chain(k.white, k.filter('bandpass', 3000, 0.4), k.gain(k.level(7500)), hiss, k.out)

  // Wind: a band of noise whose pitch and strength wander.
  const windBand = k.filter('bandpass', 480, 1.1)
  const gust = k.gain(1)
  const wind = k.gain(0)
  k.chain(k.white, windBand, k.gain(k.level(440)), gust, wind, k.out)
  k.drift(0.5, 160, windBand.frequency, 2.8)
  k.drift(0.8, 0.4, gust.gain, 3.9)

  // Carrier aircraft: a steady low drone from three big turbofans, a fan buzz and a thin whine.
  const jet = k.gain(0)
  k.chain(k.white, k.filter('lowpass', 320), k.filter('highpass', 70), k.gain(k.level(320)), jet, k.out)
  k.chain(k.osc('sawtooth', 92), k.filter('lowpass', 420), k.gain(0.25), jet)
  k.chain(k.white, k.filter('bandpass', 2700, 4), k.gain(0.12 * k.level(675)), jet)

  // In vacuum: the engine, heard only through the structure. Low and muffled.
  const throb = k.gain(1)
  const hum = k.gain(0)
  k.chain(k.white, k.filter('lowpass', 220, 1), k.filter('lowpass', 440), k.gain(0.4 * k.level(220)), k.shape(SATURATE), k.filter('highpass', 45), throb, hum, k.out)
  k.drift(5, 0.15, throb.gain, 4.4)

  // Bigger vehicles thump harder.
  const events = k.gain(score.loudness)
  events.connect(k.out)
  k.sound.cue = (name, when, rand) => k.cue(name, when, rand, events)

  const mix: LaunchMix = mixAt(score, 0)
  let last = -1
  let next = 0
  const to = (param: AudioParam, value: number, when: number) => param.setTargetAtTime(value, when, 0.03)
  k.sound.frame = (t, when) => {
    mixAt(score, t, mix)
    to(roar.gain, 0.36 * score.loudness * mix.roar, when)
    to(air.frequency, mix.cutoff, when)
    to(crackle.gain, 2.6 * mix.crackle, when)
    to(buffet.gain, 0.07 * score.loudness * mix.buffet, when)
    to(hiss.gain, 0.05 * mix.hiss, when)
    to(wind.gain, 0.02 * mix.wind, when)
    to(jet.gain, 0.027 * mix.jet, when)
    to(hum.gain, 0.0095 * score.loudness * mix.hum, when)
    // A jump (seek, replay, a long stall) fires nothing; ordinary frames fire the cues they pass.
    if (t < last || t - last > 0.5) next = score.cues.findIndex((c) => c.t > t)
    else for (; next >= 0 && next < score.cues.length && score.cues[next]!.t <= t; next++) k.sound.cue(score.cues[next]!.cue, when)
    last = t
  }
}

/** Builds one place, silent: fade `out.gain` up to 1 to hear it. */
export function buildPlace(ctx: BaseAudioContext, dest: AudioNode, place: Place, score?: LaunchScore): PlaceSound {
  const k = kit(ctx, dest)
  if (place === 'cabin') cabin(k)
  else if (place === 'control') control(k)
  else if (score) launch(k, score)
  return k.sound
}
