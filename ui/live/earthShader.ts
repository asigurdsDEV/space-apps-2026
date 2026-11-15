// The game's Earth shader with one more layer: yesterday's real picture over the bundled map.
import { planetShader, toScreen } from '../scene3d/shaders'

const MAP = 'vec3 m = mapped ? texture2D(uMap, mapUv(p)).rgb : vec3(0.0);'

/**
 * planetShader plus `uLive` (the GIBS picture) and `uLiveMix` (0 to 1, for the fade-in). The picture's no-data and
 * polar night are pure black (README.md: under 6/255 in every channel, which is 0.002 in linear light), and there the
 * bundled map shows through; near the winter pole the picture fades out before its ragged edge. earthShader.test.ts fails if planetShader changes so that this no longer fits.
 */
export const liveEarthShader = toScreen({
  ...planetShader,
  fragmentShader: planetShader.fragmentShader
    .replace('uniform float uHasMap;', 'uniform float uHasMap;\nuniform sampler2D uLive;\nuniform float uLiveMix;')
    .replace(MAP, `${MAP}
  vec3 live = texture2D(uLive, mapUv(p)).rgb;
  // Toward the winter pole the picture ends in a ragged edge of whole passes, where the midday Sun stood under about 14 degrees.
  // Fade it out before that edge. uSun.y is the sine of the Sun's height over the equator: this scene keeps north up.
  // shortcut: the 14 degrees is read off one day's picture (2026-11-14, edge at 57 to 62 N); check it again near midsummer.
  float noonSun = p.y * uSun.y + sqrt(max(0.0, (1.0 - p.y * p.y) * (1.0 - uSun.y * uSun.y)));
  m = mix(m, live, uLiveMix * smoothstep(0.25, 0.36, noonSun) * smoothstep(0.0015, 0.004, max(live.r, max(live.g, live.b))));`),
})
