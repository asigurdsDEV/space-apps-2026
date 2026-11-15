import { describe, expect, it } from 'vitest'
import { advance, LOOP, newMotion, pose, type Motion, type MoveMode, type Pose } from './motion'

const numbers = (p: Pose) => [p.lift, p.sway, p.slide, p.pitch, p.roll, ...[...p.legs, ...p.arms].flatMap((l) => [l.swing, l.spread, l.bend])]
/** Runs the clock at 60 frames a second and returns every pose on the way. */
function run(mode: MoveMode, m: Motion, seconds: number, forward: number, side = 0, turn = 0): Pose[] {
  const poses: Pose[] = []
  for (let i = 0; i < seconds * 60; i++) {
    advance(m, mode, 1 / 60, forward, side, turn)
    poses.push(pose(mode, m))
  }
  return poses
}
const biggestStep = (poses: Pose[]) =>
  Math.max(...poses.slice(1).map((p, i) => Math.max(...numbers(p).map((v, j) => Math.abs(v - numbers(poses[i]!)[j]!)))))

describe('crew motion', () => {
  it('stands almost still when not walking, with its feet on the floor', () => {
    for (const p of run('walk', newMotion(), 12, 0)) {
      for (const limb of [...p.legs, ...p.arms]) expect(Math.abs(limb.swing)).toBeLessThan(0.08)
      expect(Math.abs(p.lift)).toBeLessThan(0.005)
      expect(Math.abs(p.sway)).toBeLessThan(0.03)
    }
  })

  it('walks with legs in opposite directions and each arm against its own leg', () => {
    const poses = run('walk', newMotion(), 4, 3.2).slice(120) // up to speed
    let widest = 0
    for (const p of poses) {
      const [left, right] = [p.legs[0].swing - p.pitch, p.legs[1].swing - p.pitch]
      expect(left).toBeCloseTo(-right, 6)
      if (Math.abs(left) > 0.1) expect(Math.sign(p.arms[0].swing)).toBe(-Math.sign(left))
      widest = Math.max(widest, Math.abs(left))
      // A small bob, as the body rides over the foot on the floor.
      expect(Math.abs(p.lift)).toBeLessThan(0.06)
    }
    expect(widest).toBeGreaterThan(0.3)
  })

  it('matches stride to ground speed', () => {
    // One cycle is two steps, and steps get longer with speed: twice as fast is a quicker cycle, but not twice as quick.
    const cycles = (speed: number) => {
      const m = newMotion()
      run('walk', m, 2, speed)
      let turned = 0
      for (let i = 0; i < 600; i++) {
        const last = m.stride
        advance(m, 'walk', 1 / 60, speed, 0, 0)
        turned += (m.stride - last + Math.PI * 2) % (Math.PI * 2)
      }
      return turned / (Math.PI * 2) / 10
    }
    expect(cycles(1.6)).toBeGreaterThan(0.9)
    expect(cycles(1.6)).toBeLessThan(1.4)
    expect(cycles(3.2)).toBeGreaterThan(cycles(1.6))
    expect(cycles(3.2)).toBeLessThan(2 * cycles(1.6))
  })

  it('floats off the floor, drifting when still and leaning into travel', () => {
    const still = run('float', newMotion(), LOOP, 0)
    for (const p of still) expect(p.lift).toBeGreaterThan(0.1)
    const lifts = still.map((p) => p.lift)
    expect(Math.max(...lifts) - Math.min(...lifts)).toBeGreaterThan(0.03) // the bob
    expect(still[0]!.arms[0].bend).toBeGreaterThan(0.8) // arms up in the relaxed zero-g pose
    expect(still[0]!.legs[0].bend).toBeGreaterThan(0.5) // knees bent
    const moving = run('float', newMotion(), 4, 3.2).slice(120)
    for (const p of moving) {
      expect(p.lift).toBeGreaterThan(0.1)
      expect(p.pitch).toBeGreaterThan(still[0]!.pitch + 0.2)
      expect(p.legs[0].swing - p.pitch).toBeLessThan(-0.3) // legs trail behind
    }
    // The hands take turns reaching forwards.
    const lead = moving.map((p) => Math.sign(p.arms[0].swing - p.arms[1].swing))
    expect(lead).toContain(1)
    expect(lead).toContain(-1)
    expect(run('float', newMotion(), 4, 0, 3.2).at(-1)!.roll).toBeGreaterThan(0.2)
  })

  it('never snaps: starting, stopping, turning round and wrapping the clock', () => {
    for (const mode of ['walk', 'float'] as const) {
      const m = newMotion(LOOP - 3)
      const poses = [
        ...run(mode, m, 2, 0),
        ...run(mode, m, 3, 3.2), // crosses the clock's wrap at speed
        ...run(mode, m, 2, 0),
        ...run(mode, m, 2, -3.2),
        ...run(mode, m, 2, 0, 3.2, 2),
      ]
      // At 60 frames a second no joint turns more than a few degrees in a frame.
      expect(biggestStep(poses)).toBeLessThan(0.2)
      // A pose that jumped across the room is a quick run, not a broken one.
      for (const p of [...poses, ...run(mode, m, 2, 900, -900, 50)]) for (const v of numbers(p)) expect(Number.isFinite(v)).toBe(true)
      // Still, a frame either side of the wrap is as close as any two frames.
      const before = pose(mode, { ...newMotion(), t: LOOP - 1e-4 })
      const after = pose(mode, newMotion(1e-4))
      expect(biggestStep([before, after])).toBeLessThan(1e-3)
      const end = pose(mode, { ...newMotion(), stride: Math.PI * 2 - 1e-4, forward: 3, move: 1 })
      const start = pose(mode, { ...newMotion(), stride: 1e-4, forward: 3, move: 1 })
      expect(biggestStep([end, start])).toBeLessThan(1e-3)
    }
  })
})
