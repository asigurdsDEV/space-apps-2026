// An F-22 Raptor and an AIM-120 missile in geometry, true size in metres, for the sandbox's fictional interception
// film. The Raptor's stealth shape: a chined, faceted fuselage lofted from cross-sections, a gold-tinted bubble canopy,
// diamond wings (leading edge swept 42°, trailing edge swept forward 17°), stabilators, twin tails canted out 28°,
// box intakes beside the cockpit and flat two-dimensional nozzles. Two-tone grey paint.
// Nose along +z, up +y, right +x; the origin is the middle of the aircraft.
import * as THREE from 'three'

export const RAPTOR_LENGTH = 18.9

export interface Raptor {
  root: THREE.Group
  /** Where the missile hangs before it drops, in the aircraft's frame. */
  bay: THREE.Vector3
  /** The engines' glow: scale and opacity follow the throttle. */
  flames: THREE.Mesh[]
}

/** One cross-section of the fuselage: `w` half width at the chine, `top` and `bottom` heights from it. */
interface Section { z: number; w: number; top: number; bottom: number }

// The fuselage from nose to tail: a sharp chined nose, widening at the intakes, flat and wide over the wings, and
// narrowing to the engines.
const FUSELAGE: Section[] = [
  { z: 9.45, w: 0.02, top: 0.02, bottom: 0.02 },
  { z: 8.4, w: 0.34, top: 0.26, bottom: 0.2 },
  { z: 6.8, w: 0.62, top: 0.48, bottom: 0.38 },
  { z: 5.0, w: 0.86, top: 0.62, bottom: 0.5 },
  { z: 3.2, w: 1.4, top: 0.7, bottom: 0.58 },
  { z: 1.0, w: 2.05, top: 0.68, bottom: 0.62 },
  { z: -2.0, w: 2.2, top: 0.62, bottom: 0.58 },
  { z: -5.2, w: 2.0, top: 0.56, bottom: 0.5 },
  { z: -7.6, w: 1.72, top: 0.5, bottom: 0.42 },
  { z: -9.0, w: 1.55, top: 0.44, bottom: 0.36 },
]

/** The section's outline, right half then left, counter-clockwise seen from the nose: a ridge on top, chines at the sides. */
function outline(s: Section): [number, number][] {
  const right: [number, number][] = [[0, s.top], [s.w * 0.45, s.top * 0.92], [s.w * 0.86, s.top * 0.35], [s.w, 0], [s.w * 0.8, -s.bottom * 0.55], [s.w * 0.4, -s.bottom * 0.95], [0, -s.bottom]]
  const left = right.slice(1, -1).reverse().map(([x, y]): [number, number] => [-x, y])
  return [...right, ...left]
}

/** Lofts the sections into one closed, flat-shaded skin: the facets catch the light the way stealth panels do. */
function loft(sections: Section[]): THREE.BufferGeometry {
  const rings = sections.map(outline)
  const n = rings[0]!.length
  const pos: number[] = []
  const quad = (a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, c: THREE.Vector3Tuple, d: THREE.Vector3Tuple) => pos.push(...a, ...b, ...c, ...a, ...c, ...d)
  for (let i = 0; i + 1 < sections.length; i++) {
    const [s0, s1] = [sections[i]!, sections[i + 1]!]
    for (let k = 0; k < n; k++) {
      const [a, b] = [rings[i]![k]!, rings[i]![(k + 1) % n]!]
      const [c, d] = [rings[i + 1]![(k + 1) % n]!, rings[i + 1]![k]!]
      quad([a[0], a[1], s0.z], [d[0], d[1], s1.z], [c[0], c[1], s1.z], [b[0], b[1], s0.z])
    }
  }
  // Close the tail with a flat plate.
  const last = rings.at(-1)!
  const z = sections.at(-1)!.z
  for (let k = 1; k + 1 < n; k++) pos.push(last[0]![0], last[0]![1], z, last[k + 1]![0], last[k + 1]![1], z, last[k]![0], last[k]![1], z)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}

/** A flat, slightly bevelled plate with this outline in the x-z plane (x right, z forward), `thick` metres. */
function plate(points: [number, number][], thick: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.4, bevelSize: thick * 0.5, bevelSegments: 1 })
  // Extruded along +z; turn it so the outline lies flat and the thickness is up-down, centred.
  return geo.rotateX(Math.PI / 2).translate(0, thick / 2, 0)
}

// Double-sided: the lofted skin's winding is not checked face by face.
const paint = (color: number, roughness = 0.6) => new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness, flatShading: true, side: THREE.DoubleSide })

export function buildRaptor(): Raptor {
  const root = new THREE.Group()
  root.name = 'raptor'
  const skin = paint(0x939ba4)
  const dark = paint(0x6f7780)
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.8, roughness: 0.35 })
  const black = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.9 })
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    root.add(mesh)
    return mesh
  }

  add(loft(FUSELAGE), skin)
  // The canopy: one gold-tinted bubble with no frame, as on the real aircraft.
  const glass = new THREE.MeshStandardMaterial({ color: 0x6b5222, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.6 })
  add(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.5, 0.5, 2.3), glass, 0, 0.5, 5.3)
  for (const side of [1, -1]) {
    // Wing, stabilator and tail, mirrored. Outlines are [x, z] in metres.
    add(plate([[1.6, 2.6], [6.78, -2.15], [6.78, -3.5], [1.6, -5.1]].map(([x, z]) => [side * x!, z!] as [number, number]), 0.16), skin, 0, -0.02)
    add(plate([[1.5, -5.6], [4.45, -8.1], [4.45, -9.1], [1.5, -9.5]].map(([x, z]) => [side * x!, z!] as [number, number]), 0.1), dark, 0, -0.05)
    const fin = add(plate([[0, -4.7], [2.7, -7.3], [2.7, -8.35], [0, -8.9]], 0.1), dark)
    // The tail's outline was drawn flat: stand it up, then cant it 28° outward.
    fin.geometry.rotateZ(Math.PI / 2)
    fin.rotation.z = -side * 0.49
    fin.position.set(side * 1.45, 0.4, 0)
    // Box intake beside the cockpit, its mouth raked back, dark inside.
    const intake = add(new THREE.BoxGeometry(0.85, 0.95, 3.6), skin, side * 1.7, -0.08, 1.4)
    intake.rotation.y = side * 0.06
    add(new THREE.PlaneGeometry(0.7, 0.8), black, side * 1.73, -0.08, 3.21)
    // Flat two-dimensional nozzle.
    add(new THREE.BoxGeometry(0.95, 0.62, 1.2), metal, side * 0.62, 0, -9.3)
    add(new THREE.PlaneGeometry(0.78, 0.44), black, side * 0.62, 0, -9.905).rotateY(Math.PI)
  }
  // The engines' glow at military power: a short orange-blue core, faint in daylight.
  const flames: THREE.Mesh[] = []
  for (const side of [1, -1]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 3.2, 12, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -1.6),
      new THREE.MeshBasicMaterial({ color: 0xffa04a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    )
    flame.position.set(side * 0.62, 0, -9.9)
    flame.scale.set(1.2, 0.8, 1)
    root.add(flame)
    flames.push(flame)
  }
  // Navigation lights: red left, green right.
  for (const [x, color] of [[-6.8, 0xff2a20], [6.8, 0x22ff66]] as const)
    add(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false }), x, 0.05, -2.9)
  return { root, bay: new THREE.Vector3(0.9, -0.75, -0.5), flames }
}

/** An AIM-120: a slim white body with a grey radome, mid-body wings and tail fins in a cross. Nose along +z. */
export function buildMissile(): THREE.Group {
  const root = new THREE.Group()
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.45 })
  const grey = new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.5 })
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.089, 0.089, 3.0, 16).rotateX(Math.PI / 2), white)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.089, 0.6, 16).rotateX(Math.PI / 2).translate(0, 0, 1.8), grey)
  root.add(body, nose)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4
    for (const [z, span, chord] of [[0.25, 0.22, 0.5], [-1.35, 0.28, 0.32]] as const) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, span, chord), grey)
      fin.position.set(Math.cos(a) * (0.089 + span / 2), Math.sin(a) * (0.089 + span / 2), z)
      fin.rotation.z = a - Math.PI / 2
      root.add(fin)
    }
  }
  return root
}

export interface Ribbon {
  mesh: THREE.Mesh
  begin(): void
  /** The next point along the trail, newest first: its place, width and opacity. */
  add(at: THREE.Vector3, width: number, alpha: number): void
  /** Turns the strip to face the camera at `eye` and uploads it. */
  commit(eye: THREE.Vector3): void
}

/**
 * A smoke trail as one continuous strip that always faces the camera, soft at its edges. For something as fast as a
 * missile, puffs would sit tens of metres apart; a strip through the same points reads as one unbroken trail.
 */
export function makeRibbon(capacity: number): Ribbon {
  const pos = new Float32Array(capacity * 2 * 3)
  const edge = new Float32Array(capacity * 2)
  const alpha = new Float32Array(capacity * 2)
  const index: number[] = []
  for (let i = 0; i + 1 < capacity; i++) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2)
  for (let i = 0; i < capacity; i++) edge.set([-1, 1], 2 * i)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1))
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage))
  geo.setIndex(index)
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
attribute float aEdge;
attribute float aAlpha;
varying float vEdge;
varying float vAlpha;
void main() {
  vEdge = aEdge;
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: /* glsl */ `
varying float vEdge;
varying float vAlpha;
void main() {
  float a = vAlpha * (1.0 - vEdge * vEdge);
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.95, 0.93, 0.9) * (0.85 + 0.15 * (1.0 - abs(vEdge))), a);
}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }))
  mesh.frustumCulled = false
  mesh.renderOrder = 5
  const pts: THREE.Vector3[] = Array.from({ length: capacity }, () => new THREE.Vector3())
  const widths = new Float32Array(capacity)
  const alphas = new Float32Array(capacity)
  const side = new THREE.Vector3()
  const along = new THREE.Vector3()
  const look = new THREE.Vector3()
  let n = 0
  return {
    mesh,
    begin() { n = 0 },
    add(at, width, a) {
      if (n >= capacity) return
      pts[n]!.copy(at)
      widths[n] = width
      alphas[n] = a
      n++
    },
    commit(eye) {
      for (let i = 0; i < n; i++) {
        along.subVectors(pts[Math.min(i + 1, n - 1)]!, pts[Math.max(i - 1, 0)]!)
        side.crossVectors(along, look.subVectors(eye, pts[i]!)).normalize().multiplyScalar(widths[i]! / 2)
        pos.set([pts[i]!.x - side.x, pts[i]!.y - side.y, pts[i]!.z - side.z, pts[i]!.x + side.x, pts[i]!.y + side.y, pts[i]!.z + side.z], 6 * i)
        alpha[2 * i] = alpha[2 * i + 1] = alphas[i]!
      }
      geo.setDrawRange(0, Math.max(0, n - 1) * 6)
      geo.attributes.position!.needsUpdate = true
      geo.attributes.aAlpha!.needsUpdate = true
      mesh.visible = n > 1
    },
  }
}
