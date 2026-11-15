import { expect, it } from 'vitest'
import { liveEarthShader } from './earthShader'

// The live picture is spliced into ui/scene3d's planet shader by text. If that shader is reworded, this fails
// instead of the globe quietly losing the picture.
it('adds the live picture to the game’s Earth shader', () => {
  const glsl = liveEarthShader.fragmentShader
  expect(glsl).toContain('uniform sampler2D uLive;')
  expect(glsl).toContain('uniform float uLiveMix;')
  expect(glsl).toContain('m = mix(m, live, uLiveMix')
  // Drawn straight to the screen, so it tone-maps itself.
  expect(glsl).toContain('#include <tonemapping_fragment>')
})
