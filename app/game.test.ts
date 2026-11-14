import { describe, expect, it, vi } from 'vitest'
import type { Command, Config, SimCore } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { createGame, MAX_STEPS_PER_ADVANCE, type Game } from './game'

/** Sandbox: no random failures, so every launch works and the mission flies its full length. */
const config: Config = { ...demoConfig, params: { ...demoConfig.params, random_failures: false } }

const newGame = (sim: SimCore = simCore) => createGame({ config, datasets: fixtureDatasets, sim })

const designCommands: Command[] = Object.entries(goodDesign).map(([key, value]) => ({
  type: 'set_param',
  payload: { key, value },
}))

function design(game: Game): void {
  for (const command of designCommands) game.send(command)
}

function launch(game: Game): void {
  design(game)
  game.send({ type: 'launch', payload: {} })
}

const tick = (game: Game) => game.getSnapshot().state.tick
const phase = (game: Game) => game.getSnapshot().state.metrics.phase

describe('design phase', () => {
  it('starts in design with no events, running at 1x', () => {
    const snap = newGame().getSnapshot()
    expect(snap.state.metrics.phase).toBe('design')
    expect(snap.events).toEqual([])
    expect(snap.paused).toBe(false)
    expect(snap.speed).toBe(1)
  })

  it('applies set_param at once and tells subscribers', () => {
    const game = newGame()
    const listener = vi.fn()
    game.subscribe(listener)
    const before = game.getSnapshot()

    game.send({ type: 'set_param', payload: { key: 'bus', value: 'no-such-bus' } })
    const broken = game.getSnapshot()
    game.send({ type: 'set_param', payload: { key: 'bus', value: goodDesign.bus } })
    const after = game.getSnapshot()

    expect(listener).toHaveBeenCalledTimes(2)
    expect(broken).not.toBe(before)
    expect(broken.state.params.bus).toBe('no-such-bus')
    expect(after.state.params.bus).toBe(goodDesign.bus)
    // Budgets and issues are re-checked in the same call, not on a later tick.
    expect(after.state.issues).not.toEqual(broken.state.issues)
    expect(after.state.metrics.mass_kg).not.toBe(broken.state.metrics.mass_kg)
    expect(after.state.metrics.phase).toBe('design')
    expect(after.state.t_s).toBe(0)
    expect(after.events[0].type).toBe('scenario_started')
  })

  it('leaves no launch-blocking issues once the good design is picked', () => {
    const game = newGame()
    design(game)
    expect(game.getSnapshot().state.issues.filter((i) => i.severity === 'error')).toEqual([])
  })

  it('does not move time when advance is called', () => {
    const game = newGame()
    design(game)
    const before = game.getSnapshot()
    game.advance(10_000)
    expect(game.getSnapshot()).toBe(before)
  })

  it('refuses launch with a warning while the design has errors', () => {
    const game = newGame()
    game.send({ type: 'set_param', payload: { key: 'bus', value: 'no-such-bus' } })
    game.send({ type: 'launch', payload: {} })
    const snap = game.getSnapshot()
    expect(snap.state.metrics.phase).toBe('design')
    expect(snap.events.some((e) => e.type === 'warning')).toBe(true)
  })
})

describe('flight', () => {
  it('launch leaves design, then advance reaches ended', () => {
    const game = newGame()
    launch(game)
    expect(phase(game)).not.toBe('design')

    let calls = 0
    while (game.getSnapshot().state.status !== 'ended' && calls < 2000) {
      game.advance(1000)
      calls++
    }

    const { state, events } = game.getSnapshot()
    expect(state.status).toBe('ended')
    expect(state.metrics.phase).toBe('ended')
    expect(events[0].type).toBe('scenario_started')
    expect(events[events.length - 1].type).toBe('scenario_ended')
    expect(events.map((e) => e.tick)).toEqual([...events.map((e) => e.tick)].sort((a, b) => a - b))
    // One step per real second at 1x: every call stepped once until the end.
    expect(calls).toBe(state.tick - designCommands.length - 1)
  })

  it('does nothing after the sim has ended', () => {
    const game = newGame()
    launch(game)
    game.send({ type: 'set_speed', payload: { multiplier: 60 } })
    for (let i = 0; i < 100; i++) game.advance(1000)
    const ended = game.getSnapshot()
    expect(ended.state.status).toBe('ended')

    const listener = vi.fn()
    game.subscribe(listener)
    game.advance(60_000)
    game.send({ type: 'set_param', payload: { key: 'bus', value: goodDesign.bus } })
    game.send({ type: 'launch', payload: {} })
    expect(game.getSnapshot()).toBe(ended)
    expect(listener).not.toHaveBeenCalled()
  })

  it('pause stops time and resume starts it again', () => {
    const game = newGame()
    launch(game)
    game.send({ type: 'pause', payload: {} })
    const paused = game.getSnapshot()
    expect(paused.paused).toBe(true)

    game.advance(5000)
    expect(game.getSnapshot()).toBe(paused)

    game.send({ type: 'resume', payload: {} })
    expect(game.getSnapshot().paused).toBe(false)
    game.advance(1000)
    expect(tick(game)).toBe(paused.state.tick + 1)
  })

  it('runs one step of config.dt_s per real second at 1x and keeps fractions', () => {
    const game = newGame()
    launch(game)
    const start = game.getSnapshot().state
    game.advance(400)
    game.advance(400)
    expect(tick(game)).toBe(start.tick)
    game.advance(400)
    expect(tick(game)).toBe(start.tick + 1)
    expect(game.getSnapshot().state.t_s).toBe(start.t_s + config.dt_s)
  })

  it('speed scales the steps per real second', () => {
    const game = newGame()
    launch(game)
    let last = tick(game)
    for (const multiplier of [1, 5, 20, 60]) {
      game.send({ type: 'set_speed', payload: { multiplier } })
      expect(game.getSnapshot().speed).toBe(multiplier)
      game.advance(1000)
      expect(tick(game) - last).toBe(multiplier)
      last = tick(game)
    }
  })

  it('ignores speed multipliers that are not offered', () => {
    const game = newGame()
    const before = game.getSnapshot()
    for (const multiplier of [0, -1, 3, 1000, Number.NaN]) {
      game.send({ type: 'set_speed', payload: { multiplier } })
    }
    expect(game.getSnapshot()).toBe(before)
  })

  it('caps the steps per advance call', () => {
    const game = newGame()
    launch(game)
    game.send({ type: 'set_speed', payload: { multiplier: 60 } })
    const before = tick(game)
    game.advance(10 * 60 * 1000) // a tab that slept for ten minutes
    expect(tick(game) - before).toBe(MAX_STEPS_PER_ADVANCE)
    // The dropped time does not come back later.
    game.advance(1)
    expect(tick(game) - before).toBe(MAX_STEPS_PER_ADVANCE)
  })

  it('keeps the design locked after launch', () => {
    const game = newGame()
    launch(game)
    const launched = game.getSnapshot()
    game.send({ type: 'set_param', payload: { key: 'bus', value: 'something-else' } })
    expect(game.getSnapshot()).toBe(launched) // waits for the next step
    game.advance(1000)
    const next = game.getSnapshot()
    expect(next.state.params.bus).toBe(goodDesign.bus)
    expect(next.events.slice(launched.events.length).some((e) => e.type === 'warning')).toBe(true)
  })
})

describe('reset', () => {
  it('returns to design with empty events', () => {
    const game = newGame()
    launch(game)
    game.send({ type: 'set_speed', payload: { multiplier: 20 } })
    game.advance(1000)
    game.send({ type: 'pause', payload: {} })
    expect(game.getSnapshot().events.length).toBeGreaterThan(0)

    game.send({ type: 'reset', payload: {} })

    const snap = game.getSnapshot()
    expect(snap.state.metrics.phase).toBe('design')
    expect(snap.state.tick).toBe(0)
    expect(snap.state.t_s).toBe(0)
    expect(snap.events).toEqual([])
    expect(snap.paused).toBe(false)
    expect(snap.speed).toBe(1)
    expect(snap.state.params.bus).toBe(config.params.bus)
  })

  it('reset() does the same as the reset command', () => {
    const game = newGame()
    launch(game)
    game.reset()
    expect(phase(game)).toBe('design')
    expect(game.getSnapshot().events).toEqual([])
  })

  it('plays the same mission again after a reset', () => {
    const game = newGame()
    const fly = () => {
      launch(game)
      game.send({ type: 'set_speed', payload: { multiplier: 60 } })
      for (let i = 0; i < 100; i++) game.advance(1000)
      return game.getSnapshot()
    }
    const first = fly()
    game.reset()
    const second = fly()
    expect(second.state).toEqual(first.state)
    expect(second.events).toEqual(first.events)
  })
})

describe('snapshot and subscribers', () => {
  it('returns the same snapshot until something changes', () => {
    const game = newGame()
    const listener = vi.fn()
    game.subscribe(listener)
    const first = game.getSnapshot()

    expect(game.getSnapshot()).toBe(first)
    game.advance(1000) // design: time stands still
    game.send({ type: 'resume', payload: {} }) // already running
    game.send({ type: 'set_speed', payload: { multiplier: 1 } }) // already 1x
    game.send({ type: 'select_entity', payload: { id: 'spacecraft' } })
    expect(game.getSnapshot()).toBe(first)
    expect(listener).not.toHaveBeenCalled()

    game.send({ type: 'pause', payload: {} })
    const paused = game.getSnapshot()
    expect(paused).not.toBe(first)
    game.send({ type: 'pause', payload: {} }) // already paused
    expect(game.getSnapshot()).toBe(paused)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops calling a listener after it unsubscribes', () => {
    const game = newGame()
    const listener = vi.fn()
    const unsubscribe = game.subscribe(listener)
    game.send({ type: 'pause', payload: {} })
    unsubscribe()
    game.send({ type: 'resume', payload: {} })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('never passes app-level commands to the sim', () => {
    const sim: SimCore = { init: vi.fn(simCore.init), step: vi.fn(simCore.step), summary: simCore.summary }
    const game = newGame(sim)
    game.send({ type: 'pause', payload: {} })
    game.send({ type: 'resume', payload: {} })
    game.send({ type: 'set_speed', payload: { multiplier: 5 } })
    game.send({ type: 'select_entity', payload: { id: null } })
    game.send({ type: 'reset', payload: {} })
    expect(sim.step).not.toHaveBeenCalled()
    expect(sim.init).toHaveBeenCalledTimes(2) // createGame, then reset

    game.send({ type: 'set_param', payload: { key: 'bus', value: goodDesign.bus } })
    expect(sim.step).toHaveBeenCalledTimes(1)
  })
})
