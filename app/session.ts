// The seam between the React screens and whatever runs the game.
// Screens depend only on `Session`: a solo game in this browser, a co-op host, or a co-op
// guest (net/ + shared/net.ts). All three implement the same interface.

import { HostRoom, type Transport } from '../net'
import type { Command, NetMessage, Player, Role, SimEvent, SimState } from '../shared'
import { canSend, CONTRACT_VERSION, isNetMessage, ownerRole, ROLES } from '../shared'
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
  /**
   * `lobby`: the crew is gathering and picking roles; a guest's `state` is a placeholder until the host starts.
   * `playing`: draw `state`. `closed`: the room is gone (`notice` says why). Solo is always `playing`.
   */
  readonly stage: 'lobby' | 'playing' | 'closed'
}

export interface Session {
  /** The same object until something changes, so it works with useSyncExternalStore. */
  getSnapshot(): SessionSnapshot
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  /** Solo and host: runs the command. Guest: sends it to the host. */
  send(command: Command): void
  /** Clear `notice`. */
  dismissNotice(): void
  /** Co-op only: take a free role, or null to give yours up. */
  claimRole?(role: Role | null): void
  /** Host only: leave the lobby and begin designing the mission. */
  start?(): void
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

/** One player, in this browser, holding no role (so `canSend` lets them send everything). No net/ involved. */
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
    return { ...from, players, me, notice, stage: 'playing' }
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
    dismissNotice() {
      if (notice === null) return
      notice = null
      emit()
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

// ------------------------------------------------------------------ Co-op
// Decision 002: only the host runs the sim. Guests send Commands and draw what the host
// broadcasts. Who sent a message comes from the transport's `from`, never from its payload.

/** What the sessions need from net/: LocalTransport and PeerTransport both fit. */
export interface SessionTransport extends Transport<NetMessage> {
  readonly playerId: string
  /** PeerTransport only: the connection ids in the room right now. */
  onPlayers?(handler: (ids: readonly string[]) => void): () => void
  /** PeerTransport only: `error` or `closed` means the room is gone. */
  onStatus?(handler: (status: 'connecting' | 'ready' | 'closed' | 'error', error?: Error) => void): () => void
}

export const ROLE_LABELS: Record<Role, string> = {
  'mission-planning': 'Mission planning',
  spacecraft: 'Spacecraft',
  science: 'Science',
  'comms-resources': 'Comms and resources',
}

/** In flight the host sends `state` at most this often. Design changes and the ending go out at once. */
export const STATE_INTERVAL_MS = 100

/**
 * `state` messages have no field for the app's pause flag or speed, so the host sends them
 * inside the SimState: status `paused`, and this metric.
 */
const SPEED_METRIC = 'speed_multiplier'

const ACTIONS: Record<Command['type'], string> = {
  launch: 'launch the mission',
  pause: 'pause the mission',
  resume: 'resume the mission',
  set_speed: 'change the speed',
  reset: 'reset the mission',
  set_param: 'change that part of the design',
  select_entity: 'do that',
}

/** Why `command` was refused, for the player who sent it. */
function refusal(command: Command, players: readonly Player[]): string {
  const owner = ownerRole(command)
  const holder = players.find((p) => p.role !== null && p.role === owner)
  if (!owner || !holder) return 'That command was refused.'
  return `Only ${holder.name} (${ROLE_LABELS[owner]}) can ${ACTIONS[command.type]}.`
}

export interface HostSessionOptions {
  /** Same as SoloSessionOptions.drive. */
  drive?: (game: Game) => () => void
}

/**
 * The host: runs `game`, keeps the roster (net/'s HostRoom), checks every command against the
 * sender's role and broadcasts the result. Starts in the lobby; no `state` is sent until start().
 * The transport must be ready. With a LocalTransport this is same-screen play.
 */
export function createHostSession(
  game: Game,
  transport: SessionTransport,
  name: string,
  options: HostSessionOptions = {},
): Session {
  const hostId = transport.playerId
  // The policy callback is unused: HostRoom.authorize refuses players with no role, but the
  // contract lets anyone cover an unclaimed role, so commands are checked with canSend below.
  const newRoom = (hostName: string) => new HostRoom<Role, Command>(hostId, hostName, ROLES, () => true)
  const listeners = new Set<() => void>()
  let room = newRoom(name)
  let players: Player[] = room.players
  let stage: SessionSnapshot['stage'] = 'lobby'
  let notice: string | null = null
  let snapshot = build()
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastSent = -Infinity
  let sentPhase: unknown
  let closed = false

  function build(): SessionSnapshot {
    return { ...game.getSnapshot(), players, me: players[0], notice, stage }
  }

  function refresh(): void {
    snapshot = build()
    for (const listener of [...listeners]) listener()
  }

  function broadcast(message: NetMessage): void {
    try {
      transport.send(message)
    } catch {
      // The transport is closing or refused the message. The host's own game carries on.
    }
  }

  function sendState(): void {
    clearTimeout(timer)
    timer = undefined
    lastSent = Date.now()
    const { state, events, paused, speed } = game.getSnapshot()
    sentPhase = state.metrics.phase
    const shown: SimState = {
      ...state,
      status: paused && state.status === 'running' ? 'paused' : state.status,
      metrics: { ...state.metrics, [SPEED_METRIC]: speed },
    }
    // shortcut: every message carries the whole event list, so late joiners and resets need
    // no bookkeeping. Send only the new events if a mission ever produces hundreds.
    broadcast({ type: 'state', payload: { state: shown, events: [...events] } })
  }

  function scheduleState(): void {
    const { state } = game.getSnapshot()
    // Design edits, a change of phase (launch) and the ending go out at once.
    const { phase } = state.metrics
    const urgent = phase === 'design' || phase !== sentPhase || state.status === 'ended'
    const wait = urgent ? 0 : lastSent + STATE_INTERVAL_MS - Date.now()
    if (wait <= 0) sendState()
    else timer ??= setTimeout(sendState, wait)
  }

  function rosterChanged(): void {
    players = room.players
    broadcast({ type: 'roster', payload: { players } })
    refresh()
  }

  function reject(player_id: string, reason: string, command?: Command): void {
    broadcast({ type: 'rejected', payload: command ? { player_id, reason, command } : { player_id, reason } })
  }

  // HostRoom cannot take a role back, so build a new room with every other seat and role as it was.
  function release(id: string): void {
    const old = room.players
    room = newRoom(old[0].name)
    for (const player of old) {
      if (!player.is_host) room.join(player.player_id, player.name)
      if (player.role && player.player_id !== id) room.claimRole(player.player_id, player.role)
    }
  }

  /** Check the sender's role, then run the command. Returns why it was refused, or null. */
  function attempt(player: Player, command: Command): string | null {
    if (!canSend(player.role, command, players.map((p) => p.role))) return refusal(command, players)
    const before = game.getSnapshot().events
    game.send(command)
    const after = game.getSnapshot().events
    // A warning the sim raised in answer (a refused launch) goes back to whoever sent the command.
    let warning: string | null = null
    if (after.length >= before.length) {
      for (const event of after.slice(before.length)) if (event.type === 'warning') warning = event.payload.message
    }
    return warning
  }

  const stopListening = game.subscribe(() => {
    if (stage === 'playing') scheduleState()
    refresh()
  })

  const stopMessages = transport.onMessage((message, from) => {
    // A LocalTransport hands the host its own broadcasts back, so anything "from" the host is skipped.
    if (closed || from === hostId || !isNetMessage(message)) return
    switch (message.type) {
      case 'join': {
        const result = room.join(from, message.payload.name)
        if (!result.ok) return reject(from, result.reason)
        rosterChanged()
        if (stage === 'playing') sendState()
        return
      }
      case 'claim_role': {
        const { role } = message.payload
        if (role === null) release(from)
        else {
          const result = room.claimRole(from, role)
          if (!result.ok) return reject(from, result.reason)
        }
        return rosterChanged()
      }
      case 'command': {
        const { command } = message.payload
        if (command.type === 'select_entity') return
        const player = players.find((p) => p.player_id === from)
        const reason = player ? attempt(player, command) : 'Join the room before sending commands.'
        if (reason) reject(from, reason, command)
        return
      }
      case 'leave':
        room.leave(from)
        return rosterChanged()
      // roster, state, rejected and ended only go from the host to guests: ignored here.
    }
  })

  // A guest whose connection dropped without a `leave` message.
  const stopPlayers = transport.onPlayers?.((ids) => {
    const gone = players.filter((p) => !p.is_host && !ids.includes(p.player_id))
    if (closed || gone.length === 0) return
    for (const player of gone) room.leave(player.player_id)
    rosterChanged()
  })

  const stopDriving = options.drive?.(game)

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    send(command) {
      if (closed) return
      notice = attempt(players[0], command)
      refresh()
    },
    dismissNotice() {
      if (notice === null) return
      notice = null
      refresh()
    },
    claimRole(role) {
      if (closed) return
      notice = null
      if (role === null) release(hostId)
      else {
        const result = room.claimRole(hostId, role)
        if (!result.ok) notice = result.reason
      }
      rosterChanged()
    },
    start() {
      if (closed || stage !== 'lobby') return
      stage = 'playing'
      sendState()
      refresh()
    },
    close() {
      if (closed) return
      broadcast({ type: 'ended', payload: {} })
      closed = true
      clearTimeout(timer)
      stopDriving?.()
      stopListening()
      stopMessages()
      stopPlayers?.()
      listeners.clear()
      // After the current task, so a LocalTransport still delivers `ended`.
      queueMicrotask(() => transport.close())
    },
  }
}

/** What a guest holds before the host's first `state` message. Not drawn: the lobby is on screen until then. */
const WAITING_STATE: SimState = {
  contract_version: CONTRACT_VERSION,
  scenario_id: '',
  tick: 0,
  t_s: 0,
  utc: '',
  frame: '',
  status: 'paused',
  entities: [],
  metrics: { phase: 'design' },
  params: {},
  issues: [],
  rng_state: 0,
}

/**
 * A guest: no Game and no sim. Sends `join`, then shows whatever the host broadcasts and
 * turns send() into `command` messages. The transport must be ready (connected to the host).
 */
export function createGuestSession(transport: SessionTransport, name: string): Session {
  const myId = transport.playerId
  const listeners = new Set<() => void>()
  let me: Player = { player_id: myId, name, role: null, is_host: false }
  let players: Player[] = []
  /** True once a roster has listed this player. */
  let joined = false
  let state = WAITING_STATE
  let events: readonly SimEvent[] = []
  let paused = false
  let speed = 1
  let stage: SessionSnapshot['stage'] = 'lobby'
  let notice: string | null = null
  let snapshot = build()
  let closed = false

  function build(): SessionSnapshot {
    return { state, events, paused, speed, players, me, notice, stage }
  }

  function refresh(): void {
    snapshot = build()
    for (const listener of [...listeners]) listener()
  }

  function post(message: NetMessage): void {
    try {
      transport.send(message)
    } catch {
      notice = 'Could not reach the host.'
    }
  }

  function roomClosed(reason: string): void {
    stage = 'closed'
    notice = reason
  }

  const stopMessages = transport.onMessage((message, from) => {
    if (closed || stage === 'closed' || from === myId || !isNetMessage(message)) return
    switch (message.type) {
      case 'roster': {
        players = message.payload.players
        const found = players.find((p) => p.player_id === myId)
        if (found) {
          me = found
          joined = true
        }
        break
      }
      case 'state': {
        if (!joined) return
        state = message.payload.state
        events = message.payload.events
        paused = state.status === 'paused'
        const sent = state.metrics[SPEED_METRIC]
        speed = typeof sent === 'number' ? sent : 1
        stage = 'playing'
        break
      }
      case 'rejected':
        if (message.payload.player_id !== myId) return
        // Refused before ever being listed: the join itself failed (room full).
        if (joined) notice = message.payload.reason
        else roomClosed(message.payload.reason)
        break
      case 'ended':
        roomClosed('The host closed the room.')
        break
      default:
        // join, claim_role, command and leave are for the host.
        return
    }
    refresh()
  })

  const stopStatus = transport.onStatus?.((status, error) => {
    if (closed || stage === 'closed' || (status !== 'error' && status !== 'closed')) return
    roomClosed(error?.message ?? 'The connection to the host was lost.')
    refresh()
  })

  post({ type: 'join', payload: { name } })

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    send(command) {
      // select_entity is local to each player and nothing shows a selection yet.
      if (closed || stage === 'closed' || command.type === 'select_entity') return
      notice = null
      post({ type: 'command', payload: { command } })
      refresh()
    },
    dismissNotice() {
      if (notice === null) return
      notice = null
      refresh()
    },
    claimRole(role) {
      if (closed || stage === 'closed') return
      notice = null
      post({ type: 'claim_role', payload: { role } })
      refresh()
    },
    close() {
      if (closed) return
      if (stage !== 'closed') post({ type: 'leave', payload: {} })
      closed = true
      stopMessages()
      stopStatus?.()
      listeners.clear()
      // After the current task, so a LocalTransport still delivers `leave`.
      queueMicrotask(() => transport.close())
    },
  }
}
