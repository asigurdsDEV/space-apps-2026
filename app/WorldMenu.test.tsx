import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { WorldMenu } from './WorldMenu'

it('places utility controls in a labelled native dialog, leaving one gameplay menu trigger', () => {
  const html = renderToStaticMarkup(<WorldMenu open={false} disabled={false} onOpenChange={() => {}}
    onClassic={() => {}} onExit={() => {}} online />)
  const [gameplay, menu] = html.split('<dialog')
  expect(gameplay.match(/<button/g)).toHaveLength(1)
  expect(gameplay).toContain('aria-haspopup="dialog"')
  expect(menu).toContain('Mission menu')
  expect(menu).toContain('Back to game')
  expect(menu).toContain('Classic view')
  expect(menu).toContain('Live Earth')
  expect(menu).toContain('crew’s mission keeps running')
  expect(menu).not.toMatch(/\sopen[=> ]/)
})

it('keeps flight training inside the menu when the mission permits it', () => {
  const html = renderToStaticMarkup(<WorldMenu open={false} disabled={false} onOpenChange={() => {}}
    onClassic={() => {}} onExit={() => {}} onTraining={() => {}} online={false} />)
  expect(html.split('<dialog')[0]).not.toContain('Survey the planet')
  expect(html.split('<dialog')[1]).toContain('Survey the planet')
})

it('places earned campaign funding inside the same single menu, without a second overlay', () => {
  const html = renderToStaticMarkup(<WorldMenu open={false} disabled={false} onOpenChange={() => {}}
    onClassic={() => {}} onExit={() => {}} online={false}><p>Next grant approved: $300M</p></WorldMenu>)
  expect(html.split('<dialog')[0]).not.toContain('Next grant approved')
  expect(html.split('<dialog')[1]).toContain('Next grant approved: $300M')
  expect(html.match(/<dialog/g)).toHaveLength(1)
})

it('offers volume and mouse sensitivity as labelled sliders, and no fullscreen button where the browser has none', () => {
  const html = renderToStaticMarkup(<WorldMenu open={false} disabled={false} onOpenChange={() => {}}
    onClassic={() => {}} onExit={() => {}} online={false} />)
  const menu = html.split('<dialog')[1]
  expect(menu).toMatch(/<label[^>]*>Volume<input type="range"[^>]*value="100"/)
  expect(menu).toMatch(/<label[^>]*>Mouse sensitivity<input type="range"[^>]*value="100"/) // 1 is today's feel
  expect(menu).not.toContain('Fullscreen')
})
