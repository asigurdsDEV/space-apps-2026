// The real rockets, one builder each. Overall sizes come from the RocketSpec (vehicles.ts); the sizes of
// engines, noses and fittings written here are listed with their sources in REFERENCES.md.
import * as THREE from 'three'
import { bell, dome, lathe, lean, ogive, paint, plate, put, ring, shellPanel, skin, tube, type Profile } from './kit'
import { fairingHalves, finish, newStack, payloadBay, strapOn, type RocketModel, type Stack } from './stack'
import type { ModelId, RocketSpec } from './vehicles'

const WHITE = '#eceef0'
/** The split line of a fairing half: its texture runs once round the half, so the edges are at u = 0 and 1. */
const SPLIT: [number, number, string][] = [[0, 0.012, '#8e9197'], [0.988, 0.012, '#8e9197']]
const whiteFairing = (seams: number[] = []) => skin({ base: WHITE, stripes: SPLIT, seams, shell: true, roughness: 0.4 })

/** A cable raceway or pipe up the side at `angle`, from height y0 to y1. */
function runUp(parent: THREE.Object3D, mat: THREE.Material, R: number, angle: number, y0: number, y1: number, width: number, round = false): void {
  const geo = round ? new THREE.CylinderGeometry(width / 2, width / 2, y1 - y0, 10) : new THREE.BoxGeometry(width, y1 - y0, width * 0.5)
  ring(parent, geo, mat, 1, R + (round ? width * 0.55 : width * 0.2), (y0 + y1) / 2, angle)
}

// ---------------------------------------------------------------- Falcon 9, Falcon Heavy, rideshare

/** One Falcon first stage (Block 5): tank, octaweb with nine Merlin 1D, and on a reusable core the legs and grid fins. */
function falconCore(st: Stack, g: THREE.Object3D, o: { reusable: boolean; soot: number; nose: boolean }): void {
  const { k, spec } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  // Kerosene tank below, liquid oxygen above: frost shows through the soot of a booster that has flown before.
  const body = skin({ base: WHITE, bands: [[0, 0.035, '#17181b']], seams: [0.035, 0.4, 0.97], soot: o.soot, frost: o.soot ? [[0.42, 0.96, 0.85]] : [], roughness: 0.42 })
  put(g, tube(R, R, L, 48), body)
  runUp(g, k.dark, R, 0.5, L * 0.03, L * 0.99, 0.22)
  put(g, tube(R * 0.99, R * 0.99, 0.3, 48), k.dark, 0, -0.3)
  const merlin = bell(0.46, 1.1)
  ring(g, merlin, k.bell, 8, 1.3, -0.25)
  put(g, merlin, k.bell, 0, -0.25)
  const carbon = paint(0x141518, 0.38, 0.3)
  if (o.reusable) {
    ring(g, shellPanel(R, 9.6, 1.9, 0.5, 0.3), carbon, 4, 0, 0.5, Math.PI / 4)
    const grid = skin({ base: '#8d9096', metalness: 0.8, roughness: 0.5, extra: (ctx, w, h) => {
      ctx.strokeStyle = '#2c2e33'
      ctx.lineWidth = 2
      for (let i = 0; i <= 8; i++) {
        ctx.strokeRect(0, (i * h) / 8, w, 0)
        ctx.strokeRect((i * w) / 8, 0, 0, h)
      }
    } }, 64, 64)
    // Titanium grid fins, folded flat against the top of the stage for the climb.
    ring(g, new THREE.BoxGeometry(1.3, 1.6, 0.14), grid, 4, R + 0.1, L + (o.nose ? 0.8 : 5.4), Math.PI / 4)
  }
  if (o.nose) {
    put(g, tube(R, R, 1.6, 48), carbon, 0, L)
    put(g, lathe([[R, 0], ...ogive(R, 4.2)], 32), st.k.white, 0, L + 1.6)
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
  falconCore(st, st.stage1, { reusable: !heavy, soot: spec.rideshare ? 1 : 0, nose: false })
  if (heavy) for (const a of [0, Math.PI]) falconCore(st, strapOn(st, a, 2 * R + 0.61), { reusable: true, soot: 0.5, nose: true })

  put(upper, tube(R, R, spec.s2.length, 48), skin({ base: WHITE, seams: [0.03, 0.42, 0.97], roughness: 0.42 }))
  runUp(upper, k.dark, R, 0.5, 0.4, spec.s2.length * 0.95, 0.25)
  // Merlin Vacuum: its bell nearly fills the interstage.
  put(upper, tube(0.5, 0.9, 0.9, 16), k.metal, 0, -0.9)
  put(upper, bell(1.5, 3, 24), k.bell, 0, -0.8)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [F.radius, 1.3], [F.radius, 7.6], ...ogive(F.radius, F.length - 7.6, 7.6, 0.3)], whiteFairing([0.1]))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, F.radius * 0.92, R * 0.8)
  const core = { y: -1.4, radius: R * 0.85, propellant: 'kerolox' as const }
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: core, booster: heavy ? core : null, s2: { y: -3.8, radius: 1.5, propellant: 'kerolox' } },
    footprint: heavy ? 3 * R + 0.9 : F.radius,
  })
}

// ---------------------------------------------------------------- Electron

function electron(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  const carbon = { base: '#0e0f12', roughness: 0.32, metalness: 0.3 }
  put(stage1, tube(R, R, L, 40), skin({ ...carbon, frost: [[0.1, 0.56, 0.8]], seams: [0.08, 0.58, 0.98] }))
  put(stage1, tube(R, R, spec.interstage.length, 40), skin(carbon, 8, 8), 0, L)
  runUp(stage1, k.dark, R, 0.5, 0.3, L * 0.98, 0.1)
  put(stage1, tube(R, R, 0.2, 40), k.dark, 0, -0.2)
  const rutherford = bell(0.125, 0.32, 12)
  ring(stage1, rutherford, k.bell, 8, 0.42, -0.15)
  put(stage1, rutherford, k.bell, 0, -0.15)

  put(upper, tube(R, R, spec.s2.length, 40), skin({ ...carbon, frost: [[0.06, 0.5, 0.7]], seams: [0.04, 0.96] }))
  put(upper, bell(0.3, 0.95, 16), k.bell, 0, -0.05)
  // Curie kick stage: a squat disc under the spacecraft that finishes the orbit.
  put(upper, tube(0.5, 0.5, 0.35, 24), k.dark, 0, spec.s2.length)
  put(upper, tube(0.52, 0.52, 0.06, 24), k.foil, 0, spec.s2.length + 0.15)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 0.9], ...ogive(R, F.length - 0.9, 0.9)], skin({ ...carbon, stripes: SPLIT, shell: true }))
  const bay = payloadBay(st, spec.s2.length + 0.35, spec.s2.length + F.length, R * 0.9, 0.35)
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: { y: -0.47, radius: R * 0.85, propellant: 'kerolox' }, booster: null, s2: { y: -1, radius: 0.3, propellant: 'kerolox' } },
    footprint: R,
  })
}

// ---------------------------------------------------------------- Pegasus XL

function pegasus(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  put(stage1, tube(R, R, L, 40), skin({ base: WHITE, bands: [[0, 0.015, '#1b1c20']], seams: [0.14, 0.985], roughness: 0.4 }))
  put(stage1, tube(R, R, spec.interstage.length, 40), skin({ base: WHITE, bands: [[0.4, 0.6, '#1b1c20']] }, 8, 32), 0, L)
  put(stage1, bell(0.5, 0.9, 20), k.char, 0, 0.45)
  // The rocket flies level at first, so "up" is -x here: the wing sits on top, where the aircraft holds it.
  const y0 = 2.1
  const wing = plate([[-3.35, y0], [3.35, y0], [3.35, y0 + 0.45], [0, y0 + 3.8], [-3.35, y0 + 0.45]], 0.16).rotateY(Math.PI / 2)
  put(stage1, wing, k.white, -(R + 0.14))
  put(stage1, new THREE.BoxGeometry(0.34, 4.4, 1.15), k.white, -R, y0 + 2)
  // Three tail fins: a rudder straight up and two that droop 23 degrees below level.
  const fin = plate([[0, 0.1], [1.5, 0.15], [1.5, 0.75], [0, 1.7]], 0.08).translate(R * 0.98, 0, 0)
  for (const a of [Math.PI, Math.PI + 1.972, Math.PI - 1.972]) put(stage1, fin, k.white).rotation.y = a

  put(upper, tube(R, R, spec.s2.length, 40), skin({ base: WHITE, seams: [0.04, 0.96], roughness: 0.4 }))
  put(upper, bell(0.42, 0.8, 16), k.char, 0, 0.05)
  // Third stage (Orion 38 motor) and the avionics ring ride inside the fairing, under the spacecraft.
  const s3 = spec.s2.length
  put(upper, new THREE.SphereGeometry(0.48, 20, 12).scale(1, 1.25, 1), k.white, 0, s3 + 0.65)
  put(upper, bell(0.26, 0.45, 12), k.char, 0, s3 + 0.2)
  put(upper, tube(0.5, 0.5, 0.25, 24), k.metal, 0, s3 + 1.2)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 2.5], ...ogive(R, F.length - 2.5, 2.5)], whiteFairing([0.03]))
  const bay = payloadBay(st, s3 + 1.45, s3 + F.length, R * 0.9, 0.45)
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: { y: -0.45, radius: 0.5, propellant: 'solid' }, booster: null, s2: { y: -0.75, radius: 0.42, propellant: 'solid' } },
    footprint: 3.35,
  })
}

// ---------------------------------------------------------------- Vulcan Centaur

function vulcan(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  // White booster with the red flame sweeping up from the base on one side.
  const body = skin({ base: '#e6e8eb', seams: [0.36, 0.4, 0.975], roughness: 0.45, extra: (ctx, w, h) => {
    ctx.fillStyle = '#b3261e'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x++) ctx.lineTo(x, h * (1 - 0.1 - 0.24 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * (x / w - 0.1)), 1.6)))
    ctx.lineTo(w, h)
    ctx.fill()
  } }, 512, 512)
  put(stage1, tube(R, R, L, 56), body)
  put(stage1, tube(R, R, spec.interstage.length, 56), k.white, 0, L)
  runUp(stage1, k.dark, R, 2.2, L * 0.03, L * 0.98, 0.4)
  put(stage1, tube(R * 0.98, R * 0.98, 0.5, 56), k.dark, 0, -0.5)
  const be4 = bell(0.95, 2.3, 24)
  for (const z of [-1.3, 1.3]) put(stage1, be4, k.bell, 0, -0.4, z)

  // Six GEM 63XL solids, three each side, their nose cones leaning in toward the booster.
  const B = spec.boosters!
  const noseLen = 2.9
  const caseLen = B.length - noseLen
  const motor = tube(B.radius, B.radius, caseLen, 24)
  const motorSkin = skin({ base: WHITE, seams: [0.05, 0.5, 0.93], bands: [[0, 0.03, '#2a2c30']] }, 32, 256)
  const nose = lean(lathe([[B.radius, 0], ...ogive(B.radius, noseLen)], 24), 0, -0.2)
  const srbBell = bell(0.62, 1.5, 16)
  for (let i = 0; i < B.count; i++) {
    const half = B.count / 2
    const g = strapOn(st, (i < half ? 0 : Math.PI) + ((i % half) - (half - 1) / 2) * 0.6, R + B.radius + 0.1, 0.6)
    put(g, motor, motorSkin)
    put(g, nose, k.white, 0, caseLen)
    put(g, srbBell, k.char, 0, 0.2)
  }

  // Centaur V: bare stainless steel, two RL10 engines tucked inside the interstage.
  put(upper, tube(R, R, spec.s2.length, 56), skin({ base: '#c6c9ce', seams: [0.05, 0.55, 0.95], roughness: 0.32, metalness: 0.85 }))
  const rl10 = bell(0.75, 2, 20)
  for (const x of [-1.05, 1.05]) put(upper, rl10, k.bell, x, -0.2)
  put(upper, new THREE.SphereGeometry(R * 0.9, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.35, 1), k.metal)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 8.6], ...ogive(R, F.length - 8.6, 8.6, 0.25)], whiteFairing([0.02, 0.55]))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, R * 0.92, R * 0.6)
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: { y: -2.7, radius: R * 0.75, propellant: 'methalox' }, booster: { y: -1.3, radius: 0.62, propellant: 'solid' }, s2: { y: -2.2, radius: 1.5, propellant: 'hydrolox' } },
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
  put(stage1, tube(R, R, L, 48), skin({ base: '#8a5a2c', seams: [0.05, 0.39, 0.955], frost: [[0.4, 0.95, 0.9]], roughness: 0.45, metalness: 0.55 }))
  put(stage1, lathe([[R, 0], [R, 1], [top, 2.9], [top, spec.interstage.length]], 48), k.white, 0, L)
  // The oxygen feed line runs down the outside of the kerosene tank to the engine.
  runUp(stage1, k.white, R, 0.45, 0.8, L * 0.41, 0.42, true)
  runUp(stage1, k.dark, R, 2.4, L * 0.03, L * 0.97, 0.3)
  // One RD-180: a single engine with two thrust chambers, so two bells.
  put(stage1, tube(1.15, R * 0.97, 0.9, 32), k.dark, 0, -0.9)
  const chamber = bell(0.72, 2.3, 22)
  for (const z of [-0.8, 0.8]) put(stage1, chamber, k.bell, 0, -0.7, z)

  // Centaur: foam-insulated tanks under a bare steel forward ring; one RL10 inside the interstage.
  put(upper, tube(top, top, spec.s2.length, 40), skin({ base: '#e6e1d4', bands: [[0.9, 1, '#b4b8be']], seams: [0.08, 0.55, 0.9], roughness: 0.75 }))
  put(upper, new THREE.SphereGeometry(top * 0.95, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.4, 1), k.metal)
  put(upper, bell(0.72, 1.9, 20), k.bell, 0, -0.5)

  // 4 m fairing: a boat-tail up from the Centaur, a barrel, then a cone with a rounded cap.
  const F = spec.fairing
  const fairing = fairingHalves(st, [[top, 0], [F.radius, 1], [F.radius, 7.2], [0.55, 11.3], ...dome(0.55, F.length - 11.3, 11.3)], whiteFairing([0.09, 0.6]))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, F.radius * 0.9, 1)
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: { y: -3, radius: 1.5, propellant: 'kerolox' }, booster: null, s2: { y: -2.4, radius: 0.72, propellant: 'hydrolox' } },
    footprint: F.radius,
  })
}

// ---------------------------------------------------------------- Delta IV Heavy

const DELTA_FOAM = { base: '#c4702b', grain: 1, roughness: 0.9 }

/** One common booster core: orange spray-on foam, a pale engine section, one RS-68A with its big ablative bell. */
function deltaCore(st: Stack, g: THREE.Object3D, nose: boolean): void {
  const { k, spec } = st
  const R = spec.s1.radius
  const L = spec.s1.length
  // From the bottom: engine section, hydrogen tank, the ribbed centerbody, oxygen tank.
  put(g, tube(R, R, L, 48), skin({ ...DELTA_FOAM, bands: [[0, 0.09, '#d6d1c4'], [0.6, 0.68, '#b3611f']], seams: [0.09, 0.6, 0.68, 0.985] }))
  runUp(g, paint(0x8f4f1a, 0.9), R, 0.5, L * 0.09, L * 0.97, 0.35)
  runUp(g, paint(0xa9601f, 0.9), R, -0.5, L * 0.1, L * 0.62, 0.4, true)
  put(g, tube(1.4, R * 0.96, 1, 32), k.dark, 0, -1)
  put(g, bell(1.2, 3.2, 24), k.char, 0, -0.6)
  const I = spec.interstage.length
  if (nose) put(g, lean(lathe([[R, 0], ...ogive(R, I)], 32), 0, -0.22), k.white, 0, L)
  else put(g, tube(R, R, I, 48), skin({ base: '#d6d1c4', seams: [0.05, 0.95], roughness: 0.6 }, 8, 64), 0, L)
}

function delta(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, upper } = st
  const R = spec.s1.radius
  deltaCore(st, st.stage1, false)
  for (const a of [0, Math.PI]) deltaCore(st, strapOn(st, a, 2 * R + 0.25), true)

  // The 5 m upper stage: only its foam-covered hydrogen tank shows; the oxygen tank and RL10 hang inside the interstage.
  put(upper, tube(R, R, spec.s2.length, 48), skin({ ...DELTA_FOAM, seams: [0.04, 0.96] }))
  put(upper, new THREE.SphereGeometry(1.6, 20, 12).scale(1, 0.6, 1), k.metal, 0, -0.5)
  put(upper, bell(1.05, 2.4, 22), k.bell, 0, -1.3)

  const F = spec.fairing
  const fairing = fairingHalves(st, [[R, 0], [R, 12.2], ...ogive(R, F.length - 12.2, 12.2, 0.2)], whiteFairing([0.02, 0.35]))
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + F.length, R * 0.92, R * 0.6)
  const rs68 = { y: -3.8, radius: 1.2, propellant: 'hydrolox' as const }
  return finish(st, {
    fairing, ...bay,
    nozzles: { s1: rs68, booster: rs68, s2: { y: -3.7, radius: 1.05, propellant: 'hydrolox' } },
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
  put(stage1, tube(R, R, L, 56), skin({ ...foam, bands: [[0.715, 0.82, '#b25c1c']], seams: [0.085, 0.715, 0.82, 0.95], extra: (ctx, w, h) => {
    ctx.fillStyle = 'rgba(60,25,5,0.35)'
    for (let i = 0; i < 64; i++) ctx.fillRect((i * w) / 64, h * 0.18, 2, h * 0.105)
  } }, 512, 1024))
  // The adapter cone that narrows to the upper stage is foam-covered too.
  put(stage1, lathe([[R, 0], [spec.interstage.topRadius, spec.interstage.length]], 56), skin({ ...foam, seams: [0.03, 0.97] }), 0, L)
  // Two oxygen feed lines and the systems tunnel run down the hydrogen tank.
  const plainFoam = paint(0xa85618, 0.88)
  for (const a of [0.42, 0.42 + Math.PI]) runUp(stage1, plainFoam, R, a, L * 0.07, L * 0.73, 0.6, true)
  runUp(stage1, plainFoam, R, -0.5, L * 0.09, L * 0.97, 0.7)
  put(stage1, tube(R * 0.94, R, 1, 56), k.white, 0, -1)
  ring(stage1, bell(1.15, 3.1, 24), k.bell, 4, 2.2, -0.9, Math.PI / 4)

  // Five-segment solid boosters: flared aft skirt, segment joints, a cone-tipped nose.
  const B = spec.boosters!
  const r = B.radius
  const srb = lathe([[r * 1.43, 0], [r, 2.7], [r, 46.6], [r, 48.4], [0.3, B.length - 0.5], ...dome(0.3, 0.5, B.length - 0.5)], 32)
  const srbSkin = skin({ base: WHITE, seams: [0.05, 0.085, 0.24, 0.4, 0.56, 0.72, 0.862, 0.895], bands: [[0.085, 0.092, '#2a2c30'], [0.862, 0.868, '#2a2c30']], roughness: 0.5 }, 64, 1024)
  const srbBell = bell(1.9, 3.2, 24)
  for (const a of [0, Math.PI]) {
    const g = strapOn(st, a, R + r + 0.25, -3.2)
    put(g, srb, srbSkin)
    put(g, srbBell, k.char, 0, 0.6)
    // Attach struts to the core, bottom and top.
    for (const y of [5.6, 46]) put(g, new THREE.BoxGeometry(0.9, 0.5, 0.5), k.metal, -(r + 0.1), y)
  }

  // ICPS: the hydrogen tank shows above the cone; the oxygen tank and the RL10 hang down inside it.
  const icps = 4.5
  put(upper, tube(spec.s2.radius, spec.s2.radius, icps, 48), skin({ base: WHITE, seams: [0.06, 0.94], roughness: 0.5 }, 8, 64))
  put(upper, new THREE.SphereGeometry(1.6, 20, 12).scale(1, 0.65, 1), k.metal, 0, -1.2)
  put(upper, bell(1.07, 2.4, 22), k.bell, 0, -2.2)
  // Orion stage adapter ring, where Artemis I carried its CubeSats.
  put(upper, tube(spec.s2.radius, spec.s2.radius, spec.s2.length - icps, 48), skin({ base: '#dfe1e4', seams: [0.1, 0.9] }, 8, 32), 0, icps)

  // Orion's place: panels round the service module that split away, and the launch abort system
  // (the ogive cover and its tower of solid motors) that pulls off forward.
  const F = spec.fairing
  const panels = 4.8
  const fairing = fairingHalves(st, [[F.radius, 0], [F.radius * 1.03, 0.5], [F.radius * 1.03, panels]], whiteFairing([0.1]))
  const escape = new THREE.Group()
  escape.position.y = spec.s2.length + panels
  const coverTop = 5.6
  const cover: Profile = [[F.radius * 1.03, 0]]
  for (let i = 0; i <= 8; i++) cover.push([0.46 + (F.radius * 1.03 - 0.46) * Math.cos((i / 8) * (Math.PI / 2)), 0.5 + (i / 8) * (coverTop - 0.5)])
  put(escape, lathe(cover, 40), skin({ base: WHITE, seams: [0.09], shell: true, roughness: 0.42 }))
  const towerTop = F.length - panels
  put(escape, lathe([[0.46, coverTop], [0.46, towerTop - 2.6], [0.38, towerTop - 2.4], [0.38, towerTop - 1.2], ...ogive(0.38, 1.2, towerTop - 1.2)], 20), k.white)
  // Abort motor: four nozzles that point back down the tower.
  ring(escape, bell(0.22, 0.6, 10).rotateX(-0.45), k.dark, 4, 0.5, coverTop + 4.6, Math.PI / 4)
  put(escape, tube(0.52, 0.52, 0.5, 20), k.dark, 0, coverTop + 4.5)
  upper.add(escape)
  const bay = payloadBay(st, spec.s2.length, spec.s2.length + panels + coverTop, F.radius * 0.92, 2)
  return finish(st, {
    fairing, escape, ...bay,
    nozzles: { s1: { y: -4, radius: R * 0.7, propellant: 'hydrolox' }, booster: { y: -2.6, radius: 1.9, propellant: 'solid' }, s2: { y: -4.6, radius: 1.07, propellant: 'hydrolox' } },
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
