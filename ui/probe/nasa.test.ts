import { describe, expect, it } from 'vitest'
import { fillVoids, gibsColorUrl, gibsTrueColorUrl, groundCover, heightStats, isEarthScenario, nasademTileId, oceanGrid, parsePower, patchBox, placeLabel, powerDates, sampleHeight, SURFACE } from './nasa'

describe('surface probe NASA helpers', () => {
  it('names the NASADEM tile by its southwest corner', () => {
    expect(nasademTileId(36.1, -112.14)).toBe('n36w113')
    expect(nasademTileId(-10.4, -50.3)).toBe('s11w051')
    expect(nasademTileId(46.52, 10.48)).toBe('n46e010')
  })

  it('keeps a patch inside one tile', () => {
    const box = patchBox(36.99, -112.01)
    expect(box.north).toBeLessThanOrEqual(37)
    expect(box.east).toBeLessThanOrEqual(-112)
    expect(box.north - box.south).toBeCloseTo(0.02)
  })

  it('uses one measured land patch, not the practice storm or fire', () => {
    expect(SURFACE.name).toBe('Grand Canyon')
    expect(SURFACE.lat).toBeCloseTo(36.1)
    expect(nasademTileId(SURFACE.lat, SURFACE.lon)).toBe('n36w113')
    expect(oceanGrid(22, -55).mean_m).toBe(0)
    expect(isEarthScenario([{ id: 'earth' }, { id: 'spacecraft' }])).toBe(true)
    expect(isEarthScenario([{ id: 'moon' }])).toBe(false)
  })

  it('reads a POWER feature', () => {
    const reading = parsePower({
      geometry: { coordinates: [-112.14, 36.1, 1800.5] },
      properties: { parameter: { T2M: { '20241101': -999, '20241102': 12.5 }, TS: { '20241102': 18.2 } } },
      header: { fill_value: -999 },
    })
    expect(reading).toEqual({ temperature_c: 12.5, skin_c: 18.2, date: '20241102', model_elevation_m: 1800.5, precip_mm: null })
  })

  it('names a state and country, and skips unnamed water', () => {
    expect(placeLabel('United States of America', 'Arizona')).toBe('Arizona, United States')
    expect(placeLabel('France', '')).toBe('France')
    expect(placeLabel('France', 'France')).toBe('France')
    expect(placeLabel('', 'Atlantic Ocean')).toBeNull()
  })

  it('keeps a wet place green and a dry place yellow-brown country', () => {
    const europe = { min_m: 200, max_m: 900, mean_m: 500 }
    const canyon = { min_m: 700, max_m: 1600, mean_m: 1100 }
    expect(groundCover(48, europe, 8, 3.4, false)).toBe('green')
    expect(groundCover(36.1, canyon, 8, 0.2, false)).toBe('desert')
    expect(groundCover(-3, { min_m: 40, max_m: 80, mean_m: 60 }, 26, 9, false)).toBe('green')
    expect(groundCover(46, { min_m: 2400, max_m: 3600, mean_m: 3000 }, -4, 2, false)).toBe('alpine')
    expect(groundCover(0, { min_m: 0, max_m: 0, mean_m: 0 }, 28, 0, true)).toBe('water')
  })

  it('summarises a height grid and samples it', () => {
    const stats = heightStats([0, -32768, 10, 30], -32768)
    expect(stats).toEqual({ min: 0, max: 30, mean: 40 / 3 })
    const filled = fillVoids([0, -32768], -32768, 4)
    expect(Array.from(filled)).toEqual([0, 4])
    const grid = [0, 10, 0, 10]
    expect(sampleHeight(grid, 2, 2, 1, 0)).toBeCloseTo(10)
    expect(sampleHeight(grid, 2, 2, 0, 0)).toBeCloseTo(0)
  })

  it('asks GIBS for a dated true-color map', () => {
    const url = gibsTrueColorUrl({ south: 36, west: -112.2, north: 36.1, east: -112.1 }, '2024-08-15')
    expect(url).toContain('gibs.earthdata.nasa.gov')
    expect(url).toContain('MODIS_Terra_CorrectedReflectance_TrueColor')
    expect(url).toContain('TIME=2024-08-15')
    const color = gibsColorUrl({ south: -10.1, west: -50.1, north: -9.9, east: -49.9 })
    expect(color).toContain('BlueMarble_ShadedRelief_Bathymetry')
  })

  it('asks POWER for a day that should already exist', () => {
    const dates = powerDates(new Date('2026-11-14T12:00:00Z'))
    expect(dates.end).toBe('20261106')
    expect(dates.gibsDay).toBe('2026-11-06')
  })
})
