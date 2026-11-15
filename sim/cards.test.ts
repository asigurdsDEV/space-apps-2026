// Anomaly cards (decision 004), flown through the real sim with the real catalogs.

import { describe, expect, it } from 'vitest'
import type { Command, Config, ParamValue, SimEvent, SimState } from '../shared'
import { canSend, isCommand } from '../shared'
import { getDatasets, getScenario } from '../data'
import { cardSchedule, CARDS } from './cards'
import { flyMission, init, pendingDecision, step, summary } from './index'

const WINS: Record<string, Record<string, ParamValue>> = {
  demo: { bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' },
  mars: { instruments: 'subsurface-radar,ir-spectrometer', comms: 'mars-hga' },
}

const withCards = (id: string, cards: number, seed?: number): Config => {
  const c = getScenario(id)!
  return { ...c, seed: seed ?? c.seed, params: { ...c.params, random_failures: false, anomaly_cards: cards } }
}

/** Fly a mission, answering every card with `answer` (or leaving cards unanswered when it returns null). */
function play(config: Config, design: Record<string, ParamValue>, answer: (card_id: string) => 'a' | 'b' | null = () => 'a') {
  let state: SimState = init(config, getDatasets(config.datasets))
  const events: SimEvent[] = []
  const run = (commands: Command[]) => {
    const r = step(state, commands, config.dt_s)
    state = r.state
    events.push(...r.events)
  }
  run(Object.entries(design).map(([key, value]) => ({ type: 'set_param', payload: { key, value } })))
  run([{ type: 'launch', payload: {} }])
  for (let n = 0; state.status !== 'ended' && n < 5000; n++) {
    const waiting = pendingDecision(state)
    const option = waiting && answer(waiting.card_id)
    if (waiting && !option) break
    run(waiting && option ? [{ type: 'resolve_decision', payload: { decision_id: waiting.decision_id, option_id: option } }] : [])
  }
  const drawn = events.flatMap((e) => (e.type === 'decision_required' ? [e] : []))
  return { state, events, drawn }
}

describe('anomaly cards', () => {
  it('are off unless the scenario asks: no card events, no card metrics', () => {
    const r = play(withCards('demo', 0), WINS.demo)
    expect(r.drawn).toEqual([])
    expect(r.state.metrics.card_rng).toBeUndefined()
    expect(r.state.status).toBe('ended')
  })

  it('stop the clock until the card is answered, and survive a reload', () => {
    const r = play(withCards('demo', 2), WINS.demo, () => null)
    expect(r.drawn).toHaveLength(1)
    const waiting = pendingDecision(r.state)!
    expect(waiting).toEqual(r.drawn[0].payload)
    expect(waiting.options.map((o) => o.id)).toEqual(['a', 'b'])
    expect(waiting.story?.source_url).toMatch(/^https:\/\//)

    // More steps change nothing, and re-emit nothing.
    const again = step(r.state, [], 86400 * 30)
    expect(again.state.t_s).toBe(r.state.t_s)
    expect(again.events).toEqual([])
    // The state alone is enough to show the card (late joiner, reload).
    expect(pendingDecision(JSON.parse(JSON.stringify(r.state)))).toEqual(waiting)

    // A wrong id is refused and the card keeps waiting.
    const wrong = step(r.state, [{ type: 'resolve_decision', payload: { decision_id: 'nope', option_id: 'a' } }], 86400)
    expect(wrong.events.map((e) => e.type)).toEqual(['warning'])
    expect(pendingDecision(wrong.state)).toEqual(waiting)

    // The right answer reports what happened and time moves again.
    const ok = step(r.state, [{ type: 'resolve_decision', payload: { decision_id: waiting.decision_id, option_id: 'a' } }], 86400)
    expect(ok.events[0]).toMatchObject({ type: 'decision_resolved', payload: { card_id: waiting.card_id, option_id: 'a' } })
    expect(pendingDecision(ok.state)).toBeNull()
    expect(ok.state.t_s).toBeGreaterThan(r.state.t_s)
  })

  it('draws the asked number at most, each card once, at least a week apart, and the mission still ends', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = play(withCards('demo', 3, seed), WINS.demo)
      expect(r.state.status).toBe('ended')
      expect(r.drawn.length).toBeGreaterThan(0)
      expect(r.drawn.length).toBeLessThanOrEqual(3)
      const ids = r.drawn.map((e) => e.payload.card_id)
      expect(new Set(ids).size).toBe(ids.length)
      const days = r.drawn.map((e) => e.t_s / 86400)
      for (let i = 1; i < days.length; i++) expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(7)
      expect(r.events.filter((e) => e.type === 'decision_resolved')).toHaveLength(r.drawn.length)
    }
  })

  it('is replayable: the same seed and the same answers give the same mission', () => {
    const a = play(withCards('demo', 3), WINS.demo, () => 'b')
    const b = play(withCards('demo', 3), WINS.demo, () => 'b')
    expect(summary(b.state)).toEqual(summary(a.state))
    expect(b.drawn.map((e) => e.payload.decision_id)).toEqual(a.drawn.map((e) => e.payload.decision_id))
  })

  it('never changes the failure rolls: with cards answered safely, science is never above the same flight without cards', () => {
    const none = play(withCards('demo', 0), WINS.demo)
    const some = play(withCards('demo', 3), WINS.demo)
    expect(Number(some.state.metrics.science_score)).toBeLessThanOrEqual(Number(none.state.metrics.science_score) + 1e-9)
    expect(some.state.rng_state).toBe(none.state.rng_state)
  })

  it('only draws cards that fit the mission: no Mars dust on Earth, no Earth storms at Mars', () => {
    const seen = (id: string) => {
      const ids = new Set<string>()
      for (let seed = 1; seed <= 25; seed++) for (const e of play(withCards(id, 3, seed), WINS[id]).drawn) ids.add(e.payload.card_id)
      return ids
    }
    const earth = seen('demo')
    expect(earth.has('dust-storm')).toBe(false)
    expect(earth.size).toBeGreaterThan(2)
    const mars = seen('mars')
    expect(mars.has('geomagnetic-storm')).toBe(false)
    expect(mars.has('radiation-zone')).toBe(false)
    expect(mars.has('dust-storm')).toBe(true)
  }, 20_000) // 50 full missions: over the 5 s default on GitHub's runner

  it('a gamble can end the mission, and the summary says it failed', () => {
    // Search the seeds for a lost gamble: with option b on every card, some mission must be lost.
    const lost = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      .map((seed) => play(withCards('demo', 3, seed), WINS.demo, () => 'b'))
      .find((r) => r.state.metrics.end_reason)
    expect(lost).toBeDefined()
    expect(['reentry', 'lost_contact']).toContain(lost!.state.metrics.end_reason)
    expect(lost!.state.t_s).toBeLessThan(365 * 86400)
    expect(['spacecraft_failure', 'success']).toContain(lost!.state.metrics.outcome)
  })

  it('a card that costs money shows up in the mission cost', () => {
    const paid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      .map((seed) => play(withCards('demo', 3, seed), WINS.demo))
      .find((r) => r.drawn.some((e) => e.payload.card_id === 'station-bumped' || e.payload.card_id === 'lost-contact'))
    expect(paid).toBeDefined()
    expect(Number(summary(paid!.state).cost_usd)).toBeGreaterThan(Number(paid!.state.metrics.cost_usd))
  })

  it('what-if reruns answer cards by themselves and still finish', () => {
    const config = withCards('demo', 3)
    const result = flyMission(config, getDatasets(config.datasets), WINS.demo)
    expect(result).not.toBeNull()
    expect(result!.outcome).toBeDefined()
  })

  it('every card has two options, a console, and a sourced story', () => {
    expect(CARDS.length).toBe(8)
    for (const card of CARDS) {
      expect(card.options.map((o) => o.id)).toEqual(['a', 'b'])
      expect(card.body.length).toBeLessThan(200)
      expect(card.story.source_url).toMatch(/^https:\/\//)
    }
  })

  it('schedules one draw per slice of the operations phase', () => {
    expect(cardSchedule(0, 0, 365, [])).toEqual([])
    expect(cardSchedule(2, 0, 365, [0, 0])).toEqual([1, 183])
    const days = cardSchedule(3, 210, 1095, [0.999, 0.999, 0.999])
    expect(days[0]).toBeGreaterThan(210)
    expect(days[2]).toBeLessThan(1095)
    expect(days[1] - days[0]).toBeGreaterThanOrEqual(7)
  })
})

describe('anomaly cards in co-op', () => {
  const answer: Command = { type: 'resolve_decision', payload: { decision_id: 'reaction-wheel-40', option_id: 'a' } }

  it('the command passes the wire check, and junk does not', () => {
    expect(isCommand(answer)).toBe(true)
    expect(isCommand({ type: 'resolve_decision', payload: { decision_id: 5, option_id: 'a' } })).toBe(false)
    expect(isCommand({ type: 'resolve_decision', payload: {} })).toBe(false)
  })

  it("belongs to the card's console, or to anyone when nobody holds it", () => {
    expect(canSend('spacecraft', answer, ['spacecraft', 'science'], 'spacecraft')).toBe(true)
    expect(canSend('science', answer, ['spacecraft', 'science'], 'spacecraft')).toBe(false)
    expect(canSend('science', answer, ['science'], 'spacecraft')).toBe(true)
    expect(canSend(null, answer, [], null)).toBe(true)
  })
})
