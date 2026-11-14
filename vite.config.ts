import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { offline } from './pwa/plugin'
import { PUBLIC_FILES } from './pwa/public-files'

// base: GitHub Pages serves the site at /space-apps-2026/; `npm run preview` serves the build at the same path.
export default defineConfig(({ command, isPreview }) => ({
  // offline(): service worker for bad venue wifi (build only). It caches the build plus every file in public/.
  plugins: [react(), offline(PUBLIC_FILES)],
  base: command === 'build' || isPreview ? '/space-apps-2026/' : '/',
}))
