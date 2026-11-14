import { describe, it, expect } from 'vitest'
import type { Command, Config, Dataset, SimCore, SimEvent, SimState } from './index'
import { CONTRACT_VERSION } from './index'

describe('shared types', () => {
  it('accept the example shapes from CONTRACTS.md', () => {
    const config: Config = {
      contract_version: CONTRACT_VERSION, scenario_id: 'demo', title: 'Demo', seed: 42, dt_s: 1,
      duration_s: 3600, start_utc: '2026-11-14T00:00:00Z', datasets: ['parts'], entities: [],
      params: { launch_vehicle: 'falcon-9' },
    }
    const ds: Dataset = {
      id: 'parts', source: 'NASA', source_url: 'https://example.com', license: 'public domain',
      retrieved_utc: '2026-11-14T10:00:00Z', kind: 'table', units: { mass_kg: 'kg' },
      data: { columns: ['id', 'mass_kg'], rows: [['falcon-9', 549054]] },
    }
    const core: SimCore = {
      init: (c) => ({
        contract_version: c.contract_version, scenario_id: c.scenario_id, tick: 0, t_s: 0, utc: c.start_utc,
        frame: 'scene', status: 'running', entities: c.entities, metrics: { mass_kg: 0, phase: 'design' },
        params: c.params, rng_state: c.seed,
      }),
      step: (s, cmds: Command[], dt) => {
        const params = { ...s.params }
        for (const c of cmds) if (c.type === 'set_param') params[c.payload.key] = c.payload.value
        const events: SimEvent[] = [{ type: 'warning', tick: s.tick + 1, t_s: s.t_s + dt, payload: { message: 'hi' } }]
        return { state: { ...s, tick: s.tick + 1, t_s: s.t_s + dt, params }, events }
      },
      summary: (s) => ({ ticks: s.tick }),
    }
    const s0: SimState = core.init(config, [ds])
    const { state, events } = core.step(s0, [{ type: 'set_param', payload: { key: 'launch_vehicle', value: 'sls' } }], 1)
    expect(s0.params.launch_vehicle).toBe('falcon-9')
    expect(state.params.launch_vehicle).toBe('sls')
    expect(state.tick).toBe(1)
    expect(events[0].type).toBe('warning')
    if (ds.kind === 'table') expect(ds.data.columns).toHaveLength(2)
  })
})
