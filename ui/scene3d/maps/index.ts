// Real NASA surface maps (README.md here), inlined as data URLs so they work offline.
import * as THREE from 'three'
import type { Body } from '../model'
import earthDay from './earth-day.jpg?inline'
import earthNight from './earth-night.jpg?inline'
import mars from './mars.jpg?inline'
import moon from './moon.jpg?inline'

/** Uniforms planetShader reads for a body. Share one set per body between every mesh that draws it. */
export interface MapUniforms {
  uMap: { value: THREE.Texture | null }
  uHasMap: { value: number }
  uNight: { value: THREE.Texture | null }
  uHasNight: { value: number }
}

const DAY: Record<Body, string> = { earth: earthDay, moon, mars }

/**
 * Starts loading the maps and returns their uniforms right away. Until a map has loaded
 * (or if it fails), `uHasMap` stays 0 and the shader draws its procedural look.
 */
export function planetMaps(anisotropy = 4): { maps: Record<Body, MapUniforms>; dispose(): void } {
  const loader = new THREE.TextureLoader()
  const textures: THREE.Texture[] = []
  const load = (url: string, slot: { value: THREE.Texture | null }, flag: { value: number }) => {
    const t = loader.load(url, () => { slot.value = t; flag.value = 1 })
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = THREE.RepeatWrapping // the shader's seam-free u runs from -0.5 to 1
    t.anisotropy = anisotropy
    textures.push(t)
  }
  const maps = {} as Record<Body, MapUniforms>
  for (const body of ['earth', 'moon', 'mars'] as const) {
    const u: MapUniforms = { uMap: { value: null }, uHasMap: { value: 0 }, uNight: { value: null }, uHasNight: { value: 0 } }
    load(DAY[body], u.uMap, u.uHasMap)
    if (body === 'earth') load(earthNight, u.uNight, u.uHasNight)
    maps[body] = u
  }
  return { maps, dispose: () => textures.forEach((t) => t.dispose()) }
}
