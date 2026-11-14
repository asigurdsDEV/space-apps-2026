/**
 * Every file in public/, for the offline cache (vite.config.ts). tests/offline-public.test.mjs
 * fails when a file is added to public/ and not listed here.
 * shortcut: these names carry no content hash, so a changed file reaches returning players only
 * with the next script change (every deploy so far); hash their contents into versionOf if one ever ships alone.
 */
export const PUBLIC_FILES = [
  'icon.svg',
  'manifest.webmanifest',
  'visual-assets/flight/hurricane.glb',
  'visual-assets/flight/manifest.json',
  'visual-assets/flight/tdrs-relay.glb',
  'visual-assets/flight/wildfire.glb',
]
