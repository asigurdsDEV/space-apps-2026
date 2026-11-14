import { describe, expect, it } from 'vitest'
import { STATIONS, nextStation, prevStation, stationFor, walkMs, walkPose } from './model'

describe('mission control walk', () => {
  it('has the six stations of decision 005, in mission order', () => {
    expect(STATIONS.map((s) => s.id)).toEqual(['wall', 'bay', 'consoles', 'pad', 'ops', 'debrief'])
  })

  it('maps every game screen to its station', () => {
    expect(stationFor('briefing')).toBe('wall')
    expect(stationFor('design')).toBe('bay')
    expect(stationFor('poll')).toBe('consoles')
    expect(stationFor('flight')).toBe('ops')
    expect(stationFor('results')).toBe('debrief')
  })

  it('stops at both ends of the hall', () => {
    expect(nextStation('debrief')).toBe('debrief')
    expect(prevStation('wall')).toBe('wall')
    expect(nextStation('bay')).toBe('consoles')
  })

  it('walks from one station to the other, with a short bob only while walking', () => {
    const start = walkPose('wall', 'ops', 0)
    const end = walkPose('wall', 'ops', 1)
    expect(start.eye).toEqual(STATIONS[0]!.eye)
    expect(end.eye[0]).toBeCloseTo(STATIONS[4]!.eye[0])
    expect(end.eye[1]).toBeCloseTo(STATIONS[4]!.eye[1])
    expect(walkPose('wall', 'ops', 0.33, true).eye[1]).toBe(1.7) // reduced motion: no bob
  })

  it('keeps walks short enough to never feel like waiting', () => {
    expect(walkMs('bay', 'bay')).toBe(0)
    expect(walkMs('wall', 'bay')).toBeGreaterThanOrEqual(700)
    expect(walkMs('wall', 'debrief')).toBeLessThanOrEqual(2400)
  })
})
