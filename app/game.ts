// The game store: owns the loop that calls the sim (CONTRACTS.md, "app" module).
// No React, no DOM and no timers in here. Whoever drives it calls advance(realMs)
// (see app/driver.ts), so tests can run a whole mission without waiting.

import type { Command, Config, Dataset, SimCore, SimEvent, SimState } from '../shared'

/** The set_speed multipliers the app accepts. 1x = one sim step (config.dt_s) per real second. */
export const SPEEDS = [1, 5, 20, 60] as const

/**
 * Most sim steps one advance() call may run. One second of real time at the top speed.
 * A tab that was in the background for minutes comes back with a huge realMs; the extra
 * time is dropped instead of freezing the page or skipping the whole mission.
 */
export const MAX_STEPS_PER_ADVANCE = 60

/** Commands waiting for the next flight step. Extra ones are dropped (matters once guests can send). */
const MAX_QUEUED_COMMANDS = 64

export interface GameOptions {
  config: Config
  datasets: Dataset[]
  /** The sim core, e.g. `simCore` from sim/. Passed in so the store never imports sim/ itself. */
  sim: SimCore
}

export interface GameSnapshot {
  readonly state: SimState
  /** Every SimEvent since the last init/reset, oldest first. */
  readonly events: readonly SimEvent[]
  readonly paused: boolean
  /** Current set_speed multiplier, one of SPEEDS. */
  readonly speed: number
}

export interface Game {
  /** The same object until something changes, so it works with useSyncExternalStore. */
  getSnapshot(): GameSnapshot
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  send(command: Command): void
  /** Tell the store that `realMs` of real time passed. Runs the sim steps that are due. */
  advance(realMs: number): void
  /** Back to the design phase: calls sim.init again and clears the events. */
  reset(): void
}

export function createGame({ config, datasets, sim }: GameOptions): Game {
  const listeners = new Set<() => void>()
  let snapshot = fresh()
  /** Part of a sim step owed from earlier advance() calls (always below 1). */
  let carry = 0
  /** Sim commands that arrived in flight; applied at the start of the next step. */
  let queued: Command[] = []

  function fresh(): GameSnapshot {
    return { state: sim.init(config, datasets), events: [], paused: false, speed: 1 }
  }

  function set(next: GameSnapshot): void {
    snapshot = next
    for (const listener of [...listeners]) listener()
  }

  /** Run up to `count` sim steps. `commands` go into the first one. */
  function run(commands: Command[], count: number): void {
    let state = snapshot.state
    const added: SimEvent[] = []
    for (let i = 0; i < count && state.status !== 'ended'; i++) {
      const result = sim.step(state, i === 0 ? commands : [], config.dt_s)
      state = result.state
      added.push(...result.events)
    }
    if (state === snapshot.state && added.length === 0) return
    set({ ...snapshot, state, events: added.length > 0 ? [...snapshot.events, ...added] : snapshot.events })
  }

  function reset(): void {
    carry = 0
    queued = []
    set(fresh())
  }

  function send(command: Command): void {
    switch (command.type) {
      // ---- App-level commands: handled here, never passed to the sim.
      case 'pause':
        if (!snapshot.paused) set({ ...snapshot, paused: true })
        return
      case 'resume':
        if (snapshot.paused) set({ ...snapshot, paused: false })
        return
      case 'set_speed': {
        const { multiplier } = command.payload
        if ((SPEEDS as readonly number[]).includes(multiplier) && multiplier !== snapshot.speed) {
          set({ ...snapshot, speed: multiplier })
        }
        return
      }
      case 'reset':
        reset()
        return
      case 'select_entity':
        // Local to each player and no screen shows a selection yet, so there is nothing to store.
        return
      // ---- Everything else (set_param, launch, scenario-specific commands) belongs to the sim.
      default:
        if (snapshot.state.status === 'ended') return
        if (snapshot.state.metrics.phase === 'design') {
          // Time stands still in design, so step now: budgets and issues update at once.
          run([command], 1)
        } else if (queued.length < MAX_QUEUED_COMMANDS) {
          queued.push(command)
        }
    }
  }

  function advance(realMs: number): void {
    const { state, paused, speed } = snapshot
    if (paused || state.status === 'ended' || state.metrics.phase === 'design') return
    if (!(realMs > 0)) return
    carry += (realMs / 1000) * speed
    let steps = Math.floor(carry)
    carry -= steps
    if (steps > MAX_STEPS_PER_ADVANCE) {
      steps = MAX_STEPS_PER_ADVANCE
      carry = 0
    }
    if (steps === 0) return
    const commands = queued
    queued = []
    run(commands, steps)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    send,
    advance,
    reset,
  }
}
