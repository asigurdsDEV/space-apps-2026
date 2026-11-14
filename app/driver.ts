// Turns real time into game.advance(realMs) calls. The only place in app/ with a timer.

import type { Game } from './game'

export interface DriverClock {
  /** Milliseconds. Only differences matter. */
  now(): number
  /** Run `callback` once, soon. Returns an id for cancel(). */
  request(callback: () => void): number
  cancel(id: number): void
}

/** requestAnimationFrame where there is one (it sleeps in background tabs), otherwise a 50 ms timer. */
export function browserClock(): DriverClock {
  const now = () => performance.now()
  if (typeof requestAnimationFrame === 'function') {
    return { now, request: (callback) => requestAnimationFrame(callback), cancel: (id) => cancelAnimationFrame(id) }
  }
  return {
    now,
    request: (callback) => setTimeout(callback, 50) as unknown as number,
    cancel: (id) => clearTimeout(id),
  }
}

/** Calls game.advance with the real time since the last call, until the returned stop function runs. */
export function startDriver(game: Pick<Game, 'advance'>, clock: DriverClock = browserClock()): () => void {
  let last = clock.now()
  let stopped = false
  let id = clock.request(tick)

  function tick(): void {
    if (stopped) return
    const now = clock.now()
    game.advance(now - last)
    last = now
    id = clock.request(tick)
  }

  return () => {
    stopped = true
    clock.cancel(id)
  }
}
