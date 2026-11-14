// Dev-only preview: `npm run dev`, then open /ui/builder/preview.html. Not part of the build.
// shortcut: fake catalogs + a stand-in for sim budget math, delete once data/ and sim/ land.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Command, Issue, ParamValue, SimState, TableDataset } from '../../shared'
import { MissionBuilder } from './MissionBuilder'
import { parseIds, tableRows } from './model'

const table = (id: string, units: Record<string, string>, columns: string[], rows: ParamValue[][]): TableDataset => ({
  id, kind: 'table', units, source: 'preview fixture', source_url: '', license: 'n/a', retrieved_utc: '2026-11-14T00:00:00Z',
  data: { columns, rows },
})

const datasets = [
  table('orbits', { altitude_km: 'km' }, ['id', 'name', 'description', 'altitude_km'], [
    ['leo', 'Low Earth orbit', 'Close to Earth, cheap to reach, frequent ground passes.', 500],
    ['sso', 'Sun-synchronous', 'Same lighting every pass: great for Earth imaging.', 700],
    ['geo', 'Geostationary', 'Hovers over one spot, but far and expensive to reach.', 35786],
  ]),
  table('buses', { mass_kg: 'kg', power_w: 'W', cost_usd: 'USD' }, ['id', 'name', 'mass_kg', 'power_w', 'cost_usd'], [
    ['cubesat-6u', '6U CubeSat', 12, 10, 1_000_000],
    ['smallsat', 'SmallSat bus', 150, 60, 20_000_000],
    ['medium', 'Medium bus', 900, 300, 120_000_000],
  ]),
  table('instruments', { mass_kg: 'kg', power_w: 'W', cost_usd: 'USD', data_rate_bps: 'bps' }, ['id', 'name', 'mass_kg', 'power_w', 'cost_usd', 'data_rate_bps'], [
    ['camera', 'Multispectral camera', 25, 40, 15_000_000, 2_000_000],
    ['spectrometer', 'Infrared spectrometer', 60, 80, 45_000_000, 5_000_000],
    ['radar', 'Synthetic aperture radar', 300, 900, 150_000_000, 50_000_000],
  ]),
  table('power-systems', { mass_kg: 'kg', power_available_w: 'W', cost_usd: 'USD' }, ['id', 'name', 'mass_kg', 'power_available_w', 'cost_usd'], [
    ['small-solar', 'Body-mounted solar', 5, 60, 500_000],
    ['deploy-solar', 'Deployable solar array', 40, 600, 8_000_000],
    ['big-solar', 'Large solar wings', 150, 2500, 30_000_000],
  ]),
  table('comms-systems', { mass_kg: 'kg', power_w: 'W', cost_usd: 'USD', downlink_bps: 'bps' }, ['id', 'name', 'mass_kg', 'power_w', 'cost_usd', 'downlink_bps'], [
    ['uhf', 'UHF radio', 1, 5, 200_000, 9_600],
    ['s-band', 'S-band', 8, 30, 3_000_000, 2_000_000],
    ['x-band', 'X-band high-gain', 25, 80, 12_000_000, 100_000_000],
  ]),
  table('launch-vehicles', { payload_leo_kg: 'kg', cost_usd: 'USD' }, ['id', 'name', 'payload_leo_kg', 'cost_usd'], [
    ['rideshare', 'Rideshare slot', 200, 5_000_000],
    ['small-lv', 'Small launcher', 300, 7_500_000],
    ['medium-lv', 'Medium launcher', 20_000, 70_000_000],
  ]),
]

// Stand-in for sim/: sums the picked parts. The real rules live in claude@ethan's sim core.
function fakeMetrics(params: SimState['params']): Pick<SimState, 'metrics' | 'issues'> {
  let mass = 0, power = 0, cost = 0, avail = 0, rate = 0, downlink = 0, limit = 0
  for (const ds of datasets) {
    const key = { orbits: 'orbit', buses: 'bus', 'power-systems': 'power', 'comms-systems': 'comms', 'launch-vehicles': 'launch_vehicle' }[ds.id] ?? ds.id
    for (const row of tableRows(ds).filter((r) => parseIds(params[key]).includes(String(r.id)))) {
      const n = (c: string) => (typeof row[c] === 'number' ? (row[c] as number) : 0)
      mass += n('mass_kg'); power += n('power_w'); cost += n('cost_usd'); avail += n('power_available_w')
      rate += n('data_rate_bps'); downlink += n('downlink_bps'); limit += n('payload_leo_kg')
    }
  }
  const issues: Issue[] = []
  if (mass > limit) issues.push({ code: 'mass_over_limit', severity: 'error', resource: 'mass', message: `The spacecraft is ${mass - limit} kg too heavy for the launcher.` })
  if (power > avail) issues.push({ code: 'power_short', severity: 'error', resource: 'power', message: 'Parts draw more power than the power system makes.' })
  if (rate > downlink) issues.push({ code: 'data_backlog', severity: 'warning', resource: 'comms', message: 'Instruments make data faster than comms can send it home. Some science will be lost.' })
  return {
    metrics: { mass_kg: mass, mass_limit_kg: limit, power_w: power, power_available_w: avail, cost_usd: cost, budget_usd: 250_000_000, data_rate_bps: rate, phase: 'design' },
    issues,
  }
}

const initialParams = { orbit: 'sso', bus: 'smallsat', instruments: 'camera', power: 'deploy-solar', comms: 's-band', launch_vehicle: 'small-lv' }

function Preview() {
  const [params, setParams] = useState<SimState['params']>(initialParams)
  const state: SimState = {
    contract_version: '0.1', scenario_id: 'preview', tick: 0, t_s: 0, utc: '2026-11-14T00:00:00Z',
    frame: 'scene', status: 'paused', entities: [], params, rng_state: 1, ...fakeMetrics(params),
  }
  const send = (c: Command) => {
    console.log('command', c)
    if (c.type === 'set_param') setParams((p) => ({ ...p, [c.payload.key]: c.payload.value }))
  }
  return <MissionBuilder state={state} datasets={datasets} send={send} />
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
