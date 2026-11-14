// Builds a launch vehicle from a RocketSpec, in meters. Origin: centre of the first stage's base, +y up the stack.
// The pieces that come off in flight (boosters, first stage, fairing halves) are separate groups the scene moves.
import * as THREE from 'three'
import type { Livery, Propellant, RocketSpec } from './vehicles'

export interface Nozzle { y: number; radius: number; propellant: Propellant }

export interface RocketModel {
  root: THREE.Group
  /** First stage with its engines, interstage, legs, fins and wing. */
  stage1: THREE.Group
  /** Side boosters; `out` is the unit direction away from the core. Children of `root`. */
  boosters: { group: THREE.Group; out: THREE.Vector3; home: THREE.Vector3 }[]
  /** Upper stage; origin at its base. Carries the fairing and the payload. */
  upper: THREE.Group
  /** The two fairing halves (they open along ±x); origin at the fairing base. Children of `upper`. */
  fairing: [THREE.Group, THREE.Group]
  /** Empty group at the centre of the payload space, child of `upper`; the scene puts the spacecraft in it. */
  payload: THREE.Group
  /** Radius the spacecraft may fill. */
  payloadRadius: number
  /** Rideshare co-passengers, children of `upper`. */
  others: THREE.Mesh[]
  /** Where the flames start, in the local frame of stage1, a booster and upper. */
  nozzles: { s1: Nozzle; booster: Nozzle | null; s2: Nozzle }
  height: number
  /** Widest half-width at the base, boosters included. */
  footprint: number
}

interface Paint {
  s1: [from: number, to: number, mat: THREE.Material][]
  interstage: THREE.Material
  s2: THREE.Material
  fairing: THREE.Material
  fairingBand?: THREE.Material
  booster: THREE.Material
  boosterTip: THREE.Material
}

const std = (color: number, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })

function paintFor(livery: Livery): Paint & { metal: THREE.Material; dark: THREE.Material; bell: THREE.Material } {
  const white = std(0xe8eaed, 0.42, 0.05)
  const black = std(0x15171b, 0.45, 0.25)
  const metal = std(0x9a9ea6, 0.38, 0.85)
  const dark = std(0x24262b, 0.6, 0.5)
  const bell = std(0x3a3632, 0.45, 0.85, { side: THREE.DoubleSide })
  const shell = (m: THREE.MeshStandardMaterial) => { const c = m.clone(); c.side = THREE.DoubleSide; return c }
  const base = { metal, dark, bell }
  switch (livery) {
    case 'electron': {
      const carbon = std(0x101114, 0.3, 0.35)
      return { ...base, s1: [[0, 1, carbon]], interstage: carbon, s2: carbon, fairing: shell(carbon), fairingBand: std(0xc9ccd2, 0.4, 0.6, { side: THREE.DoubleSide }), booster: carbon, boosterTip: carbon }
    }
    case 'falcon':
      return { ...base, s1: [[0, 1, white]], interstage: black, s2: white, fairing: shell(white), booster: white, boosterTip: black }
    case 'shared': {
      const blue = std(0x1f4f8f, 0.45, 0.1)
      return { ...base, s1: [[0, 0.86, white], [0.86, 1, blue]], interstage: blue, s2: white, fairing: shell(white), fairingBand: shell(blue), booster: white, boosterTip: blue }
    }
    case 'vulcan': {
      const red = std(0xb8321c, 0.45, 0.05)
      const silver = std(0xcdd1d6, 0.3, 0.8)
      return { ...base, s1: [[0, 0.2, red], [0.2, 0.24, white], [0.24, 0.27, red], [0.27, 1, white]], interstage: white, s2: silver, fairing: shell(white), fairingBand: shell(red), booster: white, boosterTip: std(0x8f949b, 0.5, 0.3) }
    }
    case 'sls': {
      const foam = std(0xc0621f, 0.85)
      const rib = std(0xa8531a, 0.9)
      return { ...base, s1: [[0, 0.07, white], [0.07, 0.62, foam], [0.62, 0.72, rib], [0.72, 1, foam]], interstage: foam, s2: white, fairing: shell(white), booster: white, boosterTip: white }
    }
    case 'pegasus':
      return { ...base, s1: [[0, 1, white]], interstage: white, s2: white, fairing: shell(white), fairingBand: shell(black), booster: white, boosterTip: black }
    default: {
      const grey = std(0xd4d7dc, 0.45, 0.05)
      const band = std(0x3b4350, 0.5, 0.1)
      return { ...base, s1: [[0, 0.1, band], [0.1, 0.9, grey], [0.9, 1, band]], interstage: band, s2: grey, fairing: shell(grey), booster: grey, boosterTip: band }
    }
  }
}

/** Engine positions [x, z] and bell radius for `n` engines under a stage of radius `R`. */
function engineLayout(n: number, R: number): { at: [number, number][]; r: number } {
  if (n <= 1) return { at: [[0, 0]], r: R * 0.5 }
  const centre = n === 5 || n >= 7
  const k = centre ? n - 1 : n
  const ring = R * (n === 2 ? 0.45 : k <= 4 ? 0.52 : 0.68)
  const r = Math.min(ring * Math.sin(Math.PI / k) * 0.92, (R - ring) * 1.05, centre ? ring * 0.46 : Infinity)
  const at: [number, number][] = centre ? [[0, 0]] : []
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + (k === 4 ? Math.PI / 4 : 0)
    at.push([Math.cos(a) * ring, Math.sin(a) * ring])
  }
  return { at, r }
}

/** A bell nozzle hanging down from y = 0: throat at the top, exit `len` below. */
function bellGeometry(r: number, len: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    pts.push(new THREE.Vector2(r * (0.36 + 0.64 * Math.sqrt(u)), -u * len))
  }
  return new THREE.LatheGeometry(pts, 20)
}

/** Fairing outline (radius, height): an optional flare out from the stage, a straight barrel, an ogive nose. */
function fairingProfile(baseR: number, R: number, L: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(baseR, 0)]
  const flare = R > baseR * 1.05 ? 0.1 * L : 0
  if (flare) pts.push(new THREE.Vector2(R, flare))
  const nose = Math.min(L * 0.5, R * 3.2)
  pts.push(new THREE.Vector2(R, L - nose))
  for (let i = 1; i <= 10; i++) {
    const u = i / 10
    pts.push(new THREE.Vector2(R * Math.max(Math.pow(Math.cos((u * Math.PI) / 2), 0.75), 0.05 * (1 - u) + 0.0001), L - nose + nose * (u * 0.97)))
  }
  pts.push(new THREE.Vector2(0.0001, L))
  return pts
}

export function buildRocket(spec: RocketSpec): RocketModel {
  const paint = paintFor(spec.livery)
  const root = new THREE.Group()
  const stage1 = new THREE.Group()
  const upper = new THREE.Group()
  root.add(stage1, upper)
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }
  const { s1, s2, interstage, fairing } = spec
  const R = s1.radius

  // ---- First stage: painted bands, engines, interstage.
  for (const [from, to, mat] of paint.s1) {
    const len = (to - from) * s1.length
    add(stage1, new THREE.CylinderGeometry(R, R, len, 48), mat, 0, (from + (to - from) / 2) * s1.length)
  }
  add(stage1, new THREE.CylinderGeometry(interstage.topRadius, R, interstage.length, 48), paint.interstage, 0, s1.length + interstage.length / 2)
  // A raceway (the cable cover down the side) gives the eye something to read the scale and roll from.
  add(stage1, new THREE.BoxGeometry(R * 0.1, s1.length * 0.9, R * 0.06), paint.dark, 0, s1.length * 0.5, R)
  const lay1 = engineLayout(s1.engines, R)
  const solid1 = s1.propellant === 'solid'
  const bell1Len = lay1.r * (solid1 ? 1.2 : 1.7)
  const bell1 = bellGeometry(lay1.r, bell1Len)
  add(stage1, new THREE.CylinderGeometry(R * 0.98, R * 0.98, bell1Len * 0.25, 32), paint.dark, 0, -bell1Len * 0.12)
  for (const [x, z] of lay1.at) add(stage1, bell1, paint.bell, x, -bell1Len * 0.2, z)

  if (spec.legs) {
    // Folded landing legs against the base and grid fins at the top, like a reusable booster.
    const legLen = Math.min(s1.length * 0.24, R * 5.5)
    const leg = new THREE.CylinderGeometry(R * 0.1, R * 0.42, legLen, 3).scale(1, 1, 0.35)
    const fin = new THREE.BoxGeometry(R * 0.65, R * 0.85, R * 0.07)
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2
      const l = add(stage1, leg, paint.dark, Math.sin(a) * R * 1.06, legLen / 2 + R * 0.2, Math.cos(a) * R * 1.06)
      l.rotation.y = a
      const f = add(stage1, fin, paint.metal, Math.sin(a) * R * 1.05, s1.length + interstage.length * 0.72, Math.cos(a) * R * 1.05)
      f.rotation.y = a
    }
  }
  if (spec.wing) {
    // Delta wing on a saddle and three tail fins: an air-launched rocket flies like a plane at first.
    // Built on the +z side, then turned to -x, which is "up" once the rocket lies level.
    const aero = new THREE.Group()
    aero.rotation.y = -Math.PI / 2
    stage1.add(aero)
    const span = R * 5.3
    const chord = R * 6.2
    const wing = new THREE.Shape([new THREE.Vector2(-span, 0), new THREE.Vector2(span, 0), new THREE.Vector2(R * 0.9, chord), new THREE.Vector2(-R * 0.9, chord)])
    add(aero, new THREE.ExtrudeGeometry(wing, { depth: R * 0.14, bevelEnabled: false }), paint.s1[0]![2], 0, s1.length * 0.42, R * 0.92)
    add(aero, new THREE.BoxGeometry(R * 1.3, chord * 0.9, R * 0.3), paint.dark, 0, s1.length * 0.42 + chord * 0.45, R * 0.85)
    const tail = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(R * 1.9, 0), new THREE.Vector2(R * 1.9, R * 0.7), new THREE.Vector2(0, R * 2.4)])
    const tailGeo = new THREE.ExtrudeGeometry(tail, { depth: R * 0.08, bevelEnabled: false }).translate(R, 0, -R * 0.04)
    for (const a of [Math.PI / 2, Math.PI / 2 + 2.2, Math.PI / 2 - 2.2]) add(aero, tailGeo, paint.s1[0]![2], 0, R * 0.3, 0).rotation.y = a
  }

  // ---- Side boosters.
  const boosters: RocketModel['boosters'] = []
  let boosterNozzle: Nozzle | null = null
  if (spec.boosters) {
    const b = spec.boosters
    const many = b.count > 2
    const body = new THREE.CylinderGeometry(b.radius, b.radius, b.length * 0.84, 28).translate(0, b.length * 0.42, 0)
    const nosePts = [new THREE.Vector2(b.radius, 0), new THREE.Vector2(b.radius * 0.72, b.length * 0.07), new THREE.Vector2(b.radius * 0.3, b.length * 0.135), new THREE.Vector2(0.0001, b.length * 0.16)]
    const nose = new THREE.LatheGeometry(nosePts, 28).translate(0, b.length * 0.84, 0)
    const skirt = new THREE.CylinderGeometry(b.radius, b.radius * 1.22, b.length * 0.05, 28).translate(0, b.length * 0.025, 0)
    const band = new THREE.CylinderGeometry(b.radius * 1.012, b.radius * 1.012, b.length * 0.012, 28)
    const bBellLen = b.radius * 1.3
    const bBell = bellGeometry(b.radius * 0.72, bBellLen)
    boosterNozzle = { y: -bBellLen, radius: b.radius * 0.72, propellant: 'solid' }
    for (let i = 0; i < b.count; i++) {
      // Two go on opposite sides; more are fanned in two clusters, left and right.
      const half = b.count / 2
      const side = i < half ? 0 : Math.PI
      const fan = many ? ((i % half) - (half - 1) / 2) * 0.62 : 0
      const a = side + fan
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
      const group = new THREE.Group()
      const home = out.clone().multiplyScalar(R + b.radius * 1.08).setY(many ? 0 : -b.radius * 0.6)
      group.position.copy(home)
      add(group, body, paint.booster)
      add(group, nose, many ? paint.booster : paint.boosterTip)
      add(group, skirt, paint.booster)
      if (!many) for (const f of [0.22, 0.45, 0.68]) add(group, band, paint.dark, 0, b.length * f)
      else add(group, band, paint.boosterTip, 0, b.length * 0.8)
      add(group, bBell, paint.bell, 0, -bBellLen * 0.15)
      root.add(group)
      boosters.push({ group, out, home })
    }
  }

  // ---- Upper stage.
  const s2Base = s1.length + interstage.length
  upper.position.y = s2Base
  add(upper, new THREE.CylinderGeometry(s2.radius, s2.radius, s2.length, 48), paint.s2, 0, s2.length / 2)
  add(upper, new THREE.CylinderGeometry(s2.radius * 1.004, s2.radius * 1.004, s2.length * 0.05, 48), paint.dark, 0, s2.length * 0.03)
  const lay2 = engineLayout(s2.engines, s2.radius)
  // Vacuum engines have big bells; stacked, they hide inside the interstage.
  const bell2R = Math.min(lay2.r * 1.25, s2.radius * 0.62, interstage.topRadius * 0.8)
  const bell2Len = Math.min(bell2R * 2, interstage.length * 0.85)
  const bell2 = bellGeometry(bell2R, bell2Len)
  for (const [x, z] of lay2.at) add(upper, bell2, paint.bell, x * 0.8, 0, z * 0.8)

  let top = s2.length
  if (spec.kickStage) {
    const kr = s2.radius * 0.62
    add(upper, new THREE.CylinderGeometry(kr, kr * 1.15, kr * 0.9, 24), paint.dark, 0, top + kr * 0.45)
    top += kr * 0.9
  }
  const adapter = fairing.length * 0.07
  add(upper, new THREE.CylinderGeometry(s2.radius * 0.34, s2.radius * 0.8, adapter, 24), paint.metal, 0, top + adapter / 2)
  top += adapter

  // Rideshare: a dispenser tower ringed with other people's satellites; the player's rides on top.
  const others: THREE.Mesh[] = []
  if (spec.rideshare) {
    const tower = fairing.length * 0.36
    add(upper, new THREE.CylinderGeometry(fairing.radius * 0.16, fairing.radius * 0.16, tower, 12), paint.metal, 0, top + tower / 2)
    const sat = new THREE.BoxGeometry(fairing.radius * 0.3, tower * 0.2, fairing.radius * 0.22)
    const foil = std(0xd8a740, 0.35, 1)
    const cells = std(0x16245a, 0.25, 0.6)
    for (let tier = 0; tier < 4; tier++) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + tier * 0.5
        const m = add(upper, sat, (i + tier) % 3 === 0 ? cells : foil, Math.cos(a) * fairing.radius * 0.42, top + tower * (0.14 + tier * 0.24), Math.sin(a) * fairing.radius * 0.42)
        m.rotation.y = -a
        others.push(m)
      }
    }
    top += tower
  }

  const fairingBase = s2.length
  const space = fairingBase + fairing.length - top
  const payloadRadius = Math.min(fairing.radius * 0.8, space * (spec.rideshare ? 0.3 : 0.36))
  const payload = new THREE.Group()
  payload.position.y = top + payloadRadius * 1.02
  upper.add(payload)

  const profile = fairingProfile(s2.radius, fairing.radius, fairing.length)
  const halves = [0, Math.PI].map((phi) => {
    const g = new THREE.Group()
    g.position.y = fairingBase
    add(g, new THREE.LatheGeometry(profile, 24, phi, Math.PI), paint.fairing)
    if (paint.fairingBand) {
      const y0 = fairing.length * 0.3
      const r = fairing.radius * 1.004
      add(g, new THREE.CylinderGeometry(r, r, fairing.length * 0.05, 24, 1, true, phi, Math.PI), paint.fairingBand, 0, y0)
    }
    upper.add(g)
    return g
  }) as [THREE.Group, THREE.Group]

  const height = s2Base + fairingBase + fairing.length
  const footprint = spec.boosters ? R + spec.boosters.radius * 2.3 : spec.wing ? R * 5.3 : Math.max(R, fairing.radius)
  return {
    root, stage1, boosters, upper, fairing: halves, payload, payloadRadius, others,
    nozzles: {
      s1: { y: -bell1Len * 1.15, radius: lay1.at.length > 1 ? R * 0.85 : lay1.r, propellant: s1.propellant },
      booster: boosterNozzle,
      s2: { y: -bell2Len, radius: bell2R * (lay2.at.length > 1 ? 1.6 : 1), propellant: s2.propellant },
    },
    height, footprint,
  }
}
