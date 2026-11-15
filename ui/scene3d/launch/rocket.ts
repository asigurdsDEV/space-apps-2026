// Builds a launch vehicle from a RocketSpec, in meters. Origin: centre of the first stage's base, +y up the stack.
// The pieces that come off in flight (boosters, first stage, fairing halves) are separate groups the scene moves.
// Real rockets are in fleet.ts; an id nobody has modelled gets the plain rocket below.
import { FLEET } from './fleet'
import { cluster, engines, ogive, put, ring, skin, tube, type Profile } from './kit'
import { fairingHalves, finish, newStack, payloadBay, strapOn, type RocketModel } from './stack'
import type { RocketSpec } from './vehicles'

export type { Nozzle, RocketModel } from './stack'

/** A plain two-stage rocket in grey with dark bands, sized by the spec; two strap-ons when the spec has them. */
function generic(spec: RocketSpec): RocketModel {
  const st = newStack(spec)
  const { k, stage1, upper } = st
  const { s1, s2, interstage, fairing: F } = spec
  const R = s1.radius
  const grey = '#d4d7dc'
  const band = '#3b4350'
  const round = Math.PI * 2 * R
  put(stage1, tube(R, R, s1.length, 40), skin({ base: grey, bands: [[0, 0.1, band], [0.9, 1, band]], seams: [0.1, 0.45, 0.9], panels: 3 }, round, s1.length, st.px))
  put(stage1, tube(R, interstage.topRadius, interstage.length, 40), skin({ base: band, rivets: [0.05, 0.95] }, round, interstage.length, st.px), 0, s1.length)
  ring(stage1, tube(R * 0.1, R * 0.1, s1.length * 0.9, 4), k.dark, 1, R, s1.length * 0.05)
  put(stage1, tube(R * 0.98, R * 0.98, R * 0.3, 40), k.dark, 0, -R * 0.3)
  const n = s1.engines
  const exit = n > 1 ? R * 0.3 : R * 0.5
  const spots = n > 1 ? cluster(n > 4 ? n - 1 : n, R * 0.62, 0, n > 4) : cluster(0, 0, 0, true)
  engines(stage1, k, st.heat.s1, spots, exit, R * 0.8, -R * 0.25)

  const B = spec.boosters
  if (B) {
    const body = tube(B.radius, B.radius, B.length * 0.84, 24)
    const nose = tube(B.radius, 0.01, B.length * 0.16, 24)
    for (let i = 0; i < B.count; i++) {
      const g = strapOn(st, (i / B.count) * Math.PI * 2, R + B.radius * 1.08)
      put(g, body, k.white)
      put(g, nose, k.dark, 0, B.length * 0.84)
      engines(g, k, st.heat.booster, [[0, 0]], B.radius * 0.72, B.radius * 1.3, B.radius * 0.2, { mat: k.char })
    }
  }

  put(upper, tube(s2.radius, s2.radius, s2.length, 40), skin({ base: grey, seams: [0.05, 0.95] }, Math.PI * 2 * s2.radius, s2.length, st.px))
  const vac = Math.min(s2.radius * 0.62, interstage.topRadius * 0.8)
  // Room above the throat for the engine's pumps, and the bell still ends inside the interstage.
  const head = Math.min(vac, 0.8) * 0.9
  const vacLen = Math.min(vac * 2, interstage.length * 0.85 - head)
  engines(upper, k, st.heat.s2, [[0, 0]], vac, vacLen, -head, { vac: true })
  const flare = F.radius > s2.radius * 1.05 ? F.length * 0.1 : 0
  const barrel = F.length - Math.min(F.length * 0.5, F.radius * 3.2)
  const profile: Profile = [[s2.radius, 0], ...(flare ? [[F.radius, flare] as [number, number]] : []), [F.radius, barrel], ...ogive(F.radius, F.length - barrel, barrel)]
  const fairing = fairingHalves(st, profile, skin({ base: grey, seams: [0.04], shell: true }, Math.PI * F.radius, F.length, st.px))
  const bay = payloadBay(st, s2.length, s2.length + F.length, F.radius * 0.92, s2.radius * 0.8)
  return finish(st, {
    fairing, ...bay,
    nozzles: {
      s1: { y: -R * 1.05, radius: n > 1 ? R * 0.85 : R * 0.5, propellant: s1.propellant, engines: spots, exit },
      booster: B ? { y: -B.radius * 1.1, radius: B.radius * 0.72, propellant: 'solid', engines: [[0, 0]], exit: B.radius * 0.72 } : null,
      s2: { y: -head - vacLen, radius: vac, propellant: s2.propellant, engines: [[0, 0]], exit: vac },
    },
    footprint: B ? R + B.radius * 2.3 : Math.max(R, F.radius),
  })
}

export function buildRocket(spec: RocketSpec): RocketModel {
  return (FLEET[spec.model] ?? generic)(spec)
}
