// A loose flock of shore birds over the launch site: they drift across the sky before launch and scatter when the
// engines light. One instanced draw; every bird's place is worked out in the vertex shader from the clock alone.
import * as THREE from 'three'

export interface Birds {
  mesh: THREE.Mesh
  /** Seconds since the engines lit; negative before. */
  scatter: { value: number }
}

/** `time` is the scene's clock uniform. Sizes and speeds scale with the rocket's `height`, like the rest of the site. */
export function makeBirds(count: number, height: number, time: { value: number }): Birds {
  // Two triangles: a wing each side of the body line.
  const geo = new THREE.InstancedBufferGeometry()
  geo.instanceCount = count
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.4, 0, 0, -0.3, -1, 0, -0.15, 1, 0, -0.15]), 3))
  geo.setIndex([0, 2, 1, 0, 1, 3])
  const scatter = { value: -1 }
  const mesh = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { uTime: time, uScatter: scatter, uH: { value: height } },
      vertexShader: /* glsl */ `
uniform float uTime;
uniform float uScatter;
uniform float uH;
float hash1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  float id = float(gl_InstanceID);
  vec3 rnd = vec3(hash1(id + 0.1), hash1(id + 0.37), hash1(id + 0.73));
  // Before launch: strung out over the inlet between the pad and the countdown camera (it stands 3.3 uH south), west
  // of its line of sight to the rocket and fanning out with distance from it, so near and far birds are all in frame.
  vec3 cruise = vec3(0.075 + 0.03 * rnd.y, 0.0, -0.012) * uH;
  float south = 0.3 + 1.5 * rnd.z;
  vec3 at = vec3(0.24 * south - (0.06 + 0.34 * rnd.x) * (3.2 - south), 0.34 + 0.2 * rnd.y, south) * uH + cruise * uTime;
  at.y += sin(uTime * 0.9 + id) * 0.008 * uH;
  // The noise reaches each bird a moment apart; then it flees as fast as it can.
  float s = max(uScatter - rnd.z * 0.5, 0.0);
  // Out over the sea behind the pad, fanning apart: away from the cameras too, so they shrink to specks.
  vec3 flee = normalize(vec3(at.x + (rnd.x - 0.5) * uH, 0.0, -(0.5 + rnd.y) * uH)) * 0.26 * uH + vec3(0.0, 0.05 + 0.05 * rnd.x, 0.0) * uH;
  float go = s * s / (s + 0.6);
  at += flee * go;
  vec3 fwd = normalize(mix(cruise, flee, smoothstep(0.0, 0.5, s)));
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  // Flapping: quick while fleeing, with short glides while cruising.
  float beat = uTime * (7.0 + 3.0 * rnd.x + 6.0 * step(0.001, s)) + id * 2.4;
  float flap = sin(beat) * mix(smoothstep(-0.3, 0.3, sin(uTime * 0.7 + id * 1.7)), 1.0, step(0.001, s));
  float span = uH * 0.011 * (0.8 + 0.4 * rnd.y);
  vec3 p = position;
  float wing = abs(p.x);
  p.y = wing * (0.15 + 0.6 * flap);
  p.x *= 1.0 - 0.25 * abs(flap);
  vec3 world = at + (side * p.x + vec3(0.0, 1.0, 0.0) * p.y + fwd * p.z) * span;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`,
      // Dark against the sky, as birds are at any distance.
      fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(0.012, 0.013, 0.016, 1.0); }`,
      side: THREE.DoubleSide,
    }),
  )
  mesh.frustumCulled = false
  return { mesh, scatter }
}
