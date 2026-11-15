import { Box3, Vector3 } from 'three'
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
})