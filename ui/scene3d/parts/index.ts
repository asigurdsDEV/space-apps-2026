// Builds one catalog part as a tagged group, already placed on its mount in craft axes
// (+y zenith, +z Sun side, wings along x, instruments look down). craft.ts adds the bus and normalizes.
import * as THREE from 'three'
import { num } from '../model'
import { buildComms } from './comms'
import * as inst from './instruments'
import { aim, partGroup } from './kit'
import { instrumentSize, wingShape, type CraftLayout, type Mount } from './layout'
import { buildBattery, buildBodyCells, buildPowerBox, buildRtg, buildWings } from './power'
import { INSTRUMENT } from './references'

export { buildBus } from './bus'
export { mats, meshes, triangles } from './kit'
export * from './layout'
export { REFERENCES, referenceFor } from './references'

const BOOM_DIR = new THREE.Vector3(0.5, 0, -0.87)

function buildInstrument(m: Mount, [bx, by, bz]: [number, number, number]): THREE.Group {
  const g = partGroup('instrument', m.id)
  const s = Math.max(bx, by, bz)
  const mass = Math.max(num(m.entity.props.mass_kg, 2), 0.05)
  const L = m.at?.size ?? instrumentSize(m.entity)
  switch (m.key) {
    case 'camera': inst.camera(g, L); break
    case 'multispectral': inst.multispectral(g, L); break
    case 'weather-imager': inst.weatherImager(g, L); break
    case 'spectrometer': inst.spectrometer(g, L); break
    case 'sounder': inst.sounder(g, L); break
    case 'altimeter': inst.altimeter(g, L); break
    case 'particles': inst.particles(g, Math.min(L, 0.7 * bx, 0.38 * by)); break
    case 'magnetometer': inst.magnetometer(g, Math.min(Math.max(1.6 * s, 0.5), 6)); break
    // SHARAD is 10 m for 15 kg; NISAR's reflector is 12 m. shortcut: both are drawn smaller on a bus they would dwarf.
    case 'dipole-radar': inst.dipoleRadar(g, Math.min(INSTRUMENT.sharad.length * Math.cbrt(mass / INSTRUMENT.sharad.mass_kg), 3 * s), s); break
    case 'sar': inst.sar(g, Math.min(INSTRUMENT.nisar.reflector, 2.6 * s), s); break
    // 0.11 x cbrt(150 kg) is GALEX's 58 cm tube.
    case 'telescope': inst.telescope(g, Math.min(0.11 * Math.cbrt(mass), 0.5 * Math.min(bx, by))); break
    default: inst.generic(g, L)
  }
  return g
}

/** One part on its mount. Unknown keys fall back to the generic model of their family. */
export function buildPart(m: Mount, bus: CraftLayout['bus']): THREE.Group {
  const [bx, by, bz] = bus.size
  let g: THREE.Group
  if (m.key === 'wings') g = buildWings(m.id, wingShape(num(m.entity.props.power_w, 20), bus.size), bus.size)
  else if (m.key === 'body-cells') g = buildBodyCells(m.id, m.entity, bus)
  else if (m.key === 'rtg') g = buildRtg(m.id, m.entity)
  else if (m.key === 'battery') g = buildBattery(m.id, m.entity, 0.8 * bx, 0.42 * by)
  else if (m.key === 'power-box') g = buildPowerBox(m.id, m.entity, 0.8 * bx, 0.42 * by)
  else if (m.part === 'comms') g = buildComms(m, bus.size)
  else g = buildInstrument(m, bus.size)

  switch (m.slot) {
    case 'zenith': g.position.set(0, by / 2, 0); break
    case 'nadir': g.position.set(m.at?.x ?? 0, -by / 2, m.at?.z ?? 0); g.rotation.x = Math.PI; break
    case 'sun-low': g.position.set(0, -0.24 * by, bz / 2); g.rotation.x = Math.PI / 2; break
    case 'sun-high': g.position.set(0, 0.26 * by, bz / 2); g.rotation.x = Math.PI / 2; break
    // The upper half of the anti-Sun face: the engines have the lower half.
    case 'anti-sun': g.position.set(0, 0.2 * by, -bz / 2); g.rotation.x = -Math.PI / 2; break
    case 'corner-boom': aim(g, BOOM_DIR).position.set(0.4 * bx, 0.42 * by, -bz / 2); break
    case 'edge-x-plus': g.position.set(bx / 2, -by / 2, 0); break
    case 'edge-x-minus': g.position.set(-bx / 2, -by / 2, 0); break
    case 'x-faces': if (m.key === 'rtg') { g.position.set(-bx / 2, 0, 0); g.rotation.z = Math.PI / 2 } break
    case 'skin': break
  }
  return g
}
