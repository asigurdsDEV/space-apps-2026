import { describe, expect, it } from 'vitest'
import type { Entity } from '../../../shared'
import { getDataset } from '../../../data'
import { catalogEntities } from '../../../sim/parts'
import { formatMissionTime, launchTimeline, missionTime, stageAt, stageProgress, stillTime } from './timeline'
import { altitudeM, pitchRad, vacuum } from './flight'
import { payloadCapacityKg, rocketHeight, rocketSpec } from './vehicles'

const vehicles = catalogEntities([getDataset('launch-vehicles')!]).filter((e) => e.kind === 'launch_vehicle')
const byId = (id: string) => vehicles.find((v) => v.id === id)!
const ids = (id: string, failed = false) => launchTimeline(byId(id), { failed }).stages.map((s) => s.id)

describe('launchTimeline', () => {
  it('covers every catalog row with a 15 to 26 second sequence of back-to-back stages', () => {
    expect(vehicles.length).toBeGreaterThanOrEqual(6)
    for (const v of vehicles) {
      const tl = launchTimeline(v)
      expect(tl.duration, v.id).toBeGreaterThanOrEqual(15)
      expect(tl.duration, v.id).toBeLessThanOrEqual(26)
      expect(tl.stages[0]!.start).toBe(0)
      tl.stages.forEach((s, i) => {
        expect(s.end).toBeGreaterThan(s.start)
        if (i > 0) expect(s.start).toBe(tl.stages[i - 1]!.end)
        // The short line must be readable while its shot lasts; the detail is for paused reading.
        expect(s.caption.split(' ').length, `${v.id} ${s.id}`).toBeLessThanOrEqual(18)
        expect(s.detail.length, `${v.id} ${s.id}`).toBeGreaterThan(s.caption.length * 0.8)
        expect(s.detail.length, `${v.id} ${s.id}`).toBeLessThan(230)
        // The launch is drawn in full daylight.
        expect(s.caption + s.detail, `${v.id} ${s.id}`).not.toMatch(/dawn/i)
      })
      expect(tl.stages.at(-1)!.end).toBe(tl.duration)
      expect(tl.stages.at(-1)!.id).toBe('deploy')
    }
  })

  it('orders the drops by the real event times of each vehicle', () => {
    expect(ids('falcon-9')).toEqual(['countdown', 'ignition', 'liftoff', 'pitch', 'maxq', 'staging', 'fairing', 'burn', 'deploy'])
    expect(ids('vulcan-centaur')).toEqual(['countdown', 'ignition', 'liftoff', 'pitch', 'maxq', 'boosters', 'staging', 'fairing', 'burn', 'deploy'])
    // SLS drops its fairing while the core stage is still burning.
    expect(ids('sls-block-1')).toEqual(['countdown', 'ignition', 'liftoff', 'pitch', 'maxq', 'boosters', 'fairing', 'staging', 'burn', 'deploy'])
  })

  it('drops an air-launched rocket from an aircraft instead of lifting it off a pad', () => {
    expect(ids('pegasus-xl').slice(0, 3)).toEqual(['carry', 'drop', 'airstart'])
    expect(ids('pegasus-xl')).not.toContain('liftoff')
  })

  it('ends a failed launch with a failure stage that states the reliability and never reaches orbit', () => {
    const tl = launchTimeline(byId('electron'), { failed: true })
    expect(tl.failed).toBe(true)
    expect(tl.stages.at(-1)!.id).toBe('failure')
    expect(tl.stages.at(-1)!.detail).toContain('92%')
    expect(ids('electron', true)).not.toContain('deploy')
  })

  it('a failure with a known cause says that cause on the failure shot, and the same shots play', () => {
    const cause = 'Too heavy: the rocket fell short of orbital speed, so range safety destroyed it.'
    const tl = launchTimeline(byId('electron'), { failed: true, cause })
    expect(tl.stages.at(-1)!.caption).toBe(cause)
    expect(tl.stages.at(-1)!.detail).toContain(cause)
    expect(tl.stages.map((s) => [s.id, s.start, s.end])).toEqual(launchTimeline(byId('electron'), { failed: true }).stages.map((s) => [s.id, s.start, s.end]))
  })

  it('never throws on unknown or missing vehicles', () => {
    const odd: Entity = { id: 'starship-9', kind: 'launch_vehicle', name: 'Mystery rocket', props: { payload_leo_kg: 100_000, colour: 'pink' } }
    expect(launchTimeline(odd).stages.map((s) => s.id)).toContain('boosters')
    expect(launchTimeline(odd).stages[0]!.caption).toContain('Mystery rocket')
    expect(launchTimeline(undefined).stages.length).toBeGreaterThan(5)
    expect(launchTimeline({ id: 'x', name: '', props: {} }).duration).toBeGreaterThan(15)
  })
})

describe('stageAt and the mission clock', () => {
  const tl = launchTimeline(byId('falcon-9'))
  it('finds the stage and clamps outside the sequence', () => {
    expect(stageAt(tl, -5).id).toBe('countdown')
    expect(stageAt(tl, 0).id).toBe('countdown')
    expect(stageAt(tl, tl.stages[1]!.start).id).toBe('ignition')
    expect(stageAt(tl, tl.duration + 10).id).toBe('deploy')
    expect(stageProgress(tl.stages[0]!, 99)).toBe(1)
  })
  it('runs the clock through T0 at lift-off and never backwards', () => {
    expect(missionTime(tl, tl.stages.find((s) => s.id === 'liftoff')!.start)).toBe(0)
    let last = -Infinity
    for (let t = 0; t <= tl.duration; t += 0.05) {
      const met = missionTime(tl, t)
      expect(met).toBeGreaterThanOrEqual(last)
      last = met
    }
    expect(last).toBeGreaterThan(500)
  })
  it('formats the clock', () => {
    expect(formatMissionTime(-7.2)).toBe('T-00:07')
    expect(formatMissionTime(148)).toBe('T+02:28')
    expect(formatMissionTime(3725)).toBe('T+1:02:05')
  })
  it('picks a still frame inside each stage', () => {
    for (const s of tl.stages) expect(stageAt(tl, stillTime(s))).toBe(s)
  })
})

describe('rocketSpec', () => {
  it('knows every catalog row and keeps real proportions', () => {
    for (const v of vehicles) expect(rocketSpec(v).model, v.id).not.toBe('generic')
    expect(rocketHeight(rocketSpec(byId('electron')))).toBeCloseTo(18, 0)
    expect(rocketHeight(rocketSpec(byId('falcon-9')))).toBeCloseTo(70, 0)
    expect(rocketHeight(rocketSpec(byId('sls-block-1')))).toBeCloseTo(98, 0)
    expect(rocketSpec(byId('vulcan-centaur')).boosters?.count).toBe(6)
    expect(rocketSpec(byId('pegasus-xl')).airLaunch).toBe(true)
    expect(rocketSpec(byId('rideshare')).rideshare).toBe(true)
  })
  it('sizes an unknown rocket by what it can lift', () => {
    const small = rocketSpec({ id: 'a', name: 'A', props: { payload_leo_kg: 300 } })
    const big = rocketSpec({ id: 'b', name: 'B', props: { payload_leo_kg: 60_000, payload_tli_kg: 'n/a' } })
    expect(small.model).toBe('generic')
    expect(rocketHeight(big)).toBeGreaterThan(rocketHeight(small) * 2)
    expect(big.boosters).not.toBeNull()
    expect(payloadCapacityKg(undefined)).toBe(0)
    expect(rocketSpec(undefined).reliability).toBe(1)
  })
})

describe('flight profile', () => {
  it('climbs and tips over smoothly', () => {
    expect(altitudeM(0)).toBe(0)
    expect(altitudeM(-5)).toBe(0)
    expect(altitudeM(72)).toBeGreaterThan(9_000)
    expect(altitudeM(72)).toBeLessThan(16_000)
    expect(altitudeM(5000)).toBeCloseTo(200_000, -3)
    expect(altitudeM(40, true)).toBeGreaterThan(12_000)
    expect(pitchRad(5)).toBe(0)
    expect(pitchRad(5000)).toBeCloseTo(Math.PI / 2, 5)
    for (let t = 0; t < 600; t += 3) {
      expect(altitudeM(t + 3)).toBeGreaterThanOrEqual(altitudeM(t))
      expect(pitchRad(t + 3)).toBeGreaterThanOrEqual(pitchRad(t))
    }
    expect(vacuum(0)).toBe(0)
    expect(vacuum(150_000)).toBe(1)
  })

  it('the sandbox interception: the rocket climbs, an F-22 shot, then the failure; it counts as a failed launch', () => {
    const tl = launchTimeline(rocketSpec(undefined), { intercepted: true })
    expect(tl.failed).toBe(true)
    expect(tl.stages.slice(-2).map((s) => s.id)).toEqual(['intercept', 'failure'])
    expect(tl.stages.find((s) => s.id === 'intercept')!.caption).toMatch(/F-22/)
    expect(launchTimeline(rocketSpec(undefined), { failed: true }).stages.some((s) => s.id === 'intercept')).toBe(false)
  })
})
