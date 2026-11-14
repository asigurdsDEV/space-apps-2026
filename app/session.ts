// The seam between the React screens and whatever runs the game.
// Screens depend only on `Session`: today that is a solo game in this browser; the
// co-op host and guest sessions (net/ + shared/net.ts) implement the same interface.

import type { Command, Player, SimEvent, SimState } from '../shared'
import type { Game, GameSnapshot } from './game'

export interface SessionSnapshot {
  readonly state: SimState
  /** Every SimEvent so far, oldest first. */
  readonly events: readonly SimEvent[]
  readonly paused: boolean
  readonly speed: number
  /** Everyone in the room, host first. Solo: just `me`. */
  readonly players: Player[]
  readonly me: Player
  /** One short message for this player, e.g. why a command was refused. null when there is none. */
  readonly notice: string | null
}

export interface Session {
  /** The same object until something changes, so it works with useSyncExternalStore. */
  getSnapshot(): SessionSnapshot
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  /** Solo and host: runs the command. Guest: sends it to the host. */
  send(command: Command): void
  /** Stop timers and connections. The session must not be used afterwards. */
  close(): void
}

export interface SoloSessionOptions {
  /** Display name of the one player. */
  name?: string
  /**
   * Starts whatever calls game.advance and returns its stop function, e.g. `startDriver`
   * from app/driver.ts. It runs until close(). Leave it out to call game.advance yourself (tests).
   */
  drive?: (game: Game) => () => void
}

export const SOLO_PLAYER_ID = 'solo'

/**
 * One player, in this browser, holding no role (so `canSend` lets them send everything).
 *
 * CO-OP: add createHostSession / createGuestSession next to this one.
 * - Host: wrap the same `Game`. On each game change, broadcast `state` with the events
 *   added since the last broadcast (`events.slice(lastLength)`; a shorter list means a reset).
 *   Check `canSend(role, command, claimedRoles)` before `game.send`, for guests and for the
 *   host's own commands, and put the refusal in `notice` (or a `rejected` message for a guest).
 * - Guest: no `Game` at all. Build the snapshot from the host's `state` / `roster` messages,
 *   appending each message's events, and turn `send` into a `command` message.
 * - `select_entity` stays local in both.
 */
export function createSoloSession(game: Game, options: SoloSessionOptions = {}): Session {
  const me: Player = { player_id: SOLO_PLAYER_ID, name: options.name ?? 'You', role: null, is_host: true }
  const players = [me]
  const listeners = new Set<() => void>()
  let notice: string | null = null
  let base = game.getSnapshot()
  let snapshot = build(base)
  let sending = false
  let closed = false

  function build(from: GameSnapshot): SessionSnapshot {
    return { ...from, players, me, notice }
  }

  function emit(): void {
    for (const listener of [...listeners]) listener()
  }

  // While send() runs, it emits once itself, after the notice is settled.
  const stopListening = game.subscribe(() => {
    if (!sending) emit()
  })
  const stopDriving = options.drive?.(game)

  return {
    getSnapshot() {
      const current = game.getSnapshot()
      if (current !== base || snapshot.notice !== notice) {
        base = current
        snapshot = build(current)
      }
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    send(command) {
      if (closed) return
      const before = game.getSnapshot()
      sending = true
      try {
        game.send(command)
      } finally {
        sending = false
      }
      const after = game.getSnapshot()
      // A warning the sim raised in answer to this command (a refused launch) becomes the
      // notice. Any other command clears it.
      let next: string | null = null
      if (after.events.length >= before.events.length) {
        for (const event of after.events.slice(before.events.length)) {
          if (event.type === 'warning') next = event.payload.message
        }
      }
      const changed = after !== before || next !== notice
      notice = next
      if (changed) emit()
    },
    close() {
      if (closed) return
      closed = true
      stopDriving?.()
      stopListening()
      listeners.clear()
    },
  }
}
