// Real NASA surface maps (README.md here), inlined as data URLs so they work offline.
import * as THREE from 'three'
import type { Body } from '../model'
import earthClouds from './earth-clouds.jpg?inline'
import earthDay from './earth-day.jpg?inline'
import earthNight from './earth-night.jpg?inline'
import mars from './mars.jpg?inline'
import marsHeight from './mars-height.jpg?inline'
import moon from './moon.jpg?inline'
import moonHeight from './moon-height.jpg?inline'

/** Uniforms planetShader reads for a body. Share one set per body between every mesh that draws it. */
export interface MapUniforms {
  uMap: { value: THREE.Texture | null }
  uHasMap: { value: number }
  uNight: { value: THREE.Texture | null }
  uHasNight: { value: number }
  /** Real elevation (grey = height), for relief shading. The Moon and Mars have one. */
  uHeight: { value: THREE.Texture | null }
  uHasHeight: { value: number }
  /** Earth's real clouds (grey = how thick), read by cloudShader. */
  uClouds: { value: THREE.Texture | null }
  uHasClouds: { value: number }
}

const DAY: Record<Body, string> = { earth: earthDay, moon, mars }
const HEIGHT: Partial<Record<Body, string>> = { moon: moonHeight, mars: marsHeight }

/**
 * Starts loading the maps and returns their uniforms right away. Until a map has loaded
 * (or if it fails), `uHasMap` stays 0 and the shader draws its procedural look.
 */
export function planetMaps(anisotropy = 4): { maps: Record<Body, MapUniforms>; dispose(): void } {
  const loader = new THREE.TextureLoader()
  const textures: THREE.Texture[] = []
  const load = (url: string, slot: { value: THREE.Texture | null }, flag: { value: number }, data = false) => {
    const t = loader.load(url, () => { slot.value = t; flag.value = 1 })
    if (!data) t.colorSpace = THREE.SRGBColorSpace // elevation is numbers, not colour
    t.wrapS = THREE.RepeatWrapping // the shader's seam-free u runs from -0.5 to 1
    t.anisotropy = anisotropy
    textures.push(t)
  }
  const maps = {} as Record<Body, MapUniforms>
  for (const body of ['earth', 'moon', 'mars'] as const) {
    const u: MapUniforms = { uMap: { value: null }, uHasMap: { value: 0 }, uNight: { value: null }, uHasNight: { value: 0 }, uHeight: { value: null }, uHasHeight: { value: 0 }, uClouds: { value: null }, uHasClouds: { value: 0 } }
    load(DAY[body], u.uMap, u.uHasMap)
    if (body === 'earth') {
      load(earthNight, u.uNight, u.uHasNight)
      load(earthClouds, u.uClouds, u.uHasClouds, true)
    }
    const height = HEIGHT[body]
    if (height) load(height, u.uHeight, u.uHasHeight, true)
    maps[body] = u
  }
  return { maps, dispose: () => textures.forEach((t) => t.dispose()) }
}
