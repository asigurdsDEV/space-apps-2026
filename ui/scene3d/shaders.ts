// GLSL for the planet, its clouds and its atmosphere. Everything is procedural (value-noise fbm),
// so there are no texture files to download. Colors are written in linear space. The two includes
// that end each shader do tone mapping and sRGB when drawing straight to the screen and nothing
// when drawing into the bloom composer (its OutputPass does both). OCTAVES is set per device.

const NOISE = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + 0.17;
    amp *= 0.5;
  }
  return sum;
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
`

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`

const VERTEX = /* glsl */ `
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
`

/** uBody: 0 Earth, 1 Moon, 2 Mars. uSun: world-space direction to the Sun. */
export const planetShader = {
  vertexShader: VERTEX,
  fragmentShader: /* glsl */ `
uniform vec3 uSun;
uniform float uBody;
varying vec3 vObj;
varying vec3 vWorldN;
varying vec3 vWorldPos;
${NOISE}
void main() {
  vec3 n = normalize(vWorldN);
  vec3 p = normalize(vObj);
  vec3 v = normalize(cameraPosition - vWorldPos);
  float lat = abs(p.y);
  float h = fbm(p * 2.6 + 3.1);
  float detail = fbm(p * 9.0);
  vec3 col;
  float water = 0.0;
  float land = 0.0;

  if (uBody < 0.5) {
    land = smoothstep(0.532, 0.546, h);
    vec3 ocean = mix(lin(vec3(0.02, 0.07, 0.20)), lin(vec3(0.04, 0.22, 0.42)), smoothstep(0.35, 0.532, h));
    float dry = smoothstep(0.45, 0.75, fbm(p * 3.0 + 11.0)) * (1.0 - smoothstep(0.25, 0.55, lat));
    vec3 green = mix(lin(vec3(0.12, 0.28, 0.10)), lin(vec3(0.30, 0.36, 0.16)), detail);
    vec3 desert = mix(lin(vec3(0.62, 0.50, 0.32)), lin(vec3(0.74, 0.60, 0.40)), detail);
    vec3 ground = mix(green, desert, dry);
    ground = mix(ground, lin(vec3(0.42, 0.38, 0.34)), smoothstep(0.66, 0.78, h));
    col = mix(ocean, ground, land);
    float ice = smoothstep(0.80, 0.86, lat + 0.07 * (detail - 0.5));
    col = mix(col, lin(vec3(0.90, 0.94, 1.0)), ice);
    water = (1.0 - land) * (1.0 - ice);
    land *= 1.0 - ice;
  } else if (uBody < 1.5) {
    float maria = smoothstep(0.50, 0.60, fbm(p * 1.6 + 7.0));
    col = mix(lin(vec3(0.62, 0.61, 0.58)), lin(vec3(0.30, 0.30, 0.31)), maria);
    float pits = smoothstep(0.62, 0.70, noise(p * 22.0)) - 0.5 * smoothstep(0.66, 0.74, noise(p * 22.0 + 0.04));
    col *= 0.78 + 0.35 * detail + 0.25 * pits;
  } else {
    col = mix(lin(vec3(0.55, 0.24, 0.11)), lin(vec3(0.78, 0.47, 0.27)), smoothstep(0.35, 0.65, h + 0.3 * detail));
    col = mix(col, lin(vec3(0.95, 0.93, 0.90)), smoothstep(0.86, 0.90, lat + 0.05 * detail));
  }

  // Fine detail so close-ups aren't smooth.
  col *= 0.86 + 0.28 * fbm(p * 48.0);

  float d = dot(n, uSun);
  vec3 lit = col * (0.012 + 1.25 * max(d, 0.0));

  // Sun glint on the oceans.
  vec3 hv = normalize(uSun + v);
  lit += water * pow(max(dot(n, hv), 0.0), 160.0) * vec3(1.0, 0.85, 0.6) * 0.9 * step(0.0, d);

  // City lights on the night side.
  if (uBody < 0.5) {
    float night = 1.0 - smoothstep(-0.12, 0.08, d);
    float city = smoothstep(0.70, 0.80, noise(p * 140.0)) * smoothstep(0.45, 0.70, noise(p * 18.0 + 5.0));
    lit += night * city * land * vec3(1.0, 0.62, 0.28) * 1.4;
  }

  // Thin blue rim on the day side.
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 rim = uBody < 0.5 ? vec3(0.25, 0.5, 1.0) : uBody > 1.5 ? vec3(0.8, 0.45, 0.3) * 0.4 : vec3(0.0);
  // The rim is a from-afar effect; just above the surface every angle is grazing, so fade it out.
  float far = smoothstep(1.25, 2.4, length(cameraPosition));
  lit += rim * fres * smoothstep(-0.2, 0.4, d) * mix(0.12, 0.9, far);

  gl_FragColor = vec4(lit, 1.0);
${OUTPUT}
}
`,
}

export const cloudShader = {
  vertexShader: VERTEX,
  fragmentShader: /* glsl */ `
uniform vec3 uSun;
uniform float uTime;
varying vec3 vObj;
varying vec3 vWorldN;
varying vec3 vWorldPos;
${NOISE}
void main() {
  vec3 p = normalize(vObj);
  vec3 q = p * vec3(3.2, 6.0, 3.2) + vec3(uTime * 0.004, 0.0, uTime * 0.002);
  float c = fbm(q + 0.6 * vec3(fbm(q + 1.7), fbm(q + 9.2), 0.0));
  // Break big patches into puffs and streaks so close-ups show cloud, not fog.
  c += 0.35 * (fbm(p * 28.0 + c * 2.0) - 0.5);
  c = smoothstep(0.56, 0.82, c) * (1.0 - 0.6 * smoothstep(0.85, 0.95, abs(p.y)));
  float d = dot(normalize(vWorldN), uSun);
  float light = 0.01 + 1.1 * smoothstep(-0.08, 0.35, d);
  gl_FragColor = vec4(vec3(light), c * 0.8);
${OUTPUT}
}
`,
}

/** Drawn on the back faces of a slightly larger sphere, added on top. */
export const atmosphereShader = {
  vertexShader: VERTEX,
  fragmentShader: /* glsl */ `
uniform vec3 uSun;
uniform vec3 uColor;
uniform float uThickness;
varying vec3 vObj;
varying vec3 vWorldN;
varying vec3 vWorldPos;
void main() {
  vec3 n = normalize(vWorldN);
  vec3 v = normalize(cameraPosition - vWorldPos);
  // Back faces: 0 at the outer edge of the shell, about uThickness where it meets the planet's limb.
  float depth = clamp(-dot(n, v) / uThickness, 0.0, 1.0);
  float glow = pow(depth, 2.2);
  float day = 0.08 + 0.92 * smoothstep(-0.35, 0.45, dot(n, uSun));
  gl_FragColor = vec4(uColor * glow * day * 1.8, 1.0);
${OUTPUT}
}
`,
}
