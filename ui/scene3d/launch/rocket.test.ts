import { describe, expect, it } from 'vitest'
import { getDataset } from '../../../data'
import { catalogEntities } from '../../../sim/parts'
import { FLEET } from './fleet'
import { cluster, triangles } from './kit'
import { buildRocket } from './rocket'
import { launchTimeline } from './timeline'
import { KNOWN, rocketHeight, rocketSpec } from './vehicles'

const rows = catalogEntities([getDataset('launch-vehicles')!]).filter((e) => e.kind === 'launch_vehicle')
const spec = (id: string) => rocketSpec({ id, name: id, props: {} })

describe('the fleet', () => {
  it('gives every catalog row its own real rocket, not the generic fallback', () => {
    expect(rows.length).toBeGreaterThanOrEqual(6)
    for (const row of rows) {
      const model = rocketSpec(row).model
      expect(model, row.id).not.toBe('generic')
      expect(FLEET[model], row.id).toBeTypeOf('function')
    }
  })

  it('has the three extra NASA rockets ready for when the catalog adds them', () => {
    expect(spec('atlas-v').model).toBe('atlas-v')
    expect(spec('delta-iv-heavy').model).toBe('delta-iv-heavy')
    expect(spec('falcon-heavy').model).toBe('falcon-heavy')
    expect(rocketHeight(spec('atlas-v'))).toBeCloseTo(58.3, 1)
    expect(rocketHeight(spec('delta-iv-heavy'))).toBeCloseTo(72, 0)
    expect(rocketHeight(spec('falcon-heavy'))).toBeCloseTo(70, 0)
    expect(spec('falcon-heavy').boosters?.count).toBe(2)
    // Object keys like "constructor" must not be mistaken for a vehicle.
    expect(spec('constructor').model).toBe('generic')
  })

  it('builds every known rocket, and the generic one, complete and under the phone triangle budget', () => {
    const specs = [...Object.keys(KNOWN).map(spec), rocketSpec({ id: 'mystery', name: 'Mystery', props: { payload_leo_kg: 60_000 } })]
    for (const s of specs) {
      const m = buildRocket(s)
      const count = triangles(m.root)
      expect(count, s.id).toBeGreaterThan(s.model === 'generic' ? 500 : 2_500)
      expect(count, s.id).toBeLessThan(40_000)
      expect(m.height, s.id).toBeCloseTo(rocketHeight(s), 5)
      expect(m.boosters.length, s.id).toBe(s.boosters?.count ?? 0)
      expect(m.nozzles.booster === null, s.id).toBe(s.boosters === null)
      // One jet of flame per engine, each inside the flame of its cluster.
      expect(m.nozzles.s1.engines.length, s.id).toBe(s.s1.engines)
      expect(m.nozzles.s2.engines.length, s.id).toBe(s.s2.engines)
      for (const n of [m.nozzles.s1, m.nozzles.s2, m.nozzles.booster]) {
        for (const [x, z] of n?.engines ?? []) expect(Math.hypot(x, z) + n!.exit, s.id).toBeLessThanOrEqual(Math.max(n!.radius, n!.exit) * 1.75)
      }
      expect(m.payloadRadius, s.id).toBeGreaterThan(0.2)
      expect(m.footprint, s.id).toBeGreaterThanOrEqual(s.s1.radius)
      expect(m.others.length > 0, s.id).toBe(s.rideshare)
      // The cinematic has a booster shot exactly when the model has boosters to drop.
      expect(launchTimeline(s).stages.some((x) => x.id === 'boosters'), s.id).toBe(m.boosters.length > 0)
    }
  })

  it('lays engines out in a ring, with or without one in the middle', () => {
    const octaweb = cluster(8, 1.3, 0, true)
    expect(octaweb).toHaveLength(9)
    expect(octaweb[0]).toEqual([0, 0])
    for (const [x, z] of octaweb.slice(1)) expect(Math.hypot(x, z)).toBeCloseTo(1.3, 9)
    // The first engine of the ring sits at the `turn` angle from +z, where ring() puts its first part.
    const [x, z] = cluster(4, 2, Math.PI / 2)[0]!
    expect(x).toBeCloseTo(2, 9)
    expect(z).toBeCloseTo(0, 9)
    expect(cluster(0, 0, 0, true)).toEqual([[0, 0]])
  })

  it('keeps the real size order: SLS dwarfs Electron', () => {
    const h = (id: string) => buildRocket(spec(id)).height
    expect(h('sls-block-1')).toBeGreaterThan(h('falcon-9'))
    expect(h('falcon-9')).toBeGreaterThan(h('vulcan-centaur'))
    expect(h('vulcan-centaur')).toBeGreaterThan(h('atlas-v'))
    expect(h('atlas-v')).toBeGreaterThan(h('electron') * 3)
    expect(h('electron')).toBeGreaterThan(h('pegasus-xl'))
  })
})
