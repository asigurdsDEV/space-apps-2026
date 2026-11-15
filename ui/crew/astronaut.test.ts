import { Box3, Mesh, Vector3, type Object3D } from 'three'
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
    expect(meshes(a).length).toBe(32) // body 6, each leg 1 + 5, each arm 2 + 5
    meshes(a).forEach((mesh, i) => expect(mesh.geometry).toBe(meshes(b)[i]!.geometry))
    const triangles = meshes(a).reduce((sum, mesh) => sum + mesh.geometry.getAttribute('position').count / 3, 0)
    expect(triangles).toBeLessThan(40_000)
    // Feet on the floor, visor towards -Z (the way the first-person camera looks at yaw 0).
    expect(box(a).min.y).toBeGreaterThan(-0.02)
    expect(box(a).min.y).toBeLessThan(0.03)
    const visor = meshes(a).find((mesh) => mesh.name === 'visor')!
    visor.geometry.computeBoundingBox()
    expect(visor.geometry.boundingBox!.max.z).toBeLessThan(0)
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
