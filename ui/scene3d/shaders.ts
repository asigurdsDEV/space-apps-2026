// GLSL for the planet, its clouds and its atmosphere. Everything is procedural (value-noise fbm),
// so there are no texture files to download. Colors are written in linear space; OutputPass does
// tone mapping and sRGB.

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
  for (int i = 0; i < 6; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + 0.17;
    amp *= 0.5;
  }
  return sum;
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
`

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

/**
 * uBody: 0 Earth, 1 Moon, 2 Mars. uSun: world-space direction to the Sun.
 * Optional real NASA maps (maps/index.ts): uMap + uHasMap, and for Earth uNight + uHasNight.
 * Without them (uHasMap 0) the body is drawn procedurally.
 */
export const planetShader = {
  vertexShader: VERTEX,
  fragmentShader: /* glsl */ `
uniform vec3 uSun;
uniform float uBody;
uniform sampler2D uMap;
uniform float uHasMap;
uniform sampler2D uNight;
uniform float uHasNight;
uniform sampler2D uHeight;
uniform float uHasHeight;
varying vec3 vObj;
varying vec3 vWorldN;
varying vec3 vWorldPos;
${NOISE}
uniform mat4 modelMatrix;
// Directions use the body's own lat/lon (degrees): +x at lon 0, +y north, east towards -z
// (the planet spins about +y, so the surface moves east).
vec3 latLon(float lat, float lon) {
  float a = radians(lat), b = radians(lon);
  return vec3(cos(a) * cos(b), sin(a), -cos(a) * sin(b));
}
// Equirectangular map coordinates. Picks whichever of two u's has no jump here, so mipmapping
// leaves no seam at lon 180 (Tarini's trick).
vec2 mapUv(vec3 p) {
  float u1 = atan(-p.z, p.x) / 6.2831853 + 0.5;
  float u2 = fract(u1 + 0.5) - 0.5;
  float u = fwidth(u1) <= fwidth(u2) + 1e-6 ? u1 : u2;
  return vec2(u, asin(clamp(p.y, -1.0, 1.0)) / 3.14159265 + 0.5);
}
// How the real ground slopes (LOLA / MOLA elevation, maps/README.md), as a tilt for the surface normal.
// \`steepness\` = map height range / distance across two texels, times the vertical exaggeration.
vec3 relief(vec3 p, float steepness) {
  vec2 uv = mapUv(p);
  vec2 e = vec2(1.0 / 512.0, 1.0 / 256.0);
  float rise_e = texture2D(uHeight, uv + vec2(e.x, 0.0)).r - texture2D(uHeight, uv - vec2(e.x, 0.0)).r;
  float rise_n = texture2D(uHeight, uv + vec2(0.0, e.y)).r - texture2D(uHeight, uv - vec2(0.0, e.y)).r;
  float c = sqrt(max(1.0 - p.y * p.y, 0.0));
  vec3 east = vec3(p.z, 0.0, -p.x) / max(c, 1e-4);
  vec3 north = cross(p, east);
  // A step east covers less ground near the poles; fade out at the pole itself, where the map is one stretched row.
  return -steepness * smoothstep(0.03, 0.2, c) * (rise_e / max(c, 0.2) * east + rise_n * north);
}
vec3 hash3(vec3 p) {
  return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}
// 1 inside a circle of angular radius r (radians) around c, soft edge.
float blob(vec3 p, vec3 c, float r) {
  return 1.0 - smoothstep(r - 0.07, r + 0.05, acos(clamp(dot(p, c), -1.0, 1.0)));
}
// Impact craters (cellular noise). Returns how far to tilt the normal; bowl/rim say where floors and rims are.
vec3 craters(vec3 p, float scale, float density, out float bowl, out float rim) {
  vec3 q = p * scale;
  vec3 c = floor(q);
  vec3 f = q - c;
  float best = 9.0;
  vec3 bv = vec3(1.0);
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 o = vec3(x, y, z);
    vec3 k = hash3(c + o + 19.0);
    if (k.y > density) continue;
    vec3 r = o + hash3(c + o) - f;
    float d = length(r) / (0.16 + 0.30 * k.x * k.x); // many small craters, few big ones
    if (d < best) { best = d; bv = r; }
  }
  float e = exp(-pow((best - 1.0) / 0.25, 2.0));
  bowl = best < 1.0 ? 1.0 - best * best : 0.0;
  rim = e;
  if (best > 1.7) return vec3(0.0);
  float slope = (best < 1.0 ? 2.0 * best : 0.0) - 4.8 * (best - 1.0) * e;
  vec3 out_ = -normalize(bv + 1e-5); // from the crater centre outwards
  out_ -= p * dot(out_, p);
  return -out_ * slope * 0.16;
}
// Bright streaks of ejecta around a young crater at c, out to reach radians.
float rays(vec3 p, vec3 c, float reach) {
  vec3 t1 = normalize(cross(c, vec3(0.0, 1.0, 0.0)));
  vec3 t2 = cross(c, t1);
  float ang = atan(dot(p, t2), dot(p, t1));
  float dist = acos(clamp(dot(p, c), -1.0, 1.0));
  float streak = smoothstep(0.55, 0.9, noise(vec3(cos(ang) * 7.0, sin(ang) * 7.0, 4.0)));
  return 0.22 * streak * (1.0 - smoothstep(0.02, reach, dist)) + 0.3 * (1.0 - smoothstep(0.0, 0.03, dist));
}
// A shield volcano of angular radius r at c: tilt outward on its flanks, caldera = 1 at the summit.
vec3 volcano(vec3 p, vec3 c, float r, inout float caldera) {
  float s = acos(clamp(dot(p, c), -1.0, 1.0)) / r;
  if (s > 1.2) return vec3(0.0);
  caldera = max(caldera, 1.0 - smoothstep(0.08, 0.16, s));
  vec3 out_ = normalize(p - c + 1e-5);
  out_ -= p * dot(out_, p);
  float flank = smoothstep(0.12, 0.2, s) * (1.0 - smoothstep(0.9, 1.15, s));
  float pit = 1.0 - smoothstep(0.06, 0.12, s);
  return out_ * (0.22 * flank - 0.3 * pit);
}
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
  bool mapped = uHasMap > 0.5;
  // Real albedo from the NASA map (linear: the texture is sRGB), when there is one.
  vec3 m = mapped ? texture2D(uMap, mapUv(p)).rgb : vec3(0.0);
  float fine = fbm(p * 48.0);

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
    if (mapped) {
      // Blue Marble: oceans are the only places much bluer than red or green; ice is bright everywhere.
      ice = smoothstep(0.35, 0.6, min(m.r, min(m.g, m.b)));
      water = smoothstep(0.01, 0.03, m.b - max(m.r, m.g)) * (1.0 - ice);
      land = (1.0 - water) * (1.0 - ice);
      col = m;
    }
  } else if (uBody < 1.5) {
    // The Moon: dark maria where they really are (the near side faces +x), bright cratered highlands.
    float maria = 0.0;
    float edge = 0.16 * (fbm(p * 4.0 + 2.0) - 0.5) + 0.07 * (fbm(p * 13.0) - 0.5);
    maria = max(maria, blob(p, latLon(33.0, -16.0), 0.36 + edge)); // Imbrium
    maria = max(maria, blob(p, latLon(18.0, -57.0), 0.50 + edge)); // Oceanus Procellarum
    maria = max(maria, blob(p, latLon(28.0, 17.0), 0.18 + edge));  // Serenitatis
    maria = max(maria, blob(p, latLon(8.0, 31.0), 0.25 + edge));   // Tranquillitatis
    maria = max(maria, blob(p, latLon(17.0, 59.0), 0.16 + edge));  // Crisium
    maria = max(maria, blob(p, latLon(-8.0, 51.0), 0.17 + edge));  // Fecunditatis
    maria = max(maria, blob(p, latLon(-21.0, -17.0), 0.20 + edge)); // Nubium
    maria *= 0.75 + 0.25 * fbm(p * 6.0 + 9.0);
    if (mapped) maria = 1.0 - smoothstep(0.08, 0.2, dot(m, vec3(0.3, 0.59, 0.11)));
    col = mix(lin(vec3(0.66, 0.65, 0.62)), mix(lin(vec3(0.24, 0.24, 0.26)), lin(vec3(0.34, 0.32, 0.30)), detail), maria);
    // Maria are younger lava, so they have far fewer craters than the highlands.
    float bowl, rim, bowl2, rim2;
    vec3 bigT = craters(p, 7.0, 0.55, bowl, rim) * (1.0 - 0.7 * maria);
    vec3 smallT = craters(p, 19.0, 0.8, bowl2, rim2) * (1.0 - 0.4 * maria);
    vec3 tilt = bigT + smallT;
    if (mapped) {
      // LRO already shows the real maria, big craters and rays; the procedural craters add relief only.
      // Big procedural craters would be in made-up places, so mostly the small ones stay.
      col = m * (1.0 - 0.06 * bowl2 + 0.08 * rim2);
      tilt = 0.25 * bigT + 0.8 * smallT;
      // Real basins, crater walls and mountains from LOLA: 19.9 km of height over 42.6 km of ground, drawn 5x steeper so it reads from orbit.
      if (uHasHeight > 0.5) tilt = 0.6 * smallT + relief(p, 0.47 * 5.0);
    } else {
      col *= 1.0 - 0.16 * (bowl + 0.6 * bowl2) + 0.22 * (rim + 0.6 * rim2);
      // Bright rays from the young craters Tycho and Copernicus.
      col += lin(vec3(0.75)) * (rays(p, latLon(-43.0, -11.0), 0.9) + 0.6 * rays(p, latLon(10.0, -20.0), 0.45));
      col *= 0.86 + 0.28 * detail;
    }
    n = normalize(mat3(modelMatrix) * normalize(p + tilt));
  } else {
    // Mars: ochre dust and dark basalt, with its biggest landmarks in their real places.
    float darkMask = smoothstep(0.50, 0.66, fbm(p * 2.2 + 5.0) + 0.16 * (1.0 - smoothstep(0.05, 0.40, abs(p.y + 0.25))));
    vec3 ochre = mix(lin(vec3(0.72, 0.38, 0.19)), lin(vec3(0.84, 0.53, 0.30)), detail);
    vec3 basalt = mix(lin(vec3(0.30, 0.16, 0.10)), lin(vec3(0.42, 0.24, 0.15)), detail);
    col = mix(ochre, basalt, 0.85 * darkMask);
    // Hellas: a huge, bright impact basin in the south.
    col = mix(col, lin(vec3(0.86, 0.62, 0.42)), 0.6 * blob(p, latLon(-42.0, 70.0), 0.30 + 0.08 * (detail - 0.5)));
    // Southern highlands are old and heavily cratered; the northern lowlands are smooth.
    float bowl, rim;
    vec3 tilt = craters(p, 9.0, 0.6, bowl, rim) * (0.25 + 0.75 * smoothstep(0.25, -0.35, p.y));
    vec3 craterTilt = tilt;
    col *= 1.0 - 0.12 * bowl + 0.08 * rim;
    // Tharsis: Olympus Mons, the tallest volcano in the solar system, and the three Tharsis Montes.
    float caldera = 0.0;
    tilt += volcano(p, latLon(18.6, -134.0), 0.17, caldera) * 1.4;
    tilt += volcano(p, latLon(-8.3, -121.0), 0.07, caldera);
    tilt += volcano(p, latLon(0.8, -113.0), 0.06, caldera);
    tilt += volcano(p, latLon(11.8, -104.0), 0.06, caldera);
    col = mix(col, lin(vec3(0.80, 0.50, 0.30)), 0.25 * caldera) * (1.0 - 0.35 * smoothstep(0.7, 1.0, caldera));
    // Valles Marineris: a canyon 4,000 km long just south of the equator.
    float lon = degrees(atan(-p.z, p.x));
    float off = abs(degrees(asin(clamp(p.y, -1.0, 1.0))) + 8.0 + 2.0 * sin(radians(lon) * 9.0) + 3.0 * (fbm(p * 14.0) - 0.5));
    float canyon = (1.0 - smoothstep(0.6, 2.2, off)) * smoothstep(-112.0, -100.0, lon) * (1.0 - smoothstep(-40.0, -28.0, lon));
    col *= 1.0 - 0.55 * canyon;
    tilt += vec3(0.0, sign(-8.0 - degrees(asin(clamp(p.y, -1.0, 1.0)))), 0.0) * 0.25 * canyon * smoothstep(0.3, 1.6, off);
    // Polar caps of water and CO2 ice; the northern one is bigger.
    float ice = max(smoothstep(0.935, 0.95, p.y + 0.03 * (detail - 0.5)), smoothstep(0.962, 0.975, -p.y + 0.03 * (detail - 0.5)));
    col = mix(col, lin(vec3(0.95, 0.93, 0.90)), ice);
    if (mapped) {
      // Viking shows the real dark regions, Hellas and the caps; keep the relief and small craters.
      ice = smoothstep(0.4, 0.6, min(m.r, min(m.g, m.b)));
      col = m * (1.0 - 0.08 * bowl + 0.06 * rim) * (1.0 - 0.3 * canyon);
      // The real Olympus Mons, Tharsis, Valles Marineris and Hellas from MOLA replace the drawn ones:
      // 29.4 km of height over 83.2 km of ground, drawn 5x steeper so it reads from orbit.
      if (uHasHeight > 0.5) {
        tilt = 0.6 * craterTilt + relief(p, 0.35 * 5.0);
        col = m * (1.0 - 0.08 * bowl + 0.06 * rim);
      }
    }
    n = normalize(mat3(modelMatrix) * normalize(p + tilt * (1.0 - ice)));
  }

  // Fine detail so close-ups aren't smooth (softer over a real map, none on open water).
  col *= mix(mapped ? 0.93 + 0.14 * fine : 0.86 + 0.28 * fine, 1.0, water);

  float d = dot(n, uSun);
  vec3 lit = col * (0.012 + 1.25 * max(d, 0.0));

  // Sun glint on the oceans.
  vec3 hv = normalize(uSun + v);
  // Real oceans cover far more of the disc than the old noise did, so the glint is tighter and dimmer.
  lit += water * pow(max(dot(n, hv), 0.0), mapped ? 600.0 : 160.0) * vec3(1.0, 0.85, 0.6) * (mapped ? 0.45 : 0.9) * step(0.0, d);

  // City lights on the night side.
  if (uBody < 0.5) {
    float night = 1.0 - smoothstep(-0.12, 0.08, d);
    float city = smoothstep(0.70, 0.80, noise(p * 140.0)) * smoothstep(0.45, 0.70, noise(p * 18.0 + 5.0)) * land;
    if (uHasNight > 0.5) {
      // Black Marble: lights are warm (red well above blue); the dim land behind them is blue.
      vec3 nm = texture2D(uNight, mapUv(p)).rgb;
      // The map is coarse, so break each glow into separate towns.
      city = smoothstep(0.02, 0.35, nm.r - 0.6 * nm.b) * (0.25 + 1.3 * smoothstep(0.5, 0.8, noise(p * 220.0)));
    }
    lit += night * city * vec3(1.0, 0.62, 0.28) * (uHasNight > 0.5 ? 0.9 : 1.4);
  }

  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  if (uBody < 0.5) {
    // Earth's air between the ground and the eye: almost none looking straight down, a pale blue veil toward the
    // horizon. It depends only on the angle, so it holds from the pad's altitude to a far view, at any scene scale.
    float veil = 1.0 - exp(-0.04 * (1.0 / max(dot(n, v), 0.04) - 1.0));
    vec3 air = mix(vec3(0.16, 0.38, 0.95), vec3(0.62, 0.8, 1.0), veil) * smoothstep(-0.2, 0.35, d);
    lit = mix(lit, air, 0.85 * veil);
  } else if (uBody > 1.5) {
    // Mars: a thin dusty rim, a from-afar effect; just above the surface every angle is grazing, so fade it out.
    float far = smoothstep(1.25, 2.4, length(cameraPosition));
    lit += vec3(0.8, 0.45, 0.3) * 0.4 * fres * smoothstep(-0.2, 0.4, d) * mix(0.12, 0.9, far);
  }

  gl_FragColor = vec4(lit, 1.0);
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
  // Cloud cells and streets, the size you see from low orbit (tens of km): without them a close view is a flat haze.
  float cells = fbm(p * 170.0 + c * 3.0);
  c += 0.2 * (cells - 0.5);
  // Real cloud belts: the stormy equator (ITCZ) and mid-latitudes, clearer subtropics where deserts sit.
  float lat = abs(p.y);
  float belt = 0.07 * exp(-pow(p.y / 0.12, 2.0)) - 0.08 * exp(-pow((lat - 0.42) / 0.13, 2.0)) + 0.06 * exp(-pow((lat - 0.78) / 0.12, 2.0));
  float cover = smoothstep(0.55 - belt, 0.82 - belt, c) * (1.0 - 0.6 * smoothstep(0.85, 0.95, lat));
  float d = dot(normalize(vWorldN), uSun);
  // Thick cores are bright, thin edges and the gaps between cells are grey: that relief is what reads as cloud.
  float light = (0.01 + 1.1 * smoothstep(-0.08, 0.35, d)) * (0.72 + 0.28 * cover) * (0.86 + 0.28 * cells);
  // Low Sun reddens the tops along the day/night line.
  vec3 tint = mix(vec3(1.0), vec3(1.0, 0.62, 0.38), exp(-pow(d / 0.16, 2.0)));
  gl_FragColor = vec4(light * tint, cover * 0.9);
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
  float sun = dot(n, uSun);
  float day = 0.08 + 0.92 * smoothstep(-0.35, 0.45, sun);
  // At the day/night line light crosses the most air: orange sunsets on Earth, blue ones on Mars,
  // which is just the air's colour reversed (uColor.bgr).
  vec3 tint = mix(uColor, uColor.bgr, 0.6 * exp(-pow((sun + 0.05) / 0.18, 2.0)));
  gl_FragColor = vec4(tint * glow * day * 1.8, 1.0);
}
`,
}

/**
 * For a scene that draws straight to the screen, with no OutputPass after it: the shaders above write linear light,
 * so this adds the renderer's tone mapping and colour-space step at the end of `main`.
 */
export const toScreen = <S extends { fragmentShader: string }>(shader: S): S => ({
  ...shader,
  fragmentShader: shader.fragmentShader.replace(/\}\s*$/, '  #include <tonemapping_fragment>\n  #include <colorspace_fragment>\n}\n'),
})
