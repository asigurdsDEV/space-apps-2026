import { describe, expect, it } from 'vitest'
import { INTERCEPTION_PROBABILITY, interceptionTriggered, keepInterception, lightningStruck, openInterception, unitInterval } from './event'

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

  it('strikes with lightning near one in five, never on a launch that is intercepted', () => {
    let hits = 0
    for (let seed = 0; seed < 1000; seed++) {
      if (lightningStruck(seed)) hits++
      if (lightningStruck(seed)) expect(interceptionTriggered(seed)).toBe(false)
    }
    expect(hits / 1000).toBeGreaterThan(0.15)
    expect(hits / 1000).toBeLessThan(0.25)
  })
})
