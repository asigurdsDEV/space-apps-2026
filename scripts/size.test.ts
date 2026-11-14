import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs helper without types
import { firstLoadFiles } from './size.mjs'

describe('first-load files', () => {
  it('counts the entry script, preloads and stylesheets, not lazy chunks or other sites', () => {
    const html = `<html><head>
      <script type="module" crossorigin src="/space-apps-2026/assets/index-a.js"></script>
      <link rel="modulepreload" crossorigin href="/space-apps-2026/assets/runtime-b.js">
      <link rel="stylesheet" crossorigin href="/space-apps-2026/assets/index-c.css">
      <link rel="icon" href="/space-apps-2026/icon.svg">
      <link rel="manifest" href="/space-apps-2026/manifest.webmanifest">
      <script>if ('serviceWorker' in navigator) {}</script>
      <link rel="stylesheet" href="https://fonts.example.com/x.css">
    </head></html>`
    expect(firstLoadFiles(html, '/space-apps-2026/')).toEqual(['assets/index-a.js', 'assets/runtime-b.js', 'assets/index-c.css'])
  })
})
