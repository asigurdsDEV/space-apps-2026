// The real catalogs and demo scenario from data/, under the names the sim tests,
// app/ and the ui previews already import. Only this file (and the tests) may import
// data/: the sim core itself takes its Datasets and Config as arguments.

import type { Config, Dataset, ParamValue } from '../../shared'
import { getDatasets, getScenario } from '../../data'

const demo = getScenario('demo')
if (!demo) throw new Error('sim fixtures: data/ has no "demo" scenario')

/** The six parts catalogs from data/. */
export const fixtureDatasets: Dataset[] = getDatasets(demo.datasets)

/**
 * data/'s demo scenario, "First Light": 30 science points in one year on $8M.
 * It starts with a complete design that launches but misses the science target.
 */
export const demoConfig: Config = { ...demo, params: { ...demo.params }, entities: [...demo.entities] }

/**
 * data/'s reference design for the demo: it passes every launch check and wins.
 * 12U CubeSat, basic camera + infrared spectrometer, large solar wings, X-band radio. About $7.3M.
 */
export const goodDesign: Record<string, ParamValue> = {
  launch_vehicle: 'rideshare',
  orbit: 'sso',
  bus: 'cubesat-12u',
  instruments: 'camera-basic,ir-spectrometer',
  solar: 'solar-deployable-large',
  battery: 'battery-small',
  comms: 'x-band-transmitter',
}
