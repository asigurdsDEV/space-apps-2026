import type { Plugin } from 'vite'
import { serviceWorkerSource, versionOf } from './sw-source'

/**
 * Offline support for venue wifi, build only: emits `sw.js` listing every built file plus
 * `publicFiles`, and adds the registration script to index.html (so app/ needs no change).
 */
export function offline(publicFiles: string[]): Plugin {
  let base = '/'
  return {
    name: 'smdg-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: `if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('${base}sw.js').catch(() => {}))`,
          injectTo: 'body',
        },
      ]
    },
    generateBundle(_options, bundle) {
      const files = [...new Set([...Object.keys(bundle), 'index.html', ...publicFiles])].filter((f) => !f.endsWith('.map')).sort()
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(files, versionOf(files)) })
    },
  }
}
