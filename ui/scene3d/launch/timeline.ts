// Pure: the launch cinematic as a list of stages. Each stage is one camera shot with a caption.
// `start`/`end` are seconds of screen time; `met` is the real mission clock the shot covers, so
// the T+ clock jumps at each cut (like an edited launch replay) and runs at a believable pace inside a shot.
import { rocketSpec, type RocketSpec, type VehicleLike } from './vehicles'

export type StageId =
  | 'countdown' | 'ignition' | 'liftoff'
  | 'carry' | 'drop' | 'airstart'
  | 'pitch' | 'maxq' | 'boosters' | 'staging' | 'fairing' | 'burn' | 'deploy'
  | 'failure'

export interface LaunchStage {
  id: StageId
  title: string
  /** One short line a 12-year-old can read in the time the shot lasts. */
  caption: string
  /** The fuller explanation, shown when the sequence is paused or stepped through. */
  detail: string
  /** Screen time, seconds from the start of the sequence. */
  start: number
  end: number
  /** Mission clock at `start` and `end`, seconds after T0 (negative before it). */
  met: [number, number]
}

export interface LaunchTimeline {
  stages: LaunchStage[]
  /** Screen seconds for the whole sequence. */
  duration: number
  failed: boolean
}

/** Where in its shot each key event happens, 0 to 1. The scene and the clock both use these. */
export const EVENT_AT = { maxq: 0.5, boosters: 0.35, staging: 0.15, fairing: 0.35, burn: 0.8, deploy: 0.3, drop: 1 / 6 } as const

interface Shot { id: StageId; seconds: number; met: [number, number]; title: string; caption: string; detail: string }

/** A shot that covers `span` real seconds, with the event at `at` (0 to 1) of the way through. */
const around = (event: number, at: number, span: number): [number, number] => [event - at * span, event + (1 - at) * span]

function shots(spec: RocketSpec, failed: boolean): Shot[] {
  const ev = spec.events
  const name = spec.name
  const start: Shot[] = spec.airLaunch
    ? [
        { id: 'carry', seconds: 3, met: [-10, -1], title: 'Carried to altitude', caption: `A carrier aircraft hauls ${name} up above the thickest air.`, detail: `A carrier aircraft hauls ${name} up to about 12 km. Starting above the thickest air lets the rocket be smaller.` },
        { id: 'drop', seconds: 2.2, met: [-1, 5], title: 'Drop', caption: 'Released! It falls for five seconds to get clear of the aircraft.', detail: 'The aircraft lets go. The rocket falls for five seconds so it is safely clear before its motor lights.' },
        { id: 'airstart', seconds: 2.8, met: [5, 12], title: 'Ignition', caption: 'The motor lights, and the wing helps the rocket pull up.', detail: 'The solid rocket motor lights. The wing helps the rocket pull up and start to climb.' },
      ]
    : [
        { id: 'countdown', seconds: 2.8, met: [-10, -3], title: 'On the pad', caption: `${name} waits on the pad at dawn. Your spacecraft ${spec.rideshare ? 'shares the nose with many others' : 'is inside the nose'}.`, detail: `${name} stands on the launch pad at dawn${spec.rideshare ? ', carrying your spacecraft and many others' : ' with your spacecraft tucked inside its nose'}. The countdown is almost at zero.` },
        { id: 'ignition', seconds: 1.8, met: [-3, 0], title: 'Ignition', caption: 'Engines light. Water floods the pad to soak up heat and noise.', detail: 'The engines light a few seconds early so computers can check they are healthy. Water floods the pad to soak up heat and noise.' },
        { id: 'liftoff', seconds: 3, met: [0, 8], title: 'Lift-off', caption: 'Thrust beats gravity: the rocket rises straight up past the tower.', detail: 'The engines now push up harder than gravity pulls down, so the rocket rises. It climbs straight up to clear the tower.' },
      ]
  const climb: Shot[] = [
    spec.airLaunch
      ? { id: 'pitch', seconds: 2.2, met: [14, 22], title: 'Pull-up', caption: 'The wing lifts the nose, and the rocket climbs out of the thick air.', detail: 'The wing lifts the nose, so the rocket climbs steeply out of the thick air. Later it levels off: getting to orbit is mostly about going sideways very fast.' }
      : { id: 'pitch', seconds: 2.2, met: [14, 22], title: 'Pitch-over', caption: 'It tips over on purpose: orbit is about going sideways, fast.', detail: 'The rocket tips over on purpose. Getting to orbit is mostly about going sideways very fast, not just going up.' },
    { id: 'maxq', seconds: 2.5, met: around(ev.maxq, EVENT_AT.maxq, 8), title: 'Max-Q', caption: 'Max-Q: the moment the air pushes hardest on the rocket.', detail: 'Max-Q is when the air pushes hardest on the rocket: it is already fast and the air is still thick. After this the air thins and the ride gets easier.' },
  ]
  if (failed) {
    // The sim only reports that the launch failed (outcome "launch_failure"), not when or how.
    const pct = Math.round(spec.reliability * 100)
    return [...start, ...climb, {
      id: 'failure', seconds: 4.5, met: [ev.maxq + 4, ev.maxq + 14], title: 'Launch failure',
      caption: 'The rocket did not reach orbit. The spacecraft is lost.',
      detail: `The rocket did not reach orbit, and the spacecraft is lost. ${name} succeeds about ${pct}% of the time: even good rockets sometimes fail, so reliability is part of choosing one.`,
    }]
  }
  // Real vehicles differ in order: most drop the first stage before the fairing, SLS the other way round.
  const drops: (Shot & { at: number })[] = [
    { at: ev.staging, id: 'staging', seconds: 2.7, met: around(ev.staging, EVENT_AT.staging, 12), title: 'Stage separation', caption: 'The first stage is empty, so it drops away and the next engine lights.', detail: 'The first stage is empty, so it drops away and the next stage lights its own engine. Rockets shed stages so they never carry dead weight to orbit.' },
    { at: ev.fairing, id: 'fairing', seconds: 2.8, met: around(ev.fairing, EVENT_AT.fairing, 8), title: 'Fairing separation', caption: `Almost no air up here, so the nose cone splits open. There is ${spec.rideshare ? 'the stack of satellites' : 'your spacecraft'}!`, detail: `The nose cone, called the fairing, shielded ${spec.rideshare ? 'the satellites' : 'your spacecraft'} from the rushing air. Up here there is almost no air, so it splits and falls away to save weight.` },
  ]
  if (spec.boosters && ev.boosters !== undefined) {
    drops.push({ at: ev.boosters, id: 'boosters', seconds: 2.3, met: around(ev.boosters, EVENT_AT.boosters, 8), title: 'Booster separation', caption: 'The side boosters are empty. Dropping them makes the rocket lighter.', detail: 'The side boosters have burned all their fuel. Dropping them means the rocket no longer has to lift their empty cases.' })
  }
  drops.sort((a, b) => a.at - b.at)
  return [
    ...start, ...climb,
    ...drops.map(({ at: _at, ...shot }) => shot),
    { id: 'burn', seconds: 2.6, met: around(ev.seco, EVENT_AT.burn, 14), title: 'Burn to orbit', caption: 'The upper stage speeds up to 28,000 km/h: fast enough to stay in orbit.', detail: 'The upper stage keeps pushing sideways until it is going about 28,000 km/h: fast enough to keep missing the Earth as it falls. That is an orbit.' },
    { id: 'deploy', seconds: 3.2, met: around(ev.deploy, EVENT_AT.deploy, 10), title: 'Spacecraft separation', caption: 'Springs push your spacecraft free. It is in orbit: mission on!', detail: `${spec.rideshare ? 'The satellites are let go one at a time. Springs' : 'Springs'} gently push your spacecraft free. It is in orbit and on its own: time to start the mission.` },
  ]
}

/** The stages of the launch for a launch-vehicle row (any row, or none: unknown vehicles get a generic rocket). */
export function launchTimeline(vehicle: VehicleLike | RocketSpec | undefined, options: { failed?: boolean } = {}): LaunchTimeline {
  const spec = vehicle && 'events' in vehicle ? vehicle : rocketSpec(vehicle)
  const failed = options.failed === true
  let t = 0
  const stages = shots(spec, failed).map(({ seconds, ...shot }): LaunchStage => ({ ...shot, start: t, end: (t += seconds) }))
  return { stages, duration: t, failed }
}

/** The stage on screen at screen time `t`. Clamps: before the start gives the first stage, after the end the last. */
export function stageAt(timeline: LaunchTimeline, t: number): LaunchStage {
  const stages = timeline.stages
  return stages.find((s) => t < s.end) ?? stages[stages.length - 1]!
}

/** 0 to 1 through the stage. */
export function stageProgress(stage: LaunchStage, t: number): number {
  return Math.min(1, Math.max(0, (t - stage.start) / (stage.end - stage.start)))
}

/** Mission clock (seconds after T0) at screen time `t`. */
export function missionTime(timeline: LaunchTimeline, t: number): number {
  const stage = stageAt(timeline, t)
  return stage.met[0] + (stage.met[1] - stage.met[0]) * stageProgress(stage, t)
}

/** "T-00:07", "T+02:28", "T+1:02:05". */
export function formatMissionTime(seconds: number): string {
  const s = Math.floor(Math.abs(seconds))
  const two = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  return `T${seconds < 0 ? '-' : '+'}${h > 0 ? `${h}:` : ''}${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`
}

/** The screen time of the still frame that best shows a stage (used when motion is reduced). */
export function stillTime(stage: LaunchStage): number {
  return stage.start + 0.7 * (stage.end - stage.start)
}
