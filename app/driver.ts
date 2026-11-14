// Turns real time into game.advance(realMs) calls. The only place in app/ with a timer.

import type { Game } from './game'

export interface DriverClock {
  /** Milliseconds. Only differences matter. */
  now(): number
  /** Run `callback` once, soon. Returns an id for cancel(). */
  request(callback: () => void): number
  cancel(id: number): void
}

/**
 * A 50 ms timer. For an online host: guests only see what the host steps, and a timer keeps
 * running in a background tab (browsers slow it to about once a second, which advance() handles).
 */
export function timerClock(): DriverClock {
  return {
    now: () => performance.now(),
    request: (callback) => setTimeout(callback, 50) as unknown as number,
    cancel: (id) => clearTimeout(id),
  }
}

/** requestAnimationFrame where there is one (it sleeps in background tabs), otherwise timerClock. */
export function browserClock(): DriverClock {
  if (typeof requestAnimationFrame !== 'function') return timerClock()
  return {
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
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
