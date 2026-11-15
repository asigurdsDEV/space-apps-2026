import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { AIR, makeGround, sortByKey } from './fx'

describe('sortByKey', () => {
  it('orders the first n indices by rising key and leaves the rest alone', () => {
    const order = new Uint16Array([9, 9, 9, 9, 9, 7])
    sortByKey(order, new Float32Array([-5, -40, -1, -40, -12, -99]), 5)
    // Ties keep the order they were added in, so two puffs at one depth do not swap from frame to frame.
    expect([...order]).toEqual([1, 3, 4, 0, 2, 7])
  })
})

describe('makeGround', () => {
  it('draws the flat quad of the pad shots from the ground and the wide grid from the air', () => {
    const ground = makeGround({ uSun: { value: new THREE.Vector3(0, 1, 0) }, uSpace: { value: 0 }, uTime: { value: 0 } }, 60, { value: new THREE.Vector4() })
    const camera = new THREE.PerspectiveCamera()
    const before = () => ground.onBeforeRender(null as never, null as never, camera, ground.geometry, ground.material as THREE.Material, null as never)
    camera.position.y = 30
    before()
    // The quad is the first two triangles, exactly the mesh the pad shots were composed on.
    expect(ground.geometry.drawRange).toEqual({ start: 0, count: 6 })
    camera.position.y = AIR + 1
    before()
    expect(ground.geometry.drawRange.start).toBe(6)
    expect(ground.geometry.index!.count).toBe(6 + 96 * 96 * 6)
  })
})
