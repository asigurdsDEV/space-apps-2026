// Official NASA readings for one patch of Earth. Temperature comes straight from
// NASA POWER. Elevation comes from NASADEM (NASA's reprocessing of the Shuttle
// Radar Topography Mission). Earthdata does not send browser CORS headers, so the
// height grid is read from OpenTopography's public mirror of that same NASA product.

const POWER = 'https://power.larc.nasa.gov/api/temporal/daily/point'
const NASADEM = 'https://opentopography.s3.sdsc.edu/raster/NASADEM/NASADEM_be'
const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi'

export const NASADEM_SOURCE = 'https://www.earthdata.nasa.gov/data/catalog/lpcloud-nasadem-hgt-001'
export const POWER_SOURCE = 'https://power.larc.nasa.gov/'
export const GIBS_SOURCE = 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api'

/** Degrees on a side. About 2 km, inside one 1° NASADEM tile, centred on the practice target. */
export const PATCH_DEG = 0.02
export const PATCH_SAMPLES = 64
/** How far the crew may walk from the drop. The rest of the patch is visible, not walkable. */
export const WALK_RADIUS_M = 80

export interface DropSite {
  id: string
  name: string
  lat: number
  lon: number
  why: string
  /** Sky gradient. Each practice target gets its own, so the places do not share one grey bowl. */
  skyTop: string
  skyHorizon: string
}

/**
 * One land patch NASA's Shuttle radar actually measured. The hurricane and wildfire
 * marks in flight training are game placements, not NASA storm or fire detections.
 */
export const SURFACE: DropSite = {
  id: 'canyon',
  name: 'Grand Canyon',
  lat: 36.1,
  lon: -112.14,
  why: 'A patch of the Grand Canyon from NASADEM, the reprocessed Shuttle Radar Topography Mission.',
  skyTop: '#1a5ea8',
  skyHorizon: '#f0c48a',
}

export function isEarthScenario(entities: readonly { id: string }[]): boolean {
  return entities.some((entity) => entity.id === 'earth')
}

/** NASADEM tile id, such as `n36w113`. The name is the southwest corner of the 1° tile. */
export function nasademTileId(lat: number, lon: number): string {
  const latS = Math.floor(lat)
  const lonW = Math.floor(lon)
  const ns = latS >= 0 ? `n${String(latS).padStart(2, '0')}` : `s${String(Math.abs(latS)).padStart(2, '0')}`
  const ew = lonW >= 0 ? `e${String(lonW).padStart(3, '0')}` : `w${String(Math.abs(lonW)).padStart(3, '0')}`
  return `${ns}${ew}`
}

export function nasademTileUrl(lat: number, lon: number): string {
  return `${NASADEM}/${`NASADEM_HGT_${nasademTileId(lat, lon)}.tif`}`
}

/** Shift the patch so a site near a tile edge still fits in that one tile. */
export function patchCenter(lat: number, lon: number, span = PATCH_DEG): { lat: number; lon: number } {
  const half = span / 2 + 0.001
  const lat0 = Math.floor(lat)
  const lon0 = Math.floor(lon)
  return {
    lat: Math.min(lat0 + 1 - half, Math.max(lat0 + half, lat)),
    lon: Math.min(lon0 + 1 - half, Math.max(lon0 + half, lon)),
  }
}

export function patchBox(lat: number, lon: number, span = PATCH_DEG) {
  const center = patchCenter(lat, lon, span)
  const half = span / 2
  return {
    ...center,
    south: center.lat - half,
    north: center.lat + half,
    west: center.lon - half,
    east: center.lon + half,
  }
}

/** A few days back, so POWER's near-real-time day has landed. */
export function powerDates(now = new Date()): { start: string; end: string; gibsDay: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 8))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 2)
  const stamp = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '')
  return { start: stamp(start), end: stamp(end), gibsDay: end.toISOString().slice(0, 10) }
}

const PLACE = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

/** "Arizona, United States", or just the country when there is no state. Empty when the point is unnamed. */
export function placeLabel(country: string, subdivision: string): string | null {
  const land = country.trim().replace(/\s+\(the\)$/i, '')
  if (!land) return null
  const short = land
    .replace(/^United States of America$/i, 'United States')
    .replace(/^Russian Federation$/i, 'Russia')
    .replace(/^United Kingdom of Great Britain and Northern Ireland$/i, 'United Kingdom')
  const region = subdivision.trim()
  if (!region || region.toLowerCase() === short.toLowerCase() || region.toLowerCase() === land.toLowerCase()) return short
  return `${region}, ${short}`
}

export function placeUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    localityLanguage: 'en',
  })
  return `${PLACE}?${q}`
}

/** State and country for a point on land. Null over open ocean or when the lookup fails. */
export async function fetchPlace(lat: number, lon: number, signal?: AbortSignal): Promise<string | null> {
  const response = await fetch(placeUrl(lat, lon), { signal })
  if (!response.ok) return null
  const body = await response.json() as { countryName?: unknown; principalSubdivision?: unknown }
  const country = typeof body.countryName === 'string' ? body.countryName : ''
  const region = typeof body.principalSubdivision === 'string' ? body.principalSubdivision : ''
  return placeLabel(country, region)
}

export function powerUrl(lat: number, lon: number, start: string, end: string): string {
  const q = new URLSearchParams({
    parameters: 'T2M,TS,PRECTOTCORR',
    community: 'RE',
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    start,
    end,
    format: 'JSON',
    'time-standard': 'UTC',
  })
  return `${POWER}?${q}`
}

/** Cloud-free NASA Blue Marble color for this patch. Dated MODIS tiles of a 2 km box often come out grey. */
export function gibsColorUrl(box: { south: number; west: number; north: number; east: number }): string {
  const q = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: 'BlueMarble_ShadedRelief_Bathymetry',
    CRS: 'EPSG:4326',
    BBOX: `${box.south},${box.west},${box.north},${box.east}`,
    WIDTH: '512',
    HEIGHT: '512',
    FORMAT: 'image/jpeg',
  })
  return `${GIBS}?${q}`
}

export function gibsTrueColorUrl(box: { south: number; west: number; north: number; east: number }, day: string): string {
  const q = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    CRS: 'EPSG:4326',
    BBOX: `${box.south},${box.west},${box.north},${box.east}`,
    WIDTH: '512',
    HEIGHT: '512',
    FORMAT: 'image/jpeg',
    TIME: day,
  })
  return `${GIBS}?${q}`
}

export interface PowerReading {
  temperature_c: number
  skin_c: number
  date: string
  /** MERRA-2 grid elevation, metres. Coarser than NASADEM. */
  model_elevation_m: number
  /** Rain that day, millimetres. Null when POWER omitted it. */
  precip_mm: number | null
}

export type GroundCover = 'water' | 'green' | 'desert' | 'alpine'

/**
 * One colour family for a patch. Dry ground stays yellow-brown, wetter ground stays green,
 * and cold high ground stays stone. Nothing here turns a mountain red.
 */
export function groundCover(
  lat: number,
  grid: { min_m: number; max_m: number; mean_m: number },
  skinC: number,
  precipMm: number | null,
  water: boolean,
): GroundCover {
  const rise = grid.max_m - grid.min_m
  if (water || (rise < 12 && grid.mean_m < 20)) return 'water'
  if (grid.mean_m > 2800 || (skinC < -2 && grid.mean_m > 1800)) return 'alpine'
  const abs = Math.abs(lat)
  const dry = precipMm !== null
    ? precipMm < 1.2 && skinC > -2
    : rise > 300 && grid.mean_m > 400 && grid.mean_m < 2400 && abs > 15 && abs < 45 && skinC > 4
  if (dry && grid.mean_m < 2600) return 'desert'
  return 'green'
}

export function parsePower(body: unknown): PowerReading {
  if (!body || typeof body !== 'object') throw new Error('NASA POWER returned something that is not a reading.')
  const feature = body as {
    geometry?: { coordinates?: unknown[] }
    properties?: { parameter?: { T2M?: Record<string, unknown>; TS?: Record<string, unknown>; PRECTOTCORR?: Record<string, unknown> } }
    header?: { fill_value?: unknown }
  }
  const fill = typeof feature.header?.fill_value === 'number' ? feature.header.fill_value : -999
  const air = feature.properties?.parameter?.T2M ?? {}
  const skin = feature.properties?.parameter?.TS ?? {}
  const rain = feature.properties?.parameter?.PRECTOTCORR ?? {}
  const date = Object.keys(air).sort().reverse().find((key) => typeof air[key] === 'number' && air[key] !== fill)
  const temperature = date === undefined ? undefined : air[date]
  if (!date || typeof temperature !== 'number') throw new Error('NASA POWER has no air temperature for this place yet.')
  const skinValue = skin[date]
  const rainValue = rain[date]
  const model = feature.geometry?.coordinates?.[2]
  if (typeof model !== 'number') throw new Error('NASA POWER did not include the grid elevation.')
  return {
    temperature_c: temperature,
    skin_c: typeof skinValue === 'number' && skinValue !== fill ? skinValue : temperature,
    date,
    model_elevation_m: model,
    precip_mm: typeof rainValue === 'number' && rainValue !== fill ? rainValue : null,
  }
}

export interface HeightGrid {
  cols: number
  rows: number
  /** Row 0 is the north edge. Metres above the WGS84 ellipsoid / geoid mix NASADEM uses. */
  heights: Float32Array
  min_m: number
  max_m: number
  mean_m: number
  south: number
  north: number
  west: number
  east: number
}

export function heightStats(values: ArrayLike<number>, nodata: number): { min: number; max: number; mean: number } {
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let n = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? nodata
    if (!Number.isFinite(v) || v === nodata || v < -500) continue
    min = Math.min(min, v)
    max = Math.max(max, v)
    sum += v
    n += 1
  }
  if (!n) throw new Error('NASADEM has no ground elevation in this patch.')
  return { min, max, mean: sum / n }
}

/** Fill voids with the patch mean so the mesh stays continuous. */
export function fillVoids(values: ArrayLike<number>, nodata: number, mean: number): Float32Array {
  const out = new Float32Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? nodata
    out[i] = Number.isFinite(v) && v !== nodata && v >= -500 ? v : mean
  }
  return out
}

/** `u` and `v` run 0–1 across the patch. `v` 0 is north. */
export function sampleHeight(grid: ArrayLike<number>, cols: number, rows: number, u: number, v: number): number {
  const x = Math.min(cols - 1, Math.max(0, u * (cols - 1)))
  const y = Math.min(rows - 1, Math.max(0, v * (rows - 1)))
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(cols - 1, x0 + 1)
  const y1 = Math.min(rows - 1, y0 + 1)
  const tx = x - x0
  const ty = y - y0
  const at = (ix: number, iy: number) => grid[iy * cols + ix] ?? 0
  return at(x0, y0) * (1 - tx) * (1 - ty) + at(x1, y0) * tx * (1 - ty) + at(x0, y1) * (1 - tx) * ty + at(x1, y1) * tx * ty
}

function asHeights(raster: unknown): ArrayLike<number> {
  const band = Array.isArray(raster) ? raster[0] : raster
  if (!band || typeof band !== 'object' || !('length' in band)) throw new Error('NASADEM did not return a height grid.')
  return band as ArrayLike<number>
}

export async function fetchPower(lat: number, lon: number, signal?: AbortSignal): Promise<PowerReading> {
  const dates = powerDates()
  const response = await fetch(powerUrl(lat, lon, dates.start, dates.end), { signal })
  if (!response.ok) throw new Error(`NASA POWER answered ${response.status}.`)
  return parsePower(await response.json())
}

/** A flat sea at 0 m, for a practice target whose NASADEM tile is open ocean (those tiles are not published). */
export function oceanGrid(lat: number, lon: number): HeightGrid {
  const box = patchBox(lat, lon)
  return {
    cols: PATCH_SAMPLES,
    rows: PATCH_SAMPLES,
    heights: new Float32Array(PATCH_SAMPLES * PATCH_SAMPLES),
    min_m: 0,
    max_m: 0,
    mean_m: 0,
    south: box.south,
    north: box.north,
    west: box.west,
    east: box.east,
  }
}

export async function fetchHeightGrid(lat: number, lon: number, signal?: AbortSignal): Promise<HeightGrid> {
  if (lat < -56 || lat > 60) throw new Error('NASADEM does not cover this latitude.')
  const box = patchBox(lat, lon)
  const { fromUrl } = await import('geotiff')
  const tiff = await fromUrl(nasademTileUrl(box.lat, box.lon), { allowFullFile: false }, signal)
  const image = await tiff.getImage()
  const [originX, originY] = image.getOrigin()
  const [resX, resY] = image.getResolution()
  if (!originX || !originY || !resX || !resY) throw new Error('NASADEM tile has no map position.')
  const width = image.getWidth()
  const height = image.getHeight()
  const px = (lonDeg: number) => (lonDeg - originX) / resX
  const py = (latDeg: number) => (latDeg - originY) / resY
  const left = Math.max(0, Math.min(width - 2, Math.floor(Math.min(px(box.west), px(box.east)))))
  const right = Math.max(left + 1, Math.min(width, Math.ceil(Math.max(px(box.west), px(box.east)))))
  const top = Math.max(0, Math.min(height - 2, Math.floor(Math.min(py(box.north), py(box.south)))))
  const bottom = Math.max(top + 1, Math.min(height, Math.ceil(Math.max(py(box.north), py(box.south)))))
  const raster = await image.readRasters({
    window: [left, top, right, bottom],
    width: PATCH_SAMPLES,
    height: PATCH_SAMPLES,
    samples: [0],
    resampleMethod: 'bilinear',
    signal,
  })
  const nodata = image.getGDALNoData() ?? -32768
  const stats = heightStats(asHeights(raster), nodata)
  return {
    cols: PATCH_SAMPLES,
    rows: PATCH_SAMPLES,
    heights: fillVoids(asHeights(raster), nodata, stats.mean),
    ...stats,
    min_m: stats.min,
    max_m: stats.max,
    mean_m: stats.mean,
    south: box.south,
    north: box.north,
    west: box.west,
    east: box.east,
  }
}
