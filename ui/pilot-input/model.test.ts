import { describe, expect, it } from 'vitest'
import { createPilotInput } from './model'

describe('pilot input sources', () => {
  it('keeps scan held until every interaction source releases', () => {
    const input = createPilotInput()
    input.press('key:E', 'interact'); input.press('pointer:1', 'interact')
    input.release('key:E')
    expect(input.intent().interact).toBe(true)
    input.release('pointer:1')
    expect(input.intent().interact).toBe(false)
  })
  it('cancels opposing axes and restores the remaining held direction', () => {
    const input = createPilotInput()
    input.press('key:W', 'forward'); input.press('key:S', 'backward')
    expect(input.intent().forward).toBe(0)
    input.release('key:S')
    expect(input.intent().forward).toBe(1)
    input.press('key:A', 'left'); input.press('key:F', 'down')
    expect(input.intent()).toEqual({ forward: 1, right: -1, up: -1, brake: false, interact: false })
  })
  it('releases each finger/key independently, including duplicate presses', () => {
    const input = createPilotInput()
    input.press('key:W', 'forward'); input.press('key:W', 'forward')
    input.press('pointer:1', 'forward'); input.press('pointer:2', 'up')
    input.release('key:W'); input.release('pointer:2')
    expect(input.intent()).toEqual({ forward: 1, right: 0, up: 0, brake: false, interact: false })
    input.release('pointer:1'); input.release('pointer:1')
    expect(input.intent().forward).toBe(0)
  })
  it('reports brake separately and clears every source on release', () => {
    const input = createPilotInput()
    input.press('key:W', 'forward'); input.press('pointer:2', 'brake'); input.press('key:E', 'interact')
    expect(input.intent().brake).toBe(true)
    expect(input.intent().interact).toBe(true)
    input.clear()
    expect(input.intent()).toEqual({ forward: 0, right: 0, up: 0, brake: false, interact: false })
    input.press('new', 'right')
    expect(input.intent().right).toBe(1)
  })
})
