// The real rockets, one builder each. Overall sizes come from the RocketSpec (vehicles.ts); the sizes of
// engines, noses and fittings written here are listed with their sources in REFERENCES.md.
import * as THREE from 'three'
import { bell, cluster, dome, engines, lathe, lean, ogive, paint, plate, put, ring, shellPanel, skin, tube, type Mark, type Profile, type Skin } from './kit'
import { fairingHalves, finish, newStack, payloadBay, strapOn, type RocketModel, type Stack } from './stack'
import type { ModelId, RocketSpec } from './vehicles'

const WHITE = '#eceef0'
/** The split line of a fairing half: its texture runs once round the half, so the edges are at u = 0 and 1. */
const SPLIT: [number, number, string][] = [[0, 0.012, '#8e9197'], [0.988, 0.012, '#8e9197']]
const TAU = Math.PI * 2
/** White fairing halves of radius R: the split rail down each edge, a row of fasteners at the base, and whatever `s` adds. */
const whiteFairing = (st: Stack, R: number, s: Partial<Skin> = {}, length = st.spec.fairing.length) =>
  skin({ base: WHITE, stripes: SPLIT, rivets: [0.015], shell: true, roughness: 0.4, ...s }, Math.PI * R, length, st.px)
/** A straight tank or skirt of radius R, painted with `s`. */
const barrel = (st: Stack, g: THREE.Object3D, R: number, L: number, s: Skin, y = 0, seg = 48) => put(g, tube(R, R, L, seg), skin(s, TAU * R, L, st.px), 0, y)
/** Evenly spaced weld rings: a tank is a stack of welded barrels. */
const welds = (from: number, to: number, n: number) => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1))
/** A row of `n` vents or doors round the body at height v. */
const row = (kind: Mark['kind'], n: number, v: number, size: number, width = size, turn = 0): Mark[] =>
  Array.from({ length: n }, (_, i) => ({ kind, u: turn + i / n, v, size, width }))
const FLAG = (u: number, v: number, size: number): Mark => ({ kind: 'flag', u, v, size })

/** A cable raceway or pipe up the side at `angle`, from height y0 to y1. */
function runUp(parent: THREE.Object3D, mat: THREE.Material, R: number, angle: number, y0: number, y1: number, width: number, round = false): void {
  const geo = round ? new THREE.CylinderGeometry(width / 2, width / 2, y1 - y0, 10) : new THREE.BoxGeometry(width, y1 - y0, width * 0.5)
  ring(parent, geo, mat, 1, R + (round ? width * 0.55 : width * 0.2), (y0 + y1) / 2, angle)
}

// ---------------------------------------------------------------- Falcon 9, Falcon Heavy, rideshare

/** Nine Merlins: eight in a ring and one in the middle. */
const OCTAWEB = cluster(8, 1.3, 0, true)

/** One Falcon first stage (Block 5): tank, octaweb with nine Merlin 1D, and on a reusable core the legs and grid fins. */
function falconCore(st: Stack, g: THREE.Object3D, o: { reusable: boolean; soot: number; nose: boolean; glow: THREE.Material }): void {
  const { k, spec } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  // Kerosene tank below, liquid oxygen above: frost shows through the soot of a booster that has flown before.
  barrel(st, g, R, L, {
    base: WHITE, bands: [[0, 0.035, '#17181b']], seams: [0.035, 0.4, 0.97, ...welds(0.1, 0.9, 11)], panels: 3, rivets: [0.045, 0.985],
    soot: o.soot, frost: [[0.42, 0.96, o.soot ? 0.85 : 0.3]], roughness: 0.42,
    marks: [FLAG(0.07, 0.9, 1.3), ...row('door', 4, 0.065, 0.7, 1.1, 0.125), { kind: 'door', u: 0.3, v: 0.41, size: 0.6, width: 0.8 }],
  })
  runUp(g, k.dark, R, 0.5, L * 0.03, L * 0.99, 0.22)
  put(g, tube(R * 0.99, R * 0.99, 0.3, 48), k.dark, 0, -0.3)
  engines(g, k, o.glow, OCTAWEB, 0.46, 1.1, -0.25)
  const carbon = skin({ base: '#141518', roughness: 0.55, metalness: 0.1, rivets: [0.03, 0.97], seams: [0.5], marks: row('vent', 4, 0.2, 0.25, 0.5, 0.125) }, TAU * R, o.nose ? 1.6 : spec.interstage.length, st.px)
  // Cold-gas thruster pods that steer the stage on its way back.
  if (o.reusable) ring(g, new THREE.BoxGeometry(0.55, 0.9, 0.3), k.dark, 2, R + 0.1, L + (o.nose ? 0.5 : spec.interstage.length - 1.1), Math.PI / 2)
  if (o.reusable) {
    ring(g, shellPanel(R, 9.6, 1.9, 0.5, 0.3), paint(0x141518, 0.5, 0.1), 4, 0, 0.5, Math.PI / 4)
    const grid = skin({ base: '#8d9096', metalness: 0.8, roughness: 0.5, key: 'grid-fin', extra: (ctx, w, h) => {
      ctx.strokeStyle = '#2c2e33'
      ctx.lineWidth = 2
      for (let i = 0; i <= 8; i++) {
        ctx.strokeRect(0, (i * h) / 8, w, 0)
        ctx.strokeRect((i * w) / 8, 0, 0, h)
      }
    } }, 1, 1, 64)
    // Titanium grid fins, folded flat against the top of the stage for the climb.
    ring(g, new THREE.BoxGeometry(1.3, 1.6, 0.14), grid, 4, R + 0.1, L + (o.nose ? 0.8 : 5.4), Math.PI / 4)
  }
  if (o.nose) {
    put(g, tube(R, R, 1.6, 48), carbon, 0, L)
    put(g, lathe([[R, 0], ...ogive(R, 4.2)], 32), k.white, 0, L + 1.6)
  } else {
    put(g, tube(R, R, spec.interstage.length, 48), carbon, 0, L)
  }
}

function falcon(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, upper } = st
  const R = spec.s1.radius
  const heavy = spec.model === 'falcon-heavy'
  // Rideshare flights go up on boosters that have flown many times; a NASA science launch often gets a newer one.
  // Falcon Heavy as it flew Psyche: side cores come back (legs, fins), the centre core is used up (bare).
  falconCore(st, st.stage1, { reusable: !heavy, soot: spec.rideshare ? 1 : 0, nose: false, glow: st.heat.s1 })
  if (heavy) {
    // Built once: the second side core is a clone, so both share geometry, materials and textures.
    const side = new THREE.Group()
    falconCore(st, side, { reusable: true, soot: 0.5, nose: true, glow: st.heat.booster })
    for (const a of [0, Math.PI]) strapOn(st, a, 2 * R + 0.61).add(a ? side.clone() : side)
  }

  barrel(st, upper, R, spec.s2.length, { base: WHITE, seams: [0.03, 0.42, 0.97, 0.22, 0.62, 0.8], panels: 3, rivets: [0.015, 0.985], frost: [[0.44, 0.95, 0.3]], roughness: 0.42, marks: [{ kind: 'door', u: 0.2, v: 0.43, size: 0.5, width: 0.7 }] })
  runUp(upper, k.dark, R, 0.5, 0.4, spec.s2.length * 0.95, 0.25)
  // Merlin Vacuum under the tank's aft dome: its bell nearly fills the interstage.
  put(upper, new THREE.SphereGeometry(R * 0.9, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.3, 1), k.metal)
  engines(upper, k, st.heat.s2, [[0, 0]], 1.5, 3, -1.3, { seg: 24, vac: true })

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [F.radius, 1.3], [F.radius, 7.6], ...ogive(F.radius, F.length - 7.6, 7.6, 0.14)], whiteFairing(st, F.radius, { seams: [0.1, 0.58], marks: [FLAG(0.25, 0.5, 1.5), ...row('vent', 4, 0.06, 0.18, 0.4, 0.125)] }))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, F.radius * 0.92, R * 0.8)
  const core = { y: -1.4, radius: R * 0.85, propellant: 'kerolox' as const, engines: OCTAWEB, exit: 0.46 }
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: core, booster: heavy ? core : null, s2: { y: -4.3, radius: 1.5, propellant: 'kerolox', engines: [[0, 0]], exit: 1.5 } },
    footprint: heavy ? 3 * R + 0.9 : F.radius,
  })
}

// ---------------------------------------------------------------- Electron

function electron(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  // Carbon composite, left black: built in sections, so the joints show as rings.
  const carbon = { base: '#0e0f12', roughness: 0.32, metalness: 0.3, grain: 0.35 }
  barrel(st, stage1, R, L, { ...carbon, frost: [[0.1, 0.56, 0.8]], seams: [0.08, 0.33, 0.58, 0.78, 0.98], rivets: [0.02, 0.99], marks: row('door', 2, 0.05, 0.22, 0.3, 0.2) }, 0, 40)
  barrel(st, stage1, R, spec.interstage.length, { ...carbon, rivets: [0.04, 0.96], marks: row('vent', 4, 0.3, 0.07, 0.16, 0.125) }, L, 40)
  runUp(stage1, k.dark, R, 0.5, 0.3, L * 0.98, 0.1)
  put(stage1, tube(R, R, 0.2, 40), k.dark, 0, -0.2)
  const rutherfords = cluster(8, 0.42, 0, true)
  engines(stage1, k, st.heat.s1, rutherfords, 0.125, 0.32, -0.15, { seg: 12 })

  barrel(st, upper, R, spec.s2.length, { ...carbon, frost: [[0.06, 0.5, 0.7]], seams: [0.04, 0.52, 0.96], rivets: [0.02, 0.98] }, 0, 40)
  engines(upper, k, st.heat.s2, [[0, 0]], 0.3, 0.95, -0.3, { seg: 16, vac: true })
  // Curie kick stage: a squat disc under the spacecraft that finishes the orbit.
  put(upper, tube(0.5, 0.5, 0.35, 24), k.dark, 0, spec.s2.length)
  put(upper, tube(0.52, 0.52, 0.06, 24), k.foil, 0, spec.s2.length + 0.15)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 0.9], ...ogive(R, F.length - 0.9, 0.9)], skin({ ...carbon, stripes: SPLIT, rivets: [0.03], seams: [0.36], shell: true }, Math.PI * R, F.length, st.px))
  const bay = payloadBay(st, spec.s2.length + 0.35, spec.s2.length + F.length, R * 0.9, 0.35)
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: { y: -0.47, radius: R * 0.85, propellant: 'kerolox', engines: rutherfords, exit: 0.125 }, booster: null, s2: { y: -1.25, radius: 0.3, propellant: 'kerolox', engines: [[0, 0]], exit: 0.3 } },
    footprint: R,
  })
}

// ---------------------------------------------------------------- Pegasus XL

function pegasus(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  barrel(st, stage1, R, L, { base: WHITE, bands: [[0, 0.015, '#1b1c20']], seams: [0.14, 0.985], rivets: [0.03, 0.13, 0.15, 0.975], roughness: 0.4, marks: row('door', 2, 0.07, 0.3, 0.4, 0.1) }, 0, 40)
  barrel(st, stage1, R, spec.interstage.length, { base: WHITE, bands: [[0.4, 0.6, '#1b1c20']], rivets: [0.08, 0.92] }, L, 40)
  // A cable duct along the side that faces down in level flight, clear of the wing.
  runUp(stage1, k.white, R, Math.PI / 2, L * 0.16, L * 0.97, 0.12)
  engines(stage1, k, st.heat.s1, [[0, 0]], 0.5, 0.9, 0.45, { mat: k.char, seg: 20 })
  // The rocket flies level at first, so "up" is -x here: the wing sits on top, where the aircraft holds it.
  const y0 = 2.1
  const wing = plate([[-3.35, y0], [3.35, y0], [3.35, y0 + 0.45], [0, y0 + 3.8], [-3.35, y0 + 0.45]], 0.16).rotateY(Math.PI / 2)
  put(stage1, wing, k.white, -(R + 0.14))
  put(stage1, new THREE.BoxGeometry(0.34, 4.4, 1.15), k.white, -R, y0 + 2)
  // Three tail fins: a rudder straight up and two that droop 23 degrees below level.
  const fin = plate([[0, 0.1], [1.5, 0.15], [1.5, 0.75], [0, 1.7]], 0.08).translate(R * 0.98, 0, 0)
  for (const a of [Math.PI, Math.PI + 1.972, Math.PI - 1.972]) put(stage1, fin, k.white).rotation.y = a

  barrel(st, upper, R, spec.s2.length, { base: WHITE, seams: [0.04, 0.96], rivets: [0.02, 0.06, 0.94, 0.98], roughness: 0.4, marks: [{ kind: 'door', u: 0.12, v: 0.5, size: 0.3, width: 0.4 }] }, 0, 40)
  runUp(upper, k.white, R, Math.PI / 2, 0.1, spec.s2.length * 0.95, 0.12)
  engines(upper, k, st.heat.s2, [[0, 0]], 0.42, 0.8, 0.05, { mat: k.char, seg: 16 })
  // Third stage (Orion 38 motor) and the avionics ring ride inside the fairing, under the spacecraft.
  const s3 = spec.s2.length
  put(upper, new THREE.SphereGeometry(0.48, 20, 12).scale(1, 1.25, 1), k.white, 0, s3 + 0.65)
  put(upper, bell(0.26, 0.45, 12), k.char, 0, s3 + 0.2)
  put(upper, tube(0.5, 0.5, 0.25, 24), k.metal, 0, s3 + 1.2)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 2.5], ...ogive(R, F.length - 2.5, 2.5)], whiteFairing(st, R, { seams: [0.03, 0.57] }))
  const bay = payloadBay(st, s3 + 1.45, s3 + F.length, R * 0.9, 0.45)
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: { y: -0.45, radius: 0.5, propellant: 'solid', engines: [[0, 0]], exit: 0.5 }, booster: null, s2: { y: -0.75, radius: 0.42, propellant: 'solid', engines: [[0, 0]], exit: 0.42 } },
    footprint: 3.35,
  })
}

// ---------------------------------------------------------------- Vulcan Centaur

function vulcan(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  // White booster with the red flame at the base, sweeping up round the body.
  barrel(st, stage1, R, L, { base: '#e6e8eb', seams: [0.36, 0.4, 0.975, ...welds(0.06, 0.3, 4), ...welds(0.5, 0.9, 5)], panels: 4, rivets: [0.012, 0.988], frost: [[0.42, 0.96, 0.3]], roughness: 0.45, marks: [FLAG(0.06, 0.88, 1.6), ...row('door', 4, 0.045, 0.8, 1.2, 0.3)], key: 'vulcan-flame', extra: (ctx, w, h) => {
    ctx.fillStyle = '#b3261e'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x++) ctx.lineTo(x, h * (0.94 - 0.26 * Math.pow((x / w + 0.8) % 1, 1.5)))
    ctx.lineTo(w, h)
    ctx.fill()
  } }, 0, 56)
  barrel(st, stage1, R, spec.interstage.length, { base: '#e9ebee', roughness: 0.45, rivets: [0.04, 0.96], seams: [0.5], marks: row('vent', 6, 0.25, 0.2, 0.5, 0.08) }, L, 56)
  runUp(stage1, k.dark, R, 2.2, L * 0.03, L * 0.98, 0.4)
  put(stage1, tube(R * 0.98, R * 0.98, 0.5, 56), k.dark, 0, -0.5)
  const be4s: [number, number][] = [[0, -1.3], [0, 1.3]]
  engines(stage1, k, st.heat.s1, be4s, 0.95, 2.3, -0.4, { seg: 24 })

  // Six GEM 63XL solids, three each side, their nose cones leaning in toward the booster.
  const B = spec.boosters!
  const noseLen = 2.9
  const caseLen = B.length - noseLen
  // Built once and cloned, so all six share geometry, materials and textures.
  const gem = new THREE.Group()
  barrel(st, gem, B.radius, caseLen, { base: WHITE, seams: [0.05, 0.5, 0.93], bands: [[0, 0.03, '#2a2c30']], rivets: [0.04, 0.94, 0.985], stripes: [[0.24, 0.03, '#c9ccd1', 0.05, 0.93]] }, 0, 24)
  put(gem, lean(lathe([[B.radius, 0], ...ogive(B.radius, noseLen)], 24), 0, -0.2), k.white, 0, caseLen)
  engines(gem, k, st.heat.booster, [[0, 0]], 0.62, 1.5, 0.2, { mat: k.char, seg: 16 })
  // The fittings that hold a motor to the booster, bottom and top.
  for (const y of [1.2, caseLen - 0.6]) put(gem, new THREE.BoxGeometry(0.3, 0.35, 0.5), k.metal, -B.radius, y)
  for (let i = 0; i < B.count; i++) {
    const half = B.count / 2
    strapOn(st, (i < half ? 0 : Math.PI) + ((i % half) - (half - 1) / 2) * 0.6, R + B.radius + 0.1, 0.6).add(i ? gem.clone() : gem)
  }

  // Centaur V: bare stainless steel, two RL10 engines tucked inside the interstage.
  barrel(st, upper, R, spec.s2.length, { base: '#b9bcc2', seams: [0.05, 0.55, 0.95, ...welds(0.14, 0.86, 9)], panels: 6, rivets: [0.02, 0.98], frost: [[0.12, 0.9, 0.22]], roughness: 0.34, metalness: 0.85 }, 0, 56)
  const rl10s: [number, number][] = [[-1.05, 0], [1.05, 0]]
  engines(upper, k, st.heat.s2, rl10s, 0.75, 2, -1.3, { seg: 20, vac: true })
  put(upper, new THREE.SphereGeometry(R * 0.9, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.35, 1), k.metal)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 8.6], ...ogive(R, F.length - 8.6, 8.6, 0.1)], whiteFairing(st, R, { seams: [0.02, 0.55], marks: [FLAG(0.25, 0.42, 1.6), ...row('vent', 4, 0.05, 0.2, 0.45, 0.125)] }))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, R * 0.92, R * 0.6)
  return finish(st, {
    fairing, ...bay,
    nozzles: {
      s1: { y: -2.7, radius: R * 0.75, propellant: 'methalox', engines: be4s, exit: 0.95 },
      booster: { y: -1.3, radius: 0.62, propellant: 'solid', engines: [[0, 0]], exit: 0.62 },
      s2: { y: -3.3, radius: 1.5, propellant: 'hydrolox', engines: rl10s, exit: 0.75 },
    },
    footprint: R + B.radius * 2 + 0.2,
  })
}

// ---------------------------------------------------------------- Atlas V 401

function atlas(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  const top = spec.interstage.topRadius
  // Bronze-coloured booster; on the pad the liquid-oxygen tank (the upper part) is white with frost.
  barrel(st, stage1, R, L, { base: '#8a5a2c', seams: [0.05, 0.39, 0.955, ...welds(0.13, 0.31, 3), ...welds(0.5, 0.86, 4)], panels: 6, rivets: [0.02, 0.98], frost: [[0.4, 0.95, 0.9]], roughness: 0.45, metalness: 0.55, marks: row('door', 3, 0.03, 0.5, 0.8, 0.2) })
  put(stage1, lathe([[R, 0], [R, 1], [top, 2.9], [top, spec.interstage.length]], 48), skin({ base: '#e9ebee', roughness: 0.45, seams: [0.26, 0.76], rivets: [0.03, 0.97], marks: row('vent', 4, 0.13, 0.2, 0.45, 0.125) }, TAU * R, spec.interstage.length, st.px), 0, L)
  // The oxygen feed line runs down the outside of the kerosene tank to the engine.
  runUp(stage1, k.white, R, 0.45, 0.8, L * 0.41, 0.42, true)
  runUp(stage1, k.dark, R, 2.4, L * 0.03, L * 0.97, 0.3)
  // One RD-180: a single engine with two thrust chambers, so two bells.
  put(stage1, tube(1.15, R * 0.97, 0.9, 32), k.dark, 0, -0.9)
  const chambers: [number, number][] = [[0, -0.8], [0, 0.8]]
  engines(stage1, k, st.heat.s1, chambers, 0.72, 2.3, -0.7, { seg: 22 })

  // Centaur: foam-insulated tanks under a bare steel forward ring; one RL10 inside the interstage.
  barrel(st, upper, top, spec.s2.length, { base: '#e6e1d4', bands: [[0.9, 1, '#b4b8be']], seams: [0.08, 0.55, 0.9], ribs: [[0.9, 1, 72]], rivets: [0.905, 0.995], grain: 0.5, roughness: 0.75 }, 0, 40)
  put(upper, new THREE.SphereGeometry(top * 0.95, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.4, 1), k.metal)
  engines(upper, k, st.heat.s2, [[0, 0]], 0.72, 1.9, -1.3, { seg: 20, vac: true })

  // 4 m fairing: a boat-tail up from the Centaur, a barrel, then a cone with a rounded cap.
  const F = spec.fairing
  const fairing = fairingHalves(st, [[top, 0], [F.radius, 1], [F.radius, 8.1], [0.55, F.length - 0.7], ...dome(0.55, 0.7, F.length - 0.7)], whiteFairing(st, F.radius, { seams: [0.09, 0.6, 0.35], marks: [FLAG(0.25, 0.45, 1.3), ...row('vent', 4, 0.12, 0.18, 0.4, 0.125)] }))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, F.radius * 0.9, 1)
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: { y: -3, radius: 1.5, propellant: 'kerolox', engines: chambers, exit: 0.72 }, booster: null, s2: { y: -3.2, radius: 0.72, propellant: 'hydrolox', engines: [[0, 0]], exit: 0.72 } },
    footprint: F.radius,
  })
}

// ---------------------------------------------------------------- Delta IV Heavy

const DELTA_FOAM = { base: '#c4702b', grain: 1, roughness: 0.9 }

/** One common booster core: orange spray-on foam, a pale engine section, one RS-68A with its big ablative bell. */
function deltaCore(st: Stack, g: THREE.Object3D, nose: boolean, glow: THREE.Material): void {
  const { k, spec } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  // From the bottom: engine section, hydrogen tank, the ribbed centerbody, oxygen tank.
  barrel(st, g, R, L, { ...DELTA_FOAM, bands: [[0, 0.09, '#d6d1c4'], [0.6, 0.68, '#b3611f']], seams: [0.09, 0.6, 0.68, 0.985, ...welds(0.2, 0.5, 4), 0.79, 0.9], ribs: [[0.6, 0.68, 96]], rivets: [0.01, 0.085], marks: row('door', 3, 0.045, 1, 1.4, 0.1) })
  const darkFoam = paint(0x8f4f1a, 0.9)
  runUp(g, darkFoam, R, 0.5, L * 0.09, L * 0.97, 0.35)
  runUp(g, darkFoam, R, -0.5, L * 0.1, L * 0.62, 0.4, true)
  put(g, tube(1.4, R * 0.96, 1, 32), k.dark, 0, -1)
  engines(g, k, glow, [[0, 0]], 1.2, 3.2, -0.6, { mat: k.char, seg: 24 })
  const I = spec.interstage.length
  if (nose) put(g, lean(lathe([[R, 0], ...ogive(R, I)], 32), 0, -0.22), k.white, 0, L)
  else barrel(st, g, R, I, { base: '#d6d1c4', seams: [0.05, 0.95], rivets: [0.03, 0.5, 0.97], roughness: 0.6, marks: row('vent', 4, 0.3, 0.25, 0.6, 0.125) }, L)
}

function delta(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, upper } = st
  const R = spec.s1.radius
  deltaCore(st, st.stage1, false, st.heat.s1)
  const side = new THREE.Group()
  deltaCore(st, side, true, st.heat.booster)
  for (const a of [0, Math.PI]) strapOn(st, a, 2 * R + 0.25).add(a ? side.clone() : side)

  // The 5 m upper stage: only its foam-covered hydrogen tank shows; the oxygen tank and RL10 hang inside the interstage.
  barrel(st, upper, R, spec.s2.length, { ...DELTA_FOAM, seams: [0.04, 0.35, 0.66, 0.96] })
  put(upper, new THREE.SphereGeometry(1.6, 20, 12).scale(1, 0.6, 1), k.metal, 0, -0.5)
  engines(upper, k, st.heat.s2, [[0, 0]], 1.05, 2.4, -1.75, { seg: 22, vac: true })

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 12.2], ...ogive(R, F.length - 12.2, 12.2, 0.12)], whiteFairing(st, R, { seams: [0.02, 0.35, 0.64], panels: 3, marks: [FLAG(0.25, 0.5, 1.6)] }))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, R * 0.92, R * 0.6)
  const rs68 = { y: -3.8, radius: 1.2, propellant: 'hydrolox' as const, engines: [[0, 0]] as [number, number][], exit: 1.2 }
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: rs68, booster: rs68, s2: { y: -4.15, radius: 1.05, propellant: 'hydrolox', engines: [[0, 0]], exit: 1.05 } },
    footprint: 3 * R + 0.25,
  })
}

// ---------------------------------------------------------------- SLS Block 1 with Orion (Artemis I)

function sls(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  const foam = { base: '#b9621f', grain: 1, roughness: 0.88 }
  // Core stage from the bottom: engine section, hydrogen tank, ribbed intertank, oxygen tank, forward skirt.
  // The hydrogen tank is five welded barrels, the oxygen tank two; the intertank between them carries its stringers outside.
  barrel(st, stage1, R, L, {
    ...foam, bands: [[0.715, 0.82, '#b25c1c']], seams: [0.085, 0.715, 0.82, 0.95, ...welds(0.21, 0.59, 4), 0.885], ribs: [[0.715, 0.82, 108]], rivets: [0.72, 0.815],
    marks: [...row('door', 4, 0.045, 1.4, 1.8, 0.07), { kind: 'door', u: 0.12, v: 0.77, size: 1.6, width: 1.2 }, { kind: 'door', u: 0.3, v: 0.965, size: 1, width: 1.4 }],
  }, 0, 56)
  // The adapter cone that narrows to the upper stage is foam-covered too.
  put(stage1, lathe([[R, 0], [spec.interstage.topRadius, spec.interstage.length]], 56), skin({ ...foam, seams: [0.03, 0.5, 0.97], marks: row('door', 2, 0.3, 1.1, 1.1, 0.1) }, TAU * R, spec.interstage.length, st.px), 0, L)
  // Two oxygen feed lines and the systems tunnel run down the hydrogen tank.
  const plainFoam = paint(0xa85618, 0.88)
  for (const a of [0.42, 0.42 + Math.PI]) runUp(stage1, plainFoam, R, a, L * 0.07, L * 0.73, 0.6, true)
  runUp(stage1, plainFoam, R, -0.5, L * 0.09, L * 0.97, 0.7)
  put(stage1, tube(R * 0.94, R, 1, 56), k.white, 0, -1)
  const rs25s = cluster(4, 2.2, Math.PI / 4)
  engines(stage1, k, st.heat.s1, rs25s, 1.15, 3.1, -0.9, { seg: 24 })

  // Five-segment solid boosters: flared aft skirt, segment joints, a cone-tipped nose.
  const B = spec.boosters!
  const r = B.radius
  const srb = lathe([[r * 1.43, 0], [r, 2.7], [r, 46.6], [r, 48.4], [0.3, B.length - 0.5], ...dome(0.3, 0.5, B.length - 0.5)], 32)
  // Stiffener rings round the aft segment, a fastener row either side of every joint, and the tracking cameras' checkered targets.
  const srbSkin = skin({
    base: WHITE, seams: [0.05, 0.085, 0.24, 0.4, 0.56, 0.72, 0.862, 0.895, 0.115, 0.145, 0.175], bands: [[0.085, 0.092, '#2a2c30'], [0.862, 0.868, '#2a2c30']],
    rivets: [0.235, 0.245, 0.395, 0.405, 0.555, 0.565, 0.715, 0.725], roughness: 0.5,
    marks: [0.06, 0.56].flatMap((u): Mark[] => [{ kind: 'checker', u, v: 0.83, size: 1.3 }, { kind: 'checker', u, v: 0.2, size: 1.3 }]),
  }, TAU * r, B.length, st.px)
  // Built once and cloned, so both share geometry, materials and textures.
  const booster = new THREE.Group()
  put(booster, srb, srbSkin)
  engines(booster, k, st.heat.booster, [[0, 0]], 1.9, 3.2, 0.6, { mat: k.char, seg: 24 })
  // The systems tunnel: a cable cover that runs most of the booster's length.
  runUp(booster, k.white, r, Math.PI / 2, 3.2, 46, 0.35)
  // Attach struts to the core, bottom and top.
  for (const y of [5.6, 46]) put(booster, new THREE.BoxGeometry(0.9, 0.5, 0.5), k.metal, -(r + 0.1), y)
  for (const a of [0, Math.PI]) strapOn(st, a, R + r + 0.25, -3.2).add(a ? booster.clone() : booster)

  // ICPS: the hydrogen tank shows above the cone; the oxygen tank and the RL10 hang down inside it.
  const icps = 4.5
  barrel(st, upper, spec.s2.radius, icps, { base: '#e8e4da', seams: [0.06, 0.5, 0.94], grain: 0.4, rivets: [0.03, 0.97], roughness: 0.6 })
  put(upper, new THREE.SphereGeometry(1.6, 20, 12).scale(1, 0.65, 1), k.metal, 0, -1.2)
  engines(upper, k, st.heat.s2, [[0, 0]], 1.07, 2.4, -2.9, { seg: 22, vac: true })
  // Orion stage adapter ring, where Artemis I carried its CubeSats.
  barrel(st, upper, spec.s2.radius, spec.s2.length - icps, { base: '#dfe1e4', seams: [0.1, 0.9], rivets: [0.05, 0.95], marks: row('door', 6, 0.5, 0.5, 0.7) }, icps)

  // Orion's place: panels round the service module that split away, and the launch abort system
  // (the ogive cover and its tower of solid motors) that pulls off forward.
  const F = spec.fairing
  // The launch abort system is 13.4 m (44 ft) from the base of its cover to the tip; the panels fill the rest.
  const panels = F.length - 13.4
  const fairing = fairingHalves(st, [[F.radius, 0], [F.radius * 1.03, 0.5], [F.radius * 1.03, panels]], whiteFairing(st, F.radius, { seams: [0.1, 0.9], rivets: [0.05, 0.95] }, panels))
  const escape = new THREE.Group()
  escape.position.y = spec.s2.length + panels
  const coverTop = 5.2
  const cover: Profile = [[F.radius * 1.03, 0]]
  for (let i = 0; i <= 8; i++) cover.push([0.46 + (F.radius * 1.03 - 0.46) * Math.cos((i / 8) * (Math.PI / 2)), 0.5 + (i / 8) * (coverTop - 0.5)])
  put(escape, lathe(cover, 40), skin({ base: WHITE, seams: [0.09, 0.5], panels: 4, rivets: [0.05], shell: true, roughness: 0.42 }, TAU * F.radius, coverTop, st.px))
  const towerTop = F.length - panels
  put(escape, lathe([[0.46, coverTop], [0.46, towerTop - 2.6], [0.38, towerTop - 2.4], [0.38, towerTop - 1.2], ...ogive(0.38, 1.2, towerTop - 1.2)], 20), k.white)
  // Abort motor: four nozzles that point back down the tower.
  ring(escape, bell(0.22, 0.6, 10).rotateX(-0.45), k.dark, 4, 0.5, coverTop + 4.6, Math.PI / 4)
  put(escape, tube(0.52, 0.52, 0.5, 20), k.dark, 0, coverTop + 4.5)
  upper.add(escape)
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + panels + coverTop, F.radius * 0.92, 2)
  return finish(st, {
    fairing, escape, ...bay,
    nozzles: {
      s1: { y: -4, radius: R * 0.7, propellant: 'hydrolox', engines: rs25s, exit: 1.15 },
      booster: { y: -2.6, radius: 1.9, propellant: 'solid', engines: [[0, 0]], exit: 1.9 },
      s2: { y: -5.3, radius: 1.07, propellant: 'hydrolox', engines: [[0, 0]], exit: 1.07 },
    },
    footprint: R + 2 * r + 0.25 + r * 0.43,
  })
}

export const FLEET: Partial<Record<ModelId, (spec: RocketSpec) => RocketModel>> = {
  'falcon-9': falcon,
  'falcon-heavy': falcon,
  electron,
  'pegasus-xl': pegasus,
  'vulcan-centaur': vulcan,
  'atlas-v': atlas,
  'delta-iv-heavy': delta,
  'sls-block-1': sls,
}
