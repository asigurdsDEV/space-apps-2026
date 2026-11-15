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
  expect(menu).toContain('crew’s mission keeps running')
  expect(menu).not.toMatch(/\sopen[=> ]/)
})

it('keeps flight training inside the menu when the mission permits it', () => {
  const html = renderToStaticMarkup(<WorldMenu open={false} disabled={false} onOpenChange={() => {}}
    onClassic={() => {}} onExit={() => {}} onTraining={() => {}} online={false} />)
  expect(html.split('<dialog')[0]).not.toContain('Flight training')
  expect(html.split('<dialog')[1]).toContain('Flight training')
})
