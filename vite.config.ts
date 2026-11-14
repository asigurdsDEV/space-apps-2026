import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: GitHub Pages serves the site at /space-apps-2026/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/space-apps-2026/' : '/',
}))
