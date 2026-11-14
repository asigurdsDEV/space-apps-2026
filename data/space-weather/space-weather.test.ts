import { describe, expect, it } from 'vitest'
import { spaceWeather, weatherForMissionDay, weatherOn } from './index'

describe('space weather dataset (NASA OMNI)', () => {
  it('is a valid timeseries with one row per day and equal-length columns', () => {
    const t = spaceWeather.data.t as string[]
    expect(spaceWeather.kind).toBe('timeseries')
    expect(t[0]).toBe('1996-01-01')
    for (const col of Object.values(spaceWeather.data)) expect(col).toHaveLength(t.length)
    for (let i = 1; i < t.length; i++) expect(Date.parse(t[i]) - Date.parse(t[i - 1])).toBe(86_400_000)
  })

  it('matches famous storms', () => {
    expect(weatherOn('2003-10-30')).toMatchObject({ storm_g: 5, kp_max: 9 }) // Halloween storms
    expect(weatherOn('2024-05-10')?.storm_g).toBe(5) // Gannon storm
    expect(weatherOn('2022-02-03')?.storm_g).toBe(1) // the storm that downed 38 of 49 new Starlinks
    expect(weatherOn('2019-06-15')?.storm_g).toBe(0) // quiet solar minimum
  })

  it('returns null outside the data and maps mission days onto a real start date', () => {
    expect(weatherOn('1990-01-01')).toBeNull()
    expect(weatherOn('2099-01-01')).toBeNull()
    expect(weatherForMissionDay('2003-10-01', 29)?.date).toBe('2003-10-30')
  })
})
