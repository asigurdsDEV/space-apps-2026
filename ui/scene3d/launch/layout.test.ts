import { describe, expect, it } from 'vitest'
import { ASSEMBLY, CRAWLER_TURN, shoreWobble, siteLayout, siteUnit, waterDepth } from './layout'
import { buildRocket } from './rocket'
import { KNOWN, rocketHeight, rocketSpec } from './vehicles'

// The shader moves the waterline by up to shoreWobble, so "dry" means dry by more than that.
const dry = (x: number, z: number, u: number) => waterDepth(x, z, u) + shoreWobble(x, z, u) < 0
const wet = (x: number, z: number, u: number) => waterDepth(x, z, u) - shoreWobble(x, z, u) > 0

describe('the launch site', () => {
  const ids = [...Object.keys(KNOWN).filter((id) => !KNOWN[id]!.airLaunch), 'unknown']
  for (const id of ids) {
    it(`keeps every structure of ${id}'s complex on dry land, with water in front and the sea behind`, () => {
      const spec = rocketSpec({ id, name: id, props: {} })
      const height = rocketHeight(spec)
      const site = siteLayout(height, buildRocket(spec).footprint)
      const u = site.unit
      expect(u).toBe(siteUnit(height))
      const spots: [string, number, number][] = [
        ...site.masts.map(([x, z]): [string, number, number] => ['mast', x, z]),
        ...site.anchors.map(([x, z]): [string, number, number] => ['anchor', x, z]),
        ['water tower', ...site.waterTower],
        ...site.spheres.map(([x, z]): [string, number, number] => ['sphere', x, z]),
        ...site.sheds.map(([x, z]): [string, number, number] => ['shed', x, z]),
        // The mound's corners (site.ts: its foot is 5.3 mounts long and reaches 1.71 mounts out).
        ['mound', 2.65 * site.mount, 1.71 * site.mount],
        ['mound', -2.65 * site.mount, -1.71 * site.mount],
      ]
      for (const [what, x, z] of spots) expect(dry(x, z, u), `${what} at ${x.toFixed(0)}, ${z.toFixed(0)}`).toBe(true)
      // The crawlerway: west from the pad, then on to the assembly building.
      for (let f = 0; f <= 1; f += 0.05) {
        expect(dry(-CRAWLER_TURN * u * f, 0, u), `crawlerway west ${f}`).toBe(true)
        expect(dry(-CRAWLER_TURN * u + (ASSEMBLY[0] + CRAWLER_TURN * u) * f, ASSEMBLY[1] * f, u), `crawlerway north ${f}`).toBe(true)
      }
      // The pad-shot camera looks from over the inlet (scene.ts: about 0.7 heights east, 3 south) at the sea behind the pad.
      expect(wet(0.7 * height, 3 * height, u)).toBe(true)
      expect(wet(0, -3 * u, u)).toBe(true)
      expect(wet(12 * u, 0, u)).toBe(true)
    })
  }
})
