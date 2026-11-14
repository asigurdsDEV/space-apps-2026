import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Walk, WalkTo } from './Walk'

describe('Walk', () => {
  it('is today\'s screens, with no hall, where there is no WebGL', () => {
    const html = renderToStaticMarkup(
      <Walk state={{ entities: [], params: {} }} title="Demo">
        <WalkTo screen="design" />
        <p>builder</p>
      </Walk>,
    )
    expect(html).toBe('<p>builder</p>')
  })
})
