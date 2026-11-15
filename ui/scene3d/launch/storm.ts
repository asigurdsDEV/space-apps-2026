// The sandbox's thunderstorm launch: a low, dark sky of rolling cloud, heavy rain around the camera, lightning
// flickering through the clouds and down to the ground, and the one huge bolt that hits the climbing rocket.
// The scene owns the clock; this draws what the storm looks like at a moment.
import * as THREE from 'three'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { NOISE2 } from './fx'
import { makeRibbon, type Ribbon } from './raptor'
import { STORM } from './timeline'

const hash = (i: number) => {
  const s = Math.sin(i * 78.233 + 12.9898) * 43758.5453
  return s - Math.floor(s)
}

/** How bright a lightning flash is `s` seconds after it starts: a first stroke, a flicker, a restrike, then gone. */
export function flashLevel(s: number): number {
  if (s < 0 || s > 0.55) return 0
  if (s < 0.05) return 1
  if (s < 0.1) return 0.2
  if (s < 0.17) return 0.85
  if (s < 0.24) return 0.15
  return 0.55 * Math.exp(-(s - 0.24) * 9)
}

/** The whole picture under a storm: darker, greyer and cooler; a flash lights all of it up blue-white for an instant. */
export function makeStormGrade(): ShaderPass {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uStorm: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uStorm;
uniform float uFlash;
varying vec2 vUv;
void main() {
  vec4 src = texture2D(tDiffuse, vUv);
  vec3 c = src.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 storm = mix(vec3(l), c, 0.3) * vec3(0.8, 0.86, 0.97) * 0.36;
  // Fire and lightning glow through the gloom: the brightest colours keep their own.
  c = mix(c, storm, uStorm * (1.0 - smoothstep(0.5, 1.6, max(c.r, max(c.g, c.b)))));
  c += uFlash * (0.12 + 0.9 * c) * vec3(0.82, 0.88, 1.0);
  gl_FragColor = vec4(c, src.a);
}`,
  })
}

export interface Storm {
  group: THREE.Group
  /** The grade pass; the scene adds it after the render pass. */
  grade: ShaderPass
  /**
   * The storm at screen time `t`: `strikeAt` is when the bolt hits the rocket (Infinity for none), `nose` and `tail`
   * where the rocket is then. Returns how brightly lightning lights the scene now, for the scene's own lights.
   */
  update(t: number, camera: THREE.Camera, strikeAt: number, nose: THREE.Vector3, tail: THREE.Vector3): number
}

/** Jagged lightning from `from` to `to` by midpoint displacement, `depth` halvings, into `out`. */
function bolt(from: THREE.Vector3, to: THREE.Vector3, seed: number, depth: number, out: THREE.Vector3[]): THREE.Vector3[] {
  let pts = [from.clone(), to.clone()]
  let rough = from.distanceTo(to) * 0.16
  for (let d = 0; d < depth; d++) {
    const next: THREE.Vector3[] = []
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i]!, pts[i + 1]!]
      const k = seed * 31 + d * 7 + i
      next.push(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(hash(k) - 0.5, (hash(k + 0.3) - 0.5) * 0.4, hash(k + 0.7) - 0.5).multiplyScalar(2 * rough)))
    }
    next.push(pts.at(-1)!)
    pts = next
    rough *= 0.55
  }
  out.length = 0
  out.push(...pts)
  return out
}

interface Stroke { main: THREE.Vector3[]; branches: THREE.Vector3[][]; width: number }

function stroke(from: THREE.Vector3, to: THREE.Vector3, seed: number, width: number): Stroke {
  const main = bolt(from, to, seed, 6, [])
  // Two forks leave the channel partway down and die out short of the ground.
  const branches = [0.25, 0.5].map((at, i) => {
    const start = main[Math.floor(at * (main.length - 1))]!
    const end = start.clone().add(new THREE.Vector3((hash(seed + i) - 0.5) * 0.6, -0.45, (hash(seed + i + 0.5) - 0.5) * 0.6).multiplyScalar(from.distanceTo(to) * 0.4))
    return bolt(start, end, seed * 3 + i + 1, 5, [])
  })
  return { main, branches, width }
}

export function makeStorm(): Storm {
  const group = new THREE.Group()
  const grade = makeStormGrade()

  // ---- Overcast: a dark, rolling cloud base over everything; lit from within where the lightning is.
  const flashDir = new THREE.Vector3(0, 1, 0)
  const domeU = { uTime: { value: 0 }, uFlash: { value: 0 }, uFlashDir: { value: flashDir } }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: domeU,
      vertexShader: /* glsl */ `
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
uniform float uTime;
uniform float uFlash;
uniform vec3 uFlashDir;
varying vec3 vDir;
${NOISE2}
void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.0);
  // The cloud base seen in perspective: big billows overhead, flattening into the distance.
  vec2 p = d.xz / (up + 0.12) * 1.4 + vec2(uTime * 0.03, uTime * 0.012);
  float n = fbm2(p);
  float m = fbm2(p * 3.1 + 4.0);
  vec3 base = mix(vec3(0.24, 0.26, 0.3), vec3(0.07, 0.08, 0.1), smoothstep(0.0, 0.5, up));
  vec3 col = base * (0.65 + 0.7 * n) * (0.85 + 0.3 * m);
  // Rain shafts hanging under the clouds near the horizon.
  col = mix(col, vec3(0.3, 0.32, 0.36), smoothstep(0.12, 0.0, up) * 0.6 * smoothstep(0.35, 0.7, noise2(vec2(atan(d.z, d.x) * 9.0, 0.0))));
  float lit = pow(max(dot(d, uFlashDir), 0.0), 6.0);
  col += uFlash * vec3(0.75, 0.8, 1.0) * (0.25 + 2.5 * lit) * (0.5 + n);
  gl_FragColor = vec4(col, 1.0);
}`,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  )
  dome.renderOrder = -9
  dome.frustumCulled = false
  dome.scale.setScalar(900)

  // ---- Rain: streaks in a box that travels with the camera, each one fixed in the air as it falls past.
  const N = 7000
  const seed = new Float32Array(N * 2 * 3)
  const end = new Float32Array(N * 2)
  for (let i = 0; i < N; i++) {
    const s = [hash(i), hash(i + 0.31), hash(i + 0.67)]
    seed.set([...s, ...s], i * 6)
    end.set([0, 1], i * 2)
  }
  const rainGeo = new THREE.BufferGeometry()
  rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3))
  rainGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
  rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
  const rainU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFlash: { value: 0 } }
  const rain = new THREE.LineSegments(rainGeo, new THREE.ShaderMaterial({
    uniforms: rainU,
    vertexShader: /* glsl */ `
uniform float uTime;
uniform vec3 uCam;
attribute vec3 aSeed;
attribute float aEnd;
varying float vFade;
const vec3 BOX = vec3(70.0, 50.0, 70.0);
const vec3 FALL = vec3(4.0, -32.0, 2.0);
void main() {
  vec3 p = aSeed * BOX + FALL * uTime;
  p = mod(p - uCam + BOX * 0.5, BOX) + uCam - BOX * 0.5;
  p += normalize(FALL) * 2.4 * aEnd;
  vFade = 1.0 - smoothstep(14.0, 34.0, length(p - uCam));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: /* glsl */ `
uniform float uFlash;
varying float vFade;
void main() { gl_FragColor = vec4(vec3(0.62, 0.66, 0.72) * (1.0 + 2.0 * uFlash), 0.42 * vFade); }`,
    transparent: true,
    depthWrite: false,
  }))
  rain.frustumCulled = false
  rain.renderOrder = 7

  // ---- Lightning: bolts in the distance, and the one on the rocket. Each is a main channel and two forks.
  const BLUE = new THREE.Color(4.5, 5.2, 7.5)
  const far = [makeRibbon(80, BLUE), makeRibbon(40, BLUE), makeRibbon(40, BLUE)]
  const near = [makeRibbon(80, BLUE), makeRibbon(40, BLUE), makeRibbon(40, BLUE), makeRibbon(80, BLUE)]
  group.add(dome, rain, ...far.map((r) => r.mesh), ...near.map((r) => r.mesh))
  // Six spots on a ring around the pad, 2 to 4 km out; each flash uses the one most in view.
  const spots = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.4
    const r = 2200 + 1800 * hash(i + 5)
    return stroke(new THREE.Vector3(Math.cos(a) * r, 1700, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r + 300 * (hash(i) - 0.5), 0, Math.sin(a) * r + 300 * (hash(i + 1) - 0.5)), i + 1, 26)
  })
  let strike: Stroke | null = null
  let ground: THREE.Vector3[] = []
  // Where the rocket was when the bolt formed: the channel's ends stay on the rocket as it climbs on.
  const struckNose = new THREE.Vector3()
  const struckTail = new THREE.Vector3()
  const moved = new THREE.Vector3()
  /** The bolt's points, the end at `end` (0 = first, 1 = last) carried along by `by`, the other end fixed. */
  const carried = (pts: THREE.Vector3[], by: THREE.Vector3, end: 0 | 1, out: THREE.Vector3[]) => {
    out.length = 0
    pts.forEach((p, i) => out.push(p.clone().addScaledVector(by, end ? i / (pts.length - 1) : 1 - i / (pts.length - 1))))
    return out
  }
  const live = [[], [], [], []] as THREE.Vector3[][]
  const look = new THREE.Vector3()
  const to = new THREE.Vector3()
  const draw = (r: Ribbon, pts: THREE.Vector3[], width: number, level: number, eye: THREE.Vector3) => {
    r.begin()
    if (level > 0.01) for (const p of pts) r.add(p, width, Math.min(1, level))
    r.commit(eye)
  }

  return {
    group,
    grade,
    update(t, camera, strikeAt, nose, tail) {
      const eye = camera.position
      dome.position.copy(eye)
      domeU.uTime.value = t
      rainU.uTime.value = t
      rainU.uCam.value.copy(eye)
      // The distant flash now, if any: the newest one that is still lit.
      let level = 0
      let spot: Stroke | null = null
      for (const at of STORM.flashes) {
        const l = flashLevel(t - at)
        if (l <= 0) continue
        level = l
        camera.getWorldDirection(look)
        spot = spots.reduce((best, s) => (to.copy(s.main[0]!).sub(eye).normalize().dot(look) > look.dot(to.copy(best.main[0]!).sub(eye).normalize()) ? s : best), spots[0]!)
      }
      // The strike: a restriking channel from the clouds to the nose, and on from the tail down the plume to the ground.
      const hit = Math.max(flashLevel(t - strikeAt), t >= strikeAt && t < strikeAt + 0.5 ? 0.6 * Math.exp(-(t - strikeAt) * 4) : 0)
      if (hit > 0 && !strike) {
        strike = stroke(nose.clone().add(new THREE.Vector3(-260, 1500, 120)), nose, 99, 4)
        ground = bolt(tail, tail.clone().add(new THREE.Vector3(-90, -tail.y, 40)), 77, 6, [])
        struckNose.copy(nose)
        struckTail.copy(tail)
      }
      if (strike) {
        carried(strike.main, moved.subVectors(nose, struckNose), 1, live[0]!)
        live[1] = strike.branches[0]!
        live[2] = strike.branches[1]!
        carried(ground, moved.subVectors(tail, struckTail), 0, live[3]!)
      }
      for (let i = 0; i < 3; i++) draw(far[i]!, spot ? (i === 0 ? spot.main : spot.branches[i - 1]!) : [], i ? 14 : 26, level, eye)
      for (let i = 0; i < 4; i++) draw(near[i]!, strike ? live[i]! : [], i === 1 || i === 2 ? 3 : 9, hit * 2, eye)
      const flash = Math.max(level * 0.6, hit * 2)
      if (spot) flashDir.copy(spot.main[0]!).sub(eye).normalize()
      if (hit > 0 && strike) flashDir.copy(strike.main[0]!).sub(eye).normalize()
      domeU.uFlash.value = flash
      rainU.uFlash.value = flash
      grade.uniforms.uStorm!.value = 1
      grade.uniforms.uFlash!.value = flash * 0.55
      return flash
    },
  }
}
