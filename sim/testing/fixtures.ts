// Small made-up catalogs and a demo scenario, used by the sim tests and usable by
// app/ and ui/ until the real catalogs land in data/.
// THESE NUMBERS ARE PLACEHOLDERS, not NASA data. They are only sized to be plausible.

import type { Config, Dataset, ParamValue, TableDataset } from '../../shared'
import { CONTRACT_VERSION } from '../../shared'

function table(id: string, columns: string[], rows: (ParamValue | null)[][]): TableDataset {
  return {
    id,
    source: 'placeholder values written by claude@ethan for tests',
    source_url: '',
    license: 'MIT',
    retrieved_utc: '2026-11-14T18:00:00Z',
    kind: 'table',
    units: {},
    data: { columns, rows },
  }
}

export const launchVehicles = table(
  'launch-vehicles',
  ['id', 'name', 'cost_usd', 'reliability', 'capacity_leo_kg', 'capacity_sso_kg', 'capacity_geo_kg'],
  [
    ['small-lifter', 'Small Lifter', 8e6, 0.92, 300, 200, 0],
    ['medium-lifter', 'Medium Lifter', 60e6, 0.98, 8000, 6000, 2500],
    ['heavy-lifter', 'Heavy Lifter', 150e6, 0.97, 25000, 18000, 9000],
  ],
)

export const orbits = table(
  'orbits',
  ['id', 'name', 'body', 'class', 'altitude_km', 'eclipse_fraction', 'contact_min_per_day', 'science_multiplier', 'cruise_days'],
  [
    ['leo-equatorial', 'Low Earth orbit', 'earth', 'leo', 500, 0.37, 40, 1.0, 1],
    ['sun-synchronous', 'Sun-synchronous orbit', 'earth', 'sso', 700, 0.3, 50, 1.3, 2],
    ['geostationary', 'Geostationary orbit', 'earth', 'geo', 35786, 0.02, 1440, 0.8, 10],
  ],
)

export const buses = table(
  'buses',
  ['id', 'name', 'mass_kg', 'cost_usd', 'max_payload_kg', 'power_draw_w', 'storage_gb', 'reliability', 'build_months'],
  [
    ['cubesat-6u', '6U CubeSat', 8, 1.5e6, 4, 10, 32, 0.85, 9],
    ['smallsat', 'SmallSat bus', 120, 12e6, 60, 80, 500, 0.93, 18],
    ['large-bus', 'Large bus', 900, 90e6, 600, 400, 4000, 0.97, 36],
  ],
)

export const powerSystems = table(
  'power-systems',
  ['id', 'name', 'mass_kg', 'cost_usd', 'power_w', 'battery_wh', 'build_months'],
  [
    ['body-panels', 'Body-mounted panels', 1.5, 0.2e6, 30, 40, 4],
    ['deployable-array', 'Deployable solar array', 25, 2.5e6, 600, 800, 10],
    ['large-array', 'Large solar array', 120, 12e6, 4000, 6000, 18],
  ],
)

export const commsSystems = table(
  'comms-systems',
  ['id', 'name', 'mass_kg', 'cost_usd', 'power_draw_w', 'data_rate_mbps', 'build_months'],
  [
    ['uhf-radio', 'UHF radio', 0.3, 0.05e6, 4, 0.1, 3],
    ['s-band', 'S-band radio', 3, 0.6e6, 20, 2, 6],
    ['x-band', 'X-band radio', 12, 3e6, 80, 150, 9],
    ['ka-band', 'Ka-band radio', 30, 9e6, 150, 1200, 14],
  ],
)

export const instruments = table(
  'instruments',
  ['id', 'name', 'mass_kg', 'cost_usd', 'power_draw_w', 'data_gb_per_day', 'science_per_day', 'objective', 'build_months'],
  [
    ['mini-camera', 'Mini camera', 1.2, 0.4e6, 6, 2, 1, 'earth-imaging', 6],
    ['multispectral-imager', 'Multispectral imager', 35, 9e6, 90, 120, 6, 'earth-imaging', 16],
    ['radar-altimeter', 'Radar altimeter', 60, 15e6, 160, 40, 5, 'ocean', 20],
    ['magnetometer', 'Magnetometer', 2, 0.8e6, 3, 0.05, 1.5, 'space-weather', 8],
  ],
)

export const fixtureDatasets: Dataset[] = [launchVehicles, orbits, buses, powerSystems, commsSystems, instruments]

/** One year of Earth imaging on a $50M budget. Starts with nothing picked. */
export const demoConfig: Config = {
  contract_version: CONTRACT_VERSION,
  scenario_id: 'demo',
  title: 'Earth Imager: map crop health for one year',
  seed: 42,
  dt_s: 86400,
  duration_s: 365 * 86400,
  start_utc: '2027-01-01T00:00:00Z',
  datasets: fixtureDatasets.map((d) => d.id),
  entities: [],
  params: {
    objective: 'earth-imaging',
    budget_usd: 50e6,
    science_goal: 3000,
    deadline_months: 24,
    ops_cost_usd_per_day: 20000,
    ground_station_cost_usd_per_day: 5000,
    event_rate_per_day: 0.01,
  },
}

/** A design that fits the demo scenario: 192 kg to sun-synchronous orbit, three ground stations. */
export const goodDesign: Record<string, ParamValue> = {
  launch_vehicle: 'small-lifter',
  orbit: 'sun-synchronous',
  bus: 'smallsat',
  power_system: 'deployable-array',
  comms_system: 'x-band',
  instruments: 'multispectral-imager',
  ground_stations: 3,
}
