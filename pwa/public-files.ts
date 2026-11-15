/**
 * Every file in public/, for the offline cache (vite.config.ts). tests/offline-public.test.mjs
 * fails when a file is added to public/ and not listed here.
 * shortcut: these names carry no content hash, so a changed file reaches returning players only
 * with the next script change (every deploy so far); hash their contents into versionOf if one ever ships alone.
 */
export const PUBLIC_FILES = [
  'icon.svg',
  'terrain/moon/apollo17/color.jpg',
  'terrain/moon/apollo17/height.f32',
  'terrain/moon/apollo17/meta.json',
  'manifest.webmanifest',
  'visual-assets/flight/hurricane.glb',
  'visual-assets/flight/manifest.json',
  'visual-assets/flight/tdrs-relay.glb',
  'visual-assets/flight/wildfire.glb',
  'visual-assets/world/alarm-beacon.glb',
  'visual-assets/world/console-desk.glb',
  'visual-assets/world/gauge-frame.glb',
  'visual-assets/world/launch-button.glb',
  'visual-assets/world/manifest.json',
  'visual-assets/world/part-rack.glb',
  'visual-assets/world/time-lever.glb',
]
