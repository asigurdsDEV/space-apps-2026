import { describe, expect, it, vi } from 'vitest'
import type { Command, Config } from '../shared'
import { canSend } from '../shared'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { startDriver, type DriverClock } from './driver'
import { createGame } from './game'
import { createSoloSession } from './session'

const config: Config = { ...demoConfig, params: { ...demoConfig.params, random_failures: false } }
const newGame = () => createGame({ config, datasets: fixtureDatasets, sim: simCore })

const designCommands: Command[] = Object.entries(goodDesign).map(([key, value]) => ({
  type: 'set_param',
  payload: { key, value },
}))
const launch: Command = { type: 'launch', payload: {} }
const breakDesign: Command = { type: 'set_param', payload: { key: 'bus', value: 'no-such-bus' } }

/** A clock the test moves by hand. */
function fakeClock() {
  let time = 0
  let nextId = 1
  const pending = new Map<number, () => void>()
  const clock: DriverClock = {
    now: () => time,
    request(callback) {
      pending.set(nextId, callback)
      return nextId++
    },
    cancel: (id) => void pending.delete(id),
  }
  /** Move time on by `ms` and run the callbacks that were waiting. */
  const frame = (ms: number) => {
    time += ms
    const due = [...pending.values()]
    pending.clear()
    for (const callback of due) callback()
  }
  return { clock, frame, pending }
}

describe('createSoloSession', () => {
  it('has one host player with no role, who may send every command', () => {
    const { players, me, notice } = createSoloSession(newGame()).getSnapshot()
    expect(players).toEqual([me])
    expect(me.is_host).toBe(true)
    expect(me.role).toBeNull()
    expect(notice).toBeNull()
    for (const command of [...designCommands, launch]) expect(canSend(players, me.player_id, command)).toBe(true)
  })

  it('mirrors the game and passes commands to it', () => {
    const game = newGame()
    const session = createSoloSession(game)
    for (const command of designCommands) session.send(command)
    session.send(launch)
    session.send({ type: 'set_speed', payload: { multiplier: 5 } })
    session.send({ type: 'pause', payload: {} })

    const snap = session.getSnapshot()
    expect(snap.state).toBe(game.getSnapshot().state)
    expect(snap.events).toBe(game.getSnapshot().events)
    expect(snap.state.metrics.phase).not.toBe('design')
    expect(snap.speed).toBe(5)
    expect(snap.paused).toBe(true)
  })

  it('returns the same snapshot until something changes', () => {
    const game = newGame()
    const session = createSoloSession(game)
    const first = session.getSnapshot()
    expect(session.getSnapshot()).toBe(first)
    session.send({ type: 'select_entity', payload: { id: null } })
    expect(session.getSnapshot()).toBe(first)
    session.send({ type: 'pause', payload: {} })
    expect(session.getSnapshot()).not.toBe(first)
  })

  it('tells subscribers once per command and when the game advances', () => {
    const game = newGame()
    const session = createSoloSession(game)
    const listener = vi.fn()
    const unsubscribe = session.subscribe(listener)

    for (const command of designCommands) session.send(command)
    expect(listener).toHaveBeenCalledTimes(designCommands.length)
    session.send(launch)
    listener.mockClear()

    game.advance(1000)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(session.getSnapshot().state).toBe(game.getSnapshot().state)

    unsubscribe()
    game.advance(1000)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('shows a refused launch as the notice and clears it on the next command', () => {
    const session = createSoloSession(newGame())
    session.send(breakDesign)
    expect(session.getSnapshot().notice).toBeNull()

    const listener = vi.fn()
    session.subscribe(listener)
    session.send(launch)
    const refused = session.getSnapshot()
    expect(refused.state.metrics.phase).toBe('design')
    expect(refused.notice).toEqual(expect.any(String))
    expect(refused.notice).not.toBe('')
    expect(listener).toHaveBeenCalledTimes(1)

    session.send({ type: 'select_entity', payload: { id: null } })
    expect(session.getSnapshot().notice).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('goes back to design on reset', () => {
    const session = createSoloSession(newGame())
    for (const command of designCommands) session.send(command)
    session.send(launch)
    session.send({ type: 'reset', payload: {} })
    const snap = session.getSnapshot()
    expect(snap.state.metrics.phase).toBe('design')
    expect(snap.events).toEqual([])
    expect(snap.notice).toBeNull()
  })

  it('runs the driver until close, then ignores commands', () => {
    const game = newGame()
    const { clock, frame, pending } = fakeClock()
    const session = createSoloSession(game, { drive: (g) => startDriver(g, clock) })
    for (const command of designCommands) session.send(command)
    session.send(launch)
    const launched = game.getSnapshot().state.tick

    frame(1000)
    frame(1000)
    expect(game.getSnapshot().state.tick).toBe(launched + 2)

    const listener = vi.fn()
    session.subscribe(listener)
    session.close()
    expect(pending.size).toBe(0)
    frame(1000)
    session.send({ type: 'pause', payload: {} })
    game.send({ type: 'pause', payload: {} })
    expect(game.getSnapshot().state.tick).toBe(launched + 2)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('startDriver', () => {
  it('passes the real time between frames to advance', () => {
    const { clock, frame } = fakeClock()
    const advance = vi.fn()
    startDriver({ advance }, clock)
    frame(16)
    frame(250)
    expect(advance.mock.calls).toEqual([[16], [250]])
  })

  it('stops for good when the stop function runs', () => {
    const { clock, frame, pending } = fakeClock()
    const advance = vi.fn()
    const stop = startDriver({ advance }, clock)
    frame(16)
    stop()
    frame(16)
    expect(advance).toHaveBeenCalledTimes(1)
    expect(pending.size).toBe(0)
  })
})
