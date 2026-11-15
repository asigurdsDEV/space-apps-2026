// The Daily mission's real event: the fixed priority, the wording, the saved copy and the 4-second limit.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getScenario } from '../data'
import type { Debris, Feed, KpNow, Storm } from '../ui/live'
import eonet from '../ui/live/fixtures/eonet.json'
import kpFixture from '../ui/live/fixtures/kp.json'
import { parseKp } from '../ui/live/spaceWeather'
import { parseStorms } from '../ui/live/storms'
import { savePersonalBest } from '../ui/leaderboard/storage'
import { dailyMissionForDate } from '../ui/start'
import { dailyEvent, eventMission, EVENT_SCENARIO, loadDailyEvent, savedDailyEvent, WAIT_MS, withEvent, type DailyEvent } from './dailyEvent'

const live = vi.hoisted(() => ({ fetchSpaceWeather: vi.fn(), fetchStorms: vi.fn(), fetchDebris: vi.fn() }))
vi.mock('../ui/live', () => live)

const ok = <T,>(data: T, asOf: string, source: string): Feed<T> => ({ ok: true, data, source, sourceUrl: 'https://example.org/', asOf, fetchedAt: asOf })
const down = <T,>(source: string): Feed<T> => ({ ok: false, reason: 'Could not reach it.', source, sourceUrl: 'https://example.org/' })
const kp = (value: number) => ok<KpNow>({ kp: value, g: 0, label: 'quiet', from: '2026-11-15T06:00:00.000Z' }, '2026-11-15T06:00:00.000Z', 'NOAA Space Weather Prediction Center')
const storms = (list: Storm[]) => ok(list, '2026-11-12T06:00:00.000Z', 'NASA EONET')
const storm = (id: string, name: string, windKts: number | null): Storm => ({ id, name, lat: 10, lon: 20, at: '2026-11-12T06:00:00.000Z', windKts, link: 'https://eonet.gsfc.nasa.gov/' })
const debris = (counts: (number | null)[]) =>
  ok<Debris>({ objects: [], clouds: counts.map((count, i) => ({ name: `Cloud ${i}`, cause: '', count })) }, '2026-11-15T04:00:00.000Z', 'CelesTrak')

describe('the event of the day', () => {
  it('is a geomagnetic storm first, at the G level NOAA gives that Kp', () => {
    const event = dailyEvent({ kp: kp(6.33), storms: storms([storm('E1', 'Typhoon A', 90)]), debris: debris([100]) })!
    expect(event).toMatchObject({ kind: 'solar-storm', card: 'geomagnetic-storm', g: 2, source: 'NOAA Space Weather Prediction Center', asOf: '2026-11-15T06:00:00.000Z' })
    expect(event.title).toBe('Solar storm: G2, moderate')
    expect(event.text).toContain('Kp 6.3 out of 9, a G2 storm')
    expect([5, 5.67, 6, 7.33, 8, 8.67, 9].map((value) => dailyEvent({ kp: kp(value) })?.g)).toEqual([1, 1, 2, 3, 4, 4, 5])
  })

  it('is not a storm under Kp 5 or for a reading that cannot be a Kp', () => {
    for (const value of [4.67, 0, -1, 9.5, Number.NaN, '7' as unknown as number]) expect(dailyEvent({ kp: kp(value) })).toBeNull()
    expect(dailyEvent({ kp: parseKpFixture() })).toBeNull() // the real quiet day in the fixture
  })

  it('is then the open severe storm with the highest wind, the id breaking a tie, whatever order the feed lists them in', () => {
    const list = [storm('E3', 'Storm C', 40), storm('E2', 'Typhoon B', 90), storm('E1', 'Typhoon A', 90), storm('E0', 'No wind', null)]
    const event = dailyEvent({ kp: kp(3), storms: storms(list), debris: debris([100]) })!
    expect(event).toMatchObject({ kind: 'severe-storm', card: 'station-bumped', title: 'Severe storm: Typhoon A', source: 'NASA EONET', asOf: '2026-11-12T06:00:00.000Z' })
    expect(event.text).toContain('Typhoon A, with winds of 90 knots (167 km/h) at its last report')
    expect(event.text).toContain('Ground antennas are stowed in high wind and passes are lost')
    expect(event.g).toBeUndefined()
    expect(dailyEvent({ storms: storms([...list].reverse()) })).toEqual(event)
    expect(list.map((s) => s.id)).toEqual(['E3', 'E2', 'E1', 'E0']) // the feed's list is not reordered
    // A storm with no wind in its report is still the event when it is the only one, and no number is made up.
    expect(dailyEvent({ storms: storms([storm('E0', 'No wind', null)]) })!.text).toContain('lists No wind, an open severe storm.')
  })

  it('reads the real EONET answer in the fixture', () => {
    const event = dailyEvent({ kp: kp(0.67), storms: storms(parseStorms(eonet)) })!
    expect(event.title).toBe('Severe storm: Typhoon Cempaka')
    expect(event.text).toContain('65 knots (120 km/h)')
    expect(event.asOf).toBe('2026-11-11T12:00:00.000Z')
  })

  it('is otherwise the tracked debris, counted from the clouds that answered', () => {
    const event = dailyEvent({ kp: kp(2), storms: storms([]), debris: debris([1989, 581, null, 2]) })!
    expect(event).toMatchObject({ kind: 'debris', card: 'debris-pass', title: 'Tracked debris: 2,572 pieces', source: 'CelesTrak', asOf: '2026-11-15T04:00:00.000Z' })
    expect(event.text).toContain('CelesTrak lists 2,572 tracked pieces from 3 broken-up satellites circling Earth')
    expect(dailyEvent({ debris: debris([7]) })!.text).toContain('7 tracked pieces from one broken-up satellite')
  })

  it('is null when no feed answers, or answers with nothing usable', () => {
    expect(dailyEvent({})).toBeNull()
    expect(dailyEvent({ kp: down('NOAA'), storms: down('NASA EONET'), debris: down('CelesTrak') })).toBeNull()
    expect(dailyEvent({ kp: kp(1), storms: storms([]), debris: debris([null, 0, -4, 1.5, 1e9]) })).toBeNull()
    expect(dailyEvent({ storms: storms([{ ...storm('E1', '   ', 50) }, { ...storm('E2', 'Bad date', 50), at: 'yesterday' }]) })).toBeNull()
    expect(dailyEvent({ storms: ok('nope' as unknown as Storm[], '2026-11-12T06:00:00.000Z', 'NASA EONET') })).toBeNull()
  })

  it('does not trust feed text: a name is one short line and an impossible wind is left out', () => {
    const event = dailyEvent({ storms: storms([storm('E1', `<img src=x onerror=alert(1)>${'x'.repeat(500)}`, 900)]) })!
    expect(event.title.length).toBeLessThanOrEqual('Severe storm: '.length + 60)
    expect(event.text).not.toContain('900')
    expect(event.text.length).toBeLessThan(300)
  })
})

function parseKpFixture(): Feed<KpNow> {
  const data = parseKp(kpFixture)
  return ok(data, data.from, 'NOAA Space Weather Prediction Center')
}

describe('the mission an event makes', () => {
  const daily = dailyMissionForDate(new Date('2026-11-15T12:00:00Z'), ['demo', 'moon', 'mars'])!
  const event = dailyEvent({ storms: storms([storm('E1', 'Typhoon A', 90)]) })!

  it('is the Earth-orbit mission for everyone, with a seed from the date and the kind alone', () => {
    const mission = eventMission({ ...daily, name: 'Ada' }, event)
    expect(mission).toMatchObject({ date: '2026-11-15', scenarioId: EVENT_SCENARIO, seed: 202611152, difficulty: 'normal', name: 'Ada', event })
    expect(getScenario(EVENT_SCENARIO)?.title).toContain('First Light')
    expect(eventMission(mission, event).seed).toBe(mission.seed) // asking twice changes nothing
    expect(eventMission(daily, dailyEvent({ kp: kp(7) })!).seed).toBe(202611151)
    expect(eventMission(daily, dailyEvent({ debris: debris([5]) })!).seed).toBe(202611153)
  })

  it('never shares a personal-best slot with the ordinary daily of the same date, and the slot is one the record store accepts', () => {
    const saved = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => void saved.set(key, value) })
    try {
      const ordinary = { ...daily, scenarioId: EVENT_SCENARIO } // a day whose ordinary daily is First Light too
      const mission = eventMission(daily, event)
      expect(Number.isSafeInteger(mission.seed) && mission.seed >= 0).toBe(true)
      expect(mission.seed | 0).toBe(mission.seed) // the sim keeps a 32-bit seed: nothing is cut off
      expect(eventMission({ ...daily, date: '9999-12-31' }, event).seed | 0).toBe(999912312)
      expect(savePersonalBest(EVENT_SCENARIO, 500, {}, { dailySeed: ordinary.seed }).stored).toBe(true)
      expect(savePersonalBest(EVENT_SCENARIO, 900, {}, { dailySeed: mission.seed }).stored).toBe(true)
      expect(saved.size).toBe(2)
    } finally { vi.unstubAllGlobals() }
  })

  it('gives the sim the headline card and no historical storm, without changing the scenario it was given', () => {
    const config = getScenario('demo')!
    const before = JSON.stringify(config)
    expect(withEvent(config, event).params).toMatchObject({ ...config.params, headline_card: 'station-bumped', real_storms: '' })
    expect(withEvent(config, undefined)).toBe(config)
    expect(JSON.stringify(config)).toBe(before)
  })
})

describe('choosing the event once a day', () => {
  let saved: Map<string, string>
  const quiet = { kp: kp(2), flare: down('NOAA') }

  beforeEach(() => {
    saved = new Map()
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => void saved.set(key, value) })
    for (const feed of Object.values(live)) feed.mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('keeps the first event of the day on this device, whatever the feeds say later', async () => {
    live.fetchSpaceWeather.mockResolvedValue(quiet)
    live.fetchStorms.mockResolvedValue(storms([storm('E1', 'Typhoon A', 90)]))
    const first = await loadDailyEvent('2026-11-15')
    expect(first?.kind).toBe('severe-storm')
    expect(live.fetchDebris).not.toHaveBeenCalled() // CelesTrak is only asked when nothing above applies

    live.fetchSpaceWeather.mockResolvedValue({ kp: kp(8), flare: down('NOAA') })
    expect(await loadDailyEvent('2026-11-15')).toEqual(first)
    expect(live.fetchSpaceWeather).toHaveBeenCalledTimes(1) // the saved event asks no feed
    expect((await loadDailyEvent('2026-11-16'))?.kind).toBe('solar-storm') // a new day chooses again
    expect(savedDailyEvent('2026-11-15')).toBeNull()
  })

  it('falls through to debris, and saves nothing when no feed answers', async () => {
    live.fetchSpaceWeather.mockResolvedValue(quiet)
    live.fetchStorms.mockResolvedValue(storms([]))
    live.fetchDebris.mockResolvedValue(down('CelesTrak'))
    expect(await loadDailyEvent('2026-11-15')).toBeNull()
    expect(saved.size).toBe(0)
    live.fetchDebris.mockResolvedValue(debris([10, 20]))
    expect((await loadDailyEvent('2026-11-15'))?.kind).toBe('debris')
  })

  it('gives the feeds four seconds, then answers null and starts no late download', async () => {
    vi.useFakeTimers()
    live.fetchSpaceWeather.mockReturnValue(new Promise(() => {}))
    live.fetchStorms.mockReturnValue(new Promise(() => {}))
    let answer: DailyEvent | null | undefined
    void loadDailyEvent('2026-11-15').then((event) => { answer = event })
    await vi.advanceTimersByTimeAsync(WAIT_MS - 100)
    expect(answer).toBeUndefined()
    await vi.advanceTimersByTimeAsync(200)
    expect(answer).toBeNull()
    expect(live.fetchDebris).not.toHaveBeenCalled()
    expect(WAIT_MS).toBe(4000)
  })

  it('survives blocked storage and a feed layer that throws', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    live.fetchSpaceWeather.mockResolvedValue({ kp: kp(5), flare: down('NOAA') })
    live.fetchStorms.mockResolvedValue(storms([]))
    expect((await loadDailyEvent('2026-11-15'))?.g).toBe(1)
    live.fetchSpaceWeather.mockRejectedValue(new Error('boom'))
    expect(await loadDailyEvent('2026-11-15')).toBeNull()
  })

  it('reads a saved event back as plain checked text, and refuses a damaged one', () => {
    const event = dailyEvent({ kp: kp(7.33) })!
    saved.set('space-apps-2026:daily-event:v1', JSON.stringify({ date: '2026-11-15', event: { ...event, card: 'reaction-wheel', extra: 1, title: 'T'.repeat(999) } }))
    const back = savedDailyEvent('2026-11-15')!
    expect(back).toEqual({ ...event, title: 'T'.repeat(120) }) // the card is the kind's own, extras are dropped
    for (const bad of [{ ...event, kind: 'toString' }, { ...event, text: 5 }, { ...event, asOf: 'soon' }, null, 'x']) {
      saved.set('space-apps-2026:daily-event:v1', JSON.stringify({ date: '2026-11-15', event: bad }))
      expect(savedDailyEvent('2026-11-15')).toBeNull()
    }
    saved.set('space-apps-2026:daily-event:v1', '{not json')
    expect(savedDailyEvent('2026-11-15')).toBeNull()
  })
})
