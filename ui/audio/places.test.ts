import { describe, expect, it } from 'vitest'
import { launchTimeline, type StageId } from '../scene3d/launch/timeline'
import { rocketSpec } from '../scene3d/launch/vehicles'
import { CUES, DETAILS, cueLength, detailGap, launchScore, mixAt, thrustKN, type CueName } from './places'

const score = (id: string, failed = false) => {
  const spec = rocketSpec({ id, name: id, props: {} })
  return launchScore(spec, launchTimeline(spec, { failed }))
}
/** The mix in the middle of a stage. */
const at = (s: ReturnType<typeof score>, id: StageId, p = 0.5) => {
  const stage = s.timeline.stages.find((x) => x.id === id)!
  return mixAt(s, stage.start + p * (stage.end - stage.start))
}
const cuesIn = (s: ReturnType<typeof score>, id: StageId) => {
  const stage = s.timeline.stages.find((x) => x.id === id)!
  return s.cues.filter((c) => c.t >= stage.start && c.t < stage.end).map((c) => c.cue)
}

describe('launch voice', () => {
  it('follows thrust: a heavy lifter is louder and deeper than a small rocket', () => {
    const small = score('electron'), medium = score('falcon-9'), heavy = score('sls-block-1')
    expect(thrustKN(rocketSpec({ id: 'electron', name: '', props: {} }))).toBeGreaterThan(150)
    expect(thrustKN(rocketSpec({ id: 'electron', name: '', props: {} }))).toBeLessThan(320) // real: 224 kN
    expect(thrustKN(rocketSpec({ id: 'falcon-9', name: '', props: {} }))).toBeCloseTo(7600, -3) // real: 7,600 kN
    expect(small.loudness).toBeLessThan(medium.loudness)
    expect(medium.loudness).toBeLessThan(heavy.loudness)
    expect(small.peakHz).toBeGreaterThan(medium.peakHz)
    expect(medium.peakHz).toBeGreaterThan(heavy.peakHz)
    expect(heavy.peakHz).toBeGreaterThanOrEqual(40) // nothing is tuned to true sub-bass
  })

  it('crackles most for solids, clearly for kerosene, softly for hydrogen', () => {
    expect(score('sls-block-1').crackle).toBe(1) // solid boosters
    expect(score('pegasus-xl').crackle).toBe(1)
    expect(score('falcon-9').crackle).toBeGreaterThan(score('delta-iv-heavy').crackle)
    expect(score('delta-iv-heavy').crackle).toBeGreaterThan(0)
    expect(score('sls-block-1').coreCrackle).toBeLessThan(1) // before T0 only the hydrogen core is lit
  })
})

describe('launch mix', () => {
  it('is quiet on the pad, rises at ignition, and is loudest at lift-off', () => {
    const s = score('falcon-9')
    expect(at(s, 'countdown').roar).toBe(0)
    expect(at(s, 'countdown').wind).toBeGreaterThan(0)
    expect(at(s, 'ignition', 0.02).roar).toBe(0) // water first, then the engines
    expect(at(s, 'ignition', 0.02).hiss).toBeGreaterThan(0)
    expect(at(s, 'ignition', 0.9).roar).toBeGreaterThan(0.3)
    expect(at(s, 'liftoff').roar).toBeGreaterThan(at(s, 'ignition', 0.9).roar)
    expect(at(s, 'liftoff').roar).toBeGreaterThan(0.95)
  })

  it('loses its highs first and fades as the rocket climbs; buffet peaks at max-Q', () => {
    const s = score('falcon-9')
    const [lift, pitch, maxq] = [at(s, 'liftoff'), at(s, 'pitch'), at(s, 'maxq')]
    expect(pitch.cutoff).toBeLessThan(lift.cutoff)
    expect(maxq.cutoff).toBeLessThan(pitch.cutoff / 4)
    expect(maxq.roar).toBeLessThan(pitch.roar)
    expect(pitch.roar).toBeLessThanOrEqual(lift.roar)
    expect(maxq.buffet).toBeGreaterThan(0.25)
    expect(pitch.buffet).toBeLessThan(0.01)
    expect(lift.buffet).toBeLessThan(0.01)
  })

  it('carries nothing through the air in space: only a structure hum while an engine burns', () => {
    for (const id of ['electron', 'falcon-9', 'sls-block-1', 'vulcan-centaur', 'pegasus-xl']) {
      const s = score(id)
      for (const stage of s.timeline.stages.filter((x) => ['boosters', 'staging', 'fairing', 'burn', 'deploy'].includes(x.id))) {
        for (const p of [0.05, 0.5, 0.95]) {
          const m = at(s, stage.id, p)
          expect([m.roar, m.hiss, m.buffet, m.jet, m.wind], `${id} ${stage.id}`).toEqual([0, 0, 0, 0, 0])
        }
      }
      expect(at(s, 'fairing').hum).toBeGreaterThan(0)
      expect(at(s, 'burn', 0.5).hum).toBeGreaterThan(0)
      expect(at(s, 'burn', 0.95).hum).toBe(0) // engine cut-off
      expect(at(s, 'deploy').hum).toBe(0) // coasting: silence
    }
  })

  it('air launch: jet and wind, then wind only after the drop, then a thin roar', () => {
    const s = score('pegasus-xl')
    expect(at(s, 'carry').jet).toBe(1)
    expect(at(s, 'carry').roar).toBe(0)
    expect(at(s, 'drop', 0.95).jet).toBeLessThan(0.02)
    expect(at(s, 'drop', 0.95).wind).toBeGreaterThan(0.9)
    expect(at(s, 'airstart').roar).toBeGreaterThan(0.4)
    expect(at(s, 'airstart').roar).toBeLessThan(0.6) // thin air at 12 km
    expect(s.peakHz).toBeGreaterThan(score('electron').peakHz)
  })

  it('failure: the engines stop at the crack, debris hiss dies away', () => {
    const s = score('falcon-9', true)
    expect(at(s, 'failure', 0.05).roar).toBeGreaterThan(0)
    expect(at(s, 'failure', 0.2).roar).toBe(0)
    expect(at(s, 'failure', 0.2).hiss).toBeGreaterThan(at(s, 'failure', 0.9).hiss)
    expect(at(s, 'failure', 0.9).hiss).toBeLessThan(0.02)
  })
})

describe('launch cues', () => {
  it('pad: a whoomp for liquid engines, a bang at T0 for solid boosters, thuds and a click in space', () => {
    expect(cuesIn(score('falcon-9'), 'ignition')).toEqual(['whoomp'])
    expect(cuesIn(score('falcon-9'), 'liftoff')).toEqual([])
    expect(cuesIn(score('sls-block-1'), 'liftoff')).toEqual(['light'])
    for (const id of ['boosters', 'staging', 'fairing'] as const) expect(cuesIn(score('sls-block-1'), id)).toEqual(['thud'])
    expect(cuesIn(score('falcon-9'), 'burn')).toEqual([])
    expect(cuesIn(score('falcon-9'), 'deploy')).toEqual(['click'])
    const times = score('sls-block-1').cues.map((c) => c.t)
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('air launch and failure', () => {
    expect(score('pegasus-xl').cues.slice(0, 2).map((c) => c.cue)).toEqual(['clunk', 'light'])
    const lost = score('falcon-9', true)
    expect(lost.cues.map((c) => c.cue)).toEqual(['whoomp', 'crack'])
    expect(lost.lostAt).toBeGreaterThan(lost.timeline.stages.at(-1)!.start)
  })
})

describe('cues and room details', () => {
  it('are short and well formed', () => {
    for (const [name, parts] of Object.entries(CUES)) {
      expect(parts.length, name).toBeGreaterThan(0)
      for (const p of parts) {
        expect(p.dur, name).toBeGreaterThan(0)
        expect(p.gain, name).toBeGreaterThan(0)
        expect(p.freq, name).toBeGreaterThan(20)
      }
      expect(cueLength(name as CueName), name).toBeLessThan(1.6)
    }
    // The alarm is a few pulses, then quiet: it never loops.
    expect(cueLength('caution')).toBeLessThan(1.2)
    expect(CUES.caution.filter((p) => p.gain > 0.02)).toHaveLength(4)
  })

  it('room details are quiet and 8 to 20 seconds apart', () => {
    expect(detailGap(0)).toBe(8)
    expect(detailGap(1)).toBe(20)
    for (const list of Object.values(DETAILS)) for (const name of list) for (const p of CUES[name]) expect(p.gain, name).toBeLessThanOrEqual(0.07)
  })
})
