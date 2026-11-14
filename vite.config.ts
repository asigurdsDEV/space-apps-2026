import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { offline } from './pwa/plugin'
import { PUBLIC_FILES } from './pwa/public-files'

// GitHub Pages serves the site at /space-apps-2026/. Vercel serves it at the domain root
// (VERCEL=1 during `vercel build`). Local `npm run dev` stays at /.
const pagesBase = '/space-apps-2026/'
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
const onVercel = env?.VERCEL === '1'

export default defineConfig(({ command, isPreview }) => ({
  // offline(): service worker for bad venue wifi (build only). It caches the build plus every file in public/.
  plugins: [react(), offline(PUBLIC_FILES)],
  base: onVercel ? '/' : command === 'build' || isPreview ? pagesBase : '/',
}))
