import { describe, expect, it } from 'vitest'
import type { Screening } from './screening'
import { approachText, count, dayText, debrisName, flareText, kpText, placeText, timeText, whenText } from './text'

const screening = (over: Partial<Screening>): Screening => ({
  closest: { name: 'COSMOS 2251 DEB', id: 34427, index: 3, distanceKm: 117.46, at: '2026-11-15T11:16:00.000Z', inMinutes: 63.6, elementsAgeDays: 0.8 },
  sharingAltitude: 11,
  band: { lowKm: 415, highKm: 425 },
  screened: 2615,
  tooOld: 66,
  from: '2026-11-15T10:12:00.000Z',
  windowMinutes: 100,
  ...over,
})

const NOW = Date.parse('2026-11-15T10:12:00.000Z')

describe('Live Earth wording', () => {
  it('writes every time in UTC', () => {
    expect(dayText('2026-11-14T00:00:00.000Z')).toBe('14 Nov')
    expect(timeText('2026-11-15T06:00:00.000Z')).toBe('06:00 UTC')
    expect(whenText('2026-11-14T22:45:09.000Z')).toBe('14 Nov, 22:45 UTC')
    // Late evening UTC is still that UTC day, whatever the device's time zone.
    expect(dayText('2026-01-01T23:59:00.000Z')).toBe('1 Jan')
  })

  it('writes a place and a count the way a student reads them', () => {
    expect(placeText(35.831, -149.825)).toBe('35.8° N, 149.8° W')
    expect(placeText(-0.04, 75.19)).toBe('0.0° S, 75.2° E')
    expect(count(2681)).toBe('2,681')
    expect(debrisName('COSMOS 2251 DEB')).toBe('Cosmos 2251 debris')
    expect(debrisName('FENGYUN 1C DEB')).toBe('Fengyun 1C debris')
  })

  it('rounds a close approach to the kilometre and says how many pieces share the height', () => {
    expect(approachText(screening({}), NOW)).toEqual({ headline: '117 km', when: 'in 64 min', detail: 'Cosmos 2251 debris. 11 tracked pieces cross this height.' })
    // The minutes count down while the screen stays open.
    expect(approachText(screening({}), NOW + 10 * 60_000).when).toBe('in 54 min')
    expect(approachText(screening({}), NOW + 64 * 60_000).when).toBe('now')
    expect(approachText(screening({ sharingAltitude: 1 }), NOW).detail).toBe('Cosmos 2251 debris. 1 tracked piece crosses this height.')
  })

  it('says when the nearest piece has old orbit data', () => {
    const old = screening({ closest: { ...screening({}).closest!, elementsAgeDays: 3.2 } })
    expect(approachText(old, NOW).detail).toBe('Cosmos 2251 debris (its orbit data is 3 days old). 11 tracked pieces cross this height.')
  })

  it('gives no distance when nothing reaches the satellite’s height (GOES-19: 34,160 km means nothing)', () => {
    const far = approachText(screening({ sharingAltitude: 0, closest: { ...screening({}).closest!, distanceKm: 34160 } }), NOW)
    expect(far.headline).toBe('None at this height')
    expect(JSON.stringify(far)).not.toContain('34')
  })

  it('still counts the pieces when no pass could be found', () => {
    expect(approachText(screening({ closest: null }), NOW)).toEqual({ headline: 'No pass found', when: '', detail: '11 tracked pieces cross this height.' })
  })

  it('names the storm level with the Kp value', () => {
    expect(kpText({ kp: 0.67, g: 0, label: 'quiet', from: '' })).toBe('0.67 · quiet')
    expect(kpText({ kp: 7.33, g: 3, label: 'strong storm', from: '' })).toBe('7.33 · G3 strong storm')
    expect(kpText({ kp: 5, g: 1, label: 'minor storm', from: '' })).toBe('5 · G1 minor storm')
  })

  it('says how big a flare class is', () => {
    expect(flareText('C1.0')).toBe('C1.0 · small')
    expect(flareText('B5.4')).toBe('B5.4 · very small')
    expect(flareText('M5.1')).toBe('M5.1 · medium')
    expect(flareText('X2.3')).toBe('X2.3 · large')
  })
})
