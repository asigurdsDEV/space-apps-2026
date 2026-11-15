import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { getDataset } from '../../../data'
import { catalogEntities } from '../../../sim/parts'
import { FLEET } from './fleet'
import { cluster, triangles } from './kit'
import { fold } from './payload'
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

  it('carries a shared launch as twenty satellites of four kinds on one dispenser, a draw call each', () => {
    const m = buildRocket(spec('rideshare'))
    expect(m.others).toHaveLength(20)
    expect(new Set(m.others.map((o) => o.geometry)).size).toBe(4)
    expect(new Set(m.others.map((o) => o.material)).size).toBe(1)
    // Stage, engine, fairing walls, dispenser and satellites together: fewer meshes than the old stack of boxes (45).
    let meshes = 0
    m.upper.traverse((o) => { if (o instanceof THREE.Mesh) meshes++ })
    expect(meshes).toBeLessThan(40)
    // Every satellite hangs clear of the fairing wall, and under the sphere the player's spacecraft may fill.
    for (const o of m.others) {
      o.geometry.computeBoundingBox()
      const box = o.geometry.boundingBox!
      const inner = Math.hypot(o.position.x, o.position.z)
      expect(inner + box.max.z * o.scale.x).toBeLessThan(spec('rideshare').fairing.radius * 0.92)
      // A satellite may be rolled a quarter turn, so its widest side counts as its height.
      const top = o.position.y + Math.max(box.max.x, box.max.y, -box.min.x, -box.min.y) * o.scale.x
      expect(top).toBeLessThan(m.payload.position.y - Math.sqrt(m.payloadRadius ** 2 - inner ** 2))
    }
  })

  it('stands the spacecraft on a fitting that reaches the underside of its bus, wherever the bus is', () => {
    for (const id of ['falcon-9', 'rideshare', 'electron']) {
      const m = buildRocket(spec(id))
      const before = m.upper.children.length
      const craft = new THREE.Group()
      const bus = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4))
      bus.userData.part = 'bus'
      bus.position.set(0.2, 0.1, 0)
      craft.add(bus, new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.2)))
      m.payload.scale.setScalar(m.payloadRadius)
      m.payload.add(craft)
      expect(m.upper.children.length, id).toBe(before + 1)
      const fitting = new THREE.Box3().setFromObject(m.upper.children[before]!)
      const under = new THREE.Box3().setFromObject(bus)
      expect(fitting.max.y, id).toBeCloseTo(under.min.y, 1)
      expect(fitting.max.y - fitting.min.y, id).toBeGreaterThan(0.1 * m.payloadRadius)
      // Its top ring sits under the bus, not under the middle of the whole craft.
      expect(fitting.max.x, id).toBeGreaterThan(0.2 * m.payloadRadius)
    }
  })

  it('repeats an atlas tile by mirroring, never leaving the tile', () => {
    expect(fold(0)).toBeCloseTo(fold(2), 9)
    expect(fold(0.25, 2)).toBeCloseTo(fold(0.5), 9)
    expect(fold(1.25)).toBeCloseTo(fold(0.75), 9)
    for (const x of [-3.2, -0.01, 0, 0.5, 1, 1.01, 7.7]) {
      expect(fold(x)).toBeGreaterThan(0)
      expect(fold(x)).toBeLessThan(1)
    }
    expect(fold(1)).toBeGreaterThan(fold(0))
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
