import { describe, expect, it } from 'vitest'
import { sortByKey } from './fx'

describe('sortByKey', () => {
  it('orders the first n indices by rising key and leaves the rest alone', () => {
    const order = new Uint16Array([9, 9, 9, 9, 9, 7])
    sortByKey(order, new Float32Array([-5, -40, -1, -40, -12, -99]), 5)
    // Ties keep the order they were added in, so two puffs at one depth do not swap from frame to frame.
    expect([...order]).toEqual([1, 3, 4, 0, 2, 7])
  })
})
