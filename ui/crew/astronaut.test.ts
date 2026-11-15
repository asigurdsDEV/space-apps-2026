import { Box3, Mesh, Vector3, type Group } from 'three'
import { describe, expect, it } from 'vitest'
import { createAstronaut, crewLabel } from './astronaut'

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
    const meshes = (crew: Group) => crew.children.filter((c): c is Mesh => c instanceof Mesh)
    expect(meshes(a).length).toBeLessThanOrEqual(6) // one draw call per material
    meshes(a).forEach((mesh, i) => expect(mesh.geometry).toBe(meshes(b)[i]!.geometry))
    const triangles = meshes(a).reduce((sum, mesh) => sum + mesh.geometry.getAttribute('position').count / 3, 0)
    expect(triangles).toBeLessThan(40_000)
    // Feet on the floor, visor towards -Z (the way the first-person camera looks at yaw 0).
    const box = new Box3().setFromObject(a)
    expect(box.min.y).toBeGreaterThan(-0.02)
    expect(box.min.y).toBeLessThan(0.03)
    const visor = meshes(a).at(-1)!
    visor.geometry.computeBoundingBox()
    expect(visor.geometry.boundingBox!.max.z).toBeLessThan(0)
  })
})