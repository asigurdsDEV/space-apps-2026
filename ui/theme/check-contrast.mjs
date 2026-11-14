import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')
// shortcut: reads literal hex palettes only; use computed browser styles if tokens become derived colors.
const palettes = [...css.matchAll(/\{([^{}]+)\}/g)]
  .map((block) => Object.fromEntries([...block[1].matchAll(/--game-([\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map((match) => [match[1], match[2]])))
  .filter((palette) => palette.bg)
// Dark is the default (arcade look); light is explicit only, so there are 2 palettes (3 if an automatic light block returns).
assert.ok(palettes.length >= 2)
if (palettes.length === 3) assert.deepEqual(palettes[1], palettes[2], 'Automatic and explicit light palettes must match')

function luminance(hex) {
  const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (high + 0.05) / (low + 0.05)
}

for (const [index, palette] of [palettes[0], palettes[1]].entries()) {
  const mode = index === 0 ? 'dark' : 'light'
  function check(foreground, background, minimum) {
    const ratio = contrast(palette[foreground], palette[background])
    assert.ok(ratio >= minimum, `${mode}: ${foreground}/${background} is ${ratio.toFixed(2)}:1; needs ${minimum}:1`)
  }
  for (const foreground of ['text', 'muted', 'accent', 'success', 'warning', 'danger']) {
    for (const background of ['bg', 'panel', 'surface', 'selected']) check(foreground, background, 4.5)
  }
  check('on-accent', 'accent', 4.5)
  for (const foreground of ['border', 'focus']) {
    for (const background of ['bg', 'panel']) check(foreground, background, 3)
  }
  console.log(`${mode}: text/status/primary labels >= 4.5:1; control borders/focus >= 3:1`)
}
