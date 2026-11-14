// CI guard: fail the build if the first download grows past LIMIT_KB (gzipped).
// Run after `npm run build`: `npm run size`. Raise the limit on purpose, in a PR, if it must grow.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { firstLoadFiles } from './size.mjs'

const LIMIT_KB = 150 // first load was 117 kB gzipped on 2026-11-14 after the 3D view went lazy
const BASE = '/space-apps-2026/' // vite.config.ts base for builds

const html = readFileSync('dist/index.html', 'utf8')
const rows = firstLoadFiles(html, BASE).map((file) => ({ file, kb: gzipSync(readFileSync(`dist/${file}`)).length / 1024 }))
const total = rows.reduce((sum, r) => sum + r.kb, 0)
for (const r of rows) console.log(`${r.kb.toFixed(1).padStart(7)} kB  ${r.file}`)
console.log(`${total.toFixed(1).padStart(7)} kB  first load, gzipped (limit ${LIMIT_KB} kB)`)
if (total > LIMIT_KB) {
  console.error(`First load is ${(total - LIMIT_KB).toFixed(1)} kB over the limit. Lazy-load the new heavy part (React.lazy / import()) or raise LIMIT_KB in scripts/check-size.mjs on purpose.`)
  process.exit(1)
}
