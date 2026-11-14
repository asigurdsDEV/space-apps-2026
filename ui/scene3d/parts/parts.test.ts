import * as THREE from 'three'
import { OBB } from 'three/addons/math/OBB.js'
import { describe, expect, it } from 'vitest'
import { getDatasets } from '../../../data'
import type { Entity, Params } from '../../../shared'
import { catalogEntities } from '../../../sim/parts'
import { buildCraft } from '../craft'
import { sceneSpec } from '../model'
import doc from './REFERENCES.md?raw'
import { REFERENCES, SLOT, batterySize, buildBus, craftLayout, dishDiameter, instrumentSize, mats, modelKey, packDeck, referenceFor, triangles, wingShape, type Slot } from './index'

const entities = catalogEntities(getDatasets())
const of = (kind: string) => entities.filter((e) => e.kind === kind)
const ids = (kind: string) => of(kind).map((e) => e.id)
const craft = (params: Params, extra: Entity[] = []) => sceneSpec({ entities: [...entities, ...extra], params }).craft
const everything = ids('instrument').join(',')

describe('model keys', () => {
  it('gives every catalog row its own recognizable model', () => {
    const key = Object.fromEntries(entities.map((e) => [e.id, modelKey(e)]))
    expect(key).toMatchObject({
      'cubesat-3u': 'cubesat', smallsat: 'smallsat', 'medium-bus': 'medium', 'flagship-bus': 'flagship',
      'solar-body-panels': 'body-cells', 'solar-deployable-small': 'wings', 'solar-array-large': 'wings', rtg: 'rtg', 'battery-small': 'battery',
      'uhf-radio': 'turnstile', 's-band-patch': 'patch', 'x-band-transmitter': 'reflectarray',
      'high-gain-dish': 'dish-gimbal', 'deep-space-transponder': 'dish-fixed', 'mars-hga': 'dish-deep',
      'camera-basic': 'camera', 'multispectral-imager': 'multispectral', 'weather-imager': 'weather-imager', magnetometer: 'magnetometer',
      'radiation-detector': 'particles', 'ir-spectrometer': 'spectrometer', 'microwave-sounder': 'sounder', 'laser-altimeter': 'altimeter',
      'subsurface-radar': 'dipole-radar', 'synthetic-aperture-radar': 'sar', 'uv-telescope': 'telescope',
    })
    // No row on main falls back to a generic model, and every radio and instrument has a model of its own.
    for (const e of [...of('bus'), ...of('power_system'), ...of('comms_system'), ...of('instrument')]) expect(['generic', 'power-box']).not.toContain(key[e.id])
    for (const kind of ['comms_system', 'instrument']) expect(new Set(ids(kind).map((id) => key[id])).size).toBe(ids(kind).length)
  })

  it('names the real hardware behind every catalog row', () => {
    const rows = [...of('bus'), ...of('power_system'), ...of('comms_system'), ...of('instrument')]
    expect(Object.keys(REFERENCES).sort()).toEqual(rows.map((e) => e.id).sort())
    for (const e of rows) {
      const ref = REFERENCES[e.id]!
      // The reference is the one the model is built from, and REFERENCES.md documents it with its source.
      expect(ref.model).toBe(modelKey(e))
      expect(ref.hardware.length).toBeGreaterThan(8)
      expect(ref.url).toMatch(/^https:\/\/([a-z0-9-]+\.)*nasa\.gov\//)
      expect(doc).toContain(`\`${e.id}\``)
      expect(doc).toContain(ref.url)
    }
    // A part the catalog has never seen borrows the reference of its model.
    expect(referenceFor('mystery-dish', 'dish-deep')?.mission).toBe('Mars Reconnaissance Orbiter')
    expect(referenceFor('mystery', 'generic')).toBeUndefined()
  })

  it('uses the real sizes', () => {
    const wing = (id: string, bus: [number, number, number]) => wingShape(Number(entities.find((e) => e.id === id)!.props.power_w), bus)
    // MRO's wings are 5.35 x 2.53 m; they fit a bus that is tall enough.
    expect(wing('solar-array-large', [3.6, 4.6, 3.6])).toMatchObject({ length: 5.35, width: 2.53, panels: 2, mount: 'yoke', cant: 0 })
    // MAVEN's gull wing, scaled from 3,600 W to the catalog's 1,000 W.
    const maven = wing('solar-array-medium', [2.3, 2, 2.3])
    expect(maven.cant).toBeCloseTo(0.349, 3)
    expect(maven.length * maven.width * 2).toBeCloseTo((12 * 1000) / 3600, 1)
    const dish = (id: string) => dishDiameter(entities.find((e) => e.id === id)!)
    expect([dish('high-gain-dish'), dish('deep-space-transponder'), dish('mars-hga')]).toEqual([0.75, 1.3, 3])
  })

  it('draws rocket nozzles only on buses that can change their orbit', () => {
    const nozzles = (id: string) => {
      let n = 0
      buildBus(craftLayout(craft({ bus: id })).bus).traverse((o) => void (o instanceof THREE.Mesh && o.material === mats().nozzle && n++))
      return n
    }
    for (const bus of of('bus')) {
      if (Number(bus.props.propulsion_delta_v_ms) > 0) expect(nozzles(bus.id)).toBeGreaterThan(0)
      else expect(nozzles(bus.id)).toBe(0)
    }
    expect([nozzles('cubesat-3u'), nozzles('cubesat-6u'), nozzles('cubesat-12u')]).toEqual([0, 0, 8])
  })

  it('tells rows that share a model apart by size', () => {
    const bus: [number, number, number] = [1.4, 1.7, 1.4]
    const wings = of('power_system').filter((e) => modelKey(e) === 'wings').map((e) => wingShape(Number(e.props.power_w), bus))
    expect(wings.map((w) => w.mount)).toEqual(['hinge', 'drive', 'yoke', 'yoke'])
    wings.forEach((w, i) => i && expect(w.length * w.width).toBeGreaterThan(wings[i - 1]!.length * wings[i - 1]!.width))
    const packs = of('power_system').filter((e) => modelKey(e) === 'battery').map((e) => batterySize(e)[0])
    expect(packs[0]).toBeLessThan(packs[1]!)
    expect(packs[1]).toBeLessThan(packs[2]!)
  })

  it('falls back by kind and props for ids it has never seen', () => {
    const e = (kind: string, id: string, name: string, props: Params = {}): Entity => ({ id, kind, name, props })
    expect(modelKey(e('bus', 'mega', 'Mega bus', { dry_mass_kg: 5000 }))).toBe('flagship')
    expect(modelKey(e('bus', 'x', 'X'))).toBe('smallsat')
    expect(modelKey(e('power_system', 'fuel-cell', 'Fuel cell', { type: 'fuel_cell' }))).toBe('power-box')
    expect(modelKey(e('power_system', 'roll-out', 'Roll-out solar array', { type: 'solar', power_w: 300 }))).toBe('wings')
    expect(modelKey(e('comms_system', 'laser-link', 'Optical link', { band: 'optical' }))).toBe('patch')
    expect(modelKey(e('comms_system', 'ka-relay', 'Ka relay', { band: 'Ka', data_rate_bps: 1e9, reference_range_m: 4e7 }))).toBe('dish-gimbal')
    expect(modelKey(e('instrument', 'dust', 'Dust counter', { category: 'dust' }))).toBe('particles')
    expect(modelKey(e('instrument', 'mystery', 'Mystery box', {}))).toBe('generic')
  })
})

describe('layout', () => {
  it('gives every family its own mount slot', () => {
    // Models that can be picked together must never share a slot; only the nadir deck holds several.
    const picks: (keyof typeof SLOT)[][] = [
      ['body-cells'], ['wings', 'rtg'], ['battery', 'power-box'], ['turnstile', 'patch', 'reflectarray', 'dish-gimbal', 'dish-fixed', 'dish-deep'],
      ['magnetometer'], ['particles'], ['dipole-radar'], ['sar'], ['telescope'],
    ]
    const owner = new Map<Slot, number>()
    picks.forEach((keys, i) => keys.forEach((k) => {
      expect(SLOT[k]).not.toBe('nadir')
      expect(owner.get(SLOT[k]) ?? i).toBe(i)
      owner.set(SLOT[k], i)
    }))
    const listed = new Set(picks.flat())
    for (const [k, slot] of Object.entries(SLOT)) if (!listed.has(k as keyof typeof SLOT)) expect(slot).toBe('nadir')
  })

  it('packs deck instruments side by side, inside the deck', () => {
    for (const [sizes, w, d] of [[[0.7, 0.44, 0.37, 0.34, 0.22, 0.11], 1.1, 1.1], [[0.11], 0.09, 0.09], [[0.3, 0.3, 0.3, 0.3, 0.3], 0.18, 0.09], [[], 1, 1]] as const) {
      const placed = packDeck([...sizes], w, d)
      expect(placed).toHaveLength(sizes.length)
      placed.forEach((a, i) => {
        expect(Math.abs(a.x) + a.size / 2).toBeLessThanOrEqual(w / 2 + 1e-9)
        expect(Math.abs(a.z) + a.size / 2).toBeLessThanOrEqual(d / 2 + 1e-9)
        for (const b of placed.slice(i + 1)) expect(Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z))).toBeGreaterThanOrEqual((a.size + b.size) / 2)
      })
    }
    // Sizes follow mass: only an oversized instrument is shrunk to fit.
    expect(packDeck([0.11], 0.5, 0.5)[0]!.size).toBeCloseTo(0.11 * 0.92)
  })

  it('places everything at once without sharing a single-part slot', () => {
    const { mounts } = craftLayout(craft({ bus: 'medium-bus', solar: 'solar-array-large', battery: 'battery-large', comms: 'mars-hga', instruments: `${everything},uv-telescope` }))
    expect(mounts).toHaveLength(15)
    const single = mounts.filter((m) => m.slot !== 'nadir').map((m) => m.slot)
    expect(new Set(single).size).toBe(single.length)
    // The second telescope lost its slot, so it is drawn as a generic box on the deck.
    expect(mounts[mounts.length - 1]).toMatchObject({ id: 'uv-telescope', key: 'generic', slot: 'nadir' })
    expect(instrumentSize(of('instrument').find((e) => e.id === 'weather-imager')!)).toBeCloseTo(0.696, 2)
  })
})

/** Oriented boxes of every mesh, grouped by the part they belong to. */
function partBoxes(root: THREE.Object3D): Map<string, OBB[]> {
  root.updateMatrixWorld(true)
  const out = new Map<string, OBB[]>()
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    let p: THREE.Object3D | null = o
    while (p && !p.userData.part) p = p.parent
    if (!p) throw new Error('mesh outside any tagged part')
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox!
    const name = `${p.userData.part}:${p.userData.id}`
    // OBB.applyMatrix4 only shifts the centre, so the centre is transformed here.
    const obb = new OBB(new THREE.Vector3(), bb.getSize(new THREE.Vector3()).multiplyScalar(0.5)).applyMatrix4(o.matrixWorld)
    obb.center.copy(bb.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld))
    out.set(name, [...(out.get(name) ?? []), obb])
  })
  return out
}

function collisions(root: THREE.Object3D): string[] {
  // The bus is what parts bolt onto, and body-mounted cells are a skin on it: parts sit on top of both.
  const boxes = [...partBoxes(root)].filter(([name]) => !name.startsWith('bus:') && name !== 'power:solar-body-panels')
  const hits: string[] = []
  boxes.forEach(([a, as], i) => boxes.slice(i + 1).forEach(([b, bs]) => {
    if (as.some((x) => bs.some((y) => x.intersectsOBB(y)))) hits.push(`${a} x ${b}`)
  }))
  return hits
}

describe('buildCraft', () => {
  const designs: Record<string, Params> = {
    nothing: {},
    smallest: { bus: 'cubesat-3u', solar: 'solar-body-panels', battery: 'battery-small', comms: 'uhf-radio', instruments: 'camera-basic' },
    demo: { bus: 'cubesat-12u', solar: 'solar-deployable-large', battery: 'battery-small', comms: 'x-band-transmitter', instruments: 'camera-basic,ir-spectrometer,magnetometer' },
    mid: { bus: 'smallsat', solar: 'solar-array-medium', battery: 'battery-medium', comms: 'high-gain-dish', instruments: 'multispectral-imager,microwave-sounder,laser-altimeter,radiation-detector' },
    rtg: { bus: 'medium-bus', solar: 'rtg', battery: 'battery-large', comms: 'mars-hga', instruments: 'subsurface-radar,ir-spectrometer,magnetometer,radiation-detector' },
    everything: { bus: 'medium-bus', solar: 'solar-array-large', battery: 'battery-large', comms: 'deep-space-transponder', instruments: everything },
    largest: { bus: 'flagship-bus', solar: 'solar-array-large', battery: 'battery-large', comms: 'mars-hga', instruments: everything },
    // Not launchable, but the builder can show them: big parts on the smallest bus.
    misfit: { bus: 'cubesat-3u', solar: 'rtg', battery: 'battery-large', comms: 'mars-hga', instruments: everything },
    misfitWings: { bus: 'cubesat-6u', solar: 'solar-array-large', comms: 'high-gain-dish', instruments: everything },
  }

  for (const [name, params] of Object.entries(designs)) {
    it(`${name}: parts never intersect, stays in the triangle budget, carries tags and anchors`, () => {
      const spec = craft(params)
      const root = buildCraft(spec)
      expect(collisions(root)).toEqual([])
      expect(triangles(root)).toBeLessThan(60_000)
      const tagged = new Set<string>()
      root.traverse((o) => o.userData.part && tagged.add(`${o.userData.part}:${o.userData.id}`))
      for (const id of [params.solar, params.battery, params.comms]) if (id) expect([...tagged].some((t) => t.endsWith(`:${id}`))).toBe(true)
      expect(tagged.size).toBe(1 + craftLayout(spec).mounts.length)
      const { anchors } = root.userData
      expect(anchors.nadir).toBeInstanceOf(THREE.Vector3)
      expect(!!anchors.antenna).toBe(!!params.comms)
      // Fits the unit sphere, and the radio sits above the Earth-facing side.
      expect(new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere()).radius).toBeLessThan(1.01)
      if (anchors.antenna) expect(anchors.antenna.y).toBeGreaterThan(anchors.nadir.y)
    })
  }

  it('every bus with every power, radio and instrument one at a time', () => {
    for (const bus of ids('bus')) {
      for (const solar of of('power_system').filter((e) => e.props.type !== 'battery')) expect(collisions(buildCraft(craft({ bus, solar: solar.id, battery: 'battery-large', instruments: everything })))).toEqual([])
      for (const comms of ids('comms_system')) expect(collisions(buildCraft(craft({ bus, comms, solar: 'solar-array-large', instruments: everything })))).toEqual([])
    }
  })

  it('draws parts it has never seen, and a spec without part rows', () => {
    const e = (kind: string, id: string, props: Params): Entity => ({ id, kind, name: id, props })
    const extra = [e('bus', 'mystery-bus', {}), e('power_system', 'fuel-cell', { type: 'fuel_cell', mass_kg: 30 }), e('comms_system', 'laser-link', {}), e('instrument', 'thing', {}), e('instrument', 'thing-2', { category: 'telescope' })]
    const root = buildCraft(craft({ bus: 'mystery-bus', solar: 'fuel-cell', comms: 'laser-link', instruments: 'thing,thing-2,nope' }, extra))
    expect(collisions(root)).toEqual([])
    expect(triangles(root)).toBeGreaterThan(100)
    const { parts: _, ...legacy } = craft({ bus: 'smallsat' })
    expect(triangles(buildCraft(legacy))).toBeGreaterThan(100)
  })
})
