import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDebris } from './debris'
import { altitudeBand, groupUrl, parseElements, periodMinutes } from './elements'
import { forgetFeeds } from './feed'
import { imageryUrl, latestFullDay, looksLikeEarth } from './imagery'
import { fetchSatellites, KNOWN } from './satellites'
import { fetchSpaceWeather, FLARE_URL, KP_URL, parseFlare, parseKp, stormLevel } from './spaceWeather'
import { fetchStorms, parseStorms, STORMS_URL } from './storms'
// Trimmed from the real feeds, fetched 2026-11-15 09:52 UTC (README.md has the full record).
import eonet from './fixtures/eonet.json'
import flare from './fixtures/flare.json'
import cosmos1408 from './fixtures/gp-cosmos-1408-debris.json'
import fengyun from './fixtures/gp-fengyun-1c-debris.json'
import resource from './fixtures/gp-resource.json'
import science from './fixtures/gp-science.json'
import stations from './fixtures/gp-stations.json'
import weather from './fixtures/gp-weather.json'
import kp from './fixtures/kp.json'

describe('CelesTrak elements', () => {
  it('keeps the twelve fields SGP4 needs, in order, including six-digit catalogue numbers', () => {
    const rows = parseElements(stations)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toEqual(['ISS (ZARYA)', 25544, '2026-11-14T22:45:17.822016', 15.49382049, 0.0007413, 51.6323, 274.0377, 26.4902, 333.6464, 0.00018276, 9.771e-5, 0])
    expect(rows.map((row) => row[1])).toContain(100882)
  })

  it('drops damaged objects and refuses a body with nothing usable', () => {
    const iss = stations[0]
    expect(parseElements([iss, { ...iss, MEAN_MOTION: 'fast' }, { ...iss, ECCENTRICITY: 1.2 }, { ...iss, EPOCH: 'soon' }, { ...iss, OBJECT_NAME: 'X'.repeat(41) }, null, { OBJECT_NAME: 'X' }])).toHaveLength(1)
    expect(() => parseElements([])).toThrow()
    expect(() => parseElements({ error: 'GP data has not updated' })).toThrow()
    expect(() => parseElements('No GP data found')).toThrow()
  })

  it('reads height range and period off the elements', () => {
    const [name, id, epoch, meanMotion, eccentricity] = parseElements(stations)[0] as [string, number, string, number, number]
    const iss = { OBJECT_NAME: name, NORAD_CAT_ID: id, EPOCH: epoch, MEAN_MOTION: meanMotion, ECCENTRICITY: eccentricity, INCLINATION: 0, RA_OF_ASC_NODE: 0, ARG_OF_PERICENTER: 0, MEAN_ANOMALY: 0, BSTAR: 0, MEAN_MOTION_DOT: 0, MEAN_MOTION_DDOT: 0 }
    const band = altitudeBand(iss)
    expect(band.lowKm).toBeGreaterThan(405)
    expect(band.highKm).toBeLessThan(425)
    expect(band.highKm - band.lowKm).toBeCloseTo(2 * 0.0007413 * (6378.137 + (band.lowKm + band.highKm) / 2), 3)
    expect(periodMinutes(iss)).toBeCloseTo(92.94, 1)
  })
})

describe('space weather', () => {
  it('reads the newest Kp and turns it into the NOAA storm level', () => {
    expect(parseKp(kp)).toEqual({ kp: 0.67, g: 0, label: 'quiet', from: '2026-11-15T06:00:00.000Z' })
    expect(parseKp([{ time_tag: '2024-05-11T00:00:00', Kp: 9 }])).toMatchObject({ g: 5, label: 'extreme storm' })
    // Below storm level, NOAA's own words: not every Kp under 5 is quiet.
    expect(parseKp([{ time_tag: '2024-05-11T00:00:00', Kp: 3.33 }])).toMatchObject({ g: 0, label: 'unsettled' })
    expect(parseKp([{ time_tag: '2024-05-11T00:00:00', Kp: 4.67 }])).toMatchObject({ g: 0, label: 'active' })
    expect([4.67, 5, 5.67, 6, 7, 7.33, 8, 8.67, 9].map(stormLevel)).toEqual([0, 1, 1, 2, 3, 3, 4, 4, 5])
  })

  it('refuses a Kp body in another shape', () => {
    expect(() => parseKp([])).toThrow()
    expect(() => parseKp([['time_tag', 'Kp'], ['2026-11-15 06:00:00', '0.67']])).toThrow()
    expect(() => parseKp([{ time_tag: '2026-11-15T06:00:00', Kp: 12 }])).toThrow()
    expect(() => parseKp([{ time_tag: 'later', Kp: 2 }])).toThrow()
  })

  it('reads the latest flare peak and the level now', () => {
    expect(parseFlare(flare)).toEqual({ flareClass: 'C1.0', peakAt: '2026-11-15T09:23:00.000Z', nowClass: 'B7.6', measuredAt: '2026-11-15T09:48:00.000Z' })
    expect(() => parseFlare([])).toThrow()
    expect(() => parseFlare([{ ...flare[0], max_class: 'huge' }])).toThrow()
    expect(() => parseFlare([{ ...flare[0], max_time: null }])).toThrow()
    expect(() => parseFlare([{ ...flare[0], max_class: `X${'9'.repeat(40)}` }])).toThrow()
  })

  it('reads a flare that has begun but not peaked as the level now', () => {
    const rising = { ...flare[0], time_tag: '2026-11-15T12:00:00Z', current_class: 'B7.9', begin_time: '2026-11-15T11:55:00Z', max_time: 'Unk', max_class: null, end_time: 'Unk', end_class: null }
    expect(parseFlare([rising])).toEqual({ flareClass: 'B7.9', peakAt: null, nowClass: 'B7.9', measuredAt: '2026-11-15T12:00:00.000Z' })
    expect(() => parseFlare([{ ...rising, begin_time: 'Unk' }])).toThrow()
  })
})

describe('storms', () => {
  it('gives one marker per open storm at its newest report', () => {
    expect(parseStorms(eonet)).toEqual([
      { id: 'EONET_26157', name: 'Typhoon Cempaka', lat: 30.2, lon: 154.1, at: '2026-11-11T12:00:00.000Z', windKts: 65, link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_26157' },
      { id: 'EONET_26158', name: 'Tropical Storm Pena', lat: 9.8, lon: -173.2, at: '2026-11-12T12:00:00.000Z', windKts: 30, link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_26158' },
    ])
  })

  it('accepts an empty list and skips events it cannot place', () => {
    expect(parseStorms({ events: [] })).toEqual([])
    expect(parseStorms({ events: [{ id: 'a', title: 'Shape', geometry: [{ type: 'Polygon', date: '2026-11-11T12:00:00Z', coordinates: [[1, 2]] }] }, { id: 'b', title: 'Nowhere', geometry: [] }, { id: 'c', title: 'Off the map', geometry: [{ type: 'Point', date: '2026-11-11T12:00:00Z', coordinates: [10, 95] }] }] })).toEqual([])
    expect(() => parseStorms({ title: 'EONET Events' })).toThrow()
    expect(() => parseStorms(null)).toThrow()
  })

  it('does not trust the feed: one marker per id, a short name, a wind a storm can have, its own links only', () => {
    const [cempaka] = eonet.events
    const point = cempaka.geometry.at(-1)!
    const hostile = { events: [
      { ...cempaka, title: `  ${'Typhoon '.repeat(40)}`, link: 'javascript:alert(1)', geometry: [{ ...point, magnitudeValue: 1e300 }] },
      { ...cempaka, title: 'The same id again' },
      { ...cempaka, id: 'blank', title: '   ' },
    ] }
    const storms = parseStorms(hostile)
    expect(storms).toHaveLength(1)
    expect(storms[0].name).toHaveLength(60)
    expect(storms[0]).toMatchObject({ windKts: null, link: 'https://eonet.gsfc.nasa.gov/' })
  })
})

describe('imagery', () => {
  it('asks for the last day whose passes are all in', () => {
    expect(latestFullDay(new Date('2026-11-15T09:52:00Z'))).toBe('2026-11-14')
    expect(latestFullDay(new Date('2026-11-15T05:59:00Z'))).toBe('2026-11-13')
    expect(latestFullDay(new Date('2026-01-01T12:00:00Z'))).toBe('2025-12-31')
  })

  it('builds one whole-globe request', () => {
    const url = new URL(imageryUrl('2026-11-14'))
    expect(url.origin + url.pathname).toBe('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi')
    expect(Object.fromEntries(url.searchParams)).toEqual({ SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0', LAYERS: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', CRS: 'EPSG:4326', BBOX: '-90,-180,90,180', WIDTH: '2048', HEIGHT: '1024', FORMAT: 'image/jpeg', TIME: '2026-11-14' })
    expect(new URL(imageryUrl('2026-11-14', 4096)).searchParams.get('HEIGHT')).toBe('2048')
  })

  it('tells a real day from the empty and error answers GIBS gave on 2026-11-15', () => {
    expect(looksLikeEarth('image/jpeg', 558_865, 2048)).toBe(true) // NOAA-20, 2026-11-14
    expect(looksLikeEarth('image/jpeg', 2_025_233, 4096)).toBe(true)
    expect(looksLikeEarth('image/jpeg', 12_572, 2048)).toBe(false) // Suomi NPP, same day: all black
    expect(looksLikeEarth('image/jpeg', 155_615, 2048)).toBe(false) // the day in progress, a third covered
    expect(looksLikeEarth('text/xml; charset=UTF-8', 460, 2048)).toBe(false) // unknown layer
  })
})

describe('feeds put together', () => {
  const bodies: Record<string, unknown> = {
    [groupUrl('stations')]: stations,
    [groupUrl('science')]: science,
    [groupUrl('resource')]: resource,
    [groupUrl('weather')]: weather,
    [groupUrl('fengyun-1c-debris')]: fengyun,
    [groupUrl('cosmos-1408-debris')]: cosmos1408,
    [KP_URL]: kp,
    [STORMS_URL]: eonet,
  }
  let asked: string[]

  beforeEach(() => {
    asked = []
    forgetFeeds()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', (url: string) => {
      asked.push(url)
      return Promise.resolve(url in bodies ? new Response(JSON.stringify(bodies[url])) : new Response('gone', { status: 404 }))
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('finds the curated satellites in four groups and says which are absent', async () => {
    const result = await fetchSatellites()
    if (!result.ok) throw new Error(result.reason)
    expect(asked.sort()).toEqual(['resource', 'science', 'stations', 'weather'].map(groupUrl))
    expect(result.data.list.map((sat) => sat.name)).toEqual(['International Space Station', 'Tiangong', 'Hubble Space Telescope', 'Landsat 8', 'Terra', 'Aqua', 'Suomi NPP', 'NOAA-20', 'NOAA-21', 'GOES-19', 'GPM Core Observatory', 'ICESat-2', 'SWOT'])
    expect(result.data.missing).toEqual(['Landsat 9']) // left out of the fixture on purpose
    expect(result.data.list[0].elements.OBJECT_NAME).toBe('ISS (ZARYA)')
    expect(result.source).toBe('CelesTrak')
    expect(result.asOf).toBe('2026-11-15T04:59:19.605Z') // the newest element epoch among them (Aqua)
    expect(new Set(KNOWN.map((known) => known.id)).size).toBe(KNOWN.length)
  })

  it('keeps the debris clouds that answered and marks the ones that did not', async () => {
    const result = await fetchDebris()
    if (!result.ok) throw new Error(result.reason)
    expect(result.data.objects).toHaveLength(8)
    expect(result.data.clouds.map((cloud) => [cloud.name, cloud.count])).toEqual([['Fengyun-1C', 6], ['Cosmos 2251', null], ['Iridium 33', null], ['Cosmos 1408', 2]])
  })

  it('reports each item on its own: Kp arrives, the flare feed is down, storms arrive', async () => {
    const { kp: kpNow, flare: flareNow } = await fetchSpaceWeather()
    expect(kpNow).toMatchObject({ ok: true, data: { kp: 0.67 }, source: 'NOAA Space Weather Prediction Center', asOf: '2026-11-15T06:00:00.000Z' })
    expect(flareNow).toMatchObject({ ok: false, reason: 'NOAA Space Weather Prediction Center answered 404.' })
    expect(asked).toContain(FLARE_URL)
    expect(await fetchStorms()).toMatchObject({ ok: true, source: 'NASA EONET', asOf: '2026-11-12T12:00:00.000Z' })
  })

  it('says unavailable, never throws, when CelesTrak is down', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
    expect(await fetchSatellites()).toEqual({ ok: false, reason: 'Could not reach CelesTrak.', source: 'CelesTrak', sourceUrl: 'https://celestrak.org/NORAD/elements/' })
    expect(await fetchDebris()).toMatchObject({ ok: false, reason: 'Could not reach CelesTrak.' })
  })
})
