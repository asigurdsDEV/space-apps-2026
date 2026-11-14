import { readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { PUBLIC_FILES } from '../pwa/public-files'

it('the offline cache lists every file in public/', () => {
  const onDisk = readdirSync(new URL('../public/', import.meta.url), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== '.DS_Store')
    .map((entry) => `${entry.parentPath.replaceAll('\\', '/').split('/public/')[1] ?? ''}/${entry.name}`.replace(/^\//, ''))
    .sort()
  expect([...PUBLIC_FILES].sort()).toEqual(onDisk)
})
