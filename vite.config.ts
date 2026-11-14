import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { offline } from './pwa/plugin'

// base: GitHub Pages serves the site at /space-apps-2026/; `npm run preview` serves the build at the same path.
export default defineConfig(({ command, isPreview }) => ({
  // offline(): service worker for bad venue wifi (build only). List public/ files it should cache too.
  plugins: [react(), offline(['manifest.webmanifest', 'icon.svg'])],
  base: command === 'build' || isPreview ? '/space-apps-2026/' : '/',
}))
