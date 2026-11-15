import { Box3, Mesh, Vector3, type Material, type Object3D } from 'three'
import { describe, expect, it } from 'vitest'
import { createAstronaut, crewLabel, poseAstronaut } from './astronaut'
import { advance, newMotion, pose, type MoveMode } from './motion'

const meshes = (crew: Object3D) => {
  const found: Mesh[] = []
  crew.traverse((c) => c instanceof Mesh && found.push(c))
  return found
}
/** The exact box round every vertex, as posed. */
const box = (crew: Object3D) => {
  crew.updateMatrixWorld(true)
  return new Box3().setFromObject(crew, true)
}
/** The lowest point of the suit over a few seconds at this speed, sampled a few times a second. */
function lowest(mode: MoveMode, forward: number, side = 0): number[] {
  const crew = createAstronaut('A')
  const m = newMotion(7)
  const floor: number[] = []
  for (let i = 0; i < 300; i++) {
    advance(m, mode, 1 / 60, i < 200 ? forward : 0, i < 200 ? side : 0, 0)
    if (i % 12) continue
    poseAstronaut(crew, pose(mode, m))
    floor.push(box(crew).min.y)
  }
  return floor
}

describe('astronaut', () => {
  it('stands about person-height and keeps the name', () => {
    const crew = createAstronaut('  Kaipo  ')
    const size = new Box3().setFromObject(crew).getSize(new Vector3())
    expect(crew.name).toBe('Kaipo')
    expect(size.y).toBeGreaterThan(1.6)
    expect(size.y).toBeLessThan(2.2)
    expect(size.x).toBeGreaterThan(0.6)
    expect(crewLabel('a very long call sign indeed')).toMatch(/…$/)
  })

  it('shares its shapes between crew members and stays cheap to draw', () => {
    const [a, b] = [createAstronaut('A'), createAstronaut('B')]
    expect(meshes(a).length).toBe(1) // one skinned suit, a draw call per material
    const suit = meshes(a)[0]!
    const looks = suit.material as Material[]
    expect(looks.length).toBe(6)
    expect(suit.geometry.groups.map((group) => group.materialIndex)).toEqual([0, 1, 2, 3, 4, 5])
    expect(suit.geometry).toBe(meshes(b)[0]!.geometry)
    looks.forEach((look, i) => expect(look).toBe((meshes(b)[0]!.material as Material[])[i]))
    expect((meshes(createAstronaut('C', 2))[0]!.material as Material[])[5]).not.toBe(looks[5]) // only the leg stripes differ
    const triangles = suit.geometry.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(30_000)
    // Feet on the floor, visor towards -Z (the way the first-person camera looks at yaw 0).
    expect(box(a).min.y).toBeGreaterThan(-0.02)
    expect(box(a).min.y).toBeLessThan(0.03)
    const visor = suit.geometry.groups[looks.findIndex((look) => look.name === 'visor')]!
    const position = suit.geometry.getAttribute('position')
    for (let i = visor.start; i < visor.start + visor.count; i++) expect(position.getZ(i)).toBeLessThan(0)
  })

  it('keeps its feet on the floor when walking and off it when floating', () => {
    for (const y of [...lowest('walk', 0), ...lowest('walk', 3.2), ...lowest('walk', -6), ...lowest('walk', 0, 3.2)]) {
      expect(y).toBeGreaterThan(-0.02)
      expect(y).toBeLessThan(0.03)
    }
    for (const y of [...lowest('float', 0), ...lowest('float', 3.2), ...lowest('float', -3.2), ...lowest('float', 2, 6)]) expect(y).toBeGreaterThan(0.03)
  })

  it('poses the limbs and comes back to the standing shape', () => {
    const crew = createAstronaut('A')
    const standing = box(crew)
    const m = newMotion()
    for (let i = 0; i < 90; i++) advance(m, 'float', 1 / 60, 3.2, 0, 0)
    poseAstronaut(crew, pose('float', m))
    expect(box(crew).getSize(new Vector3()).z).toBeGreaterThan(standing.getSize(new Vector3()).z + 0.5) // arms out ahead, legs behind
    const limb = { swing: 0, spread: 0, bend: 0 }
    poseAstronaut(crew, { lift: 0, sway: 0, slide: 0, pitch: 0, roll: 0, legs: [limb, limb], arms: [limb, limb] })
    const again = box(crew)
    expect(again.min.distanceTo(standing.min)).toBeLessThan(1e-6)
    expect(again.max.distanceTo(standing.max)).toBeLessThan(1e-6)
  })
})
