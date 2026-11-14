// The crash screen and the boundary's state logic. React error boundaries only catch in a
// browser render, so the catch itself is checked in the browser (see the PR).
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CrashScreen, ErrorBoundary } from './ErrorBoundary'

describe('crash safety', () => {
  it('shows a message and a way out instead of a white page', () => {
    const html = renderToStaticMarkup(<CrashScreen actions={[{ label: 'Back to the builder', run: () => {} }, { label: 'Main menu', run: () => {} }]} />)
    expect(html).toContain('Something went wrong')
    expect(html).toContain('role="alert"')
    expect(html).toContain('Back to the builder')
    expect(html).toContain('Main menu')
  })

  it('remembers the error that crashed the screen', () => {
    const error = new Error('boom')
    expect(ErrorBoundary.getDerivedStateFromError(error)).toEqual({ error })
  })

  it('renders its screen when nothing is wrong', () => {
    expect(renderToStaticMarkup(<ErrorBoundary actions={[]}><p>builder</p></ErrorBoundary>)).toBe('<p>builder</p>')
  })
})
