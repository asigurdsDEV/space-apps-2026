// Ready-made designs for the Mission Control preset wall: one per rocket, for each scenario that rocket can fly.
// A rocket missing from a scenario can't do it within budget or reach (e.g. Falcon 9 costs more than the CubeSat
// mission's whole budget; the small rockets can't reach the Moon). presets.test.ts proves every one is GO everywhere.

import type { Id, Params } from '../shared'

export interface Preset {
  name: string
  /** All seven slots plus ground stations, so loading one replaces the whole design. `launch_vehicle` is the rocket. */
  design: Params
}

const each = (name: string, design: Params, rockets: Id[]): Preset[] =>
  rockets.map((launch_vehicle) => ({ name, design: { ...design, launch_vehicle, ground_stations: 1 } }))

const MOON: Params = { orbit: 'lunar', bus: 'medium-bus', solar: 'solar-array-medium', battery: 'battery-medium', comms: 'high-gain-dish', instruments: 'laser-altimeter,radiation-detector,ir-spectrometer,magnetometer' }
const MARS: Params = { orbit: 'low-mars-orbit', bus: 'medium-bus', solar: 'solar-array-large', battery: 'battery-medium', comms: 'mars-hga', instruments: 'subsurface-radar,ir-spectrometer' }
const TEST_SAT: Params = { orbit: 'sso', bus: 'cubesat-12u', solar: 'solar-deployable-small', battery: 'battery-small', comms: 's-band-patch', instruments: 'magnetometer' }

/** By base scenario id (data/scenarios). */
export const PRESETS: Record<Id, readonly Preset[]> = {
  demo: each('Earth Imager', { orbit: 'sso', bus: 'cubesat-12u', solar: 'solar-deployable-large', battery: 'battery-small', comms: 'x-band-transmitter', instruments: 'camera-basic,ir-spectrometer' }, ['rideshare']),
  // Falcon 9 is cheap enough for the Mars dish (a faster link); the others can't afford it on Hard.
  moon: [...each('Lunar Mapper', { ...MOON, comms: 'mars-hga' }, ['falcon-9']), ...each('Lunar Mapper', MOON, ['atlas-v', 'vulcan-centaur'])],
  mars: each('Ice Hunter', MARS, ['falcon-9', 'atlas-v', 'vulcan-centaur', 'falcon-heavy']),
  sandbox: [
    ...each('Test CubeSat', TEST_SAT, ['rideshare', 'electron', 'pegasus-xl', 'falcon-9', 'atlas-v', 'vulcan-centaur', 'falcon-heavy']),
    ...each('Moon Orbiter', { orbit: 'lunar', bus: 'medium-bus', solar: 'solar-array-medium', battery: 'battery-medium', comms: 'deep-space-transponder', instruments: 'laser-altimeter,radiation-detector' }, ['sls-block-1']),
  ],
}

/** The presets for a scenario at any difficulty ("moon-hard" → moon's). */
export function presetsFor(scenarioId: Id): readonly Preset[] {
  return PRESETS[scenarioId.replace(/-(easy|hard)$/, '')] ?? []
}
