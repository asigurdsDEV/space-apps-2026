// Dev-only preview: `npm run dev`, then open /ui/builder/preview.html. Not part of the build.
// shortcut: a few hand-made parts in data/'s column names + a stand-in for sim budget math. Delete once app/ mounts the builder with the real sim.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Command, Entity, Issue, Params, Player, SimState } from '../../shared'
import { MissionBuilder } from './MissionBuilder'
import { parseIds } from './model'

const e = (kind: string, id: string, name: string, props: Params): Entity => ({ id, kind, name, props })
const entities: Entity[] = [
  e('orbit', 'leo', 'Low Earth orbit', { altitude_m: 500_000, eclipse_fraction: 0.38, contact_s_per_day: 2400, radiation_factor: 1, launch_capacity_column: 'payload_leo_kg', description: 'Close and cheap to reach. Frequent, short ground passes.' }),
  e('orbit', 'sso', 'Sun-synchronous', { altitude_m: 700_000, eclipse_fraction: 0.33, contact_s_per_day: 3000, radiation_factor: 1.2, launch_capacity_column: 'payload_sso_kg', description: 'Same lighting on every pass: great for photographing Earth.' }),
  e('orbit', 'geo', 'Geostationary', { altitude_m: 35_786_000, eclipse_fraction: 0.01, contact_s_per_day: 86400, radiation_factor: 3, launch_capacity_column: 'payload_gto_kg', description: 'Hovers over one spot with nonstop contact, but far and costly to reach.' }),
  e('bus', 'cubesat-6u', '6U CubeSat', { class: 'cubesat', dry_mass_kg: 8, max_added_mass_kg: 4, max_instruments: 1, base_power_w: 4, cost_usd: 150_000, description: 'Shoebox-sized. Cheap, but tight on mass and power.' }),
  e('bus', 'smallsat', 'SmallSat bus', { class: 'smallsat', dry_mass_kg: 120, max_added_mass_kg: 80, max_instruments: 3, base_power_w: 40, cost_usd: 6_000_000 }),
  e('instrument', 'camera-basic', 'Basic camera', { best_orbit: 'sso', mass_kg: 0.4, power_w: 2, data_rate_bps: 2_000_000, science_value: 0.05, cost_usd: 50_000 }),
  e('instrument', 'camera-hires', 'High-res camera', { min_bus_class: 'smallsat', best_orbit: 'sso', mass_kg: 3, power_w: 12, data_rate_bps: 20_000_000, science_value: 0.2, cost_usd: 900_000, description: 'Sharper pictures, but a lot more data to send home.' }),
  e('instrument', 'magnetometer', 'Magnetometer', { mass_kg: 0.2, power_w: 0.5, data_rate_bps: 2_000, science_value: 0.02, cost_usd: 40_000 }),
  e('power_system', 'solar-deployable-small', 'Small deployable panels', { type: 'solar', mass_kg: 0.6, power_w: 20, cost_usd: 60_000 }),
  e('power_system', 'solar-large', 'Large solar wings', { type: 'solar', min_bus_class: 'smallsat', mass_kg: 15, power_w: 400, cost_usd: 1_500_000 }),
  e('power_system', 'battery-small', 'Small battery', { type: 'battery', mass_kg: 0.3, capacity_wh: 40, cost_usd: 15_000 }),
  e('power_system', 'battery-large', 'Large battery', { type: 'battery', mass_kg: 4, capacity_wh: 600, cost_usd: 120_000 }),
  e('comms_system', 'uhf', 'UHF radio', { mass_kg: 0.1, power_w: 1, data_rate_bps: 9_600, cost_usd: 10_000 }),
  e('comms_system', 's-band-patch', 'S-band patch', { mass_kg: 0.2, power_w: 5, data_rate_bps: 1_000_000, cost_usd: 60_000 }),
  e('launch_vehicle', 'rideshare', 'Rideshare slot', { payload_leo_kg: 15, payload_sso_kg: 12, payload_gto_kg: 0, cost_usd: 300_000, reliability: 0.97 }),
  e('launch_vehicle', 'small-lv', 'Small launcher', { payload_leo_kg: 300, payload_sso_kg: 200, payload_gto_kg: 0, cost_usd: 7_500_000, reliability: 0.95 }),
  e('launch_vehicle', 'medium-lv', 'Medium launcher', { payload_leo_kg: 20_000, payload_sso_kg: 15_000, payload_gto_kg: 8_000, cost_usd: 70_000_000, reliability: 0.99 }),
]

// Stand-in for sim/: sums the picked parts. The real rules live in claude@ethan's sim core.
function fakeBudgets(params: Params): Pick<SimState, 'metrics' | 'issues'> {
  const picked = Object.entries(params).flatMap(([key, v]) => parseIds(v).map((id) => ({ key, part: entities.find((p) => p.id === id) })))
  const sum = (prop: string) => picked.reduce((t, { part }) => t + (typeof part?.props[prop] === 'number' ? (part.props[prop] as number) : 0), 0)
  const orbit = entities.find((p) => p.id === params.orbit)
  const lv = entities.find((p) => p.id === params.launch_vehicle)
  const bus = entities.find((p) => p.id === params.bus)
  const mass = sum('dry_mass_kg') + sum('mass_kg')
  const limit = Number(lv?.props[String(orbit?.props.launch_capacity_column)] ?? 0)
  const load = sum('base_power_w') + picked.filter((p) => p.key !== 'solar').reduce((t, { part }) => t + Number(part?.props.power_w ?? 0), 0)
  const avail = Number(entities.find((p) => p.id === params.solar)?.props.power_w ?? 0) * (1 - Number(orbit?.props.eclipse_fraction ?? 0))
  const instruments = parseIds(params.instruments).map((id) => entities.find((p) => p.id === id))
  const genGb = instruments.reduce((t, p) => t + Number(p?.props.data_rate_bps ?? 0), 0) * 86400 * 0.1 / 8e9
  const downGb = Number(entities.find((p) => p.id === params.comms)?.props.data_rate_bps ?? 0) * Number(orbit?.props.contact_s_per_day ?? 0) / 8e9
  const sciPerDay = instruments.reduce((t, p) => t + Number(p?.props.science_value ?? 0), 0) * Math.min(1, genGb > 0 ? downGb / genGb : 0)
  const issues: Issue[] = []
  if (mass > limit) issues.push({ code: 'mass_over_limit', severity: 'error', resource: 'mass', message: limit === 0 ? `${lv?.name} cannot reach ${orbit?.name}. Pick a bigger launch vehicle or a closer orbit.` : `The spacecraft is ${(mass - limit).toFixed(1)} kg too heavy for ${lv?.name}.` })
  if (load > avail) issues.push({ code: 'power_short', severity: 'error', resource: 'power', message: 'Your parts draw more power than the power source makes on average.' })
  if (genGb > downGb) issues.push({ code: 'data_backlog', severity: 'warning', resource: 'data', message: 'Instruments make data faster than the radio can send it home. Data that never reaches the ground earns no science.' })
  return {
    metrics: {
      phase: 'design', mass_kg: mass, mass_limit_kg: limit, added_mass_kg: sum('mass_kg'), added_mass_limit_kg: Number(bus?.props.max_added_mass_kg ?? 0),
      battery_wh: Number(entities.find((p) => p.id === params.battery)?.props.capacity_wh ?? 0), battery_needed_wh: load * 1.6 * Number(orbit?.props.eclipse_fraction ?? 0),
      power_w: load, power_available_w: avail, cost_usd: sum('cost_usd'), budget_usd: 8_000_000,
      data_generated_gb_per_day: genGb, downlink_gb_per_day: downGb, science_expected: sciPerDay * 365, science_goal: 30, mission_days: 365,
    },
    issues,
  }
}

const initialParams: Params = {
  objective_text: 'Photograph Earth from orbit and send home enough data to earn 30 science points within one year, without going over budget.',
  launch_vehicle: 'rideshare', orbit: 'sso', bus: 'cubesat-6u', instruments: 'camera-basic', solar: 'solar-deployable-small', battery: 'battery-small', comms: 's-band-patch',
}

// Co-op stand-in: a 3-player room (comms is unclaimed). Pick who you are from the bar on top.
const roster: Player[] = [
  { player_id: 'ana', name: 'Ana', role: 'mission-planning', is_host: true },
  { player_id: 'kai', name: 'Kai', role: 'science', is_host: false },
  { player_id: 'sam', name: 'Sam', role: 'spacecraft', is_host: false },
]

function Preview() {
  const [params, setParams] = useState<Params>(initialParams)
  const [meId, setMeId] = useState('solo')
  const me = roster.find((p) => p.player_id === meId)
  const state: SimState = {
    contract_version: '0.1', scenario_id: 'preview', tick: 0, t_s: 0, utc: '2027-01-01T00:00:00Z',
    frame: 'body-centered', status: 'paused', entities, params, rng_state: 1, ...fakeBudgets(params),
  }
  const send = (c: Command) => {
    if (c.type === 'set_param') setParams((p) => ({ ...p, [c.payload.key]: c.payload.value }))
  }
  return (
    <>
      <div style={{ padding: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', font: '14px system-ui' }}>
        <label>
          View as{' '}
          <select value={meId} onChange={(ev) => setMeId(ev.target.value)}>
            <option value="solo">Solo (no roles)</option>
            {roster.map((p) => <option key={p.player_id} value={p.player_id}>{p.name} ({p.role})</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setParams((p) => ({ ...p, orbit: p.orbit === 'sso' ? 'leo' : 'sso' }))}>
          Ana switches the orbit
        </button>
      </div>
      <MissionBuilder state={state} send={send} players={me ? roster : undefined} me={me} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
