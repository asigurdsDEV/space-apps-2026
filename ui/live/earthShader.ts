// The game's Earth shader with one more layer: yesterday's real picture over the bundled map.
import { planetShader, toScreen } from '../scene3d/shaders'

const MAP = 'vec3 m = mapped ? texture2D(uMap, mapUv(p)).rgb : vec3(0.0);'

/**
 * planetShader plus `uLive` (the GIBS picture) and `uLiveMix` (0 to 1, for the fade-in). The picture's no-data and
 * polar night are pure black (README.md: under 6/255 in every channel, which is 0.002 in linear light), and there the
 * bundled map shows through. earthShader.test.ts fails if planetShader changes so that this no longer fits.
 */
export const liveEarthShader = toScreen({
  ...planetShader,
  fragmentShader: planetShader.fragmentShader
    .replace('uniform float uHasMap;', 'uniform float uHasMap;\nuniform sampler2D uLive;\nuniform float uLiveMix;')
    .replace(MAP, `${MAP}
  vec3 live = texture2D(uLive, mapUv(p)).rgb;
  m = mix(m, live, uLiveMix * smoothstep(0.0015, 0.004, max(live.r, max(live.g, live.b))));`),
})
