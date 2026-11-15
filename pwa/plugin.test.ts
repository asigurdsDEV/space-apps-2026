import { expect, it } from 'vitest'
import { offline } from './plugin'

it('builds one complete download manifest and gives the worker the same cache version', async () => {
  const files: { fileName: string; source: string }[] = []
  const hook = offline(['models/craft.glb', 'icon.svg']).generateBundle
  if (typeof hook !== 'function') throw new Error('Missing packaging hook')
  await Reflect.apply(hook, { emitFile: (file: { fileName: string; source: string }) => files.push(file) }, [{}, {
    'assets/main-hash.js': {}, 'assets/room-hash.js': {}, 'assets/main-hash.js.map': {}, 'index.html': {},
  }])
  const manifest = JSON.parse(files.find((f) => f.fileName === 'game-assets.json')!.source)
  expect(manifest.files).toEqual(['assets/main-hash.js', 'assets/room-hash.js', 'icon.svg', 'index.html', 'models/craft.glb'])
  const worker = files.find((f) => f.fileName === 'sw.js')!.source
  expect(worker).toContain(`smdg-${manifest.version}`)
  expect(worker).toContain('game-assets.json')
  expect(worker).not.toContain('.js.map')
})
