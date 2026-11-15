// Shader effects for the launch: sky, ground, cloud deck, engine plumes, smoke puffs and the Earth from low orbit.
// Everything is procedural (no texture files) except the Earth, which reads the NASA maps. Colors are linear; OutputPass tone-maps.
import * as THREE from 'three'
import type { MapUniforms } from '../maps'
import { ASSEMBLY, COAST_GLSL, CRAWLER_TURN } from './layout'
import type { Nozzle } from './stack'
import type { Propellant } from './vehicles'

const NOISE2 = /* glsl */ `
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
float fbm2(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise2(p);
    p = p * 2.03 + 7.1;
    amp *= 0.5;
  }
  return sum;
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
`

// uSpace: 0 on the ground, 1 above the air (the sky goes black from the top down).
const SKY = /* glsl */ `
uniform vec3 uSun;
uniform float uSpace;
uniform float uTime;
vec3 skyColor(vec3 d) {
  float toSun = max(dot(normalize(d.xz + 1e-5), normalize(uSun.xz)), 0.0);
  // A hazy morning: soft blue overhead, paling to a milky blue-grey at the horizon, a little cream toward the Sun.
  vec3 zenith = mix(lin(vec3(0.24, 0.38, 0.64)), vec3(0.0005, 0.001, 0.004), uSpace);
  vec3 mid = mix(lin(vec3(0.49, 0.62, 0.80)), lin(vec3(0.10, 0.20, 0.50)), uSpace);
  vec3 horizon = mix(lin(vec3(0.73, 0.78, 0.83)), lin(vec3(0.97, 0.78, 0.58)), pow(toSun, 3.0) * 0.7);
  float h = max(d.y, 0.0);
  vec3 col = mix(horizon, mid, smoothstep(0.0, mix(0.32, 0.10, uSpace), h));
  col = mix(col, zenith, smoothstep(0.10, mix(0.85, 0.3, uSpace), h));
  float s = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.5, 0.2) * (pow(s, 12.0) * 0.35 + pow(s, 90.0) * 0.9);
  return col;
}
// How much of a view that many meters long is haze: thick near the ground on a still morning, thin from high up.
float hazeOver(float dist) {
  float k = mix(mix(0.00016, 0.00004, smoothstep(30.0, 600.0, cameraPosition.y)), 0.000012, smoothstep(2000.0, 20000.0, cameraPosition.y));
  return 1.0 - exp(-dist * k);
}
`

const WORLD_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export type SkyUniforms = { uSun: { value: THREE.Vector3 }; uSpace: { value: number }; uTime: { value: number } }

/** A dome that follows the camera. */
export function makeSky(u: SkyUniforms): THREE.Mesh {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: { ...u },
      vertexShader: WORLD_VERTEX,
      fragmentShader: /* glsl */ `
varying vec3 vWorld;
${NOISE2}
${SKY}
void main() {
  vec3 d = normalize(vWorld - cameraPosition);
  vec3 col = skyColor(d);
  float s = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.82, 0.6) * smoothstep(0.99985, 0.99995, s) * 30.0;
  // Below the horizon only shows past the edge of the ground plane.
  col = mix(col, skyColor(vec3(d.x, 0.0, d.z)), smoothstep(0.0, -0.03, d.y));
  gl_FragColor = vec4(col, 1.0);
}
`,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  )
  sky.renderOrder = -10
  sky.frustumCulled = false
  return sky
}

/**
 * The launch site's ground at dawn: a sand spit with the concrete apron and the crawlerway, the sea behind and to the
 * east, an inlet in front (layout.ts has the map). `flame`: where the engines' fire is (xyz) and how bright (w), so
 * the pad and the water can pick up its glow.
 */
export function makeGround(u: SkyUniforms, unit: number, flame: { value: THREE.Vector4 }): THREE.Mesh {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400_000, 400_000).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { ...u, uPad: { value: unit }, uFlame: flame },
      vertexShader: WORLD_VERTEX,
      fragmentShader: /* glsl */ `
uniform float uPad;
uniform vec4 uFlame;
varying vec3 vWorld;
${NOISE2}
${SKY}
${COAST_GLSL}
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
void main() {
  vec2 p = vWorld.xz;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 v = toCam / dist;
  float U = uPad;
  float r = length(p);
  float big = fbm2(p * 0.00012 + 3.0);
  float mid = fbm2(p * 0.0021);
  float fine = fbm2(p * 0.07);
  vec2 lp = p * (0.9 / U) + 5.0;
  float local = 0.65 * noise2(lp) + 0.35 * noise2(lp * 2.3 + 9.0);
  vec2 assembly = vec2(${ASSEMBLY[0].toFixed(1)}, ${ASSEMBLY[1].toFixed(1)});
  vec2 turn = vec2(-${CRAWLER_TURN.toFixed(1)} * U, 0.0);
  float way = min(segDist(p, vec2(0.0), turn), segDist(p, turn, assembly));
  // The waterline wanders a little at the pad and a lot far away (layout.ts: shoreWobble is the bound).
  float shore = coast(p, U) + (local - 0.5) * 0.3 * U + (mid - 0.5) * 500.0 * smoothstep(600.0, 3000.0, r) + (big - 0.5) * 2500.0 * smoothstep(1500.0, 9000.0, r);
  // Marsh ponds inland, but none under the crawlerway or the assembly buildings.
  float pond = smoothstep(0.66, 0.68, fbm2(p * 0.00035 + 20.0)) * smoothstep(2500.0, 5000.0, r) * smoothstep(150.0, 400.0, way) * smoothstep(700.0, 1300.0, length(p - assembly));
  float sea = max(smoothstep(-0.02 * U - 1.0, 0.02 * U + 1.0, shore), pond);
  float sand = smoothstep(-0.3 * U - 12.0, -0.04 * U, shore) * (1.0 - sea);

  // Coastal scrub: dry grass and bare sandy soil with darker stands of palmetto, sandier where the site was cleared.
  float patches = 0.6 * noise2(p * 0.0009 + 7.0) + 0.4 * noise2(p * 0.0031 + 2.0);
  vec3 scrub = mix(lin(vec3(0.20, 0.27, 0.15)), lin(vec3(0.50, 0.47, 0.30)), smoothstep(0.3, 0.7, mid)) * (0.75 + 0.5 * fine);
  scrub = mix(scrub, lin(vec3(0.15, 0.22, 0.13)), smoothstep(0.5, 0.75, patches) * 0.7);
  vec3 sandCol = lin(vec3(0.74, 0.68, 0.55)) * (0.85 + 0.3 * fine);
  scrub = mix(scrub, sandCol, (0.3 + 0.5 * smoothstep(0.45, 0.8, local)) * (1.0 - smoothstep(1.2 * U, 5.0 * U, r)));
  vec3 col = mix(scrub, sandCol, sand);
  // The crawlerway: two lanes of pale river gravel with a strip of grass between them.
  float lane = smoothstep(0.045 * U, 0.06 * U, way) * (1.0 - smoothstep(0.19 * U, 0.21 * U, way));
  col = mix(col, lin(vec3(0.63, 0.59, 0.50)) * (0.85 + 0.3 * fine), lane * (1.0 - sea));
  // The apron: a rounded square of concrete slabs, scorched along the flame trench.
  vec2 q = abs(p) / vec2(U, 0.8 * U);
  float apron = 1.0 - smoothstep(0.96, 1.0, sqrt(sqrt(q.x * q.x * q.x * q.x + q.y * q.y * q.y * q.y)) + (fine - 0.5) * 0.05);
  vec2 slab = abs(fract(p / (0.125 * U)) - 0.5);
  vec3 concrete = lin(vec3(0.60, 0.59, 0.56)) * (0.82 + 0.3 * fine + 0.1 * noise2(p * 0.4));
  concrete *= 1.0 - 0.22 * smoothstep(0.47, 0.49, max(slab.x, slab.y)) * (1.0 - smoothstep(3.0 * U, 6.0 * U, dist));
  concrete *= 1.0 - 0.6 * (1.0 - smoothstep(0.0, U * 0.45, abs(p.y))) * (1.0 - smoothstep(U * 0.3, U * 0.95, abs(p.x)));
  col = mix(col, concrete, apron * (1.0 - sea));
  // Dawn light: a low warm Sun plus blue sky light.
  vec3 light = vec3(1.0, 0.72, 0.5) * 0.5 * max(uSun.y * 3.0, 0.0) + lin(vec3(0.42, 0.52, 0.72)) * 0.75;
  col *= light;
  // The engines' fire lights the pad around it.
  vec3 toFlame = uFlame.xyz - vWorld;
  col += col * vec3(2.4, 1.1, 0.35) * uFlame.w / (1.0 + dot(toFlame, toFlame) / (0.03 * U * U));

  // ---- Water on a still morning: mostly a mirror of the sky. Trains of low ripples, each with its own heading,
  // length and speed, bent a little by noise so the crests are not ruler-straight. The breeze ruffles it in long
  // patches and leaves glassy slicks between them. The short ripples fade with distance, where they would only shimmer.
  float inlet = step(1.0, p.y / U);
  float jit = mid * 14.0 + local * 3.0 + 5.0 * noise2(p * 0.045);
  float f1 = 1.0 - smoothstep(30.0, 220.0, dist);
  float f2 = 1.0 - smoothstep(100.0, 800.0, dist);
  float f3 = (1.0 - smoothstep(400.0, 3500.0, dist)) * (1.0 - 0.6 * inlet);
  float f4 = (1.0 - smoothstep(2500.0, 14000.0, dist)) * (1.0 - 0.8 * inlet);
  // The current: the inlet drains east to the sea, the sea sets toward the beach.
  vec2 drift = mix(vec2(-0.3, 0.5), vec2(1.0, 0.08), inlet) * uTime;
  float ruffle = smoothstep(0.35, 0.7, fbm2((p - drift * 0.6) * vec2(0.5, 2.2) / U + 11.0));
  // The sheltered inlet is far calmer than the open sea.
  float calm = mix(0.7, 0.3, inlet) * (0.35 + 0.65 * ruffle);
  // The long trains come in groups, one strong where the other is weak, so the two never weave an even lattice.
  float ph4 = dot(p, vec2(-0.78, 0.62)) * 0.2 - uTime * 1.4 + jit * 0.6;
  vec2 slope = vec2(0.94, 0.34) * 0.03 * f1 * cos(dot(p, vec2(0.94, 0.34)) * 3.7 - uTime * 6.0 + jit * 2.3)
    + vec2(0.57, -0.82) * 0.03 * f2 * cos(dot(p, vec2(0.57, -0.82)) * 1.46 - uTime * 3.8 + jit * 1.7)
    + vec2(-0.3, 0.954) * 0.045 * f3 * (0.4 + 1.2 * local) * cos(dot(p, vec2(-0.3, 0.954)) * 0.57 - uTime * 2.4 + jit)
    + vec2(-0.78, 0.62) * 0.04 * f4 * (1.6 - 1.2 * local) * cos(ph4);
  // Wind ripples carried along by the current.
  vec2 w1 = p * 0.9 - drift * 1.2;
  vec2 w2 = p * 0.21 - drift * 0.5;
  slope += (vec2(noise2(w1), noise2(w1 + 40.0)) - 0.5) * 0.08 * f1 + (vec2(noise2(w2), noise2(w2 + 17.0)) - 0.5) * 0.06 * f2;
  slope *= calm;
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));
  // Far off, the many small waves the shader no longer draws still tip the mirror up: the sea reflects higher,
  // bluer sky than the horizon behind it, and shows more of its own colour.
  float distant = smoothstep(150.0, 4000.0, dist);
  vec3 refl = reflect(-v, n);
  refl.y = abs(refl.y) + 0.03 + 0.07 * ruffle + 0.25 * distant;
  refl = normalize(refl);
  float fresnel = (0.03 + 0.97 * pow(1.0 - max(dot(n, v), 0.0), 5.0)) * mix(1.0, 0.6, distant);
  // Sand shows through at the edge, then green-grey shallows, slate blue a few hundred meters out.
  // The marsh ponds lie inland of the waterline, where shore is negative: they get a depth of their own.
  float depth = max(shore, pond * 80.0);
  vec3 deep = mix(lin(vec3(0.20, 0.38, 0.40)), lin(vec3(0.07, 0.18, 0.29)), smoothstep(0.0, 6.0 * U + 300.0, depth));
  vec3 body = mix(sandCol * 0.6, deep, smoothstep(0.0, 0.12 * U + 2.0, depth)) * light;
  // Wave faces turned to the Sun are brighter. From the air the mirror is weak, so this is what shows the swell.
  body *= 1.0 + 2.5 * dot(slope, uSun.xz);
  vec3 mirror = skyColor(refl);
  // The bank ahead stands a little above the water, so close under it the mirror shows the dark scrub, not the sky.
  vec2 ahead = normalize(refl.xz + 1e-5);
  float base = coast(p, U);
  float closing = (base - coast(p + ahead * 0.05 * U, U)) / (0.05 * U);
  float bank = step(0.05, closing) * (1.0 - smoothstep(0.5, 1.6, refl.y / max(length(refl.xz), 1e-3) * base / max(closing, 0.05) / (0.05 * U)));
  mirror = mix(mirror, lin(vec3(0.20, 0.23, 0.16)) * light, 0.75 * bank * step(0.0, base));
  vec3 water = mix(body, mirror, fresnel);
  // Sun glitter, and the fire's reflection: a tall streak under the flame, broken up by the ripples.
  water += vec3(1.0, 0.6, 0.3) * (pow(max(dot(refl, uSun), 0.0), 220.0) * 6.0 + pow(max(dot(refl, uSun), 0.0), 24.0) * 0.25);
  float along = dot(toFlame, refl);
  vec3 off = toFlame - refl * along;
  off.y *= 0.35;
  water += vec3(2.4, 1.0, 0.3) * uFlame.w * exp(-dot(off, off) / (0.05 * U * U + 0.004 * along * along)) * step(0.0, along);
  // Foam: a thin line lapping the banks, and rows of surf rolling up the sea beach.
  float lap = (1.0 - smoothstep(0.0, 0.035 * U + 0.6 + (0.02 * U + 0.4) * sin(uTime * 1.3 + local * 40.0), shore));
  float surf = smoothstep(0.55, 0.95, sin(shore * 0.22 + uTime * 0.8 + local * 5.0)) * (1.0 - smoothstep(8.0, 55.0, shore)) * (1.0 - inlet);
  // A few whitecaps on the open sea, breaking on the crests of the long swell. Seen from far only: close up they are squiggles.
  float caps = smoothstep(0.9, 1.0, sin(ph4)) * smoothstep(0.75, 0.83, noise2(p * 0.035 + 31.0 - drift * 0.03)) * (1.0 - inlet) * smoothstep(60.0, 250.0, shore) * smoothstep(250.0, 1000.0, dist) * (1.0 - smoothstep(2500.0, 9000.0, dist));
  float foam = max(max(lap, caps * 0.45), surf * (0.4 + 0.6 * noise2(p * 0.12 + uTime * 0.15)));
  // Only along the coast: the ponds are still, and inland of the waterline, where shore is below zero.
  water = mix(water, vec3(0.92) * light, clamp(foam, 0.0, 1.0) * step(-0.02 * U - 1.0, shore));
  col = mix(col, water, sea);
  // Haze toward the horizon: the far shore and the sea's edge melt into the sky.
  col = mix(col, skyColor(vec3(-v.x, 0.0, -v.z)), hazeOver(dist));
  gl_FragColor = vec4(col, 1.0);
}
`,
    }),
  )
  return ground
}

/**
 * Paint for things far away (the assembly complex): vertex colours lit by the same dawn light as the ground and faded
 * into the same haze, so they sit on the horizon instead of standing out from it.
 */
export function makeHazed(u: SkyUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...u },
    vertexColors: true,
    vertexShader: /* glsl */ `
varying vec3 vWorld;
varying vec3 vColor;
varying vec3 vN;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vColor = color;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,
    fragmentShader: /* glsl */ `
varying vec3 vWorld;
varying vec3 vColor;
varying vec3 vN;
${NOISE2}
${SKY}
void main() {
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 v = toCam / dist;
  vec3 light = vec3(1.0, 0.72, 0.5) * 1.5 * max(dot(normalize(vN), uSun), 0.0) + lin(vec3(0.42, 0.52, 0.72)) * (0.55 + 0.2 * vN.y);
  vec3 col = lin(vColor) * light;
  gl_FragColor = vec4(mix(col, skyColor(vec3(-v.x, 0.0, -v.z)), hazeOver(dist)), 1.0);
}
`,
  })
}

/** A broken cloud deck: one big plane with noise holes, lit from the Sun side. */
export function makeCloudDeck(u: SkyUniforms, altitude: number): THREE.Mesh {
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(400_000, 400_000).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { ...u },
      vertexShader: WORLD_VERTEX,
      fragmentShader: /* glsl */ `
varying vec3 vWorld;
${NOISE2}
${SKY}
void main() {
  vec2 p = vWorld.xz;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 v = toCam / dist;
  float c = fbm2(p * 0.00022 + vec2(uTime * 0.004, 0.0)) + 0.25 * (fbm2(p * 0.0016) - 0.5);
  // A few soft clouds, not an overcast.
  float a = smoothstep(0.57, 0.82, c);
  // Seen from below, the Sun side glows pink; from above it is bright white.
  float above = step(0.0, toCam.y);
  float toSun = pow(max(dot(normalize(-v.xz + 1e-5), normalize(uSun.xz)), 0.0), 2.0);
  vec3 under = mix(lin(vec3(0.66, 0.68, 0.76)), lin(vec3(1.0, 0.70, 0.52)), toSun) * (0.55 + 0.6 * c);
  vec3 top = mix(lin(vec3(0.80, 0.82, 0.90)), lin(vec3(1.0, 0.86, 0.74)), toSun) * (0.5 + 0.7 * c);
  vec3 col = mix(under, top, above);
  float haze = 1.0 - exp(-dist * 0.000025);
  col = mix(col, skyColor(vec3(-v.x, 0.0, -v.z)), haze);
  // Fade out where the camera flies through the deck, and far away where it would alias.
  a *= smoothstep(0.0, 300.0, abs(toCam.y)) * (1.0 - smoothstep(20000.0, 140000.0, dist));
  gl_FragColor = vec4(col, a * 0.9);
}
`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  deck.position.y = altitude
  return deck
}

// ---------------------------------------------------------------- Plumes

// `body`: how solid the flame looks. Kerosene and solid motors burn sooty and opaque; hydrogen and methane flames are
// thin enough to see the shock diamonds through. `smoke`: how much of a trail is left behind.
// In thick air only: `tail` is the colour the flame cools to, `flare` how many nozzle widths it spreads by its end,
// `reach` how much longer than in vacuum the air keeps it lit.
type Look = { core: [number, number, number]; edge: [number, number, number]; tail: [number, number, number]; diamonds: number; length: number; body: number; smoke: number; flare: number; reach: number }
const PLUME_COLORS: Record<Propellant, Look> = {
  kerolox: { core: [3.4, 2.5, 1.3], edge: [1.9, 0.6, 0.1], tail: [1.3, 0.3, 0.05], diamonds: 0.7, length: 1, body: 0.9, smoke: 0.6, flare: 1.5, reach: 1.3 },
  methalox: { core: [2.2, 2.0, 3.0], edge: [0.9, 0.5, 1.5], tail: [1.5, 0.55, 0.4], diamonds: 1, length: 0.9, body: 0.5, smoke: 0.35, flare: 1.3, reach: 1.2 },
  hydrolox: { core: [1.5, 1.9, 2.8], edge: [0.3, 0.45, 1.0], tail: [0.9, 0.4, 0.15], diamonds: 1, length: 0.7, body: 0.35, smoke: 0.22, flare: 1.1, reach: 1.2 },
  solid: { core: [4.6, 3.6, 2.2], edge: [2.8, 1.3, 0.35], tail: [1.8, 0.6, 0.12], diamonds: 0, length: 1.3, body: 1.2, smoke: 1, flare: 10, reach: 1.1 },
}

export const smokiness = (p: Propellant) => PLUME_COLORS[p].smoke
export const flameColor = (p: Propellant) => PLUME_COLORS[p].core
/** How long the flame is in thick air, as a multiple of the length makePlume was given. */
export const flameReach = (p: Propellant) => PLUME_COLORS[p].length * PLUME_COLORS[p].reach

export interface Plume {
  mesh: THREE.Mesh
  /** Thrust 0 to 1, how far the plume has spread in thin air (0 sea level, 1 vacuum), and the clock for the flicker. */
  set(power: number, vacuum: number, time: number): void
  propellant: Propellant
}

let plumeGeometry: THREE.BufferGeometry | null = null

/**
 * The flame of a stage, hanging down -y from its origin, as nested soft shells: a wide outer flame for the whole
 * cluster (about `length` long at sea level), a narrow white-hot core inside it, and a jet with shock diamonds for
 * every engine. In thin air the outer shell opens into a wide, faint fan and the core shrinks to a knot at the nozzle.
 */
export function makePlume(nozzle: Nozzle, length: number, seed = 0): Plume {
  // One shared open tube, 1 long and 1 wide; the vertex shader shapes it.
  plumeGeometry ??= new THREE.CylinderGeometry(1, 1, 1, 28, 24, true).translate(0, -0.5, 0)
  const look = PLUME_COLORS[nozzle.propellant]
  const uniforms = {
    uPower: { value: 0 },
    uVacuum: { value: 0 },
    uTime: { value: 0 },
    uSeed: { value: seed },
    uCore: { value: new THREE.Vector3(...look.core) },
    uEdge: { value: new THREE.Vector3(...look.edge) },
    uTail: { value: new THREE.Vector3(...look.tail) },
    uFlare: { value: look.flare },
    uReach: { value: look.reach },
    uDiamonds: { value: look.diamonds },
    uBody: { value: look.body },
    uSolid: { value: nozzle.propellant === 'solid' ? 1 : 0 },
  }
  const mesh = new THREE.InstancedMesh(
    plumeGeometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
uniform float uVacuum;
uniform float uTime;
uniform float uSeed;
uniform float uFlare;
uniform float uReach;
varying float vAlong;
varying float vRadii;
varying float vLayer;
varying float vAround;
varying vec3 vN;
varying vec3 vView;
void main() {
  vAlong = -position.y;
  // Instance 0 is the cluster's outer flame, 1 its hot core; the others are single engines' jets.
  vLayer = float(gl_InstanceID > 1 ? 2 : gl_InstanceID);
  vec3 stretch = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  // How far downstream, counted in nozzle radii: in vacuum the exhaust spreads at a fixed angle whatever the engine's size.
  vRadii = vAlong * stretch.y / stretch.x;
  vec3 p = position;
  float root = sqrt(vAlong);
  // Sea level: the air squeezes the flame into a long narrow spindle. Thin air: it fans out the moment it leaves the bell.
  float fan = uVacuum * step(vLayer, 0.5) * 0.9;
  float air = 1.0 - uVacuum;
  // Thick air: the flame leaves as wide as the engines, flares out and stays lit far downstream; its edge boils.
  vAround = position.x * 1.7 + position.z * 1.1;
  float boil = 1.0 + 0.09 * vAlong * sin(vAlong * 37.0 - uTime * 21.0 + vAround * 2.0 + uSeed * 5.0);
  float wide = uFlare * pow(vAlong, 0.6);
  float outer = 1.0 + air * wide * boil + fan * vRadii;
  float core = mix((0.55 + 0.35 * wide) * (1.0 - 0.45 * vAlong), 0.6 + 0.2 * vRadii, uVacuum);
  float jet = 1.0 + 0.25 * root - 1.2 * vAlong * vAlong;
  p.xz *= max(vLayer < 0.5 ? outer : vLayer < 1.5 ? core : jet, 0.05);
  p.y *= 1.0 + air * (uReach - 1.0) * step(vLayer, 1.5);
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  // The shell's normal leans upstream by the angle it opens at.
  vN = normalize(normalMatrix * vec3(normal.x, fan + 0.02, normal.z));
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`,
      fragmentShader: /* glsl */ `
uniform float uPower;
uniform float uVacuum;
uniform float uTime;
uniform float uSeed;
uniform vec3 uCore;
uniform vec3 uEdge;
uniform vec3 uTail;
uniform float uDiamonds;
uniform float uBody;
uniform float uSolid;
varying float vAlong;
varying float vRadii;
varying float vLayer;
varying float vAround;
varying vec3 vN;
varying vec3 vView;
${NOISE2}
void main() {
  // A shell seen face-on is the thick middle of the flame; seen edge-on it is the thin rim, so it fades out: no outline.
  float facing = abs(dot(normalize(vN), normalize(vView)));
  float air = 1.0 - uVacuum;
  // Never below zero: at the very end of the tube the interpolated value can overshoot, and pow() of a negative is not a number.
  float left = max(1.0 - vAlong, 0.0);
  // Solid motors burn rough: their flame boils. Liquid engines only shimmer, and in vacuum the fan is steady.
  float flick = mix(0.8 + 0.4 * noise2(vec2(vAlong * 7.0 - uTime * 11.0, uSeed * 13.0 + facing * 2.0)),
                    0.5 + 1.0 * noise2(vec2(vAlong * 16.0 - uTime * 17.0, uSeed * 13.0 + facing * 5.0)), uSolid);
  flick = mix(1.0, flick, mix(0.25, 1.0, air));
  float start = smoothstep(0.0, 0.015, vAlong);
  vec3 col;
  float a;
  if (vLayer < 0.5) {
    // Outer flame: thick with glowing soot, so it is bright right across with a soft rim: white-yellow in the middle,
    // the edge colour outside, cooling to the tail colour where it breaks up into ragged tongues.
    float tongues = noise2(vec2(vAlong * 9.0 - uTime * 13.0, vAround * 2.0 + uSeed * 13.0));
    float fine = noise2(vec2(vAlong * 38.0 - uTime * 29.0, vAround * 7.0 + uSeed * 7.0));
    float hot = facing * (1.0 - 0.75 * vAlong);
    col = mix(mix(uEdge, uTail, smoothstep(0.3, 0.9, vAlong)) * (0.7 + 0.3 * facing), uCore, smoothstep(0.4, 0.9, hot));
    a = smoothstep(0.0, 0.25, facing) * (1.0 - smoothstep(0.65, 1.0, vAlong + (tongues - 0.5) * 0.5)) * uBody * (0.7 + 0.5 * tongues) * (0.85 + 0.3 * fine);
    // Vacuum: a wide bluish-white fan, brightest in a small zone behind the bell, then thinning out fast as it spreads.
    vec3 fan = mix(vec3(0.3, 0.46, 1.0), vec3(0.55, 0.7, 1.0), facing) + 0.04 * uCore;
    // Even across the cone and soft only at its outline: a peak where a wall faces the eye reads as a torch beam.
    float thin = smoothstep(0.0, 0.5, facing) * (0.012 + 0.12 / (1.0 + 0.1 * vRadii * vRadii)) * (0.45 + 0.5 * uBody) * pow(left, 1.5) * smoothstep(0.0, 3.0, vRadii);
    col = mix(col, fan, uVacuum);
    // The flame dims faster than it widens: the same light spread over a far bigger cone.
    a = a * air * air + thin * uVacuum;
  } else if (vLayer < 1.5) {
    // Core: too bright to have a colour at the nozzle.
    col = mix(uCore, vec3(3.6, 3.3, 2.8), (1.0 - vAlong) * air * (1.0 - 0.5 * uSolid) * 0.7);
    a = pow(facing, 1.6) * pow(left, 0.8) * (0.4 + 0.6 * uBody) * (1.0 - 0.4 * uDiamonds);
    // Vacuum: a short blue-white knot at the exit of the bell.
    col = mix(col, vec3(0.9, 1.3, 2.4) + 0.15 * uCore, uVacuum);
    a = a * air * air + pow(facing, 2.0) * exp(-vRadii * 2.0) * 0.5 * uVacuum;
  } else {
    // One engine's jet. Shock diamonds: bright knots where the air squeezes it, closer and dimmer down the jet, gone in thin air.
    float knots = pow(max(sin(vAlong * 44.0 * (1.0 + 0.35 * vAlong) - 0.5), 0.0), 4.0) * (1.0 - smoothstep(0.08, 0.7, vAlong)) * uDiamonds * air;
    col = mix(uEdge, uCore, 0.85 - 0.5 * vAlong) + vec3(1.2, 1.1, 0.9) * knots;
    a = pow(facing, 2.0) * pow(left, 1.4) * (0.3 + 0.3 * uBody + 4.5 * knots) * air;
  }
  a *= start * flick * uPower;
  // A grain finer than one colour step, so the long faint gradients do not show bands.
  a *= 0.97 + 0.06 * hash2(gl_FragCoord.xy + uSeed);
  // In thick air the sooty flame also hides what is behind it, so its orange edge keeps its colour against a bright
  // sky and the layers settle at the flame's own brightness instead of adding up. In vacuum it only adds light.
  float solid = min(a, 1.0) * air * step(vLayer, 1.5);
  gl_FragColor = vec4(col * mix(a, min(a, 1.0), air), solid);
}
`,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    2 + nozzle.engines.length,
  )
  const m = new THREE.Matrix4()
  const long = length * look.length
  mesh.setMatrixAt(0, m.makeScale(nozzle.radius, long, nozzle.radius))
  mesh.setMatrixAt(1, m.makeScale(nozzle.radius, long * 0.8, nozzle.radius))
  const jet = Math.min(long * 0.6, nozzle.exit * 22)
  nozzle.engines.forEach(([x, z], i) => mesh.setMatrixAt(i + 2, m.makeScale(nozzle.exit * 0.8, jet, nozzle.exit * 0.8).setPosition(x, 0, z)))
  mesh.frustumCulled = false
  mesh.visible = false
  return {
    mesh,
    propellant: nozzle.propellant,
    set(power, vacuum, time) {
      mesh.visible = power > 0.001
      uniforms.uPower.value = power
      uniforms.uVacuum.value = vacuum
      uniforms.uTime.value = time
    },
  }
}

let glowMap: THREE.DataTexture | null = null

/** Soft additive glow at a nozzle, so a firing engine also reads from behind. */
export function makeGlow(propellant: Propellant, radius: number): THREE.Sprite {
  if (!glowMap) {
    // Computed, not drawn on a canvas: browsers dither canvas gradients, and at low alpha that came out as coloured speckles.
    const size = 64
    const data = new Uint8Array(size * size * 4)
    for (let i = 0; i < size * size; i++) {
      const r = Math.hypot((i % size) + 0.5 - size / 2, Math.floor(i / size) + 0.5 - size / 2) / (size / 2)
      const v = Math.round(255 * Math.max(0, Math.exp(-r * r * 4.5) - 0.011) / 0.989)
      data.set([v, v, v, 255], i * 4)
    }
    glowMap = new THREE.DataTexture(data, size, size)
    glowMap.magFilter = glowMap.minFilter = THREE.LinearFilter
    glowMap.needsUpdate = true
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: new THREE.Color(...PLUME_COLORS[propellant].core), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
  sprite.scale.setScalar(radius * 5)
  sprite.visible = false
  return sprite
}

// ----------------------------------------------------------------- Smoke

export interface Puffs {
  mesh: THREE.Mesh
  /** Start a frame, add puffs, then commit. Positions are in the mesh's parent frame; `scale` converts sizes to world units. */
  begin(): void
  add(x: number, y: number, z: number, size: number, alpha: number, heat: number, seed: number): void
  /** `view`: the camera's world-to-view matrix. Billows need it, to draw the far ones first. */
  commit(sunView: THREE.Vector3, scale: number, inSpace: boolean, view?: THREE.Matrix4): void
}

/** Fills `order` with 0 to n-1 so that `key` rises along it. Sorts in place and allocates nothing: it runs every frame. */
export function sortByKey(order: Uint16Array, key: Float32Array, n: number): void {
  for (let i = 0; i < n; i++) {
    const k = key[i]!
    let j = i - 1
    for (; j >= 0 && key[order[j]!]! > k; j--) order[j + 1] = order[j]!
    order[j + 1] = i
  }
}

// Thin vapour: a soft-edged wisp, lit as one round ball.
const WISP = /* glsl */ `
uniform vec3 uSunView;
uniform vec3 uLit;
uniform vec3 uShade;
varying vec2 vUv;
varying vec3 vData;
${NOISE2}
void main() {
  float r = length(vUv);
  // Two octaves only: dozens of puffs overlap at ignition, and this runs for every layer.
  float n = 0.62 * noise2(vUv * 1.7 + vData.z * 31.0) + 0.38 * noise2(vUv * 4.1 + vData.z * 17.0);
  float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.9);
  if (a * vData.x < 0.004) discard;
  vec3 nrm = normalize(vec3(vUv, 0.6 + n * 0.6));
  float l = clamp(dot(nrm, uSunView) * 0.6 + 0.45, 0.0, 1.0);
  vec3 col = mix(uShade, uLit, l) * (0.7 + 0.6 * n);
  col += vec3(3.0, 1.1, 0.25) * vData.y * (1.0 - r * 0.6);
  gl_FragColor = vec4(col, a * vData.x);
}
`

// Dense smoke and steam: every puff is a solid ball covered in round lumps, like a cauliflower, with a crisp outline.
// It is shaded as that shape: bright where a lump faces the Sun, grey in the creases and underneath, orange toward the fire.
const BILLOW = /* glsl */ `
uniform vec3 uSunView;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec4 uFire;
uniform float uUnit;
varying vec2 vUv;
varying vec3 vData;
varying vec3 vAt;
varying float vHalf;
${NOISE2}
// One layer of lumps: xy points away from the nearest lump's middle, z is 1 on its crown and falls to 0 around it.
// The lumps are blended (a smooth "highest one wins"), so the creases between them are rounded, not cut with a knife.
vec3 lumps(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec3 sum = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = f - g - 0.15 - 0.7 * vec2(hash2(i + g), hash2(i + g + 57.0));
      sum += vec3(o, 1.0) * exp(-12.0 * dot(o, o));
    }
  }
  return vec3(sum.xy / sum.z, clamp(1.0 + log(sum.z) / 12.0, 0.0, 1.0));
}
void main() {
  if (dot(vUv, vUv) > 1.0) discard;
  vec2 q = vUv + vData.z * vec2(31.0, 17.0);
  // The ball is pulled out of round, a different way for every puff.
  float r2 = dot(vUv, vUv) * (0.75 + 0.9 * noise2(q * 1.1));
  vec3 big = lumps(q * 1.6);
  vec3 small = lumps(q * 4.1);
  // The finest lumps only show on a puff that fills much of the screen: skip the work on the rest.
  float close = smoothstep(0.012, 0.005, fwidth(vUv.x));
  vec3 fine = close > 0.0 ? lumps(q * 9.7) * close : vec3(0.0);
  // Height toward the eye, in puff radii: a few big round lobes on a ball that stops short of the quad's edge, with
  // small lumps all over them. Where it reaches zero is the puff's outline.
  float ball = sqrt(max(0.42 - r2, 0.0)) / 0.65;
  float h = 0.35 * ball + 0.9 * big.z + 0.2 * small.z + 0.06 * fine.z - 0.6;
  float a = smoothstep(0.0, 0.07, h) * (1.0 - smoothstep(0.8, 1.0, dot(vUv, vUv))) * vData.x;
  if (a < 0.004) discard;
  vec3 n = normalize(vec3(0.3 * vUv / max(0.42 * ball, 0.15) + 2.0 * big.xy + 1.3 * small.xy + 0.8 * fine.xy, 1.0));
  vec3 up = viewMatrix[1].xyz;
  float sun = clamp(dot(n, uSunView) * 0.75 + 0.25, 0.0, 1.0);
  // The look of self-shadow: the creases between lobes are dark, and so is the foot of the whole cloud bank.
  float height = dot(up, vAt) + cameraPosition.y;
  float open = (0.5 + 0.5 * smoothstep(0.0, 0.5, big.z)) * (0.55 + 0.45 * smoothstep(0.0, 0.35 * uUnit, height)) * (0.8 + 0.2 * smoothstep(-0.6, 0.3, dot(vUv, up.xy)));
  vec3 col = (uLit * sun * sun + uShade * (0.6 + 0.4 * dot(n, up))) * open;
  vec3 toFire = (viewMatrix * vec4(uFire.xyz, 1.0)).xyz - vAt - vec3(0.0, 0.0, h * vHalf);
  float d2 = dot(toFire, toFire);
  col += vec3(6.0, 2.6, 0.7) * uFire.w * (0.15 + 0.85 * max(dot(n, toFire) * inversesqrt(d2), 0.0)) / (1.0 + d2 / (0.1 * uUnit * uUnit));
  col += vec3(3.0, 1.1, 0.25) * vData.y * (1.0 - r2 * 0.6);
  gl_FragColor = vec4(col, a);
}
`

/**
 * Camera-facing smoke puffs, drawn in one instanced call. Stateless: the scene refills them every frame.
 * Without `billow` they are thin wisps of vapour. With it they are dense, solid-looking clouds, drawn far ones first:
 * `fire` is where the engines' flame is (xyz) and how bright (w), `unit` the size of the site its glow is measured in.
 */
export function makePuffs(capacity: number, billow?: { fire: { value: THREE.Vector4 }; unit: number }): Puffs {
  const base = new THREE.PlaneGeometry(1, 1)
  const geo = new THREE.InstancedBufferGeometry()
  geo.index = base.index
  geo.setAttribute('position', base.getAttribute('position'))
  geo.setAttribute('uv', base.getAttribute('uv'))
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3)
  const data = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4)
  pos.setUsage(THREE.DynamicDrawUsage)
  data.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('iPos', pos)
  geo.setAttribute('iData', data)
  // Puffs are collected here as they are added; commit() copies them to the buffers in drawing order.
  const spot = new Float32Array(capacity * 3)
  const info = new Float32Array(capacity * 4)
  const depth = new Float32Array(capacity)
  const order = new Uint16Array(capacity)
  const uniforms = {
    uSunView: { value: new THREE.Vector3(0, 1, 0) },
    uScale: { value: 1 },
    uLit: { value: new THREE.Vector3() },
    uShade: { value: new THREE.Vector3() },
    uFire: billow?.fire ?? { value: new THREE.Vector4() },
    uUnit: { value: billow?.unit ?? 1 },
  }
  const mesh = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData;
uniform float uScale;
varying vec2 vUv;
varying vec3 vData;
varying vec3 vAt;
varying float vHalf;
void main() {
  vUv = uv * 2.0 - 1.0;
  vData = iData.yzw;
  vHalf = iData.x * uScale * 0.5;
  // Wisps are turned at random; billows stay upright, because their shading knows which way is up.
  float a = iData.w * 6.283 * ${billow ? '0.0' : '1.0'};
  vec2 corner = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  mv.xy += corner * iData.x * uScale;
  vAt = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`,
      fragmentShader: billow ? BILLOW : WISP,
      transparent: true,
      depthWrite: false,
    }),
  )
  mesh.frustumCulled = false
  mesh.renderOrder = billow ? 4 : 5
  let n = 0
  return {
    mesh,
    begin() { n = 0 },
    add(x, y, z, size, alpha, heat, seed) {
      if (n >= capacity || alpha <= 0.004) return
      spot[n * 3] = x
      spot[n * 3 + 1] = y
      spot[n * 3 + 2] = z
      info[n * 4] = size
      info[n * 4 + 1] = alpha
      info[n * 4 + 2] = heat
      info[n * 4 + 3] = seed
      n++
    },
    commit(sunView, scale, inSpace, view) {
      const e = view?.elements
      for (let i = 0; i < n; i++) depth[i] = e ? e[2]! * spot[i * 3]! + e[6]! * spot[i * 3 + 1]! + e[10]! * spot[i * 3 + 2]! : i
      sortByKey(order, depth, n)
      for (let i = 0; i < n; i++) {
        const from = order[i]!
        pos.setXYZ(i, spot[from * 3]!, spot[from * 3 + 1]!, spot[from * 3 + 2]!)
        data.setXYZW(i, info[from * 4]!, info[from * 4 + 1]!, info[from * 4 + 2]!, info[from * 4 + 3]!)
      }
      geo.instanceCount = n
      pos.needsUpdate = true
      data.needsUpdate = true
      mesh.visible = n > 0
      uniforms.uSunView.value.copy(sunView)
      uniforms.uScale.value = scale
      // In space: hard white and near-black. On the ground, vapour is peach where the dawn Sun hits it and blue-grey
      // in shade; dense cloud is white to cream in the Sun, with the sky's grey-blue filling its shadows.
      if (inSpace) { uniforms.uLit.value.set(1.1, 1.05, 1.0); uniforms.uShade.value.set(0.06, 0.07, 0.1) }
      else if (billow) { uniforms.uLit.value.set(1.35, 1.28, 1.14); uniforms.uShade.value.set(0.26, 0.25, 0.27) }
      else { uniforms.uLit.value.set(1.0, 0.72, 0.56); uniforms.uShade.value.set(0.2, 0.23, 0.32) }
    },
  }
}

export function makeStars(radius: number): THREE.Points {
  const n = 3000
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    pos.set([Math.cos(a) * r * radius, u * radius, Math.sin(a) * r * radius], i * 3)
    const b = Math.pow(rnd(), 6) * 1.6 + 0.12
    col.set([b, b * (0.9 + rnd() * 0.1), b * (0.8 + rnd() * 0.2)], i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }))
}

// ------------------------------------------------------------ Above the air

export type SpaceSkyUniforms = { uSun: { value: THREE.Vector3 }; uAltitude: { value: number } }

/**
 * The sky from high up: black above, a thin band of blue air hugging the horizon. A dome that follows the camera;
 * world +y is "up" and the planet's centre is straight down. The air is drawn thicker than life so the band reads on a phone.
 */
export function makeSpaceSky(u: SpaceSkyUniforms, planetRadius: number): THREE.Mesh {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: { ...u, uRadius: { value: planetRadius } },
      vertexShader: WORLD_VERTEX,
      fragmentShader: /* glsl */ `
uniform vec3 uSun;
uniform float uAltitude;
uniform float uRadius;
varying vec3 vWorld;
void main() {
  vec3 d = normalize(vWorld - cameraPosition);
  float r0 = uRadius + uAltitude;
  // Lowest height the view ray reaches: the camera's own for rays going up, the grazing height for rays going down.
  float graze = r0 * sqrt(max(1.0 - d.y * d.y, 0.0)) - uRadius;
  float h = d.y >= 0.0 ? uAltitude : max(graze, 0.0);
  // Seen from orbit the air is a thin bright line on the horizon, not a wide band.
  float air = exp(-h / 10000.0) / (max(d.y, 0.0) + 0.06) * (1.0 + smoothstep(0.0, -0.03, d.y));
  float glow = 1.0 - exp(-air * 0.32);
  float day = 0.15 + 0.85 * smoothstep(-0.2, 0.3, uSun.y + 0.5 * dot(normalize(d.xz + 1e-5), normalize(uSun.xz + 1e-5)));
  vec3 col = mix(vec3(0.07, 0.2, 0.62), vec3(0.5, 0.74, 1.0), glow * glow) * glow * day * 1.3;
  float s = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.9, 0.75) * (pow(s, 600.0) * 2.0 + smoothstep(0.99985, 0.99995, s) * 40.0);
  gl_FragColor = vec4(col, 1.0);
}
`,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  )
  sky.renderOrder = -10
  sky.frustumCulled = false
  return sky
}

const NOISE3 = /* glsl */ `
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise3(p);
    p = p * 2.07 + 0.17;
    amp *= 0.5;
  }
  return sum / 0.9375;
}
`

/**
 * The Earth seen from 100 to 400 km up, as one sphere of radius `radius`: ground, clouds, their shadows and the air.
 * ../shaders.ts draws the whole globe from far away, where one texel of the NASA maps (39 km) is a pixel. From this
 * low the same texel covers a fifth of the screen, so here the maps only say where land, sea and cloud are, and
 * noise draws the coastline, the shallows and the cloud cells at the size the eye expects (a few km down to a few hundred m).
 */
export function makeEarthBelow(u: { uSun: { value: THREE.Vector3 }; uTime: { value: number } } & Pick<MapUniforms, 'uMap' | 'uHasMap' | 'uClouds' | 'uHasClouds'>, radius: number): THREE.Mesh {
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 192, 96),
    new THREE.ShaderMaterial({
      uniforms: { ...u },
      vertexShader: /* glsl */ `
varying vec3 vObj;
varying vec3 vWorldN;
varying vec3 vWorldPos;
void main() {
  vObj = position;
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,
      fragmentShader: /* glsl */ `
uniform vec3 uSun;
uniform float uTime;
uniform sampler2D uMap;
uniform float uHasMap;
uniform sampler2D uClouds;
uniform float uHasClouds;
uniform mat4 modelMatrix;
varying vec3 vObj;
varying vec3 vWorldN;
varying vec3 vWorldPos;
${NOISE3}
// Equirectangular map coordinates without a seam at lon 180 (as ../shaders.ts).
vec2 mapUv(vec3 p) {
  float u1 = atan(-p.z, p.x) / 6.2831853 + 0.5;
  float u2 = fract(u1 + 0.5) - 0.5;
  float u = fwidth(u1) <= fwidth(u2) + 1e-6 ? u1 : u2;
  return vec2(u, asin(clamp(p.y, -1.0, 1.0)) / 3.14159265 + 0.5);
}
// How much cloud stands over a point: the real weather systems from the map, broken into cells and streets.
float cloudAt(vec3 q) {
  float a = uTime * 0.0015;
  vec3 m = vec3(q.x * cos(a) - q.z * sin(a), q.y, q.x * sin(a) + q.z * cos(a));
  float seen = uHasClouds > 0.5 ? texture2D(uClouds, mapUv(m)).r : fbm3(m * 5.0);
  float cells = fbm3(m * 300.0);
  float fine = noise3(m * 2600.0);
  // Thick decks are not a flat sheet either: the cells show as lumps and the gaps between them.
  return seen * (1.0 - 0.45 * smoothstep(0.55, 0.3, cells) * smoothstep(0.5, 0.9, seen)) + (0.5 * (cells - 0.5) + 0.12 * (fine - 0.5)) * smoothstep(0.02, 0.3, seen);
}
void main() {
  vec3 p = normalize(vObj);
  vec3 n = normalize(vWorldN);
  vec3 v = normalize(cameraPosition - vWorldPos);
  // shortcut: plain ocean until the map has decoded (a few frames, long before the first space shot); no drawn continents.
  vec3 m = uHasMap > 0.5 ? texture2D(uMap, mapUv(p)).rgb : vec3(0.004, 0.012, 0.05);
  float rough = fbm3(p * 420.0);
  float grain = noise3(p * 5200.0);
  // Blue Marble: oceans are the only places bluer than red or green (1 open sea, -1 land); ice is bright everywhere.
  float blue = (m.b - max(m.r, m.g)) / (m.b + max(m.r, m.g) + 0.004);
  // The noise moves the waterline by less than a texel, which turns the map's soft edge into bays and headlands.
  float c = blue - 0.1 + 0.7 * (rough - 0.5) + 0.06 * (grain - 0.5);
  float w = fwidth(c) * 1.4 + 0.02;
  float ice = smoothstep(0.35, 0.6, min(m.r, min(m.g, m.b)));
  float water = smoothstep(-w, w, c) * (1.0 - ice);
  // Land: the map's colour, mottled by fields, forest and bare ground. Sea: deep blue, turquoise shallows along the coast.
  // The map's forests are darker than they look from orbit next to the sea; deserts and ice are already bright.
  vec3 land = m * (1.9 - min(dot(m, vec3(0.3, 0.6, 0.1)), 1.0)) * (0.8 + 0.5 * rough) * mix(vec3(1.0), vec3(0.86, 0.97, 0.8), smoothstep(0.45, 0.7, grain) * (1.0 - ice));
  float shallow = 1.0 - smoothstep(0.1, 0.75, blue);
  vec3 sea = mix(vec3(0.002, 0.012, 0.045) * (0.8 + 0.4 * rough), vec3(0.02, 0.2, 0.24), 0.65 * shallow * shallow);
  vec3 col = mix(land, sea, water);

  vec3 sunObj = normalize(uSun * mat3(modelMatrix));
  float here = cloudAt(p);
  // The same clouds a dozen km toward the Sun: thick there means shadow here, on the ground and on the cloud's far side.
  float sunward = cloudAt(normalize(p + (sunObj - p * dot(sunObj, p)) * 0.002));
  float cover = smoothstep(0.3, 0.6, here);
  float shadow = smoothstep(0.3, 0.6, sunward);

  float d = dot(n, uSun);
  float sunlit = max(d, 0.0);
  vec3 lit = col * (0.012 + 1.25 * sunlit) * (1.0 - 0.55 * shadow);
  // Sun glint on open water.
  vec3 hv = normalize(uSun + v);
  lit += water * (1.0 - shadow) * (pow(max(dot(n, hv), 0.0), 500.0) * 0.5 + pow(max(dot(n, hv), 0.0), 40.0) * 0.03) * vec3(1.0, 0.88, 0.7) * step(0.0, d);
  // Clouds: bright where they face the Sun and where they are thick, blue-grey on the side turned away.
  float relief = clamp((here - sunward) * 6.0, -1.0, 1.0);
  vec3 cloud = mix(vec3(0.42, 0.48, 0.62), vec3(1.0), clamp(0.7 + 0.5 * relief, 0.0, 1.0)) * (0.02 + 1.12 * smoothstep(-0.08, 0.35, d));
  lit = mix(lit, cloud, cover * 0.94);
  // The air between the ground and the eye: almost none looking straight down, a pale blue veil toward the horizon.
  // At the very limb the ground is gone behind the air and takes the colour of the sky's bright line, so the edge of the sphere does not show as a stepped line.
  float veil = 1.0 - exp(-0.035 * (1.0 / max(dot(n, v), 0.012) - 1.0));
  vec3 air = mix(mix(vec3(0.16, 0.38, 0.95), vec3(0.62, 0.8, 1.0), veil), vec3(0.65, 0.96, 1.3), veil * veil * veil) * smoothstep(-0.2, 0.35, d);
  gl_FragColor = vec4(mix(lit, air, veil * (0.85 + 0.15 * veil)), 1.0);
}
`,
      depthTest: false,
      depthWrite: false,
    }),
  )
  earth.renderOrder = -8
  earth.frustumCulled = false
  return earth
}
