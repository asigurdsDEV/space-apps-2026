// Shader effects for the launch: dawn sky, ground, cloud deck, engine plumes and smoke puffs.
// Everything is procedural (no texture files). Colors are linear; OutputPass tone-maps.
import * as THREE from 'three'
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
  vec3 zenith = mix(lin(vec3(0.16, 0.27, 0.52)), vec3(0.0005, 0.001, 0.004), uSpace);
  vec3 mid = mix(lin(vec3(0.46, 0.56, 0.78)), lin(vec3(0.10, 0.20, 0.50)), uSpace);
  vec3 horizon = mix(lin(vec3(0.74, 0.68, 0.72)), lin(vec3(1.0, 0.60, 0.30)), pow(toSun, 3.0));
  float h = max(d.y, 0.0);
  vec3 col = mix(horizon, mid, smoothstep(0.0, mix(0.26, 0.10, uSpace), h));
  col = mix(col, zenith, smoothstep(0.08, mix(0.8, 0.3, uSpace), h));
  float s = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.5, 0.2) * (pow(s, 12.0) * 0.35 + pow(s, 90.0) * 0.9);
  return col;
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

/** Coastal launch site seen at dawn: concrete apron and roads at the pad, scrub, a shoreline, sea. uPad: apron radius in meters. */
export function makeGround(u: SkyUniforms, padRadius: number): THREE.Mesh {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400_000, 400_000).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: { ...u, uPad: { value: padRadius } },
      vertexShader: WORLD_VERTEX,
      fragmentShader: /* glsl */ `
uniform float uPad;
varying vec3 vWorld;
${NOISE2}
${SKY}
void main() {
  vec2 p = vWorld.xz;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 v = toCam / dist;
  float big = fbm2(p * 0.00012 + 3.0);
  float mid = fbm2(p * 0.0021);
  float fine = fbm2(p * 0.07);
  // Sea to the east, behind a wavy shoreline; a lagoon or two inland.
  float r = length(p);
  // The pad always stands on dry land, about 2 km from the beach.
  float shore = p.x - 2200.0 + (big - 0.5) * 9000.0 * smoothstep(1500.0, 9000.0, r) + (mid - 0.5) * 500.0;
  float sea = max(smoothstep(-30.0, 30.0, shore), smoothstep(0.66, 0.68, fbm2(p * 0.00035 + 20.0)) * smoothstep(2500.0, 5000.0, r));
  float sand = smoothstep(-160.0, -30.0, shore) * (1.0 - sea);
  vec3 scrub = mix(lin(vec3(0.20, 0.25, 0.14)), lin(vec3(0.33, 0.33, 0.20)), mid) * (0.7 + 0.6 * fine);
  scrub = mix(scrub, lin(vec3(0.30, 0.29, 0.22)), smoothstep(0.55, 0.7, big));
  vec3 col = mix(scrub, lin(vec3(0.66, 0.60, 0.48)), sand);
  // Apron, a crawlerway to the west and a perimeter road.
  float road = (1.0 - smoothstep(uPad * 0.10, uPad * 0.12, abs(p.y + 0.0))) * step(p.x, 0.0) * step(-uPad * 14.0, p.x);
  road = max(road, 1.0 - smoothstep(uPad * 0.035, uPad * 0.05, abs(r - uPad * 2.4)));
  float apron = max(1.0 - smoothstep(uPad * 0.96, uPad, r + (fine - 0.5) * uPad * 0.05), road);
  vec3 concrete = lin(vec3(0.52, 0.51, 0.49)) * (0.8 + 0.4 * fbm2(p * 0.35));
  concrete *= 1.0 - 0.6 * (1.0 - smoothstep(0.0, uPad * 0.5, abs(p.y))) * (1.0 - smoothstep(uPad * 0.3, uPad * 0.95, abs(p.x)));
  col = mix(col, concrete, apron * (1.0 - sea));
  // Dawn light: a low warm Sun plus blue sky light.
  vec3 light = vec3(1.0, 0.72, 0.5) * 0.5 * max(uSun.y * 3.0, 0.0) + lin(vec3(0.42, 0.52, 0.72)) * 0.75;
  col *= light;
  // Water: reflects the sky, with a glitter path toward the Sun.
  vec3 n = normalize(vec3((noise2(p * 0.05 + uTime * 0.3) - 0.5) * 0.16, 1.0, (noise2(p * 0.05 + 40.0 - uTime * 0.2) - 0.5) * 0.16));
  vec3 refl = reflect(-v, n);
  vec3 water = lin(vec3(0.03, 0.07, 0.12)) + skyColor(vec3(refl.x, abs(refl.y), refl.z)) * 0.45;
  water += vec3(1.0, 0.6, 0.3) * pow(max(dot(refl, uSun), 0.0), 220.0) * 6.0;
  col = mix(col, water, sea);
  // Haze toward the horizon; thinner when looking down from high up.
  float haze = 1.0 - exp(-dist * mix(0.00006, 0.00002, smoothstep(2000.0, 20000.0, cameraPosition.y)));
  col = mix(col, skyColor(vec3(-v.x, 0.0, -v.z)), haze);
  gl_FragColor = vec4(col, 1.0);
}
`,
    }),
  )
  return ground
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
  float a = smoothstep(0.52, 0.72, c);
  // Seen from below, the Sun side glows pink; from above it is bright white.
  float above = step(0.0, toCam.y);
  float toSun = pow(max(dot(normalize(-v.xz + 1e-5), normalize(uSun.xz)), 0.0), 2.0);
  vec3 under = mix(lin(vec3(0.42, 0.44, 0.56)), lin(vec3(1.0, 0.62, 0.45)), toSun) * (0.55 + 0.6 * c);
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

const PLUME_COLORS: Record<Propellant, { core: [number, number, number]; edge: [number, number, number]; diamonds: number; length: number }> = {
  kerolox: { core: [3.2, 2.0, 0.9], edge: [1.8, 0.55, 0.1], diamonds: 0.5, length: 1 },
  methalox: { core: [2.2, 2.0, 3.0], edge: [0.9, 0.5, 1.5], diamonds: 1, length: 0.9 },
  hydrolox: { core: [1.5, 1.9, 2.8], edge: [0.3, 0.45, 1.0], diamonds: 1, length: 0.7 },
  solid: { core: [3.6, 2.5, 1.2], edge: [2.4, 1.0, 0.25], diamonds: 0, length: 1.25 },
}

export interface Plume {
  mesh: THREE.Mesh
  /** Thrust 0 to 1, how far the plume has spread in thin air (0 sea level, 1 vacuum), and the clock for the flicker. */
  set(power: number, vacuum: number, time: number): void
  propellant: Propellant
}

let plumeGeometry: THREE.BufferGeometry | null = null

/** A flame hanging down -y from its origin: `radius` at the nozzle, about `length` long at sea level. */
export function makePlume(propellant: Propellant, radius: number, length: number, seed = 0): Plume {
  // One shared open cone, 1 long and 1 wide; the vertex shader shapes it.
  plumeGeometry ??= new THREE.CylinderGeometry(1, 1, 1, 28, 24, true).translate(0, -0.5, 0)
  const look = PLUME_COLORS[propellant]
  const uniforms = {
    uPower: { value: 0 },
    uVacuum: { value: 0 },
    uTime: { value: 0 },
    uSeed: { value: seed },
    uCore: { value: new THREE.Vector3(...look.core) },
    uEdge: { value: new THREE.Vector3(...look.edge) },
    uDiamonds: { value: look.diamonds },
  }
  const mesh = new THREE.Mesh(
    plumeGeometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
uniform float uVacuum;
varying float vAlong;
varying vec3 vN;
varying vec3 vView;
void main() {
  vAlong = -position.y;
  vec3 p = position;
  // Sea level: a long narrow flame. Thin air: the exhaust balloons out into a wide, short bell.
  float w = mix(1.0 + 0.9 * sqrt(vAlong) - 1.2 * vAlong * vAlong, 1.0 + 6.0 * pow(vAlong, 0.6), uVacuum);
  p.xz *= max(w, 0.05);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * vec3(normal.x, 0.25, normal.z));
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
uniform float uDiamonds;
varying float vAlong;
varying vec3 vN;
varying vec3 vView;
${NOISE2}
void main() {
  float facing = abs(dot(normalize(vN), normalize(vView)));
  float flick = 0.75 + 0.5 * noise2(vec2(vAlong * 7.0 - uTime * 11.0, uSeed * 13.0 + facing * 2.0));
  float fade = pow(1.0 - vAlong, mix(1.4, 2.6, uVacuum)) * smoothstep(0.0, 0.02, vAlong);
  float diamonds = 1.0 + uDiamonds * (1.0 - uVacuum) * 0.9 * pow(max(sin(vAlong * 44.0 - 0.6), 0.0), 3.0) * (1.0 - smoothstep(0.05, 0.5, vAlong));
  vec3 col = mix(uEdge, uCore, pow(facing, 2.5) * (1.0 - 0.75 * vAlong));
  float a = pow(facing, 1.3) * fade * flick * diamonds * uPower * mix(1.0, 0.22, uVacuum);
  gl_FragColor = vec4(col * a, 1.0);
}
`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  mesh.scale.set(radius, length * look.length, radius)
  mesh.frustumCulled = false
  mesh.visible = false
  return {
    mesh,
    propellant,
    set(power, vacuum, time) {
      mesh.visible = power > 0.001
      uniforms.uPower.value = power
      uniforms.uVacuum.value = vacuum
      uniforms.uTime.value = time
    },
  }
}

/** Soft additive glow at a nozzle, so a firing engine also reads from behind. */
export function makeGlow(propellant: Propellant, radius: number): THREE.Sprite {
  const [r, g, b] = PLUME_COLORS[propellant].core
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: new THREE.Color(r, g, b), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
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
  commit(sunView: THREE.Vector3, scale: number, inSpace: boolean): void
}

/** Camera-facing smoke puffs, drawn in one instanced call. Stateless: the scene refills them every frame. */
export function makePuffs(capacity: number): Puffs {
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
  const uniforms = {
    uSunView: { value: new THREE.Vector3(0, 1, 0) },
    uScale: { value: 1 },
    uLit: { value: new THREE.Vector3() },
    uShade: { value: new THREE.Vector3() },
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
void main() {
  vUv = uv * 2.0 - 1.0;
  vData = iData.yzw;
  float a = iData.w * 6.283;
  vec2 corner = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  mv.xy += corner * iData.x * uScale;
  gl_Position = projectionMatrix * mv;
}
`,
      fragmentShader: /* glsl */ `
uniform vec3 uSunView;
uniform vec3 uLit;
uniform vec3 uShade;
varying vec2 vUv;
varying vec3 vData;
${NOISE2}
void main() {
  float r = length(vUv);
  float n = fbm2(vUv * 1.7 + vData.z * 31.0);
  float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.9);
  if (a * vData.x < 0.004) discard;
  vec3 nrm = normalize(vec3(vUv, 0.6 + n * 0.6));
  float l = clamp(dot(nrm, uSunView) * 0.6 + 0.45, 0.0, 1.0);
  vec3 col = mix(uShade, uLit, l) * (0.7 + 0.6 * n);
  col += vec3(3.0, 1.1, 0.25) * vData.y * (1.0 - r * 0.6);
  gl_FragColor = vec4(col, a * vData.x);
}
`,
      transparent: true,
      depthWrite: false,
    }),
  )
  mesh.frustumCulled = false
  mesh.renderOrder = 5
  let n = 0
  return {
    mesh,
    begin() { n = 0 },
    add(x, y, z, size, alpha, heat, seed) {
      if (n >= capacity || alpha <= 0.004) return
      pos.setXYZ(n, x, y, z)
      data.setXYZW(n, size, alpha, heat, seed)
      n++
    },
    commit(sunView, scale, inSpace) {
      geo.instanceCount = n
      pos.needsUpdate = true
      data.needsUpdate = true
      mesh.visible = n > 0
      uniforms.uSunView.value.copy(sunView)
      uniforms.uScale.value = scale
      // Dawn on the ground: peach where the Sun hits, blue-grey in shade. In space: hard white and near-black.
      if (inSpace) { uniforms.uLit.value.set(1.1, 1.05, 1.0); uniforms.uShade.value.set(0.06, 0.07, 0.1) }
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
  float air = exp(-h / 16000.0) / (max(d.y, 0.0) + 0.06) * (1.0 + smoothstep(0.0, -0.03, d.y));
  float glow = 1.0 - exp(-air * 0.45);
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
