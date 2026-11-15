import { describe, expect, it } from 'vitest'
import type { Command, SimState } from '../../shared'
import { getDatasets, getScenario } from '../../data'
import { init, step } from '../../sim'
import { CALLOUT_MAX, fitCallout } from './callouts'

const demo = getScenario('demo')!
const start = () => step(init(demo, getDatasets(demo.datasets)), [], demo.dt_s).state
const set = (s: SimState, key: string, value: string | number) =>
  step(s, [{ type: 'set_param', payload: { key, value } } as Command], demo.dt_s).state

describe('CAPCOM answers design choices (real sim)', () => {
  it('names the part and its biggest effects', () => {
    // Enough bus and power first, so the radio adds no NO-GO (on the starting 6U it would, and CAPCOM says so).
    const a = set(set(start(), 'bus', 'cubesat-12u'), 'solar', 'solar-deployable-large')
    const b = set(a, 'comms', 'x-band-transmitter')
    const line = fitCallout(a, b)!
    expect(line).toMatch(/^Copy, Flight\. X-band transmitter fitted · downlink ×\d+/)
    expect(line.length).toBeLessThanOrEqual(CALLOUT_MAX)
  })

  it('warns about a new NO-GO first, and says when one clears', () => {
    expect(fitCallout(start(), set(start(), 'comms', 'x-band-transmitter'))).toMatch(/Heads up, Flight: /)
    const a = start()
    const heavy = set(a, 'bus', 'flagship-bus')
    expect(fitCallout(a, heavy)).toMatch(/^Flagship spacecraft fitted\. Heads up, Flight: /)
    const back = set(heavy, 'bus', 'cubesat-6u')
    expect(fitCallout(heavy, back)).toMatch(/^Copy, Flight\. 6U CubeSat fitted\. That clears it: /)
  })

  it('reads instrument additions and stays quiet when nothing was chosen', () => {
    const a = start()
    const b = set(a, 'instruments', 'camera-basic,magnetometer')
    expect(fitCallout(a, b)).toMatch(/^Copy, Flight\. Magnetometer added/)
    expect(fitCallout(a, step(a, [], demo.dt_s).state)).toBeNull()
  })
})
