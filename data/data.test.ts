import { describe, it, expect } from 'vitest'
import { CONTRACT_VERSION } from '../shared'
import {
  BUS_CLASSES, CATALOG_IDS, PARAM_CATALOG, catalogs, getDataset, getDatasets, getPart, getScenario,
  parseIdList, rowsAsObjects, scenarios,
} from './index'

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const num = (v: unknown) => v as number

describe('catalogs', () => {
  it('are table Datasets with every CONTRACTS.md field', () => {
    expect(catalogs.map((d) => d.id).sort()).toEqual(Object.values(CATALOG_IDS).sort())
    for (const ds of catalogs) {
      expect(ds.kind).toBe('table')
      for (const k of ['source', 'source_url', 'license', 'retrieved_utc'] as const) expect(ds[k]).toBeTruthy()
      expect(ds.retrieved_utc).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
    }
  })

  it('have unique kebab-case ids, rows the right length, and units for every numeric column', () => {
    for (const ds of catalogs) {
      const ids = ds.data.rows.map((r) => r[0])
      expect(new Set(ids).size, ds.id).toBe(ids.length)
      for (const id of ids) expect(String(id), ds.id).toMatch(KEBAB)
      for (const [i, col] of ds.data.columns.entries()) {
        const numeric = ds.data.rows.every((r) => typeof r[i] === 'number')
        // Every numeric column has a units entry; "" means a unitless ratio/count.
        if (numeric) expect(typeof ds.units[col], `${ds.id}.${col} needs a units entry`).toBe('string')
        else expect(ds.units[col], `${ds.id}.${col} is not numeric, so no unit`).toBeUndefined()
        for (const r of ds.data.rows) {
          if (typeof r[i] === 'number') expect(Number.isFinite(r[i]) && num(r[i]) >= 0, `${ds.id}.${col}`).toBe(true)
        }
      }
      for (const unitCol of Object.keys(ds.units)) expect(ds.data.columns, ds.id).toContain(unitCol)
    }
  })

  it('cross-reference correctly', () => {
    const orbitIds = rowsAsObjects(getDataset(CATALOG_IDS.orbits)!).map((o) => o.id)
    const launcherCols = getDataset(CATALOG_IDS.launchVehicles)!.data.columns
    for (const o of rowsAsObjects(getDataset(CATALOG_IDS.orbits)!)) {
      expect(launcherCols, o.id).toContain(o.launch_capacity_column)
    }
    for (const id of [CATALOG_IDS.instruments, CATALOG_IDS.power, CATALOG_IDS.comms]) {
      for (const part of rowsAsObjects(getDataset(id)!)) {
        expect(BUS_CLASSES as readonly unknown[], `${id}/${part.id}`).toContain(part.min_bus_class)
      }
    }
    for (const inst of rowsAsObjects(getDataset(CATALOG_IDS.instruments)!)) {
      expect(['any', ...orbitIds], inst.id).toContain(inst.best_orbit)
      expect(num(inst.duty_cycle)).toBeLessThanOrEqual(1)
    }
    for (const bus of rowsAsObjects(getDataset(CATALOG_IDS.buses)!)) {
      expect(BUS_CLASSES as readonly unknown[], bus.id).toContain(bus.class)
      expect(num(bus.reliability)).toBeLessThanOrEqual(1)
    }
    for (const lv of rowsAsObjects(getDataset(CATALOG_IDS.launchVehicles)!)) {
      expect(num(lv.reliability)).toBeLessThanOrEqual(1)
    }
  })

  it('every orbit can be reached by at least one launcher', () => {
    const launchers = rowsAsObjects(getDataset(CATALOG_IDS.launchVehicles)!)
    for (const o of rowsAsObjects(getDataset(CATALOG_IDS.orbits)!)) {
      expect(launchers.some((lv) => num(lv[String(o.launch_capacity_column)]) > 0), o.id).toBe(true)
    }
  })
})

describe('demo scenario', () => {
  const demo = getScenario('demo')!

  it('every scenario is a valid Config that lists only real datasets', () => {
    expect(scenarios.map((c) => c.scenario_id)).toEqual(['demo', 'moon', 'mars'])
    for (const c of scenarios) {
      expect(c.contract_version).toBe(CONTRACT_VERSION)
      expect(c.scenario_id).toMatch(KEBAB)
      expect(c.duration_s / c.dt_s).toBe(Math.round(c.duration_s / c.dt_s))
      expect(getDatasets(c.datasets).map((d) => d.id).sort()).toEqual([...c.datasets].sort())
      for (const e of c.entities) expect(e.id).toMatch(KEBAB)
    }
  })

  // The sim turns every part into an entity, so a scenario entity with a part's id replaces that part.
  it('scenario entity ids never collide with part ids', () => {
    const partIds = new Set(catalogs.flatMap((d) => d.data.rows.map((r) => r[0])))
    for (const c of scenarios) for (const e of c.entities) expect(partIds.has(e.id), `${c.scenario_id}/${e.id}`).toBe(false)
  })

  it('every scenario starts with parts that all exist', () => {
    for (const c of scenarios) {
      for (const [param, catalogId] of Object.entries(PARAM_CATALOG)) {
        for (const id of param === 'instruments' ? parseIdList(c.params[param]) : [String(c.params[param])]) {
          expect(getPart(catalogId, id), `${c.scenario_id}: ${param}=${id}`).toBeDefined()
        }
      }
    }
  })

  // Simple budget math from data/README.md. The sim owns the real rules; this only proves
  // the catalog numbers make a game: the starting design flies but loses, and a win exists.
  function budgets(p: typeof demo.params) {
    const lv = getPart(CATALOG_IDS.launchVehicles, String(p.launch_vehicle))!
    const orbit = getPart(CATALOG_IDS.orbits, String(p.orbit))!
    const bus = getPart(CATALOG_IDS.buses, String(p.bus))!
    const insts = parseIdList(p.instruments).map((id) => getPart(CATALOG_IDS.instruments, id)!)
    const solar = getPart(CATALOG_IDS.power, String(p.solar))!
    const battery = getPart(CATALOG_IDS.power, String(p.battery))!
    const radio = getPart(CATALOG_IDS.comms, String(p.comms))!
    const added = [...insts, solar, battery, radio].reduce((m, part) => m + num(part.mass_kg), 0)
    const mass = num(bus.dry_mass_kg) + added
    const load = num(bus.base_power_w) + insts.reduce((w, i) => w + num(i.power_w), 0) + num(radio.power_w)
    const rate = num(radio.data_rate_bps) * Math.min(1, (num(radio.reference_range_m) / num(orbit.comm_range_m)) ** 2)
    return {
      addedOk: added <= num(bus.max_added_mass_kg) && insts.length <= num(bus.max_instruments),
      launchOk: mass <= num(lv[String(orbit.launch_capacity_column)]),
      powerOk: num(solar.power_w) * (1 - num(orbit.eclipse_fraction)) >= load,
      batteryOk: num(battery.capacity_wh) >= (load * num(orbit.eclipse_fraction) * num(orbit.period_s)) / 3600,
      cost: num(lv.cost_usd) + num(lv.cost_per_kg_usd) * mass +
        [bus, ...insts, solar, battery, radio].reduce((c, part) => c + num(part.cost_usd), 0),
      science: insts.reduce((s, i) => s + num(i.science_value), 0),
      downlinkOk: rate * num(orbit.contact_s_per_day) >=
        insts.reduce((b, i) => b + num(i.data_rate_bps) * num(i.duty_cycle) * 86400, 0),
    }
  }

  it('starting design fits mass, power and budget but misses the science target', () => {
    const b = budgets(demo.params)
    expect([b.addedOk, b.launchOk, b.powerOk, b.batteryOk]).toEqual([true, true, true, true])
    expect(b.cost).toBeLessThanOrEqual(num(demo.params.budget_usd))
    expect(b.science).toBeLessThan(num(demo.params.target_science_score))
    expect(b.downlinkOk).toBe(false) // the radio is the bottleneck: a lesson waiting to happen
  })

  it('has at least one winning design (reference solution)', () => {
    const win = {
      ...demo.params, bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer',
      solar: 'solar-deployable-large', comms: 'x-band-transmitter',
    }
    const b = budgets(win)
    expect(b).toMatchObject({ addedOk: true, launchOk: true, powerOk: true, batteryOk: true, downlinkOk: true })
    expect(b.cost).toBeLessThanOrEqual(num(demo.params.budget_usd))
    expect(b.science).toBeGreaterThanOrEqual(num(demo.params.target_science_score))
  })
})

describe('helpers', () => {
  it('parseIdList handles lists, blanks and non-strings', () => {
    expect(parseIdList('a, b,,c')).toEqual(['a', 'b', 'c'])
    expect(parseIdList('')).toEqual([])
    expect(parseIdList(3)).toEqual([])
    expect(parseIdList(undefined)).toEqual([])
  })

  it('getPart finds parts and returns undefined for unknown ids', () => {
    expect(getPart(CATALOG_IDS.launchVehicles, 'falcon-9')?.payload_leo_kg).toBe(17500)
    expect(getPart(CATALOG_IDS.launchVehicles, 'nope')).toBeUndefined()
    expect(getPart('nope', 'falcon-9')).toBeUndefined()
  })
})
