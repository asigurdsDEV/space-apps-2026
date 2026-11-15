// Pure: where things stand at the launch site. The pad sits on a sand spit: open sea to the north (behind it, as the
// camera looks) and to the east, an inlet to the south (in front of the camera), land and the crawlerway to the west.
// Meters; +x is east (downrange), -z is north. The site is laid out in units of `u`, the apron's half-width, so every
// rocket gets the same picture at its own scale. Only the far assembly complex is a fixed real-world distance away.

/** The site's unit: half the width of the concrete apron. */
export const siteUnit = (height: number) => Math.max(20, height * 0.9)

/**
 * How far past the waterline a point is: above 0 in water, below 0 on land. The ground shader adds a wobble to this
 * (see `shoreWobble`); COAST_GLSL is the same formula for the shader, so change both together.
 */
export function waterDepth(x: number, z: number, u: number): number {
  const north = -z - 2.4 * u
  // West of the pad the land runs on north as a headland; its shore leans 3:1, so divide to keep meters.
  const sea = Math.max(Math.min(north, (north + 3 * (x + 4 * u)) / 3.162), x - 9 * u)
  const inlet = 1.6 * u - Math.abs(z - (2.55 * u - 0.3 * u * Math.sin(x / (5 * u))))
  return Math.max(sea, inlet)
}

/** `float coast(vec2 p, float u)`: waterDepth for the shader (p = world xz). */
export const COAST_GLSL = /* glsl */ `
float coast(vec2 p, float u) {
  float north = -p.y - 2.4 * u;
  float sea = max(min(north, (north + 3.0 * (p.x + 4.0 * u)) / 3.162), p.x - 9.0 * u);
  float inlet = 1.6 * u - abs(p.y - (2.55 * u - 0.3 * u * sin(p.x / (5.0 * u))));
  return max(sea, inlet);
}
`

const ramp = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/** The most the shader's noise can move the waterline at a point: small at the pad, large far away where the coast wanders. */
export function shoreWobble(x: number, z: number, u: number): number {
  const r = Math.hypot(x, z)
  return 0.15 * u + 250 * ramp(600, 3000, r) + 1250 * ramp(1500, 9000, r)
}

/** Centre of the far assembly complex: 4.5 km from the pad, 33 degrees west of north, at the end of the crawlerway. */
export const ASSEMBLY: readonly [x: number, z: number] = [-2450, -3775]
/** Where the crawlerway leaves its straight run west of the pad and turns for the assembly building, in units. */
export const CRAWLER_TURN = 6

export interface SiteLayout {
  unit: number
  /** Half-width of the launch mount. */
  mount: number
  /** Three lightning masts, and where their down-wires are anchored. */
  masts: [x: number, z: number][]
  anchors: [x: number, z: number, mast: number][]
  waterTower: [x: number, z: number]
  /** Propellant spheres: hydrogen (the big one) and oxygen. */
  spheres: [x: number, z: number, radius: number][]
  /** Low support buildings by the crawlerway: centre, then width, height and depth. */
  sheds: [x: number, z: number, w: number, h: number, d: number][]
}

export function siteLayout(height: number, footprint: number): SiteLayout {
  const unit = siteUnit(height)
  const mount = Math.max(footprint * 1.5, height * 0.06)
  const ring = Math.max(mount * 3.2, height * 0.55)
  // Angles chosen so no mast stands between the camera and the rocket or the tower in the pad shots.
  const angles = [2.5, 4.9, 0.5]
  const masts = angles.map((a): [number, number] => [Math.cos(a) * ring, Math.sin(a) * ring])
  const anchors: [number, number, number][] = []
  // Down-wires run to a ground anchor between two masts, a little outside them. Only behind the pad: in front they
  // would cross the camera's view of the rocket, and the water is in the way.
  for (const i of [0, 1]) {
    const mid = (angles[i]! + angles[i + 1]! + (i === 1 ? Math.PI * 2 : 0)) / 2
    anchors.push([Math.cos(mid) * ring * 1.3, Math.sin(mid) * ring * 1.3, i], [Math.cos(mid) * ring * 1.3, Math.sin(mid) * ring * 1.3, i + 1])
  }
  const tank = Math.max(height * 0.075, 2)
  return {
    unit, mount, masts, anchors,
    waterTower: [ring * 0.95, -ring * 1.25],
    spheres: [[-ring * 1.55, -ring * 0.85, tank], [ring * 1.6, -ring * 0.45, tank * 0.72]],
    sheds: [
      // North of the line the tower's long dawn shadow falls along.
      [-unit * 2.7, -unit * 1.9, height * 0.5, height * 0.13, height * 0.26],
      [-unit * 1.95, -unit * 1.45, height * 0.22, height * 0.08, height * 0.16],
      [-unit * 3.5, -unit * 0.75, height * 0.3, height * 0.1, height * 0.18],
    ],
  }
}
