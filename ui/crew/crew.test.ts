import { Scene, SkinnedMesh, type Material } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountCrew } from './crew'

const member = { player_id: 'p1', name: 'Kaipo', x: 0, z: 0, yaw: 0 }
const settle = (crew: ReturnType<typeof mountCrew>) => {
  let last = false
  for (let i = 0; i < 120; i++) last = crew.update(1 / 60)
  return last
}

describe('crew in a room', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks for no frames while the room is empty, and for every frame while crew are in it', () => {
    for (const float of [false, true]) {
      const crew = mountCrew(new Scene(), { float })
      expect(crew.update(1 / 60)).toBe(false)
      crew.set([member])
      expect(settle(crew)).toBe(true) // standing still, but breathing or drifting
      crew.set([])
      expect(crew.update(1 / 60)).toBe(true) // one frame to show they left
      expect(crew.update(1 / 60)).toBe(false)
      crew.dispose()
    }
  })

  it('floats the body up in the spacecraft and leaves it on the floor on Earth', () => {
    const lift = (float: boolean) => {
      const scene = new Scene()
      const crew = mountCrew(scene, { float })
      crew.set([member])
      settle(crew)
      return scene.children[0]!.children[0]!.children[0]!.position.y
    }
    expect(lift(true)).toBeGreaterThan(0.1)
    expect(Math.abs(lift(false))).toBeLessThan(0.01)
  })

  it('stands a body on uneven ground when the place provides a height', () => {
    const scene = new Scene()
    const crew = mountCrew(scene, { ground: () => 40 })
    crew.set([member])
    settle(crew)
    expect(scene.children[0]!.children[0]!.position.y).toBeCloseTo(40)
    crew.dispose()
  })

  it('walks smoothly on poses that arrive ten times a second', () => {
    const scene = new Scene()
    const crew = mountCrew(scene)
    crew.set([member])
    const thigh = scene.children[0]!.children[0]!.children[0]!.children[0]! // the body's first bone: a leg
    let widest = 0
    let jerk = 0
    for (let frame = 0; frame < 300; frame++) {
      // Heading along -Z (the way yaw 0 faces) at walking pace, 3.2 m/s.
      if (frame % 6 === 0) crew.set([{ ...member, z: (-3.2 * frame) / 60 }])
      const before = thigh.rotation.x
      crew.update(1 / 60)
      jerk = Math.max(jerk, Math.abs(thigh.rotation.x - before))
      widest = Math.max(widest, thigh.rotation.x)
    }
    expect(widest).toBeGreaterThan(0.4) // a real stride, forwards
    expect(jerk).toBeLessThan(0.15)
  })

  it('leans the way a floating crew member travels, whichever way they face', () => {
    const lean = (yaw: number, dx: number, dz: number) => {
      const scene = new Scene()
      const crew = mountCrew(scene, { float: true })
      crew.set([{ ...member, yaw }])
      for (let frame = 0; frame < 120; frame++) {
        if (frame % 6 === 0) crew.set([{ ...member, yaw, x: (dx * 3.2 * frame) / 60, z: (dz * 3.2 * frame) / 60 }])
        crew.update(1 / 60)
      }
      return scene.children[0]!.children[0]!.children[0]!.rotation
    }
    expect(lean(0, 0, -1).x).toBeLessThan(-0.4) // facing -Z, going -Z: head first
    expect(lean(Math.PI / 2, -1, 0).x).toBeLessThan(-0.4) // facing -X, going -X: head first again
    expect(lean(0, 0, 1).x).toBeGreaterThan(0) // backwards: leans back
    expect(lean(0, 1, 0).z).toBeLessThan(-0.15) // sideways to +X: head towards +X
  })

  it('gives everyone in the room their own leg-stripe colour, and keeps it through a rename', () => {
    const scene = new Scene()
    const crew = mountCrew(scene)
    const stripes = () => scene.children[0]!.children.map((body) => (body.children.find((part) => part instanceof SkinnedMesh)!.material as Material[]).at(-1)!)
    const four = ['a', 'b', 'c', 'd'].map((player_id) => ({ ...member, player_id }))
    crew.set(four)
    expect(new Set(stripes()).size).toBe(4)
    const [first, second] = stripes()
    crew.set([{ ...four[0]!, name: 'Renamed' }, four[2]!, four[3]!])
    expect(stripes()).toContain(first)
    expect(stripes()).not.toContain(second)
    crew.set([four[0]!, four[2]!, four[3]!, { ...member, player_id: 'e' }])
    expect(stripes()).toContain(second) // the newcomer takes the colour that was freed
    expect(new Set(stripes()).size).toBe(4)
    crew.dispose()
  })

  it('only eases the position when the player asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
    const scene = new Scene()
    const crew = mountCrew(scene, { float: true })
    crew.set([member])
    expect(crew.update(1 / 60)).toBe(true)
    expect(crew.update(1 / 60)).toBe(false)
    crew.set([{ ...member, x: 2 }])
    expect(crew.update(1 / 60)).toBe(true)
    expect(settle(crew)).toBe(false)
    const body = scene.children[0]!.children[0]!
    expect(body.position.x).toBeCloseTo(2, 2)
    expect(body.children[0]!.position.y).toBe(0) // not lifted, not posed
  })
})
