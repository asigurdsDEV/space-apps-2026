import { describe, expect, it } from 'vitest'
import { INTERCEPTION_PROBABILITY, interceptionTriggered, keepInterception, openInterception, unitInterval } from './event'
import { missileAlong, shotAt, timeScale } from './timeline'

describe('interception roll', () => {
  it('is the same value every time for one seed', () => {
    expect(unitInterval(1)).toBe(unitInterval(1))
    expect(interceptionTriggered(4)).toBe(interceptionTriggered(4))
  })

  it('lands near one in five across a thousand seeds', () => {
    let hits = 0
    for (let seed = 0; seed < 1000; seed++) if (interceptionTriggered(seed)) hits++
    expect(hits / 1000).toBeGreaterThan(0.15)
    expect(hits / 1000).toBeLessThan(0.25)
  })

  it('does not roll again after the simulation has opened', () => {
    const run = openInterception(7)
    const again = keepInterception(run)
    expect(again).toBe(run)
    expect(again.triggered).toBe(run.triggered)
    expect(openInterception(7, INTERCEPTION_PROBABILITY, true).triggered).toBe(true)
    expect(openInterception(7, INTERCEPTION_PROBABILITY, false).triggered).toBe(false)
  })

  it('plays the missile release slower than the climb, on one path', () => {
    expect(timeScale('release')).toBeLessThan(timeScale('climb'))
    expect(shotAt(0).id).toBe('climb')
    expect(shotAt(9).id).toBe('release')
    expect(shotAt(100).id).toBe('explosion')
    expect(missileAlong(1)).toBe(0)
    expect(missileAlong(12)).toBeGreaterThan(0)
    expect(missileAlong(12)).toBeLessThan(missileAlong(16))
    expect(missileAlong(20)).toBe(1)
  })
})
